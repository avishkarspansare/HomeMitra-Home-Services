/* ============================================================
   HomeMitra API Client
   ============================================================ */

// Base URL: set window.API_BASE_URL in env-config.js for production.
// Falls back to localhost for local dev.
const API_BASE = (window.API_BASE_URL || 'http://localhost:8080') + '/api';

// Resolve page prefix depending on where we're served from:
//  A) /index.html (root)             → pages live at frontend/pages/name.html
//  B) /frontend/index.html           → pages live at pages/name.html
//  C) /frontend/pages/x.html         → pages are siblings, name.html
const _ROOT = (() => {
  const p = window.location.pathname;
  if (p.includes('/frontend/pages/')) return '';          // C: siblings
  if (p.includes('/frontend/'))       return 'pages';     // B: one level down
  return 'frontend/pages';                                 // A: at root
})();

// Build a URL to a page by name (e.g. 'dashboard.html')
function _page(name) {
  return _ROOT ? _ROOT + '/' + name : name;
}

// Home URL (index.html)
function _home() {
  const p = window.location.pathname;
  if (p.includes('/frontend/pages/')) return '../index.html';
  if (p.includes('/frontend/'))       return 'index.html';
  return 'index.html';
}

const api = {
  _token: () => localStorage.getItem('hm_token'),

  _headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    const t = this._token();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  },

  // silent: if true, don't show a toast on network/fetch errors (use for background calls)
  async _req(method, path, body, silent = false) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method, headers: this._headers(),
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (e) {
      // "Failed to fetch" = network down / backend not running
      const isNetworkErr = e.message === 'Failed to fetch' || e instanceof TypeError;
      if (!silent && !isNetworkErr) {
        Toast.show(e.message, 'error');
      } else if (!silent && isNetworkErr) {
        Toast.show('Cannot reach server. Please check your connection.', 'warning');
      }
      throw e;
    }
  },

  get:    (p, silent)    => api._req('GET', p, null, silent),
  post:   (p, b, silent) => api._req('POST', p, b, silent),
  put:    (p, b, silent) => api._req('PUT', p, b, silent),
  patch:  (p, b, silent) => api._req('PATCH', p, b, silent),
  delete: (p, silent)    => api._req('DELETE', p, null, silent),

  // Auth
  auth: {
    register: (b) => api.post('/auth/register', b),
    login:    (b) => api.post('/auth/login', b),
  },

  // Services
  services: {
    featured:   ()      => api.get('/services/featured', true),
    all:        (p, s)  => api.get(`/services?page=${p||0}&size=${s||12}`, true),
    byCategory: (id)    => api.get(`/services/category/${id}`, true),
    search:     (q)     => api.get(`/services/search?q=${encodeURIComponent(q)}`, true),
    bySlug:     (slug)  => api.get(`/services/${slug}`, true),
  },

  // Categories
  categories: {
    all: () => api.get('/categories', true),
  },

  // Bookings
  bookings: {
    create:       (b)           => api.post('/bookings', b),
    mine:         (p, s)        => api.get(`/bookings/my?page=${p||0}&size=${s||10}`, true),
    get:          (ref)         => api.get(`/bookings/${ref}`, true),
    updateStatus: (id, status)  => api.patch(`/bookings/${id}/status?status=${status}`),
  },

  // Payments
  payments: {
    createOrder: (bookingId) => api.post(`/payments/create-order/${bookingId}`),
    verify:      (b)         => api.post('/payments/verify', b),
  },

  // Notifications
  notifications: {
    list:     () => api.get('/notifications', true),
    unread:   () => api.get('/notifications/unread-count', true),
    markRead: () => api.post('/notifications/mark-read'),
  }
};

/* ── Auth helpers ── */
const Auth = {
  save(data) {
    localStorage.setItem('hm_token', data.token);
    localStorage.setItem('hm_refresh', data.refreshToken);
    localStorage.setItem('hm_user', JSON.stringify({
      id: data.userId, name: data.fullName, email: data.email, role: data.role
    }));
  },
  clear() {
    ['hm_token','hm_refresh','hm_user'].forEach(k => localStorage.removeItem(k));
  },
  user() {
    try { return JSON.parse(localStorage.getItem('hm_user')); } catch { return null; }
  },
  loggedIn() { return !!localStorage.getItem('hm_token') && !!this.user(); },
  role()     { return this.user()?.role; },

  requireAuth() {
    if (!this.loggedIn()) {
      window.location.href = _page('login.html');
      return false;
    }
    return true;
  },
  requireRole(role) {
    if (this.role() !== role) {
      window.location.href = _home();
      return false;
    }
    return true;
  }
};

/* ── Toast ── */
const Toast = {
  _container: null,
  _init() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'toast-container';
      document.body.appendChild(this._container);
    }
  },
  show(msg, type = 'info', duration = 3500) {
    this._init();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${icons[type]||''}</span><span>${msg}</span>`;
    this._container.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }
};

/* ── Stars renderer ── */
function renderStars(rating, max = 5) {
  return Array.from({length: max}, (_, i) =>
    `<span class="star${i < Math.round(rating) ? '' : ' empty'}">★</span>`).join('');
}

/* ── Price formatter ── */
function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

/* ── Skeleton loaders ── */
function skeletonCard(n = 4) {
  return Array.from({length: n}, () => `
    <div class="card" style="padding:1.5rem">
      <div class="skeleton" style="height:60px;width:60px;border-radius:50%;margin-bottom:1rem"></div>
      <div class="skeleton" style="height:18px;width:70%;margin-bottom:.75rem"></div>
      <div class="skeleton" style="height:12px;width:90%;margin-bottom:.5rem"></div>
      <div class="skeleton" style="height:12px;width:60%"></div>
    </div>`).join('');
}

/* ── Navbar init ── */
function initNavbar() {
  const user = Auth.user();
  const actionsEl = document.getElementById('navActions');
  if (!actionsEl) return;

  if (user) {
    actionsEl.innerHTML = `
      <div class="user-avatar" onclick="window.location.href='${_page("dashboard.html")}'" title="${user.name}">
        ${user.name.charAt(0).toUpperCase()}
      </div>
      <button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>`;

    // Load unread count silently
    api.notifications.unread().then(r => {
      const cnt = r?.data;
      if (cnt > 0) Toast.show(`You have ${cnt} unread notification${cnt>1?'s':''}`, 'info');
    }).catch(() => {});
  } else {
    actionsEl.innerHTML = `
      <a href="${_page('login.html')}" class="btn btn-secondary btn-sm">Login</a>
      <a href="${_page('register.html')}" class="btn btn-primary btn-sm">Sign Up</a>`;
  }

  // Scroll effect
  window.addEventListener('scroll', () => {
    document.querySelector('.navbar')?.classList.toggle('scrolled', window.scrollY > 10);
  });

  // Hamburger
  const burger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  burger?.addEventListener('click', () => navLinks?.classList.toggle('open'));
}

function logout() {
  Auth.clear();
  Toast.show('Logged out successfully', 'success');
  setTimeout(() => window.location.href = _home(), 800);
}

/* ── WebSocket for live booking tracking ── */
function connectTrackingSocket(bookingId, onUpdate) {
  if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') return;
  const wsBase = (window.API_BASE_URL || 'http://localhost:8080');
  const socket = new SockJS(`${wsBase}/ws`);
  const client = Stomp.over(socket);
  client.connect({}, () => {
    client.subscribe(`/topic/booking/${bookingId}`, (msg) => {
      try { onUpdate(JSON.parse(msg.body)); } catch {}
    });
  });
  return client;
}
