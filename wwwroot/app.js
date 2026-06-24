let allBooks = [];
let pendingDeleteId = null;
let authMode = 'login';

const CARD_COLORS = [
  '#0a3d62','#1e5799','#006994','#0c6e9b','#003B5C',
  '#0077B6','#00506e','#2c5f8a','#0d5c7a','#1b4c8a',
];
const CARD_DARKS = [
  '#071f33','#0e3366','#003d4f','#063d52','#001c2e',
  '#004d80','#002535','#112b44','#052e3e','#0a1e42',
];

function getBookColor(id) { return CARD_COLORS[(id - 1) % CARD_COLORS.length]; }
function getBookDark(id)  { return CARD_DARKS[(id - 1) % CARD_DARKS.length]; }

const TRANSLATIONS = {
  ar: {
    'site-heading':       'مكتبة <span class="gradient-text">المياه</span>',
    'site-subtitle':      'اكتشف عالم المياه والبيئة والحضارة',
    'tab-login':          'تسجيل الدخول',
    'tab-register':       'إنشاء حساب',
    'lbl-email':          'البريد الإلكتروني (Gmail)',
    'ph-email':           'example@gmail.com',
    'lbl-username':       'اسم المستخدم',
    'ph-username':        'أدخل اسم المستخدم...',
    'lbl-password':       'كلمة المرور',
    'err-gmail':          'يجب استخدام بريد Gmail صالح (@gmail.com)',
    'lbl-admin-username': 'اسم مستخدم المدير',
    'lbl-admin-password': 'كلمة مرور المدير',
    'btn-guest':          '◎ تصفح كضيف',
    'btn-logout':         'خروج',
    'lbl-admin':          'مدير',
    'ph-search':          'البحث',
    'btn-search':         'بحث ذكي',
    'ai-label':           'مساعد ذكي',
    'stats-loading':      'جارٍ التحميل...',
    'btn-add':            'إضافة كتاب',
    'add-form-title':     '✦ إضافة كتاب جديد',
    'lbl-book-title':     'عنوان الكتاب',
    'ph-book-title':      'أدخل العنوان...',
    'lbl-author':         'المؤلف',
    'ph-author':          'اسم المؤلف...',
    'lbl-year':           'سنة النشر',
    'lbl-pdf':            'رابط PDF',
    'lbl-pdf-opt':        ' (اختياري)',
    'btn-save':           'حفظ الكتاب',
    'no-results-text':    'لا توجد نتائج مطابقة',
    'no-results-hint':    'جرّب كلمة أخرى',
    'footer-brand-name':  'مكتبة المياه',
    'footer-brand-tag':   'علوم المياه · البيئة · الحضارة',
    'footer-copy':        'جميع الحقوق محفوظة © 2026 — مكتبة المياه',
   
    'delete-confirm-title':'تأكيد الحذف',
    'btn-confirm-delete': 'نعم، احذف',
    'btn-cancel':         'إلغاء',
    'chatbot-name':       'مساعد مكتبة المياه',
    'chatbot-status-text':'متاح الآن',
    'ph-chatbot':         'اكتب سؤالك...',
    'pdf-click':          'اضغط لتحميل PDF',
    'no-pdf':             'لا يوجد PDF',
    'btn-delete':         '🗑 حذف',
    'auth-btn-login':     'تسجيل الدخول',
    'auth-btn-register':  'إنشاء حساب',
    'auth-btn-admin':     'دخول كمدير',
    'auth-loading':       'جارٍ التحقق...',
    'err-fill-all':       'يرجى ملء جميع الحقول',
    'err-server':         'حدث خطأ، حاول مجدداً',
    'err-connect':        'تعذّر الاتصال بالخادم',
    'err-session':        'انتهت الجلسة.',
    'err-delete':         'حدث خطأ أثناء الحذف.',
    'book-added':         '✓ تمت الإضافة بنجاح',
    'book-exists':        'هذا الكتاب موجود بالفعل.',
    'add-error':          'حدث خطأ، حاول مجدداً.',
    'server-error':       'خطأ في الاتصال بالخادم.',
    'toast-register':     'تم إنشاء حسابك بنجاح! مرحباً بك 🎉',
    'toast-login':        'تم تسجيل الدخول بنجاح، أهلاً بعودتك 👋',
    'toast-admin':        'تم تسجيل دخول المدير بنجاح',
    'chatbot-greeting':   'مرحباً! 👋 أنا مساعد مكتبة المياه. كيف يمكنني مساعدتك اليوم؟',
    'chatbot-fallback':   'عذراً، لم أفهم سؤالك تماماً 🤔 جرّب أن تسألني عن: <b>الكتب، البحث، تحميل PDF، التسجيل، أو التواصل</b>.',
    'quick-chips':        ['📚 ما هي الكتب المتاحة؟', '🔍 كيف أبحث؟', '📄 كيف أحمّل PDF؟', '💰 هل الخدمة مجانية؟', '📞 كيف أتواصل معكم؟'],
    'stats-total':        n => `${n} كتاب`,
    'stats-filtered':     (s, tot) => `${s} من ${tot} كتاب`,
    'count-books':        n => `${n} كتاب`,
    'sb-books':           'كتاباً متاحاً',
    'sb-pdfs':            'PDF مجاني',
    'sb-search':          'بحث ذكي بالعربية',
    'sb-free':            '✓ مجاني للأبد',
    'hs1-badge': 'مكتبة المياه', 'hs1-title': 'علم المياه في متناول يدك',
    'hs1-sub':   'اكتشف أفضل الكتب في علوم المياه والبيئة والحضارة الإنسانية',
    'hs2-badge': '',              'hs2-title': '30 كتاباً مجانياً في انتظارك',
    'hs2-sub':   'من تحلية المياه إلى إدارة الموارد — كل شيء مجاني بلا قيود أو رسوم',
    'hs3-badge': 'بحث ذكي',      'hs3-title': 'ابحث بطريقتك — النظام يفهمك',
    'hs3-sub':   'اكتب سؤالاً أو موضوعاً وسيجد لك النظام الكتاب المناسب تلقائياً',
    'hs-cta1': 'تصفح الكتب ←', 'hs-cta2': 'ابدأ الاستكشاف ←', 'hs-cta3': 'جرّب البحث ←',
  },
  en: {
    'site-heading':       'Water <span class="gradient-text">Library</span>',
    'site-subtitle':      'Explore water, environment & civilization',
    'tab-login':          'Sign In',
    'tab-register':       'Register',
    'lbl-email':          'Email Address (Gmail)',
    'ph-email':           'example@gmail.com',
    'lbl-username':       'Username',
    'ph-username':        'Enter username...',
    'lbl-password':       'Password',
    'err-gmail':          'Please use a valid Gmail address (@gmail.com)',
    'lbl-admin-username': 'Admin Username',
    'lbl-admin-password': 'Admin Password',
    'btn-guest':          '◎ Browse as Guest',
    'btn-logout':         'Sign Out',
    'lbl-admin':          'Admin',
    'ph-search':          'Search',
    'btn-search':         'Smart Search',
    'ai-label':           'Smart Assistant',
    'stats-loading':      'Loading...',
    'btn-add':            'Add Book',
    'add-form-title':     '✦ Add New Book',
    'lbl-book-title':     'Book Title',
    'ph-book-title':      'Enter title...',
    'lbl-author':         'Author',
    'ph-author':          'Author name...',
    'lbl-year':           'Publication Year',
    'lbl-pdf':            'PDF Link',
    'lbl-pdf-opt':        ' (optional)',
    'btn-save':           'Save Book',
    'no-results-text':    'No matching results',
    'no-results-hint':    'Try another keyword',
    'footer-brand-name':  'Water Library',
    'footer-brand-tag':   'Water Science · Environment · Civilization',
    'footer-copy':        'All rights reserved © 2026 — Water Library',
    'delete-confirm-title':'Confirm Delete',
    'btn-confirm-delete': 'Yes, Delete',
    'btn-cancel':         'Cancel',
    'chatbot-name':       'Water Library Assistant',
    'chatbot-status-text':'Online now',
    'ph-chatbot':         'Type your question...',
    'pdf-click':          'Click to download PDF',
    'no-pdf':             'No PDF',
    'btn-delete':         '🗑 Delete',
    'auth-btn-login':     'Sign In',
    'auth-btn-register':  'Create Account',
    'auth-btn-admin':     'Admin Sign In',
    'auth-loading':       'Verifying...',
    'err-fill-all':       'Please fill in all fields',
    'err-server':         'An error occurred, try again',
    'err-connect':        'Could not connect to server',
    'err-session':        'Session expired.',
    'err-delete':         'Error while deleting.',
    'book-added':         '✓ Book added successfully',
    'book-exists':        'This book already exists.',
    'add-error':          'An error occurred, please try again.',
    'server-error':       'Server connection error.',
    'toast-register':     'Account created successfully! Welcome 🎉',
    'toast-login':        'Signed in successfully, welcome back 👋',
    'toast-admin':        'Admin signed in successfully 🔑',
    'chatbot-greeting':   "Hello! 👋 I'm the Water Library assistant. How can I help you today?",
    'chatbot-fallback':   "Sorry, I didn't quite understand 🤔 Try asking me about: <b>books, search, PDF download, registration, or contact</b>.",
    'quick-chips':        ['📚 What books are available?', '🔍 How to search?', '📄 How to download PDF?', '💰 Is it free?', '📞 How to contact you?'],
    'stats-total':        n => `${n} book${n !== 1 ? 's' : ''}`,
    'stats-filtered':     (s, tot) => `${s} of ${tot} books`,
    'count-books':        n => `${n} book${n !== 1 ? 's' : ''}`,
    'sb-books':           'books available',
    'sb-pdfs':            'free PDFs',
    'sb-search':          'smart search',
    'sb-free':            '✓ free forever',
    'hs1-badge': 'Water Library', 'hs1-title': 'Water Science at Your Fingertips',
    'hs1-sub':   'Discover the best books on water science, environment & civilization',
    'hs2-badge': '',              'hs2-title': '30 Free Books Waiting for You',
    'hs2-sub':   'From desalination to water resource management — all free, no limits',
    'hs3-badge': 'Smart Search',  'hs3-title': 'Search Your Way — We Understand You',
    'hs3-sub':   'Type a question or topic and the system will find the right book for you automatically',
    'hs-cta1': 'Browse Books →', 'hs-cta2': 'Start Exploring →', 'hs-cta3': 'Try Search →',
  }
};

let currentLang = localStorage.getItem('lang') || 'ar';

function t(key, ...args) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.ar;
  const val  = dict[key] ?? TRANSLATIONS.ar[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

function applyLang() {
  const isAr = currentLang === 'ar';
  document.documentElement.lang = currentLang;
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr';

  document.getElementById('langOptAr')?.classList.toggle('active', isAr);
  document.getElementById('langOptEn')?.classList.toggle('active', !isAr);

  document.querySelectorAll('[data-i18n]').forEach(el =>
    el.textContent = t(el.dataset.i18n)
  );
  document.querySelectorAll('[data-i18n-html]').forEach(el =>
    el.innerHTML = t(el.dataset.i18nHtml)
  );
  document.querySelectorAll('[data-i18n-ph]').forEach(el =>
    el.placeholder = t(el.dataset.i18nPh)
  );

  showAuthTab(authMode);

  if (allBooks.length) {
    renderBooks(allBooks);
    updateStats(allBooks.length, allBooks.length);
    document.getElementById('headerCount').textContent = t('count-books', allBooks.length);
    updateHeroCount(allBooks.length);
  }
  const chatWin = document.getElementById('chatbotWindow');
  if (chatWin && !chatWin.classList.contains('hidden')) {
    document.getElementById('chatbotMessages').innerHTML = '';
    chatbotGreeted = true;
    addBotMsg(t('chatbot-greeting'));
    renderQuickChips();
  } else {
    chatbotGreeted = false;
  }

  localStorage.setItem('lang', currentLang);
}

function toggleLang() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  applyLang();
}

(function initWaves() {
  const canvas = document.getElementById('waveCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, t = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const isMobile = () => window.innerWidth < 768;

  const LAYERS = [
    { amp: 0.18, freq: 0.006, spd: 0.008, yRatio: 0.50, alpha: 0.22, c1: '#001830', c2: '#002a50' },
    { amp: 0.14, freq: 0.008, spd: 0.011, yRatio: 0.56, alpha: 0.28, c1: '#002244', c2: '#003366' },
    { amp: 0.11, freq: 0.010, spd: 0.014, yRatio: 0.62, alpha: 0.32, c1: '#003366', c2: '#005588' },
    { amp: 0.09, freq: 0.013, spd: 0.018, yRatio: 0.68, alpha: 0.38, c1: '#004488', c2: '#0066AA' },
    { amp: 0.07, freq: 0.016, spd: 0.022, yRatio: 0.74, alpha: 0.42, c1: '#0055AA', c2: '#0088CC' },
    { amp: 0.05, freq: 0.020, spd: 0.028, yRatio: 0.80, alpha: 0.50, c1: '#0077BB', c2: '#00AADD' },
  ];

  function drawWave(layer, tick) {
    const baseY = H * layer.yRatio;
    const amp   = H * layer.amp;
    const steps = isMobile() ? 6 : 3;

    ctx.beginPath();
    ctx.moveTo(0, H);

    for (let x = 0; x <= W; x += steps) {
      const y = baseY
        + Math.sin(x * layer.freq + tick * layer.spd)          * amp
        + Math.sin(x * layer.freq * 1.8 + tick * layer.spd * 1.4) * amp * 0.45
        + Math.sin(x * layer.freq * 0.6 + tick * layer.spd * 0.7) * amp * 0.30;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(W, H);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baseY - amp, 0, H);
    grad.addColorStop(0, layer.c2 + Math.round(layer.alpha * 255).toString(16).padStart(2,'0'));
    grad.addColorStop(1, layer.c1 + 'ff');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= W; x += steps) {
      const y = baseY
        + Math.sin(x * layer.freq + tick * layer.spd)              * amp
        + Math.sin(x * layer.freq * 1.8 + tick * layer.spd * 1.4)  * amp * 0.45
        + Math.sin(x * layer.freq * 0.6 + tick * layer.spd * 0.7)  * amp * 0.30;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(0,200,255,${layer.alpha * 0.6})`;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    LAYERS.forEach(l => drawWave(l, t));
    t += 1;
    requestAnimationFrame(draw);
  }
  draw();
}());

function getToken()     { return sessionStorage.getItem('adminToken'); }
function isAdmin()      { return !!getToken(); }
function isLoggedIn()   { return isAdmin() || !!localStorage.getItem('userToken'); }
function getUsername()  { return sessionStorage.getItem('username') || localStorage.getItem('username') || ''; }

function updateAdminUI() {
  const admin  = isAdmin();
  const user   = !admin && !!localStorage.getItem('userToken');

  document.querySelectorAll('.admin-only').forEach(el =>
    el.classList.toggle('hidden', !admin)
  );

  const guestBtns = document.getElementById('headerGuestBtns');
  const userArea  = document.getElementById('headerUserArea');
  const adminArea = document.getElementById('headerAdminArea');

  guestBtns?.classList.toggle('hidden', admin || user);
  userArea?.classList.toggle('hidden', !user);
  adminArea?.classList.toggle('hidden', !admin);

  const unEl = document.getElementById('headerUsernameDisplay');
  if (unEl && getUsername()) unEl.textContent = getUsername();
}

function showLoginOverlay(tab = 'login') {
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('chatbotWidget')?.classList.add('hidden');
  showAuthTab(tab);
  setTimeout(() => {
    if (tab === 'admin') document.getElementById('adminUsernameField')?.focus();
    else document.getElementById('authUsername')?.focus();
  }, 100);
}

function hideLoginOverlay() {
  document.getElementById('loginOverlay').classList.add('hidden');
  document.getElementById('chatbotWidget')?.classList.remove('hidden');
}

function showAuthTab(mode) {
  authMode = mode;

  document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.remove('active'));

  if (mode === 'login')    document.getElementById('tabLogin')?.classList.add('active');
  if (mode === 'register') document.getElementById('tabRegister')?.classList.add('active');
  if (mode === 'admin')    document.getElementById('tabAdmin')?.classList.add('active');

  const isAdminMode = mode === 'admin';
  document.getElementById('formUserAuth')?.classList.toggle('hidden', isAdminMode);
  document.getElementById('formAdmin')?.classList.toggle('hidden', !isAdminMode);
  document.querySelector('.auth-tabs')?.classList.toggle('hidden', isAdminMode);
  document.getElementById('fieldEmail')?.classList.toggle('hidden', mode !== 'register');
  document.getElementById('authBtnText').textContent =
    mode === 'register' ? t('auth-btn-register') : mode === 'admin' ? t('auth-btn-admin') : t('auth-btn-login');
  document.getElementById('authError').classList.add('hidden');
  document.getElementById('authError').textContent = '';
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setAuthLoading(on) {
  const btn = document.getElementById('authSubmitBtn');
  const txt = document.getElementById('authBtnText');
  if (btn) btn.disabled = on;
  if (txt && on) txt.textContent = t('auth-loading');
  else if (txt) txt.textContent =
    authMode === 'register' ? t('auth-btn-register') : authMode === 'admin' ? t('auth-btn-admin') : t('auth-btn-login');
}

async function submitAuth() {
  if (authMode === 'admin')    await doAdminLogin();
  else if (authMode === 'register') await doRegister();
  else                              await doUserLogin();
}

async function doRegister() {
  const email    = document.getElementById('authEmail').value.trim().toLowerCase();
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value;

  if (!email || !username || !password) { showAuthError(t('err-fill-all')); return; }
  if (!email.includes('@') || !email.endsWith('@gmail.com')) {
    showAuthError(t('err-gmail')); return;
  }

  setAuthLoading(true);
  try {
    const res  = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('username', data.username);
      hideLoginOverlay();
      updateAdminUI();
      showToast(t('toast-register'), '✓');
    } else {
      showAuthError(data.error || t('err-server'));
    }
  } catch { showAuthError(t('err-connect')); }
  finally  { setAuthLoading(false); }
}

async function doUserLogin() {
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value;
  if (!username || !password) { showAuthError(t('err-fill-all')); return; }
  setAuthLoading(true);
  try {
    const res  = await fetch('/api/auth/user-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('username', data.username);
      hideLoginOverlay();
      updateAdminUI();
      showToast(t('toast-login'), '✓');
    } else if (res.status === 401) {
      showAuthError(t('err-server'));
    } else {
      showAuthError(data.error || t('err-server'));
    }
  } catch { showAuthError(t('err-connect')); }
  finally  { setAuthLoading(false); }
}

async function doAdminLogin() {
  const username = document.getElementById('adminUsernameField').value.trim();
  const password = document.getElementById('adminPasswordField').value;
  if (!username || !password) { showAuthError(t('err-fill-all')); return; }
  setAuthLoading(true);
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      const data = await res.json();
      sessionStorage.setItem('adminToken', data.token);
      sessionStorage.setItem('username', data.username || 'عمر');
      const nameEl = document.getElementById('adminNameDisplay');
      if (nameEl) nameEl.textContent = data.username || 'عمر';
      hideLoginOverlay();
      updateAdminUI();
      window.location.href = '/admin-panel.html';
    } else if (res.status === 401) {
      showAuthError(t('err-server'));
    } else {
      showAuthError(t('err-server'));
    }
  } catch { showAuthError(t('err-connect')); }
  finally  { setAuthLoading(false); }
}

function browseAsGuest() { hideLoginOverlay(); }

function logout() {
  sessionStorage.removeItem('adminToken');
  sessionStorage.removeItem('username');
  localStorage.removeItem('userToken');
  localStorage.removeItem('username');
  updateAdminUI();
  document.getElementById('addForm').classList.add('hidden');
  renderBooks(allBooks);
  showLoginOverlay('login');
}

let heroIndex = 0;
let heroTimer = null;
const HERO_DURATION = 10000;

function goSlide(idx) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;
  slides[heroIndex].classList.remove('active');
  dots[heroIndex].classList.remove('active');
  heroIndex = ((idx % slides.length) + slides.length) % slides.length;
  slides[heroIndex].classList.add('active');
  dots[heroIndex].classList.add('active');
  startHeroProgress();
}

function startHeroProgress() {
  const bar = document.getElementById('heroProgressBar');
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = `width ${HERO_DURATION}ms linear`;
    bar.style.width = '100%';
  }));
}

function startHeroSlider() {
  if (!document.querySelector('.hero-slide')) return;
  startHeroProgress();
  heroTimer = setInterval(() => goSlide(heroIndex + 1), HERO_DURATION);

  const heroEl = document.querySelector('.hero-slider') || document.querySelector('.hero-section');
  if (!heroEl) return;
  let touchStartX = 0;
  heroEl.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  heroEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 40) return;
    clearInterval(heroTimer);
    goSlide(dx < 0 ? heroIndex + 1 : heroIndex - 1);
    heroTimer = setInterval(() => goSlide(heroIndex + 1), HERO_DURATION);
  }, { passive: true });
}

function updateHeroCount(count) {
  const el = document.getElementById('heroSlide2Title');
  if (!el) return;
  el.textContent = currentLang === 'en'
    ? `${count} Free Books Waiting for You`
    : `${count} كتاباً مجانياً في انتظارك`;
}

function scrollToBooks() {
  document.getElementById('booksGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function focusSearch() {
  document.getElementById('searchInput')?.focus();
  document.getElementById('searchInput')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function runCountUp() {
  document.querySelectorAll('.sb-num[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const duration = 1200;
    const step = Math.ceil(duration / target);
    let current = 0;
    el.textContent = '0';
    const timer = setInterval(() => {
      current++;
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, step);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  const adminURL = new URLSearchParams(window.location.search).has('admin');
  if (adminURL) {
    localStorage.removeItem('userToken');
    localStorage.removeItem('username');
    sessionStorage.removeItem('username');
    showLoginOverlay('admin');
  } else if (!isLoggedIn()) {
    showLoginOverlay('login');
  } else {
    document.getElementById('chatbotWidget')?.classList.remove('hidden');
  }
  updateAdminUI();
  loadAllBooks();
  setTimeout(runCountUp, 400);
  startHeroSlider();

  const input = document.getElementById('searchInput');
  let debounce;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    if (!input.value.trim()) { hidePredictions(); return; }
    debounce = setTimeout(() => fetchPredictions(input.value), 300);
  });
});

async function loadAllBooks() {
  renderSkeletons();
  try {
    const res = await fetch('/api/books');
    if (!res.ok) throw new Error('server error');
    allBooks = await res.json();
    if (!Array.isArray(allBooks)) throw new Error('bad response');
    renderBooks(allBooks);
    updateStats(allBooks.length, allBooks.length);
    document.getElementById('headerCount').textContent = t('count-books', allBooks.length);
    updateHeroCount(allBooks.length);
  } catch {
    document.getElementById('statsText').textContent = 'خطأ في تحميل البيانات';
    document.getElementById('booksGrid').innerHTML =
      '<p style="color:#D62839;padding:20px">تعذّر الاتصال بالخادم.</p>';
  }
}

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  hidePredictions();
  if (!q) {
    document.getElementById('aiBox').classList.add('hidden');
    renderBooks(allBooks); updateStats(allBooks.length, allBooks.length); return;
  }
  await smartSearch(q);
}

async function smartSearch(q) {
  renderSkeletons();
  try {
    const res = await fetch(`/api/books/smart-search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    document.getElementById('aiText').textContent = data.aiResponse;
    document.getElementById('aiBox').classList.remove('hidden');
    renderBooks(data.books);
    updateStats(data.books.length, allBooks.length);
    if (data.predictions?.length) renderPredictions(data.predictions);
  } catch { showError(); }
}

async function fetchPredictions(q) {
  try {
    const res = await fetch(`/api/books/smart-search?q=${encodeURIComponent(q)}`);
    if (!res.ok) { hidePredictions(); return; }
    const data = await res.json();
    data.predictions?.length ? renderPredictions(data.predictions) : hidePredictions();
  } catch { hidePredictions(); }
}

function renderPredictions(preds) {
  const box = document.getElementById('predictions');
  box.innerHTML = preds.map(p =>
    `<span class="pred-chip" onclick="usePrediction(this)" data-val="${escAttr(p)}">${escHtml(p)}</span>`
  ).join('');
  box.classList.remove('hidden');
}

function usePrediction(el) {
  const val = el.dataset.val;
  document.getElementById('searchInput').value = val;
  hidePredictions();

  const exactMatch = allBooks.filter(b => b.title === val);
  if (exactMatch.length === 1) {
    document.getElementById('aiBox').classList.add('hidden');
    renderBooks(exactMatch);
    updateStats(1, allBooks.length);
    return;
  }

  doSearch();
}

function hidePredictions() {
  document.getElementById('predictions').classList.add('hidden');
}

const BOOK_EN = {
  "الماء والغذاء: مستقبل البشرية":          { t: "Water & Food: The Future of Humanity",         a: "Dr. Salim Ahmad" },
  "البحار والمحيطات: عجائب أسرار الأعماق":  { t: "Seas & Oceans: Wonders of the Deep",           a: "Omar Al-Faruq" },
  "تحلية المياه: تقنيات المستقبل":           { t: "Water Desalination: Future Technologies",      a: "Eng. Khalid Al-Mansour" },
  "أسرار جزيء الماء: المعجزة الحيوية":       { t: "Secrets of the Water Molecule",                a: "Dr. Kamal Al-Rashidi" },
  "تاريخ المياه: كيف شكلت الحضارة":          { t: "Water History: How It Shaped Civilization",   a: "Dr. Sultan Al-Mansouri" },
  "حروب المياه: الصراع القادم":              { t: "Water Wars: The Coming Conflict",              a: "Dr. Mohammed Al-Omari" },
  "ترشيد استهلاك المياه: دليل عملي":         { t: "Water Conservation: A Practical Guide",       a: "Saudi Water Society" },
  "دورة المياه في الطبيعة":                  { t: "The Water Cycle in Nature",                   a: "Dr. Nadia Hassan" },
  "المياه الجوفية: الكنوز المخفية":           { t: "Groundwater: Hidden Treasures",               a: "Eng. Faisal Al-Otaibi" },
  "تلوث المياه وطرق معالجتها":               { t: "Water Pollution and Treatment Methods",       a: "Dr. Ahmad Khalil" },
  "أنهار العالم: شريان الحياة":               { t: "Rivers of the World: The Artery of Life",     a: "Dr. Jamal Al-Rashidi" },
  "إدارة الموارد المائية المستدامة":           { t: "Sustainable Water Resource Management",       a: "Water & Environment Authority" },
  "الماء في القرآن والسنة":                   { t: "Water in the Quran and Sunnah",               a: "Dr. Suleiman Al-Najjar" },
  "المياه الإقليمية والقانون الدولي":          { t: "Territorial Waters and International Law",    a: "Dr. Tariq Al-Ghamdi" },
  "الجليد والمناخ العالمي":                   { t: "Ice and Global Climate",                      a: "Dr. Layla Abdul Hamid" },
  "الكائنات المائية وسلاسل الغذاء":           { t: "Aquatic Organisms and Food Chains",           a: "Dr. Fawzi Al-Shammari" },
  "تكنولوجيا معالجة مياه الصرف":             { t: "Wastewater Treatment Technology",             a: "Eng. Yasser Al-Qahtani" },
  "الحصاد المائي والأمن الغذائي":             { t: "Water Harvesting and Food Security",          a: "Dr. Samira Ibrahim" },
  "الفيضانات وتدابير الحماية":                { t: "Floods and Protection Measures",              a: "General Authority of Meteorology" },
  "الجفاف والتصحر: دليل المواجهة":            { t: "Drought & Desertification: A Combat Guide",   a: "Dr. Mustafa Al-Shahri" },
  "المحيطات والتغير المناخي":                  { t: "Oceans and Climate Change",                   a: "Kuwait Institute for Scientific Research" },
  "اقتصاديات المياه وسعر اللتر":              { t: "Water Economics and the Price per Liter",     a: "Dr. Rania Youssef" },
  "الماء والصحة: دليل الترطيب المثالي":       { t: "Water & Health: The Ultimate Hydration Guide",a: "Dr. Sara Fahd" },
  "الحياة المائية في البحيرات العذبة":         { t: "Aquatic Life in Freshwater Lakes",            a: "Dr. Amjad Hilal" },
  "نظام الري الذكي في الزراعة":               { t: "Smart Irrigation Systems in Agriculture",     a: "Eng. Ali Al-Zahrani" },
  "الهندسة المائية: السدود والجسور":           { t: "Hydraulic Engineering: Dams and Bridges",     a: "Dr. Hassan Al-Rifai" },
  "الماء والطاقة: الترابط الحيوي":             { t: "Water and Energy: The Vital Link",            a: "Eng. Saeed Al-Ajlan" },
  "عجائب المخلوقات المائية في الأعماق":        { t: "Wonders of Deep Aquatic Creatures",           a: "Dr. Zakaria Dahim" },
  "الأمطار والحياة الفطرية":                   { t: "Rain and Wildlife",                           a: "Dr. Mona Al-Harbi" },
  "رطوبة الجو والغيوم":                       { t: "Atmospheric Humidity and Clouds",             a: "Dr. Mansour Ubaid" },
};

let _bkCvr = {};
try { _bkCvr = JSON.parse(localStorage.getItem('_bkCvr') || '{}'); } catch {}

async function fetchCoverUrl(id, title) {
  if (_bkCvr[id] !== undefined) return _bkCvr[id] || null;
  const search = async (lang) => {
    const q = encodeURIComponent(title);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1${lang ? '&langRestrict=' + lang : ''}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    return d.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || null;
  };
  try {
    let thumb = await search('ar');
    if (!thumb) thumb = await search('');
    const url = thumb
      ? thumb.replace('http://', 'https://').replace('&edge=curl', '').replace('zoom=1', 'zoom=2')
      : '';
    _bkCvr[id] = url;
    localStorage.setItem('_bkCvr', JSON.stringify(_bkCvr));
    return url || null;
  } catch { return null; }
}

function loadBookCovers() {
  document.querySelectorAll('.book-cover[data-bid]').forEach(async el => {
    const id    = el.dataset.bid;
    const title = el.dataset.title;
    const url   = await fetchCoverUrl(id, title);
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      el.style.backgroundImage    = `url('${url}')`;
      el.style.backgroundSize     = 'cover';
      el.style.backgroundPosition = 'center top';
      el.classList.add('has-cover');
    };
    img.src = url;
  });
}

function renderBooks(books) {
  const grid  = document.getElementById('booksGrid');
  const noRes = document.getElementById('noResults');
  if (!books || !books.length) {
    grid.innerHTML = ''; noRes.classList.remove('hidden'); return;
  }
  noRes.classList.add('hidden');
  const admin = isAdmin();

  grid.innerHTML = books.map((b, i) => {
    const c1 = getBookColor(b.id);
    const c2 = getBookDark(b.id);
    const en  = BOOK_EN[b.title];
    const displayTitle  = (currentLang === 'en' && en) ? en.t : b.title;
    const displayAuthor = (currentLang === 'en' && en) ? en.a : b.author;
    const cardDir = currentLang === 'en' ? 'ltr' : 'rtl';
    return `
    <div class="book-card ${b.pdfUrl ? 'has-pdf' : ''}"
         data-pdf="${b.pdfUrl ? escAttr(b.pdfUrl) : ''}"
         style="animation-delay:${i * 40}ms">
      <div class="book-cover" data-bid="${b.id}" data-title="${escAttr(b.title)}"
           style="background:linear-gradient(145deg,${c1} 0%,${c2} 100%)">
        <div class="cover-deco"></div>
        <div class="cover-content">
          <div class="cover-title-text" dir="${cardDir}">${escHtml(displayTitle)}</div>
          <div class="cover-sep"></div>
          <div class="cover-author-text" dir="${cardDir}">${escHtml(displayAuthor)}</div>
        </div>
        <span class="book-id">#${b.id}</span>
        <div class="cover-stripe"></div>
      </div>
      <div class="book-body">
        <div class="book-title" dir="${cardDir}">${escHtml(displayTitle)}</div>
        <div class="book-author" dir="${cardDir}">✦ ${escHtml(displayAuthor)}</div>
        <div class="book-year">🗓 <span class="year-badge">${b.year}</span></div>
        <div class="card-actions">
          ${b.pdfUrl
            ? `<div class="pdf-indicator">📄 ${t('pdf-click')}</div>`
            : `<div class="no-pdf-indicator">${t('no-pdf')}</div>`}
          ${admin ? `<button class="btn-delete"
            onclick="event.stopPropagation(); openDeleteModal(${b.id}, ${JSON.stringify(b.title)})">
            ${t('btn-delete')}
          </button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.book-card.has-pdf').forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.btn-delete')) return;
      const url = this.dataset.pdf;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
  });

  loadBookCovers();
}

function renderSkeletons() {
  document.getElementById('noResults').classList.add('hidden');
  document.getElementById('booksGrid').innerHTML = Array.from({ length: 9 }, () => `
    <div class="book-card">
      <div class="book-cover" style="background:#e2eef5"></div>
      <div class="book-body">
        <div class="skeleton" style="height:14px;width:35%;margin-bottom:10px"></div>
        <div class="skeleton" style="height:20px;width:92%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:14px;width:55%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:13px;width:30%"></div>
      </div>
    </div>
  `).join('');
}

function updateStats(shown, total) {
  const el = document.getElementById('statsText');
  el.textContent = shown === total ? t('stats-total', total) : t('stats-filtered', shown, total);
}

function toggleAddForm() {
  document.getElementById('addForm').classList.toggle('hidden');
}

async function addBook() {
  const token  = getToken();
  if (!token) return;
  const title  = document.getElementById('newTitle').value.trim();
  const author = document.getElementById('newAuthor').value.trim();
  const year   = parseInt(document.getElementById('newYear').value) || 0;
  const pdfUrl = document.getElementById('newPdfUrl').value.trim() || null;
  const msg    = document.getElementById('addMsg');
  msg.className = 'form-msg';

  if (!title || !author) {
    msg.className = 'form-msg error'; msg.textContent = 'العنوان والمؤلف مطلوبان.'; return;
  }

  try {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': token },
      body: JSON.stringify({ title, author, year, pdfUrl })
    });
    if (res.status === 201) {
      msg.className = 'form-msg success'; msg.textContent = t('book-added');
      ['newTitle','newAuthor','newYear','newPdfUrl'].forEach(id => document.getElementById(id).value = '');
      await loadAllBooks();
    } else if (res.status === 409) {
      msg.className = 'form-msg error'; msg.textContent = t('book-exists');
    } else if (res.status === 401) {
      msg.className = 'form-msg error'; msg.textContent = t('err-session');
      logout();
    } else {
      msg.className = 'form-msg error'; msg.textContent = t('add-error');
    }
  } catch {
    msg.className = 'form-msg error'; msg.textContent = t('err-connect');
  }
}

function openDeleteModal(id, title) {
  pendingDeleteId = id;
  document.getElementById('deleteBookTitle').textContent = `«${title}»`;
  document.getElementById('deleteMsg').textContent = '';
  document.getElementById('deleteMsg').className = 'form-msg';
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  pendingDeleteId = null;
}

let deleteInFlight = false;
async function confirmDelete() {
  if (deleteInFlight) return;
  const token = getToken();
  if (!token) return;
  const msg = document.getElementById('deleteMsg');
  msg.className = 'form-msg';
  deleteInFlight = true;
  try {
    const res = await fetch(`/api/books/${pendingDeleteId}`, {
      method: 'DELETE', headers: { 'X-Api-Key': token }
    });
    if (res.ok) {
      closeModal(); await loadAllBooks();
    } else if (res.status === 401) {
      msg.className = 'form-msg error'; msg.textContent = t('err-session');
      logout(); closeModal();
    } else {
      msg.className = 'form-msg error'; msg.textContent = t('err-delete');
    }
  } catch {
    msg.className = 'form-msg error'; msg.textContent = t('err-connect');
  } finally {
    deleteInFlight = false;
  }
}

function showToast(msg, icon = '✓') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast-notif';
  el.innerHTML = `<div class="toast-icon">${icon}</div><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 3500);
}

let chatbotOpen = false;
let chatbotGreeted = false;

const CHAT_RULES = [
  { kw: ['مرحبا','مرحباً','أهلا','أهلاً','هلو','هاي','السلام','صباح','مساء','ايش اخبارك','كيف حالك','شلونك'],
    reply: 'أهلاً وسهلاً! 😊 أنا بخير والحمد لله. كيف يمكنني مساعدتك اليوم؟' },
  { kw: ['كم كتاب','عدد الكتب','كم عدد','كتب متاحة','ما هي الكتب','الكتب الموجودة','اعطني قائمة'],
    reply: () => `تحتوي مكتبتنا على <b>${allBooks.length} كتاباً</b> 📚 تشمل:<br>• علوم المياه والبيئة<br>• تحلية المياه وتقنياتها<br>• تاريخ المياه والحضارات<br>• إدارة الموارد المائية<br>• الكائنات المائية<br>استخدم البحث الذكي للعثور على ما يناسبك.` },
  { kw: ['كتاب','كتب'],
    reply: () => `لدينا <b>${allBooks.length} كتاباً</b> 📚 في مجالات المياه المختلفة. اضغط على أي كتاب لرؤية تفاصيله، أو استخدم البحث الذكي للبحث باسم محدد.` },
  { kw: ['كيف ابحث','طريقة البحث','البحث الذكي','ابحث','بحث'],
    reply: 'البحث سهل جداً! 🔍<br>١. اكتب في خانة البحث الذكي ✦<br>٢. يمكنك الكتابة بأي شكل: عنوان، موضوع، أو حتى سؤال<br>٣. النظام يفهم العربية ويقترح الكتب المناسبة تلقائياً.' },
  { kw: ['pdf','تحميل pdf','تنزيل','حمل الكتاب','قراءة الكتاب','ملف'],
    reply: 'لتحميل PDF 📄:<br>١. ابحث عن الكتاب المطلوب<br>٢. اضغط على بطاقة الكتاب<br>٣. إذا كان به PDF ستجد زر <b>"تحميل PDF"</b><br>ملاحظة: ليس جميع الكتب متاحة بـ PDF حالياً.' },
  { kw: ['انشئ حساب','انشاء حساب','حساب جديد','تسجيل جديد','اشتراك','كيف اسجل','كيف أسجل'],
    reply: 'إنشاء حساب سريع وسهل! 👤<br>١. اضغط <b>"إنشاء حساب"</b> في الشريط العلوي<br>٢. أدخل بريد Gmail الخاص بك (@gmail.com)<br>٣. أدخل اسم المستخدم (3 أحرف أو أكثر)<br>٤. أدخل كلمة مرور (6 أحرف أو أكثر)<br>٥. ستصلك رسالة ترحيب على بريدك الإلكتروني ✉️<br>الخدمة مجانية تماماً ✅' },
  { kw: ['تسجيل الدخول','دخول','لوقن','لوجن','نسيت كلمة المرور'],
    reply: 'لتسجيل الدخول 🔑:<br>١. اضغط <b>"تسجيل الدخول"</b> في الشريط العلوي<br>٢. أدخل اسم المستخدم وكلمة المرور<br>٣. يمكنك أيضاً التصفح <b>كضيف</b> بدون حساب.' },
  { kw: ['ضيف','بدون حساب','بدون تسجيل','مشاهدة بدون'],
    reply: 'نعم يمكنك التصفح كضيف! 👀<br>اضغط <b>"تصفح كضيف"</b> وستتمكن من رؤية جميع الكتب وتحميل PDF بدون تسجيل.' },
  { kw: ['تحلية','تنقية','معالجة مياه','محطة تحلية'],
    reply: 'لدينا عدة كتب في تحلية المياه 🔬 منها:<br>• <b>تحلية المياه: تقنيات المستقبل</b><br>• <b>تكنولوجيا معالجة مياه الصرف</b><br>ابحث بكلمة "تحلية" للعثور عليها.' },
  { kw: ['مياه جوفية','آبار','مياه تحت الأرض'],
    reply: 'لدينا كتاب مميز عن المياه الجوفية 💧<br><b>"المياه الجوفية: الكنوز المخفية"</b> — ابحث عنه في المكتبة!' },
  { kw: ['جفاف','تصحر','مناخ'],
    reply: 'موضوع مهم جداً 🌍 لدينا كتب عن:<br>• <b>الجفاف والتصحر: دليل المواجهة</b><br>• <b>الجليد والمناخ العالمي</b><br>• <b>المحيطات والتغير المناخي</b>' },
  { kw: ['فيضان','سيول','أمطار'],
    reply: 'لدينا كتب مفيدة عن الفيضانات والأمطار 🌧️:<br>• <b>الفيضانات وتدابير الحماية</b><br>• <b>الأمطار والحياة الفطرية</b><br>• <b>الحصاد المائي والأمن الغذائي</b>' },
  { kw: ['مياه','ماء','بيئة','علوم'],
    reply: 'مكتبة المياه متخصصة في علوم المياه 💧 تشمل:<br>• إدارة الموارد المائية<br>• تحلية المياه<br>• تاريخ المياه والحضارات<br>• البيئة المائية والكائنات الحية<br>• الاقتصاد المائي والقانون الدولي' },
  { kw: ['تاريخ','حضارة','قديم','إسلام','قرآن'],
    reply: 'لدينا كتب تاريخية رائعة 🏛️ منها:<br>• <b>تاريخ المياه: كيف شكّلت الحضارة</b><br>• <b>الماء في القرآن والسنة</b><br>• <b>المياه الإقليمية والقانون الدولي</b>' },
  { kw: ['مجاني','مجانا','مجانية','رسوم','سعر','تكلفة','بكم'],
    reply: 'نعم! ✅ الخدمة مجانية 100%<br>• التسجيل مجاني<br>• تحميل الكتب مجاني<br>• لا بطاقة ائتمان ولا أي رسوم.' },
  { kw: ['واتساب','تواصل','اتصال','ايميل','بريد','اتصل'],
    reply: 'يسعدنا التواصل معك! 📞<br>• البريد الإلكتروني: <b>omar5567j@gmail.com</b><br>• يمكنك مراسلتنا في أي وقت وسنرد عليك.' },
  { kw: ['شكرا','شكراً','شكر','ممنون','عاشت','يعطيك العافية','مشكور'],
    reply: 'العفو! 😊 يسعدنا مساعدتك دائماً. هل تحتاج إلى أي شيء آخر؟' },
  { kw: ['باي','مع السلامة','وداع','الله معك','الى اللقاء'],
    reply: 'مع السلامة! 👋 نتمنى لك قراءة ممتعة في مكتبة المياه 💧 عود إلينا في أي وقت.' },
  { kw: ['من انت','ما انت','عرّفني','عرفني عليك'],
    reply: 'أنا <b>مساعد مكتبة المياه</b> 🤖💧<br>مساعد ذكي يساعدك في:<br>• البحث عن الكتب<br>• الإجابة على أسئلتك<br>• إرشادك في استخدام المكتبة' },
  { kw: ['موقع','رابط','url','لينك'],
    reply: 'رابط الموقع هو: 🌐<br><b>book-app-production-41c6.up.railway.app</b><br>يمكنك حفظه والعودة إليه في أي وقت.' },
];

const CHAT_RULES_EN = [
  { kw: ['hello','hi','hey','good morning','good evening','how are you','sup'],
    reply: "Hello! 😊 I'm doing great, thanks! How can I help you today?" },
  { kw: ['how many books','list books','what books','all books','books available','show me books'],
    reply: () => `Our library has <b>${allBooks.length} books</b> 📚 covering:<br>• Water science & environment<br>• Desalination technology<br>• Water history & civilizations<br>• Water resource management<br>• Aquatic life & ecosystems<br>Use Smart Search to find what you need!` },
  { kw: ['book','books'],
    reply: () => `We have <b>${allBooks.length} books</b> 📚 on water-related topics. Click any book card to see details, or use Smart Search to find a specific title.` },
  { kw: ['how to search','search','find','look for','smart search'],
    reply: 'Searching is easy! 🔍<br>1. Type in the Smart Search ✦ box<br>2. Write a title, topic, or even a question<br>3. Our AI suggests the most relevant books automatically.' },
  { kw: ['pdf','download','read book','get book','file'],
    reply: 'To download a PDF 📄:<br>1. Find the book you want<br>2. Click on the book card<br>3. If a PDF is available, you will see a <b>"Download PDF"</b> button<br>Note: Not all books have PDFs currently.' },
  { kw: ['create account','sign up','register','new account','join'],
    reply: 'Creating an account is quick and free! 👤<br>1. Click <b>"Register"</b> in the top bar<br>2. Enter your Gmail address (@gmail.com)<br>3. Enter a username (3+ characters)<br>4. Enter a password (6+ characters)<br>5. A welcome email will be sent to your inbox ✉️<br>100% free — no credit card ✅' },
  { kw: ['login','sign in','log in','forgot password'],
    reply: 'To sign in 🔑:<br>1. Click <b>"Sign In"</b> in the top bar<br>2. Enter your username and password<br>3. You can also browse as a <b>Guest</b> without an account.' },
  { kw: ['guest','without account','no account','browse without'],
    reply: 'Yes, guest browsing is available! 👀<br>Click <b>"Browse as Guest"</b> and you can view all books and download PDFs without registering.' },
  { kw: ['desalination','purification','water treatment','plant'],
    reply: 'We have specialized books on water treatment 🔬 including:<br>• <b>Water Desalination: Technologies of the Future</b><br>• <b>Wastewater Treatment Technology</b><br>Search "desalination" to find them.' },
  { kw: ['groundwater','wells','underground water','aquifer'],
    reply: 'Great topic! We have a dedicated book 💧<br><b>"Groundwater: Hidden Treasures"</b> — search for it in the library!' },
  { kw: ['drought','desertification','climate','climate change'],
    reply: 'Important topic 🌍 We have books on:<br>• <b>Drought and Desertification: A Guide to Confrontation</b><br>• <b>Ice and Global Climate</b><br>• <b>Oceans and Climate Change</b>' },
  { kw: ['flood','rain','rainfall','storm'],
    reply: 'We have relevant books 🌧️:<br>• <b>Floods and Protection Measures</b><br>• <b>Rain and Wildlife</b><br>• <b>Water Harvesting and Food Security</b>' },
  { kw: ['water','ocean','sea','environment','science'],
    reply: 'Water Library is specialized in water sciences 💧 covering:<br>• Water resource management<br>• Desalination technology<br>• Water history & civilizations<br>• Aquatic ecosystems<br>• Water economics & international law' },
  { kw: ['history','civilization','ancient','islam','quran'],
    reply: 'We have great historical books 🏛️ including:<br>• <b>History of Water: How It Shaped Civilization</b><br>• <b>Water in the Quran and Sunnah</b><br>• <b>Territorial Waters and International Law</b>' },
  { kw: ['free','cost','price','charge','pay','subscription'],
    reply: 'Completely free! ✅<br>• Registration is free<br>• Book downloads are free<br>• No credit card, no fees — ever.' },
  { kw: ['contact','email','phone','reach','support'],
    reply: 'We would love to hear from you! 📞<br>• Email: <b>omar5567j@gmail.com</b><br>• Send us a message anytime and we will get back to you.' },
  { kw: ['thank','thanks','appreciate','great job'],
    reply: "You're welcome! 😊 Happy to help anytime. Is there anything else you need?" },
  { kw: ['bye','goodbye','see you','later','cya'],
    reply: 'Goodbye! 👋 Happy reading at the Water Library 💧 Come back anytime!' },
  { kw: ['who are you','what are you','about you','introduce'],
    reply: 'I am the <b>Water Library Assistant</b> 🤖💧<br>A smart assistant that helps you:<br>• Find the right books<br>• Answer your questions<br>• Guide you through the library' },
  { kw: ['website','link','url','site'],
    reply: 'The website URL is: 🌐<br><b>book-app-production-41c6.up.railway.app</b><br>Bookmark it and come back anytime!' },
];

function toggleChatbot() {
  chatbotOpen = !chatbotOpen;
  const win = document.getElementById('chatbotWindow');
  const iconOpen  = document.getElementById('chatbotIconOpen');
  const iconClose = document.getElementById('chatbotIconClose');
  if (chatbotOpen) {
    win.classList.remove('hidden');
    win.classList.add('opening');
    iconOpen.style.display  = 'none';
    iconClose.style.display = 'block';
    document.getElementById('chatbotNotif').classList.remove('show');
    if (!chatbotGreeted) {
      chatbotGreeted = true;
      setTimeout(() => {
        addBotMsg(t('chatbot-greeting'));
        renderQuickChips();
      }, 250);
    }
    setTimeout(() => document.getElementById('chatbotInput')?.focus(), 350);
  } else {
    win.classList.add('hidden');
    win.classList.remove('opening');
    iconOpen.style.display  = 'block';
    iconClose.style.display = 'none';
    document.getElementById('chatbotMessages').innerHTML = '';
    chatbotGreeted = false;
  }
}

function addBotMsg(html) {
  const box = document.getElementById('chatbotMessages');
  const el = document.createElement('div');
  el.className = 'chat-msg bot';
  el.innerHTML = `<div class="chat-bubble-msg">${html}</div>`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function addUserMsg(text) {
  const box = document.getElementById('chatbotMessages');
  const el = document.createElement('div');
  el.className = 'chat-msg user';
  el.innerHTML = `<div class="chat-bubble-msg">${escHtml(text)}</div>`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  removeQuickChips();
}

function showTyping() {
  const box = document.getElementById('chatbotMessages');
  const el = document.createElement('div');
  el.className = 'chat-msg bot'; el.id = 'chatTyping';
  el.innerHTML = '<div class="chat-bubble-msg chat-typing"><span></span><span></span><span></span></div>';
  box.appendChild(el); box.scrollTop = box.scrollHeight;
}
function hideTyping() {
  document.getElementById('chatTyping')?.remove();
}

function renderQuickChips() {
  removeQuickChips();
  const box = document.getElementById('chatbotMessages');
  const wrap = document.createElement('div');
  wrap.className = 'chatbot-quick-btns'; wrap.id = 'quickChips';
  t('quick-chips').forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'chatbot-quick-btn'; btn.textContent = q;
    btn.onclick = () => {
      document.getElementById('chatbotInput').value = q;
      sendChat();
    };
    wrap.appendChild(btn);
  });
  box.appendChild(wrap); box.scrollTop = box.scrollHeight;
}
function removeQuickChips() { document.getElementById('quickChips')?.remove(); }

function sendChat() {
  const input = document.getElementById('chatbotInput');
  const text = input.value.trim(); if (!text) return;
  input.value = '';
  addUserMsg(text);
  showTyping();
  setTimeout(() => {
    hideTyping();
    const lower = text.toLowerCase();
    const rules = currentLang === 'en' ? CHAT_RULES_EN : CHAT_RULES;
    let reply = null;
    for (const rule of rules) {
      if (rule.kw.some(k => lower.includes(k))) {
        reply = typeof rule.reply === 'function' ? rule.reply() : rule.reply;
        break;
      }
    }
    if (!reply) {
      reply = t('chatbot-fallback');
    }
    addBotMsg(reply);
    renderQuickChips();
  }, 700 + Math.random() * 400);
}

function openAdminPanel() {
  document.getElementById('adminPanel').classList.remove('hidden');
  switchApTab('stats');
  const name = sessionStorage.getItem('username') || 'omar';
  document.getElementById('apAdminName').textContent = name;
}

function closeAdminPanel() {
  document.getElementById('adminPanel').classList.add('hidden');
}

function switchApTab(tab) {
  ['stats','books','users'].forEach(t => {
    document.getElementById(`apTab${t.charAt(0).toUpperCase()+t.slice(1)}`).classList.toggle('active', t === tab);
    document.getElementById(`apContent${t.charAt(0).toUpperCase()+t.slice(1)}`).classList.toggle('hidden', t !== tab);
  });
  if (tab === 'stats')  apLoadStats();
  if (tab === 'books')  apLoadBooks();
  if (tab === 'users')  apLoadUsers();
}

async function apLoadStats() {
  const token = getToken(); if (!token) return;
  try {
    const r = await fetch('/api/admin/stats', { headers: { 'X-Api-Key': token } });
    if (!r.ok) return;
    const d = await r.json();
    document.getElementById('statBooks').textContent = d.books;
    document.getElementById('statUsers').textContent = d.users;
    document.getElementById('statPdfs').textContent  = d.pdfs;
  } catch {}
}

async function apLoadBooks() {
  const token = getToken(); if (!token) return;
  try {
    const r = await fetch('/api/books');
    const books = await r.json();
    document.getElementById('apBooksCount').textContent = books.length;
    const tbody = document.getElementById('apBooksBody');
    tbody.innerHTML = books.map(b => `
      <tr>
        <td class="ap-td-id">#${b.id}</td>
        <td class="ap-td-title" dir="rtl">${escHtml(b.title)}</td>
        <td class="ap-td-author" dir="rtl">${escHtml(b.author)}</td>
        <td>${b.year}</td>
        <td>${b.pdfUrl ? '<span class="ap-pdf-yes">✓</span>' : '<span class="ap-pdf-no">—</span>'}</td>
        <td><button class="ap-btn-del" onclick="apDeleteBook(${b.id}, this)">🗑</button></td>
      </tr>`).join('');
  } catch {}
}

async function apLoadUsers() {
  const token = getToken(); if (!token) return;
  try {
    const r = await fetch('/api/admin/users', { headers: { 'X-Api-Key': token } });
    if (!r.ok) return;
    const users = await r.json();
    document.getElementById('apUsersCount').textContent = users.length;
    const tbody = document.getElementById('apUsersBody');
    tbody.innerHTML = users.length
      ? users.map(u => `
          <tr>
            <td class="ap-td-id">${u.id}</td>
            <td><strong>${escHtml(u.username)}</strong></td>
            <td class="ap-td-email" style="color:#7ab8d8;font-size:.84rem">${escHtml(u.email || '—')}</td>
            <td><button class="ap-btn-del" onclick="apDeleteUser(${u.id}, '${escAttr(u.username)}', this)">🗑 حذف</button></td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;padding:20px;opacity:.6">لا يوجد مستخدمون مسجّلون</td></tr>';
  } catch {}
}

async function apAddBook() {
  const token = getToken(); if (!token) return;
  const title  = document.getElementById('apNewTitle').value.trim();
  const author = document.getElementById('apNewAuthor').value.trim();
  const year   = parseInt(document.getElementById('apNewYear').value) || 0;
  const pdfUrl = document.getElementById('apNewPdfUrl').value.trim() || null;
  const msg    = document.getElementById('apAddMsg');
  if (!title || !author) { msg.className = 'form-msg error'; msg.textContent = t('err-fill-all'); return; }
  try {
    const r = await fetch('/api/books', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': token },
      body: JSON.stringify({ title, author, year, pdfUrl })
    });
    if (r.status === 201) {
      msg.className = 'form-msg success'; msg.textContent = t('book-added');
      ['apNewTitle','apNewAuthor','apNewYear','apNewPdfUrl'].forEach(id => document.getElementById(id).value = '');
      apLoadBooks(); loadAllBooks();
    } else if (r.status === 409) {
      msg.className = 'form-msg error'; msg.textContent = t('book-exists');
    } else {
      msg.className = 'form-msg error'; msg.textContent = t('add-error');
    }
  } catch { msg.className = 'form-msg error'; msg.textContent = t('err-connect'); }
}

async function apDeleteBook(id, btnEl) {
  const token = getToken(); if (!token) return;
  if (!confirm('هل تريد حذف هذا الكتاب؟')) return;
  btnEl.disabled = true; btnEl.textContent = '...';
  try {
    const r = await fetch(`/api/books/${id}`, { method: 'DELETE', headers: { 'X-Api-Key': token } });
    if (r.ok) { apLoadBooks(); loadAllBooks(); }
    else { btnEl.disabled = false; btnEl.textContent = '🗑'; }
  } catch { btnEl.disabled = false; btnEl.textContent = '🗑'; }
}

function openUsersPage() {
  const token = sessionStorage.getItem('adminToken') || getToken();
  if (!token) return;
  window.open(`/admin/users?key=${encodeURIComponent(token)}`, '_blank');
}

async function apDeleteUser(id, username, btnEl) {
  const token = getToken(); if (!token) return;
  if (!confirm(`هل تريد حذف المستخدم "${username}"؟`)) return;
  btnEl.disabled = true; btnEl.textContent = '...';
  try {
    const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: { 'X-Api-Key': token } });
    if (r.ok) { apLoadUsers(); apLoadStats(); showToast(`تم حذف المستخدم ${username}`, '🗑'); }
    else { btnEl.disabled = false; btnEl.textContent = '🗑 حذف'; }
  } catch { btnEl.disabled = false; btnEl.textContent = '🗑 حذف'; }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escAttr(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function showError() {
  document.getElementById('booksGrid').innerHTML =
    `<p style="color:#D62839;padding:20px;grid-column:1/-1">${t('server-error')}</p>`;
}
