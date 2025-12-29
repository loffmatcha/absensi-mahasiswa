// ==============================
// GLOBAL VARIABLES & FUNCTIONS
// ==============================

let schedules = JSON.parse(localStorage.getItem("schedules")) || [];

function showMessage(text, type = 'info') {
  const message = document.getElementById("message");
  if (!message) return;
  message.textContent = text;
  message.style.color = type === 'error' ? 'var(--danger)' : 'green';
  setTimeout(() => { message.textContent = ''; }, 3000);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, function (s) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]);
  });
}

// ==============================
// THEME MANAGEMENT
// ==============================

function applyTheme(theme){
  if(theme === 'dark') {
    document.documentElement.setAttribute('data-theme','dark');
    const toggle = document.getElementById('themeToggle');
    if(toggle) toggle.setAttribute('aria-pressed','true');
  } else {
    document.documentElement.removeAttribute('data-theme');
    const toggle = document.getElementById('themeToggle');
    if(toggle) toggle.setAttribute('aria-pressed','false');
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

const themeToggle = document.getElementById('themeToggle');
if(themeToggle){
  themeToggle.addEventListener('click', ()=>{
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('smj_theme', newTheme);
  });
}

// ==============================
// MOBILE NAVIGATION
// ==============================

const navToggle = document.querySelector('.nav-toggle');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    document.body.classList.toggle('nav-open');
  });
}

// ==============================
// PWA: INSTALL & SERVICE WORKER
// ==============================

const installBtn = document.getElementById('installBtn');
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('⚡ beforeinstallprompt event fired');
  e.preventDefault();
  deferredPrompt = e;
  if(installBtn){ 
    installBtn.style.display = 'inline-flex'; 
    installBtn.setAttribute('aria-hidden','false');
    console.log('✅ Install button shown');
  }
});

if(installBtn){
  installBtn.addEventListener('click', async () => {
    console.log('👆 Install button clicked');
    if(!deferredPrompt) {
      console.warn('⚠️ deferredPrompt not available');
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log('User choice:', choice.outcome);
    if(choice.outcome === 'accepted') {
      console.log('✅ User accepted install');
    } else {
      console.log('❌ User dismissed install');
    }
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}

// Service Worker Registration with better error handling
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker update found');
        });
      })
      .catch(error => {
        console.error('❌ Service Worker registration failed:', error);
      });
    
    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 New Service Worker activated, reloading...');
      window.location.reload();
    });
  });
}

// Debug: Check PWA installability
window.addEventListener('load', () => {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('✅ App is running as PWA');
  } else {
    console.log('ℹ️ App is running in browser');
  }
});

// ==============================
// INDEX.HTML - ADD SCHEDULE PAGE
// ==============================

const scheduleForm = document.getElementById("scheduleForm");
const scheduleCount = document.getElementById("scheduleCount");

if (scheduleForm) {
  // Update counter
  function updateCounter() {
    if (!scheduleCount) return;
    schedules = JSON.parse(localStorage.getItem("schedules")) || [];
    scheduleCount.textContent = schedules.length;
  }

  // Submit form
  scheduleForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const mataKuliah = document.getElementById("mataKuliah").value.trim();
    const hari = document.getElementById("hari").value;
    const jam = document.getElementById("jam").value.trim();
    const ruang = document.getElementById("ruang").value.trim();

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
    showMessage('✓ Jadwal berhasil ditambahkan!', 'success');
    updateCounter();
  });

  // Keyboard shortcut
  window.addEventListener('keydown', (e) => {
    if(e.key === 'n' && document.activeElement.tagName.toLowerCase() !== 'input'){
      const firstInput = document.getElementById('mataKuliah');
      if(firstInput) firstInput.focus();
    }
  });

  // Initial counter
  updateCounter();
}

// ==============================
// JADWAL.HTML - SCHEDULE LIST PAGE
// ==============================

const tableBody = document.getElementById("scheduleTable");
const scheduleCards = document.getElementById("scheduleCards");
const tableWrapper = document.getElementById("scheduleTableWrapper");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById('searchInput');
const filterDay = document.getElementById('filterDay');
const filterRoom = document.getElementById('filterRoom');

if (tableBody && scheduleCards) {
  
  // Filter function
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

  // Render schedules (dual view: cards + table)
  function renderSchedules() {
    schedules = JSON.parse(localStorage.getItem("schedules")) || [];
    tableBody.innerHTML = "";
    scheduleCards.innerHTML = "";

    const filtered = schedules.filter(matchesFilter);

    if (schedules.length === 0) {
      if(tableWrapper) tableWrapper.style.display = 'none';
      if(scheduleCards) scheduleCards.style.display = 'none';
      if(emptyState) emptyState.style.display = 'block';
      return;
    }

    if(tableWrapper) tableWrapper.style.display = 'block';
    if(scheduleCards) scheduleCards.style.display = 'block';
    if(emptyState) emptyState.style.display = 'none';

    if (filtered.length === 0) {
      scheduleCards.innerHTML = '<div class="card" style="text-align:center;padding:2rem;color:var(--muted)">Tidak ada jadwal yang cocok dengan filter</div>';
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted)">Tidak ada jadwal yang cocok dengan filter</td></tr>';
      return;
    }

    filtered.forEach(schedule => {
      // Card view for mobile
      const card = document.createElement("div");
      card.className = "schedule-card card";
      card.innerHTML = `
        <div class="schedule-card-header">
          <h3 class="schedule-title">${escapeHtml(schedule.mataKuliah)}</h3>
          <button class="action-btn action-btn-small" data-id="${schedule.id}">Hapus</button>
        </div>
        <div class="schedule-card-body">
          <div class="schedule-info">
            <span class="schedule-label">📅 Hari:</span>
            <span class="schedule-value">${escapeHtml(schedule.hari)}</span>
          </div>
          <div class="schedule-info">
            <span class="schedule-label">🕐 Jam:</span>
            <span class="schedule-value">${escapeHtml(schedule.jam)}</span>
          </div>
          <div class="schedule-info">
            <span class="schedule-label">🏛️ Ruang:</span>
            <span class="schedule-value">${escapeHtml(schedule.ruang)}</span>
          </div>
        </div>
      `;
      scheduleCards.appendChild(card);

      // Table view for desktop
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${escapeHtml(schedule.mataKuliah)}</strong></td>
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

  // Event delegation for delete (both card and table)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.matches('.action-btn')) {
      const id = Number(e.target.getAttribute('data-id'));
      if (confirm('Yakin ingin menghapus jadwal ini?')) {
        schedules = schedules.filter(item => item.id !== id);
        localStorage.setItem("schedules", JSON.stringify(schedules));
        showMessage('Jadwal dihapus', 'success');
        renderSchedules();
      }
    }
  });

  // Live filter
  if(searchInput) searchInput.addEventListener('input', renderSchedules);
  if(filterDay) filterDay.addEventListener('change', renderSchedules);
  if(filterRoom) filterRoom.addEventListener('input', renderSchedules);

  // Keyboard shortcut for search
  window.addEventListener('keydown', (e) => {
    if(e.key === '/' && document.activeElement !== searchInput){
      e.preventDefault(); 
      if(searchInput) searchInput.focus();
    }
  });

  // Initial render
  renderSchedules();
}

// ==============================
// CSV EXPORT/IMPORT
// ==============================

const exportBtn = document.getElementById('exportCsv');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');
const downloadSample = document.getElementById('downloadSample');

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  return '"' + s.replace(/"/g, '""') + '"';
}

function exportCSV() {
  schedules = JSON.parse(localStorage.getItem("schedules")) || [];
  if (!schedules.length) { 
    showMessage('Tidak ada data untuk diekspor', 'error'); 
    return; 
  }
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
  showMessage('CSV berhasil diunduh', 'success');
}

function downloadSampleCsv() {
  const sample = 'mataKuliah,hari,jam,ruang\nPengantar Pemrograman,Senin,08:00 - 10:00,R101\nBasis Data,Selasa,10:00 - 12:00,R102\n';
  const blob = new Blob([sample], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample-jadwal.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showMessage('Sample CSV diunduh', 'success');
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
      if (rows.length < 2) { 
        showMessage('CSV kosong atau format tidak sesuai', 'error'); 
        return; 
      }
      const header = rows[0].map(h => h.trim().toLowerCase());
      const idx = {
        mataKuliah: header.findIndex(h => h === 'matakuliah' || h === 'mata kuliah'),
        hari: header.indexOf('hari'),
        jam: header.indexOf('jam'),
        ruang: header.indexOf('ruang')
      };
      if (idx.mataKuliah === -1 || idx.hari === -1 || idx.jam === -1 || idx.ruang === -1) {
        showMessage('Header CSV harus berisi: mataKuliah,hari,jam,ruang', 'error');
        return;
      }
      let added = 0;
      schedules = JSON.parse(localStorage.getItem("schedules")) || [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length <= Math.max(...Object.values(idx))) continue;
        const newSchedule = {
          id: Date.now() + i,
          mataKuliah: r[idx.mataKuliah].trim(),
          hari: r[idx.hari].trim(),
          jam: r[idx.jam].trim(),
          ruang: r[idx.ruang].trim()
        };
        if (newSchedule.mataKuliah && newSchedule.hari) { 
          schedules.push(newSchedule); 
          added++; 
        }
      }
      if (added) {
        localStorage.setItem('schedules', JSON.stringify(schedules));
        if(typeof renderSchedules === 'function') renderSchedules();
        showMessage('✓ Berhasil mengimpor ' + added + ' jadwal', 'success');
      } else {
        showMessage('Tidak ada baris valid dalam CSV', 'error');
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

// ==============================
// INITIALIZE
// ==============================

initTheme();