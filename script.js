const mataKuliahInput = document.getElementById("mataKuliah");
const hariInput = document.getElementById("hari");
const jamInput = document.getElementById("jam");
const ruangInput = document.getElementById("ruang");
const addBtn = document.getElementById("addSchedule");
const tableBody = document.getElementById("scheduleTable");
const message = document.getElementById("message");
const scheduleForm = document.getElementById("scheduleForm");
const navToggle = document.querySelector('.nav-toggle');
const themeToggle = document.getElementById('themeToggle');
const installBtn = document.getElementById('installBtn');
const searchInput = document.getElementById('searchInput');
const filterDay = document.getElementById('filterDay');
const filterRoom = document.getElementById('filterRoom');
const exportBtn = document.getElementById('exportCsv');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');
const downloadSample = document.getElementById('downloadSample');

let schedules = JSON.parse(localStorage.getItem("schedules")) || [];

function showMessage(text, type = 'info') {
  message.textContent = text;
  message.style.color = type === 'error' ? 'red' : 'green';
}

// Render jadwal ke tabel
function renderSchedules() {
  tableBody.innerHTML = "";

  schedules.forEach(schedule => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(schedule.mataKuliah)}</td>
      <td>${escapeHtml(schedule.hari)}</td>
      <td>${escapeHtml(schedule.jam)}</td>
      <td>${escapeHtml(schedule.ruang)}</td>
      <td>
        <button class="action-btn" data-id="${schedule.id}">Hapus</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

// Escape teks sederhana untuk mencegah XSS saat menampilkan
function escapeHtml(text) {
  return String(text).replace(/[&<>\"]/g, function (s) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]);
  });
}

// Tambah jadwal melalui submit form
scheduleForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const mataKuliah = mataKuliahInput.value.trim();
  const hari = hariInput.value;
  const jam = jamInput.value.trim();
  const ruang = ruangInput.value.trim();

  if (!mataKuliah || !hari || !jam || !ruang) {
    showMessage('Semua field wajib diisi!', 'error');
    return;
  }

  const newSchedule = {
    id: Date.now(),
    mataKuliah,
    hari,
    jam,
    ruang
  };

  schedules.push(newSchedule);
  localStorage.setItem("schedules", JSON.stringify(schedules));

  scheduleForm.reset();
  showMessage('Jadwal berhasil ditambahkan!', 'success');
  renderSchedules();
  document.getElementById('list').scrollIntoView({ behavior: 'smooth' });
});

// Event delegation untuk tombol hapus
tableBody.addEventListener('click', (e) => {
  if (e.target && e.target.matches('.action-btn')) {
    const id = Number(e.target.getAttribute('data-id'));
    if (confirm('Yakin ingin menghapus jadwal ini?')) {
      deleteSchedule(id);
      showMessage('Jadwal dihapus', 'success');
    }
  }
});

// Hapus jadwal
function deleteSchedule(id) {
  schedules = schedules.filter(item => item.id !== id);
  localStorage.setItem("schedules", JSON.stringify(schedules));
  renderSchedules();
}

// Toggle mobile nav
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    document.body.classList.toggle('nav-open');
  });
}

// Render awal
// Render awal
renderSchedules();

/* --- THEME (dark/light) --- */
function applyTheme(theme){
  if(theme === 'dark') {
    document.documentElement.setAttribute('data-theme','dark');
    themeToggle.setAttribute('aria-pressed','true');
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggle.setAttribute('aria-pressed','false');
  }
}

function initTheme(){
  try{
    const stored = localStorage.getItem('smj_theme');
    if(stored) { applyTheme(stored); return; }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  } catch(e){}
}

if(themeToggle){
  themeToggle.addEventListener('click', ()=>{
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('smj_theme', newTheme);
  });
}

initTheme();

/* --- PWA: install prompt & service worker registration --- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if(installBtn){ installBtn.style.display = 'inline-flex'; installBtn.setAttribute('aria-hidden','false'); }
});

if(installBtn){
  installBtn.addEventListener('click', async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/service-worker.js').catch(()=>{/* ignore */});
  });
}

/* --- Filtering & Search --- */
function matchesFilter(item){
  const q = (searchInput && searchInput.value || '').trim().toLowerCase();
  const day = (filterDay && filterDay.value) || '';
  const room = (filterRoom && filterRoom.value || '').trim().toLowerCase();

  if(day && item.hari !== day) return false;
  if(room && !item.ruang.toLowerCase().includes(room)) return false;
  if(q){
    const hay = (item.mataKuliah + ' ' + item.jam + ' ' + item.ruang + ' ' + item.hari).toLowerCase();
    return hay.includes(q);
  }
  return true;
}

// enhance renderSchedules to respect search/filter
function renderSchedules(){
  tableBody.innerHTML = "";

  schedules.filter(matchesFilter).forEach(schedule => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(schedule.mataKuliah)}</td>
      <td>${escapeHtml(schedule.hari)}</td>
      <td>${escapeHtml(schedule.jam)}</td>
      <td>${escapeHtml(schedule.ruang)}</td>
      <td>
        <button class="action-btn" data-id="${schedule.id}">Hapus</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

// live update when search or filters change
if(searchInput) searchInput.addEventListener('input', ()=> renderSchedules());
if(filterDay) filterDay.addEventListener('change', ()=> renderSchedules());
if(filterRoom) filterRoom.addEventListener('input', ()=> renderSchedules());

/* --- Microinteractions: keyboard shortcuts --- */
window.addEventListener('keydown', (e) => {
  if(e.key === '/' && document.activeElement !== searchInput){
    e.preventDefault(); searchInput && searchInput.focus();
  }
  if(e.key === 'n' && document.activeElement.tagName.toLowerCase() !== 'input'){
    // focus first input of add form
    mataKuliahInput && mataKuliahInput.focus();
  }
});


// CSV helpers
function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  return '"' + s.replace(/"/g, '""') + '"';
}

function exportCSV() {
  if (!schedules.length) { showMessage('Tidak ada data untuk diekspor', 'error'); return; }
  const header = ['mataKuliah','hari','jam','ruang'];
  const rows = [header.join(',')];
  schedules.forEach(s => {
    rows.push([csvEscape(s.mataKuliah), csvEscape(s.hari), csvEscape(s.jam), csvEscape(s.ruang)].join(','));
  });
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jadwal.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadSampleCsv() {
  const sample = 'mataKuliah,hari,jam,ruang\nPengantar Pemrograman,Senin,08:00 - 10:00,R101\n';
  const blob = new Blob([sample], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample-jadwal.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const rows = lines.map(line => {
    const values = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (c === ',' && !inQuotes) {
        values.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur);
    return values;
  });
  return rows;
}

function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const rows = parseCSV(text);
      if (rows.length < 2) { showMessage('CSV kosong atau format tidak sesuai', 'error'); return; }
      const header = rows[0].map(h => h.trim().toLowerCase());
      const idx = {
        mataKuliah: header.indexOf('matakuliah') !== -1 ? header.indexOf('matakuliah') : header.indexOf('mataKuliah'.toLowerCase()),
        hari: header.indexOf('hari'),
        jam: header.indexOf('jam'),
        ruang: header.indexOf('ruang')
      };
      if (idx.mataKuliah === -1 || idx.hari === -1 || idx.jam === -1 || idx.ruang === -1) {
        showMessage('Header CSV harus berisi: mataKuliah,hari,jam,ruang', 'error');
        return;
      }
      let added = 0;
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length <= Math.max(idx.mataKuliah, idx.hari, idx.jam, idx.ruang)) continue;
        const newSchedule = {
          id: Date.now() + i,
          mataKuliah: r[idx.mataKuliah].trim(),
          hari: r[idx.hari].trim(),
          jam: r[idx.jam].trim(),
          ruang: r[idx.ruang].trim()
        };
        if (newSchedule.mataKuliah && newSchedule.hari) { schedules.push(newSchedule); added++; }
      }
      if (added) {
        localStorage.setItem('schedules', JSON.stringify(schedules));
        renderSchedules();
        showMessage('Berhasil mengimpor ' + added + ' jadwal', 'success');
      } else {
        showMessage('Tidak ada baris valid yang ditemukan dalam CSV', 'error');
      }
    } catch (err) {
      showMessage('Gagal membaca CSV: ' + err.message, 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');
}

if (exportBtn) exportBtn.addEventListener('click', exportCSV);
if (downloadSample) downloadSample.addEventListener('click', downloadSampleCsv);
if (importBtn && importInput) importBtn.addEventListener('click', () => importInput.click());
if (importInput) importInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) handleImportFile(file);
  importInput.value = '';
});
