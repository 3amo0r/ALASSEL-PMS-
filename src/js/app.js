// app.js
// Boot sequence + shell chrome + router. This is what was missing from
// Phase 1 — it's the file that actually starts the application, renders
// the sidebar/topbar, and mounts each module into #contentPane.
//
// Navigation is pure content-swap: exactly one BrowserWindow (see main.js),
// one HTML document, one #contentPane whose innerHTML changes. Nothing here
// ever creates a second screen.

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const NAV_ITEMS = [
    { id: 'dashboard', label: () => Alaseel.i18n.nav.dashboard, icon: iconGrid, built: true },
    { id: 'rooms', label: () => Alaseel.i18n.nav.rooms, icon: iconBed, built: true },
    { id: 'guests', label: () => Alaseel.i18n.nav.guests, icon: iconUsers, built: true },
    { id: 'coffee_shop', label: () => Alaseel.i18n.nav.coffee_shop, icon: iconCoffee, built: true },
    { id: 'laundry', label: () => Alaseel.i18n.nav.laundry, icon: iconWasher, built: true },
    { id: 'inventory', label: () => Alaseel.i18n.nav.inventory, icon: iconBox, built: true },
    { id: 'hr', label: () => Alaseel.i18n.nav.hr, icon: iconIdCard, built: true },
    { id: 'accounting', label: () => Alaseel.i18n.nav.accounting, icon: iconCalc, built: true },
    { id: 'corporate', label: () => Alaseel.i18n.nav.corporate, icon: iconUsers, built: true },
    { id: 'maintenance', label: () => Alaseel.i18n.nav.maintenance, icon: iconWrench, built: true },
    { id: 'settings', label: () => Alaseel.i18n.nav.settings, icon: iconGear, built: true }
  ];

  // 'guests' is a composite module: one sidebar entry, two internal tabs
  // (Guests / Reservations), matching the spec's own module grouping.
  let activeNav = 'dashboard';
  let activeGuestTab = 'guests';
  let pendingGuestTabIntent = null; // { tab, action, guestId } set by cross-module nav

  let contentPane, toastEl, toastText, toastAction;
  let toastHideTimer = null;

  /* ---------------- boot ---------------- */
  async function boot() {
    await Alaseel.store.init();
    applyTheme(Alaseel.store.get().settings.theme || 'dark');

    toastEl = document.getElementById('toast');
    toastText = document.getElementById('toastText');
    toastAction = document.getElementById('toastAction');

    Alaseel.auth.mount(document.getElementById('authScreen'), {
      onAuthenticated: onAuthenticated
    });
  }

  function onAuthenticated() {
    document.getElementById('authScreen').hidden = true;
    document.getElementById('appShell').hidden = false;
    initShell();
  }

  /* ---------------- shell chrome ---------------- */
  function initShell() {
    contentPane = document.getElementById('contentPane');
    renderSidebarBrand();
    renderSidebarNav();
    wireTopbar();
    tickClock();
    setInterval(tickClock, 15000);
    navigateTo('dashboard');
  }

  function renderSidebarBrand() {
    const data = Alaseel.store.get();
    const logo = document.getElementById('sidebarLogo');
    logo.src = (data.hotel && data.hotel.logo_dataurl) || '../assets/logo/logo-white.png';
    document.getElementById('sidebarHotelName').textContent =
      (data.hotel && data.hotel.name_ar) || Alaseel.i18n.app_name;
    document.getElementById('logoutLabel').textContent = Alaseel.i18n.auth.logout;
  }

  function renderSidebarNav() {
    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = NAV_ITEMS.map((item) => (
      '<button class="nav-item' + (item.id === activeNav ? ' active' : '') + '" data-nav="' + item.id + '">' +
        item.icon() +
        '<span>' + item.label() + '</span>' +
        (!item.built ? '<span class="phase-dot" title="Phase ' + item.phase + '"></span>' : '') +
      '</button>'
    )).join('');

    Array.prototype.forEach.call(nav.querySelectorAll('[data-nav]'), (btn) => {
      btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-nav')));
    });

    document.getElementById('btnLogout').addEventListener('click', logout);
  }

  function updateActiveNavHighlight() {
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), (btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-nav') === activeNav);
    });
  }

  function wireTopbar() {
    const themeBtn = document.getElementById('themeToggle');
    updateThemeButton();
    themeBtn.addEventListener('click', () => {
      const current = Alaseel.store.get().settings.theme || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      const data = Alaseel.store.get();
      data.settings.theme = next;
      Alaseel.store.touch();
      updateThemeButton();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      const term = e.target.value;
      if (activeNav === 'rooms' && Alaseel.rooms) Alaseel.rooms.onSearch(term);
      else if (activeNav === 'inventory' && Alaseel.inventory) Alaseel.inventory.onSearch(term);
      else if (activeNav === 'coffee_shop' && Alaseel.coffeeShop) Alaseel.coffeeShop.onSearch(term);
      else if (activeNav === 'laundry' && Alaseel.laundry) Alaseel.laundry.onSearch(term);
      else if (activeNav === 'maintenance' && Alaseel.maintenance) Alaseel.maintenance.onSearch(term);
      else if (activeNav === 'hr' && Alaseel.hr) Alaseel.hr.onSearch(term);
      else if (activeNav === 'accounting' && Alaseel.accounting) Alaseel.accounting.onSearch(term);
      else if (activeNav === 'corporate' && Alaseel.corporate) Alaseel.corporate.onSearch(term);
      else if (activeNav === 'guests') {
        if (activeGuestTab === 'guests' && Alaseel.guests) Alaseel.guests.onSearch(term);
        if (activeGuestTab === 'reservations' && Alaseel.reservations) Alaseel.reservations.onSearch(term);
      }
    });
  }

  function updateThemeButton() {
    const theme = Alaseel.store.get().settings.theme || 'dark';
    const btn = document.getElementById('themeToggle');
    btn.innerHTML = theme === 'dark' ? iconSun() : iconMoon();
    btn.title = theme === 'dark' ? Alaseel.i18n.topbar.theme_light : Alaseel.i18n.topbar.theme_dark;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function tickClock() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    const suffix = h >= 12 ? 'م' : 'ص';
    const timeEl = document.getElementById('clockTime');
    const dateEl = document.getElementById('clockDate');
    if (!timeEl) return;
    timeEl.textContent = h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + suffix;
    dateEl.textContent = now.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function logout() {
    document.getElementById('appShell').hidden = true;
    const authScreen = document.getElementById('authScreen');
    authScreen.hidden = false;
    activeNav = 'dashboard';
    Alaseel.auth.mount(authScreen, { onAuthenticated: onAuthenticated });
  }

  /* ---------------- router ---------------- */
  function navigateTo(id, opts) {
    activeNav = id;
    if (id === 'guests' && opts) {
      pendingGuestTabIntent = opts;
      if (opts.tab) activeGuestTab = opts.tab;
    }
    updateActiveNavHighlight();
    document.getElementById('searchInput').value = '';
    renderActiveModule();
  }

  function renderActiveModule() {
    const item = NAV_ITEMS.find((n) => n.id === activeNav);

    if (activeNav === 'dashboard') return renderDashboard();
    if (activeNav === 'rooms') return Alaseel.rooms.mount(contentPane, toast);
    if (activeNav === 'settings') return Alaseel.settings.mount(contentPane, toast);
    if (activeNav === 'guests') return renderGuestsReservationsComposite();
    if (activeNav === 'inventory') return Alaseel.inventory.mount(contentPane, toast);
    if (activeNav === 'coffee_shop') return Alaseel.coffeeShop.mount(contentPane, toast);
    if (activeNav === 'laundry') return Alaseel.laundry.mount(contentPane, toast);
    if (activeNav === 'maintenance') return Alaseel.maintenance.mount(contentPane, toast);
    if (activeNav === 'hr') return Alaseel.hr.mount(contentPane, toast);
    if (activeNav === 'accounting') return Alaseel.accounting.mount(contentPane, toast);
    if (activeNav === 'corporate') return Alaseel.corporate.mount(contentPane, toast);

    return renderStub(item);
  }

  /* ---------------- composite: guests + reservations tabs ---------------- */
  function renderGuestsReservationsComposite() {
    contentPane.innerHTML =
      '<div class="module-tabs">' +
        '<button class="module-tab' + (activeGuestTab === 'guests' ? ' active' : '') + '" data-tab="guests">' + Alaseel.i18n.moduleTabs.guests + '</button>' +
        '<button class="module-tab' + (activeGuestTab === 'reservations' ? ' active' : '') + '" data-tab="reservations">' + Alaseel.i18n.moduleTabs.reservations + '</button>' +
      '</div>' +
      '<div id="moduleSubPane"></div>';

    Array.prototype.forEach.call(contentPane.querySelectorAll('[data-tab]'), (btn) => {
      btn.addEventListener('click', () => {
        activeGuestTab = btn.getAttribute('data-tab');
        pendingGuestTabIntent = null;
        renderGuestsReservationsComposite();
      });
    });

    const subPane = document.getElementById('moduleSubPane');
    const intent = pendingGuestTabIntent;
    pendingGuestTabIntent = null;

    if (activeGuestTab === 'guests') {
      Alaseel.guests.mount(subPane, toast, intent && intent.tab !== 'reservations' ? intent : null);
    } else {
      Alaseel.reservations.mount(subPane, toast, intent && intent.tab === 'reservations' ? intent : null);
    }
  }

  /* ---------------- dashboard (lightweight, real — reuses room stats) ---------------- */
  function renderDashboard() {
    const d = Alaseel.i18n.dashboard;
    const rooms = Alaseel.store.get().rooms;
    const k = Alaseel.rooms.computeKpis(rooms);

    contentPane.innerHTML =
      '<div class="kpi-strip">' +
        kpiCard(d.occupancy, k.occupancyPct + '%', 'gold') +
        kpiCard(d.ready, k.ready, 'clean-c') +
        kpiCard(d.needs_cleaning, k.needsCleaning, 'dirty-c') +
        kpiCard(d.maintenance, k.maintenance, 'maint-c') +
        kpiCard(d.total_rooms, k.totalRooms, '') +
      '</div>' +
      '<section class="panel"><div class="panel-head"><div class="panel-title">' + d.title + '</div></div>' +
        '<div class="stub-view" style="padding:40px 24px;">' +
          '<p>' + 'نظرة سريعة على حالة الفندق الآن. لعرض تفاصيل الغرف انتقل إلى وحدة "الغرف" من القائمة الجانبية.' + '</p>' +
        '</div>' +
      '</section>';
  }

  function kpiCard(label, value, colorCls) {
    return '<div class="kpi"><div class="kpi-label">' + label + '</div>' +
      '<div class="kpi-value ' + (colorCls || '') + '">' + value + '</div></div>';
  }

  /* ---------------- stub views for unbuilt modules ---------------- */
  function renderStub(item) {
    const s = Alaseel.i18n.stub;
    contentPane.innerHTML =
      '<div class="stub-view">' +
        '<div class="stub-icon">' + item.icon() + '</div>' +
        '<h2>' + item.label() + '</h2>' +
        '<p>' + s.body + '</p>' +
        '<span class="stub-phase-tag">' + s.phase_label + ' ' + item.phase + '</span>' +
      '</div>';
  }

  /* ---------------- toast ---------------- */
  function toast(message, opts) {
    clearTimeout(toastHideTimer);
    toastText.textContent = message;
    if (opts && opts.actionLabel) {
      toastAction.textContent = opts.actionLabel;
      toastAction.hidden = false;
      toastAction.onclick = () => { if (opts.onAction) opts.onAction(); };
    } else {
      toastAction.hidden = true;
      toastAction.onclick = null;
    }
    toastEl.classList.add('show');
    const duration = (opts && (opts.actionLabel || opts.long)) ? 5000 : 2400;
    toastHideTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
  }

  /* ---------------- public hook for cross-module navigation ---------------- */
  Alaseel.app = {
    navigateTo: navigateTo
  };

  /* ---------------- icons (primitives only — safe, no freehand curves) ---------------- */
  function iconGrid() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>' +
      '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
  }
  function iconBed() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18v2"/><path d="M21 18v2"/>' +
      '<path d="M3 12V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M11 12V9a1 1 0 0 1 1-1h6a2 2 0 0 1 2 2v2"/></svg>';
  }
  function iconUsers() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="9" cy="7.5" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>' +
      '<circle cx="17.5" cy="8.5" r="2.3"/><path d="M15.8 20c.2-2.6 1.9-4.5 4.2-4.9"/></svg>';
  }
  function iconCoffee() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/>' +
      '<path d="M8 3c-.4 1 .4 1.3 0 2.3M12 3c-.4 1 .4 1.3 0 2.3"/></svg>';
  }
  function iconWasher() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="13" r="5"/><circle cx="12" cy="13" r="2"/>' +
      '<line x1="7" y1="6.5" x2="7.01" y2="6.5"/><line x1="10" y1="6.5" x2="10.01" y2="6.5"/></svg>';
  }
  function iconBox() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/></svg>';
  }
  function iconIdCard() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/>' +
      '<path d="M6 16c.5-1.8 1.9-2.8 3-2.8s2.5 1 3 2.8"/><line x1="14" y1="10" x2="18" y2="10"/><line x1="14" y1="13" x2="18" y2="13"/></svg>';
  }
  function iconCalc() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/>' +
      '<line x1="8.5" y1="12" x2="8.5" y2="12"/><line x1="12" y1="12" x2="12" y2="12"/><line x1="15.5" y1="12" x2="15.5" y2="12"/>' +
      '<line x1="8.5" y1="16" x2="8.5" y2="16"/><line x1="12" y1="16" x2="12" y2="16"/><line x1="15.5" y1="16" x2="15.5" y2="16"/></svg>';
  }
  function iconWrench() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="7" cy="7" r="3.3"/><line x1="9.3" y1="9.3" x2="18.5" y2="18.5"/><path d="M16 16l3-3 2 2-3 3z"/></svg>';
  }
  function iconGear() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="2.2 2.4"/></svg>';
  }
  function iconSun() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/>' +
      '<line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/>' +
      '<line x1="4.9" y1="4.9" x2="6.6" y2="6.6"/><line x1="17.4" y1="17.4" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="6.6" y2="17.4"/><line x1="17.4" y1="6.6" x2="19.1" y2="4.9"/></svg>';
  }
  function iconMoon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/></svg>';
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
