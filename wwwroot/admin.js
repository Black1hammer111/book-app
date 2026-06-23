let adminToken = sessionStorage.getItem('adminToken') || '';
let allBooks = [];
let allUsers = [];
let editingId = null;

function getToken() { return adminToken; }

async function doLogin() {
  const user = document.getElementById('liUser').value.trim();
  const pass = document.getElementById('liPass').value;
  const btn  = document.getElementById('liBtn');
  const err  = document.getElementById('liErr');
  err.classList.add('hidden'); err.textContent = '';
  if (!user || !pass) { showErr('أدخل اسم المستخدم وكلمة المرور'); return; }
  btn.disabled = true; btn.textContent = 'جارٍ الدخول...';
  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    if (r.ok) {
      const data = await r.json();
      adminToken = data.token;
      sessionStorage.setItem('adminToken', adminToken);
      document.getElementById('sbAdminName').textContent = data.username || user;
      showDashboard();
    } else {
      showErr('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  } catch { showErr('تعذّر الاتصال بالخادم'); }
  btn.disabled = false; btn.textContent = 'دخول';
}

function showErr(msg) {
  const err = document.getElementById('liErr');
  err.textContent = msg; err.classList.remove('hidden');
}

function doLogout() {
  adminToken = '';
  sessionStorage.removeItem('adminToken');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
}

function showDashboard() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  goPage('stats');
}

document.getElementById('liPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('liUser').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('liPass').focus(); });

window.addEventListener('DOMContentLoaded', async () => {
  updateClock();
  setInterval(updateClock, 1000);
  if (adminToken) {
    const ok = await verifyToken();
    if (ok) { showDashboard(); return; }
    sessionStorage.removeItem('adminToken');
    adminToken = '';
  }
});

async function verifyToken() {
  try {
    const r = await fetch('/api/admin/stats', { headers: { 'X-Api-Key': adminToken } });
    return r.ok;
  } catch { return false; }
}

function goPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.sb-link').forEach(a => a.classList.remove('active'));
  document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1)).classList.remove('hidden');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  if (page === 'stats')    loadStats();
  if (page === 'books')    loadBooks();
  if (page === 'users')    loadUsers();
  if (page === 'activity') loadActivity();
}

function updateClock() {
  const now = new Date();
  const opts = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  document.getElementById('pageTime').textContent = now.toLocaleDateString('ar-SA', opts);
}

let chartActivity = null, chartBreakdown = null, chartBrowsers = null;

async function loadStats() {
  try {
    const r = await fetch('/api/admin/analytics', { headers: { 'X-Api-Key': adminToken } });
    if (!r.ok) return;
    const d = await r.json();

    setText('stBooks',      d.totalBooks ?? '—');
    setText('stUsers',      d.totalUsers ?? '—');
    setText('stTotalVisits', d.totalVisits ?? '—');
    setText('stTodayVisits', d.todayVisits ?? '—');

    const maxVal = Math.max(d.totalBooks, d.totalUsers, d.totalVisits, d.todayVisits, 1);
    setBar('kpiBooksBar',  d.totalBooks,   maxVal);
    setBar('kpiUsersBar',  d.totalUsers,   maxVal);
    setBar('kpiVisitsBar', d.totalVisits,  maxVal);
    setBar('kpiTodayBar',  d.todayVisits,  maxVal);

    renderActivityChart(d.labels, d.dailyVisits, d.dailyLogins, d.dailyRegs);

    if (d.breakdown) renderBreakdownChart(d.breakdown);

    if (d.browsers) renderBrowsersChart(d.browsers);

  } catch(e) { console.error('loadStats', e); }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setBar(id, val, max) {
  const el = document.getElementById(id);
  if (el) el.style.width = Math.min(100, Math.round((val / max) * 100)) + '%';
}

const CHART_DEFAULTS = {
  color: 'rgba(255,255,255,.7)',
  grid:  'rgba(255,255,255,.07)',
};

function renderActivityChart(labels, visits, logins, regs) {
  const ctx = document.getElementById('chartActivity');
  if (!ctx) return;
  if (chartActivity) chartActivity.destroy();
  chartActivity = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'زيارات', data: visits, borderColor: '#0096C7', backgroundColor: 'rgba(0,150,199,.12)', tension: .4, fill: true, pointRadius: 3 },
        { label: 'دخول',   data: logins, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.10)',  tension: .4, fill: true, pointRadius: 3 },
        { label: 'تسجيل',  data: regs,   borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,.10)', tension: .4, fill: true, pointRadius: 3 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: CHART_DEFAULTS.color, font: { family: 'Cairo', size: 12 } } } },
      scales: {
        x: { ticks: { color: CHART_DEFAULTS.color, font: { family: 'Cairo', size: 11 } }, grid: { color: CHART_DEFAULTS.grid } },
        y: { ticks: { color: CHART_DEFAULTS.color, font: { family: 'Cairo', size: 11 } }, grid: { color: CHART_DEFAULTS.grid }, beginAtZero: true },
      }
    }
  });
}

function renderBreakdownChart(b) {
  const ctx = document.getElementById('chartBreakdown');
  if (!ctx) return;
  if (chartBreakdown) chartBreakdown.destroy();
  chartBreakdown = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['زيارات', 'دخول', 'تسجيل', 'فشل دخول', 'مدير'],
      datasets: [{
        data: [b.visits, b.logins, b.regs, b.fails, b.admins],
        backgroundColor: ['#0096C7','#22c55e','#a855f7','#ef4444','#f59e0b'],
        borderWidth: 2, borderColor: '#0f1e35',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { color: CHART_DEFAULTS.color, font: { family: 'Cairo', size: 11 }, padding: 10 } } }
    }
  });
}

function renderBrowsersChart(browsers) {
  const ctx = document.getElementById('chartBrowsers');
  if (!ctx) return;
  if (chartBrowsers) chartBrowsers.destroy();
  const arr    = Array.isArray(browsers) ? browsers : Object.entries(browsers).map(([b,c]) => ({ browser: b, count: c }));
  const labels = arr.map(x => x.browser);
  const data   = arr.map(x => x.count);
  const colors = ['#0096C7','#22c55e','#a855f7','#f59e0b','#ef4444','#14b8a6'];
  chartBrowsers = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 2, borderColor: '#0f1e35' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { color: CHART_DEFAULTS.color, font: { family: 'Cairo', size: 11 }, padding: 10 } } }
    }
  });
}

async function loadBooks() {
  const tbody = document.getElementById('booksTbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;opacity:.5">جارٍ التحميل...</td></tr>';
  try {
    const r = await fetch('/api/books');
    if (!r.ok) return;
    allBooks = await r.json();
    document.getElementById('booksTotalBadge').textContent = `${allBooks.length} كتاب`;
    renderBooks(allBooks);
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">فشل تحميل الكتب</td></tr>';
  }
}

function renderBooks(books) {
  const tbody = document.getElementById('booksTbody');
  if (!books.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">لا توجد كتب</td></tr>';
    return;
  }
  tbody.innerHTML = books.map(b => `
    <tr>
      <td class="td-id">${b.id}</td>
      <td class="td-title">${esc(b.title)}</td>
      <td class="td-author">${esc(b.author)}</td>
      <td class="td-year">${b.year || '—'}</td>
      <td>${b.pdfUrl ? '<span class="td-pdf-yes">✓</span>' : '<span class="td-pdf-no">—</span>'}</td>
      <td>
        <div class="tbl-actions">
          <button class="btn-edit" onclick="openEditForm(${b.id})">تعديل</button>
          <button class="btn-del"  onclick="confirmDeleteBook(${b.id}, '${escAttr(b.title)}')">حذف</button>
        </div>
      </td>
    </tr>`).join('');
}

function filterBooks() {
  const q = document.getElementById('booksSearch').value.toLowerCase();
  const filtered = allBooks.filter(b =>
    b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
  );
  document.getElementById('booksTotalBadge').textContent = `${filtered.length} / ${allBooks.length} كتاب`;
  renderBooks(filtered);
}

function openAddForm() {
  editingId = null;
  document.getElementById('bookFormTitle').textContent = 'إضافة كتاب جديد';
  document.getElementById('bfSaveLabel').textContent = 'حفظ الكتاب';
  document.getElementById('bfId').value = '';
  document.getElementById('bfTitle').value  = '';
  document.getElementById('bfAuthor').value = '';
  document.getElementById('bfYear').value   = '';
  document.getElementById('bfPdf').value    = '';
  clearMsg();
  document.getElementById('bookForm').classList.remove('hidden');
  document.getElementById('bfTitle').focus();
}

function openEditForm(id) {
  const b = allBooks.find(x => x.id === id);
  if (!b) return;
  editingId = id;
  document.getElementById('bookFormTitle').textContent = 'تعديل الكتاب';
  document.getElementById('bfSaveLabel').textContent = 'حفظ التعديلات';
  document.getElementById('bfId').value     = b.id;
  document.getElementById('bfTitle').value  = b.title;
  document.getElementById('bfAuthor').value = b.author;
  document.getElementById('bfYear').value   = b.year || '';
  document.getElementById('bfPdf').value    = b.pdfUrl || '';
  clearMsg();
  document.getElementById('bookForm').classList.remove('hidden');
  document.getElementById('bfTitle').focus();
  document.getElementById('bookForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeBookForm() {
  document.getElementById('bookForm').classList.add('hidden');
  editingId = null;
}

async function saveBook() {
  const title  = document.getElementById('bfTitle').value.trim();
  const author = document.getElementById('bfAuthor').value.trim();
  const year   = parseInt(document.getElementById('bfYear').value) || 0;
  const pdfUrl = document.getElementById('bfPdf').value.trim() || null;
  if (!title)  { setMsg('أدخل عنوان الكتاب', 'error'); return; }
  if (!author) { setMsg('أدخل اسم المؤلف',   'error'); return; }

  const isEdit = editingId !== null;
  const url    = isEdit ? `/api/books/${editingId}` : '/api/books';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': adminToken },
      body: JSON.stringify({ title, author, year, pdfUrl })
    });
    if (r.status === 201 || r.ok) {
      setMsg(isEdit ? 'تم تعديل الكتاب بنجاح ✓' : 'تمت إضافة الكتاب بنجاح ✓', 'success');
      showToast(isEdit ? 'تم تعديل الكتاب' : 'تمت إضافة الكتاب', 'success');
      closeBookForm();
      loadBooks();
      loadStats();
    } else if (r.status === 409) {
      setMsg('الكتاب موجود مسبقاً', 'error');
    } else {
      setMsg('حدث خطأ، حاول مجدداً', 'error');
    }
  } catch { setMsg('تعذّر الاتصال بالخادم', 'error'); }
}

function confirmDeleteBook(id, title) {
  document.getElementById('modalBody').textContent = `سيتم حذف كتاب "${title}" بشكل نهائي.`;
  document.getElementById('confirmModal').classList.remove('hidden');
  document.getElementById('modalConfirmBtn').onclick = () => deleteBook(id);
}

async function deleteBook(id) {
  closeModal();
  try {
    const r = await fetch(`/api/books/${id}`, { method: 'DELETE', headers: { 'X-Api-Key': adminToken } });
    if (r.ok) { showToast('تم حذف الكتاب', 'success'); loadBooks(); loadStats(); }
    else showToast('فشل الحذف', 'error');
  } catch { showToast('تعذّر الاتصال', 'error'); }
}

async function loadUsers() {
  const tbody = document.getElementById('usersTbody');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;opacity:.5">جارٍ التحميل...</td></tr>';
  try {
    const r = await fetch('/api/admin/users', { headers: { 'X-Api-Key': adminToken } });
    if (!r.ok) return;
    allUsers = await r.json();
    document.getElementById('usersTotalBadge').textContent = `${allUsers.length} مستخدم`;
    renderUsers(allUsers);
  } catch {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-row">فشل تحميل المستخدمين</td></tr>';
  }
}

function renderUsers(users) {
  const tbody = document.getElementById('usersTbody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">لا يوجد مستخدمون مسجّلون</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td class="td-id">${u.id}</td>
      <td><strong>${esc(u.username)}</strong></td>
      <td style="color:#7ab8d8;font-size:.84rem">${esc(u.email || '—')}</td>
      <td>
        <div class="tbl-actions">
          <button class="btn-del" onclick="confirmDeleteUser(${u.id}, '${escAttr(u.username)}')">حذف</button>
        </div>
      </td>
    </tr>`).join('');
}

function filterUsers() {
  const q = document.getElementById('usersSearch').value.toLowerCase();
  const filtered = allUsers.filter(u => u.username.toLowerCase().includes(q));
  document.getElementById('usersTotalBadge').textContent = `${filtered.length} / ${allUsers.length} مستخدم`;
  renderUsers(filtered);
}

function confirmDeleteUser(id, username) {
  document.getElementById('modalBody').textContent = `سيتم حذف حساب "${username}" بشكل نهائي.`;
  document.getElementById('confirmModal').classList.remove('hidden');
  document.getElementById('modalConfirmBtn').onclick = () => deleteUser(id, username);
}

async function deleteUser(id, username) {
  closeModal();
  try {
    const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: { 'X-Api-Key': adminToken } });
    if (r.ok) { showToast(`تم حذف المستخدم ${username}`, 'success'); loadUsers(); loadStats(); }
    else showToast('فشل الحذف', 'error');
  } catch { showToast('تعذّر الاتصال', 'error'); }
}

let allActivity = [];

async function loadActivity() {
  const tbody = document.getElementById('activityTbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;opacity:.5">جارٍ التحميل...</td></tr>';
  try {
    const r = await fetch('/api/admin/activity?limit=200', { headers: { 'X-Api-Key': adminToken } });
    if (!r.ok) return;
    allActivity = await r.json();
    document.getElementById('activityTotalBadge').textContent = `${allActivity.length} سجل`;
    renderActivity(allActivity);
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">فشل تحميل السجلات</td></tr>';
  }
}

function renderActivity(logs) {
  const tbody = document.getElementById('activityTbody');
  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">لا توجد سجلات</td></tr>';
    return;
  }
  const typeMap = {
    'visit':            { label: '🌐 زيارة',          color: '#4488aa' },
    'login':            { label: '✅ دخول',            color: '#22c55e' },
    'login_fail':       { label: '❌ فشل دخول',        color: '#ef4444' },
    'register':         { label: '🆕 تسجيل جديد',      color: '#a855f7' },
    'admin_login':      { label: '🔑 دخول مدير',       color: '#f59e0b' },
    'admin_login_fail': { label: '🚫 فشل مدير',        color: '#dc2626' },
  };
  tbody.innerHTML = logs.map(a => {
    const t = typeMap[a.type] || { label: a.type, color: '#888' };
    const ua = a.userAgent || '—';
    const browser = ua.includes('Mobile') ? '📱 جوال'
                  : ua.includes('Chrome') ? '🌐 Chrome'
                  : ua.includes('Firefox') ? '🦊 Firefox'
                  : ua.includes('Safari') ? '🧭 Safari'
                  : ua.includes('Edge') ? '🔷 Edge' : '💻 متصفح';
    return `<tr>
      <td class="td-id">${a.id}</td>
      <td><span style="color:${t.color};font-size:.82rem;font-weight:700">${t.label}</span></td>
      <td><strong>${esc(a.username || '—')}</strong></td>
      <td style="color:#7ab8d8;font-size:.82rem">${esc(a.email || '—')}</td>
      <td style="font-size:.8rem;color:#aaa">${esc(a.ipAddress || '—')}</td>
      <td style="font-size:.8rem;color:#aaa;white-space:nowrap">${a.createdAt}</td>
      <td style="font-size:.78rem;color:#888">${browser}</td>
    </tr>`;
  }).join('');
}

function filterActivity() {
  const q    = document.getElementById('activitySearch').value.toLowerCase();
  const type = document.getElementById('activityFilter').value;
  const filtered = allActivity.filter(a =>
    (!type || a.type === type) &&
    (!q || (a.username||'').toLowerCase().includes(q) ||
           (a.ipAddress||'').includes(q) ||
           (a.type||'').includes(q) ||
           (a.email||'').toLowerCase().includes(q))
  );
  document.getElementById('activityTotalBadge').textContent = `${filtered.length} / ${allActivity.length} سجل`;
  renderActivity(filtered);
}

function closeModal() {
  document.getElementById('confirmModal').classList.add('hidden');
}
document.getElementById('confirmModal').addEventListener('click', e => {
  if (e.target === document.getElementById('confirmModal')) closeModal();
});

let toastTimer;
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}

function setMsg(msg, type) {
  const el = document.getElementById('bfMsg');
  el.textContent = msg; el.className = `form-msg ${type}`;
}
function clearMsg() {
  const el = document.getElementById('bfMsg');
  el.textContent = ''; el.className = 'form-msg';
}
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escAttr(str) {
  return String(str).replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
