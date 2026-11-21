/* ==========================================================
   Room Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

const ORDER_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbz5ybsVEfBKrNpF8naPbuPMKcOjSY_GuzoZaneyKerccT1WW_3ggoAcU9-WdQivmigFtw/exec';

const ORDERS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQZ9pdDbK-eO5cDcNR292URMxj2AoMAACSlfkhbjVv3g4sQegkW7r7aFyjxh373ZbqVc8FxXm7IXyWM/pub?gid=0&single=true&output=csv';

const MOODS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'relax', label: 'Relax' },
  { key: 'focus', label: 'Focus' },
  { key: 'romance', label: 'Romance' }
];

/* ---------- Helpers ---------- */

// กันข้อความจากผู้ใช้ไม่ให้ถูกตีความเป็น HTML
function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(num) {
  return Number(num).toLocaleString('th-TH');
}

/* ---------- เมนูมือถือ (ทุกหน้า) ---------- */

function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('is-open');
    nav.classList.toggle('is-open');
  });
}

/* ==========================================================
   1) product.html
   ========================================================== */

let allProducts = [];

function initProductPage() {
  const list = document.getElementById('product-list');
  const filterBar = document.getElementById('filter-bar');
  if (!list || !filterBar) return;

  const params = new URLSearchParams(window.location.search);
  const requested = (params.get('mood') || 'all').toLowerCase();
  const startMood = MOODS.some(m => m.key === requested) ? requested : 'all';

  // สร้างปุ่มกรอง
  filterBar.innerHTML = MOODS.map(m => `
    <button type="button"
            class="filter-btn ${m.key !== 'all' ? 'mood-' + m.key : ''}"
            data-mood="${m.key}">${m.label}</button>
  `).join('');

  filterBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    applyFilter(btn.dataset.mood, true);
  });

  list.innerHTML = '<p class="cart-empty">กำลังโหลดสินค้า...</p>';

  fetch('products.json')
    .then(res => {
      if (!res.ok) throw new Error('โหลด products.json ไม่สำเร็จ');
      return res.json();
    })
    .then(products => {
      allProducts = products;
      applyFilter(startMood, false);
    })
    .catch(err => {
      console.error(err);
      list.innerHTML = '<p class="cart-empty">ขออภัย โหลดสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>';
    });
}

function applyFilter(mood, updateUrl) {
  // ไฮไลต์ปุ่มที่เลือก
  document.querySelectorAll('#filter-bar .filter-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mood === mood);
  });

  const items = mood === 'all'
    ? allProducts
    : allProducts.filter(p => p.mood === mood);

  renderProducts(items);

  // อัปเดต URL ให้แชร์ลิงก์ที่กรองแล้วได้ (ไม่รีโหลดหน้า)
  if (updateUrl) {
    const url = new URL(window.location.href);
    if (mood === 'all') url.searchParams.delete('mood');
    else url.searchParams.set('mood', mood);
    history.replaceState(null, '', url);
  }
}

function renderProducts(items) {
  const list = document.getElementById('product-list');

  if (!items.length) {
    list.innerHTML = '<p class="cart-empty">ยังไม่มีสินค้าในหมวดนี้</p>';
    return;
  }

  list.innerHTML = items.map(p => {
    const orderParams = new URLSearchParams({ item: p.name, price: p.price });
    const typeLabel = p.type === 'candle' ? 'Candle' : 'Room Spray';

    return `
      <article class="product-card mood-${escapeHTML(p.mood)}">
        <div class="product-card__img">
          <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy">
        </div>
        <div class="product-card__body">
          <div class="product-card__meta">
            <span class="mood-tag">${escapeHTML(p.mood)}</span>
            <span>${escapeHTML(p.size || typeLabel)}</span>
          </div>
          <h3 class="product-card__name">${escapeHTML(p.name)}</h3>
          <p class="product-card__desc">${escapeHTML(p.description)}</p>
          <div class="product-card__footer">
            <span class="price">${formatPrice(p.price)}<small>บาท</small></span>
            <a class="btn btn--sm" href="order.html?${orderParams.toString()}">สั่งซื้อ</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/* ==========================================================
   2) order.html
   ========================================================== */

function initOrderPage() {
  const form = document.getElementById('orderForm');
  if (!form) return;

  // เติมค่าจาก URL parameter ลงฟอร์มทันที
  const params = new URLSearchParams(window.location.search);
  const item = params.get('item');
  const price = params.get('price');

  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  if (item !== null && itemsInput) itemsInput.value = item;
  if (price !== null && totalInput) totalInput.value = price;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    // กันกดซ้ำระหว่างรอส่ง
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(ORDER_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) submitBtn.disabled = false;
    });
  });
}

/* ==========================================================
   3) admin.html
   ========================================================== */

// Parse CSV เอง: รองรับค่าที่อยู่ใน "..." , มี comma/ขึ้นบรรทัดใหม่ข้างใน
// และ "" (เครื่องหมายคำพูดซ้อน)
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // ปิดแถวสุดท้าย (ถ้าไฟล์ไม่จบด้วยขึ้นบรรทัดใหม่)
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  // ตัดแถวว่างทิ้ง
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="cart-empty">กำลังโหลดข้อมูล...</td></tr>';

  // ต่อท้าย t= เพื่อลดโอกาสได้ข้อมูลเก่าจาก cache
  const url = ORDERS_CSV_URL + '&t=' + Date.now();

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('โหลดข้อมูลคำสั่งซื้อไม่สำเร็จ');
      return res.text();
    })
    .then(text => {
      let rows = parseCSV(text);

      // ถ้าแถวแรกเป็นหัวตาราง (คอลัมน์ A ไม่มีตัวเลขเลย = ไม่ใช่วันที่) ให้ตัดทิ้ง
      if (rows.length && !/\d/.test(rows[0][0])) {
        rows = rows.slice(1);
      }

      // แถวใน Sheet เรียงตามเวลาที่ถูกเพิ่ม → กลับลำดับให้ล่าสุดขึ้นก่อน
      rows.reverse();

      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="cart-empty">ยังไม่มีคำสั่งซื้อ</td></tr>';
        return;
      }

      tbody.innerHTML = rows.map(r => `
        <tr>
          <td>${escapeHTML(r[0])}</td>
          <td>${escapeHTML(r[1])}</td>
          <td>${escapeHTML(r[2])}</td>
          <td>${escapeHTML(r[3])}</td>
          <td>${escapeHTML(r[4])}</td>
          <td>${escapeHTML(r[5])}</td>
        </tr>
      `).join('');
    })
    .catch(err => {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="6" class="cart-empty">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</td></tr>';
    });
}

/* ---------- เริ่มทำงาน ---------- */

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initProductPage();
  initOrderPage();
  initAdminPage();
});
