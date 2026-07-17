// laundry.js
// Unlike Coffee Shop's tables, laundry transactions aren't a persistent
// open tab — build the cart, settle immediately (folio or cash), done.
// Settlement reuses the exact same postFolioCharge router as Coffee Shop.

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.laundry;
  const U = Alaseel.util;

  let pane, toast;
  let activeTab = 'newTransaction';
  let cart = [];

  const Laundry = {
    mount(contentPaneEl, toastFn) {
      pane = contentPaneEl;
      toast = toastFn;
      cart = [];
      render();
    },
    onSearch() { /* no search surface in this module */ }
  };

  function data() { return Alaseel.store.get(); }
  function ld() { return data().laundry; }

  function render() {
    pane.innerHTML =
      '<div class="module-tabs">' +
        tabBtn('newTransaction') + tabBtn('pricing') + tabBtn('log') +
      '</div>' +
      '<div id="ldSubPane"></div>';
    Array.prototype.forEach.call(pane.querySelectorAll('[data-ld-tab]'), (btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-ld-tab');
        if (activeTab === 'newTransaction') cart = [];
        render();
      });
    });
    renderActiveTab();
  }

  function tabBtn(key) {
    return '<button class="module-tab' + (activeTab === key ? ' active' : '') + '" data-ld-tab="' + key + '">' + T().tabs[key] + '</button>';
  }

  function renderActiveTab() {
    const sub = document.getElementById('ldSubPane');
    if (activeTab === 'pricing') return renderPricing(sub);
    if (activeTab === 'log') return renderLog(sub);
    return renderNewTransaction(sub);
  }

  /* =========================================================== */
  /*  New transaction: tier picker + cart + settle                 */
  /* =========================================================== */

  function renderNewTransaction(sub) {
    const tiers = ld().tiers;
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

    sub.innerHTML =
      '<div class="booking-layout">' +
        '<div class="booking-main">' +
          '<section class="panel">' +
            '<div class="panel-head"><div class="panel-title">' + T().new_transaction_title + '</div></div>' +
            '<div class="settings-body">' +
              '<p class="hint">' + T().pick_tier_hint + '</p>' +
              (tiers.length ? '<div class="table-grid">' + tiers.map(tierCard).join('') + '</div>' : '<div class="empty-note">' + T().no_tiers_yet + '</div>') +
            '</div>' +
          '</section>' +
        '</div>' +
        '<div class="booking-sidebar"><div class="sidebar-panel">' +
          '<div class="sidebar-panel-title">' + T().new_transaction_title + '</div>' +
          cartHtml() +
          '<div class="folio-row folio-total-row"><span>' + T().cart_total + '</span><span class="ltr-num">' + total.toFixed(2) + '</span></div>' +
          settleZoneHtml() +
        '</div></div>' +
      '</div>';

    wireTierPicker(sub);
    wireCart(sub);
    wireSettle(sub);
  }

  function tierCard(t) {
    return '<button class="table-card open" data-add-tier="' + t.tier_id + '">' +
      '<div class="table-card-name">' + U.esc(t.item_name) + '</div>' +
      '<div class="table-card-status">' + T().processing_types[t.processing_type] + '</div>' +
      '<div class="table-card-total ltr-num">' + t.price.toFixed(2) + '</div>' +
    '</button>';
  }

  function wireTierPicker(sub) {
    Array.prototype.forEach.call(sub.querySelectorAll('[data-add-tier]'), (btn) => {
      btn.addEventListener('click', () => {
        const tierId = btn.getAttribute('data-add-tier');
        const tier = ld().tiers.find((t) => t.tier_id === tierId);
        if (!tier) return;
        const existing = cart.find((c) => c.tier_id === tierId);
        if (existing) existing.qty += 1;
        else cart.push({ tier_id: tierId, item_name: tier.item_name, processing_type: tier.processing_type, price: tier.price, qty: 1 });
        renderNewTransaction(sub);
      });
    });
  }

  function cartHtml() {
    if (!cart.length) return '<div class="empty-note">' + T().cart_empty + '</div>';
    return cart.map((c) =>
      '<div class="mini-row"><span>' + U.esc(c.item_name) + ' \u00b7 ' + T().processing_types[c.processing_type] + '</span>' +
      '<div class="stepper"><button class="stepper-btn" data-cart-step="-1" data-cart-tier="' + c.tier_id + '">\u2212</button>' +
      '<span class="stepper-input" style="width:22px;text-align:center;">' + c.qty + '</span>' +
      '<button class="stepper-btn" data-cart-step="1" data-cart-tier="' + c.tier_id + '">+</button></div></div>'
    ).join('');
  }

  function wireCart(sub) {
    Array.prototype.forEach.call(sub.querySelectorAll('[data-cart-step]'), (btn) => {
      btn.addEventListener('click', () => {
        const tierId = btn.getAttribute('data-cart-tier');
        const delta = parseInt(btn.getAttribute('data-cart-step'), 10);
        const item = cart.find((c) => c.tier_id === tierId);
        if (!item) return;
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter((c) => c.tier_id !== tierId);
        renderNewTransaction(sub);
      });
    });
  }

  function settleZoneHtml() {
    return '<div class="settle-option-card">' +
        '<strong>' + T().settle_folio_title + '</strong>' +
        '<input class="field-input" id="ldRoomNumber" type="number" min="1" placeholder="' + T().settle_folio_room_label + '">' +
        '<button class="btn btn-secondary btn-sm" id="btnLdSettleFolio">' + T().settle_folio_btn + '</button>' +
        '<div class="auth-error" id="ldFolioErr" hidden></div>' +
      '</div>' +
      '<div class="settle-option-card">' +
        '<strong>' + T().settle_cash_title + '</strong>' +
        '<button class="btn btn-primary btn-sm" id="btnLdSettleCash" style="margin-top:8px;">' + T().settle_cash_btn + '</button>' +
      '</div>';
  }

  function wireSettle(sub) {
    const btnFolio = document.getElementById('btnLdSettleFolio');
    if (btnFolio) btnFolio.addEventListener('click', () => {
      const err = document.getElementById('ldFolioErr');
      err.hidden = true;
      if (!cart.length) { showErr(err, T().cannot_settle_empty); return; }
      const roomNumber = parseInt(document.getElementById('ldRoomNumber').value, 10);
      if (!roomNumber) { showErr(err, T().settle_folio_room_not_found); return; }

      const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
      const desc = cart.map((c) => c.item_name + ' (' + T().processing_types[c.processing_type] + ') \u00d7' + c.qty).join(', ');
      const res = U.postFolioCharge(roomNumber, { source: 'laundry', description: desc, amount: total });

      if (!res.ok) {
        showErr(err, res.error === 'ROOM_NOT_FOUND' ? T().settle_folio_room_not_found : T().settle_folio_no_active_guest);
        return;
      }
      logTransaction('folio', roomNumber, total);
      toast(T().settle_folio_success);
      cart = [];
      renderNewTransaction(sub);
    });

    const btnCash = document.getElementById('btnLdSettleCash');
    if (btnCash) btnCash.addEventListener('click', () => {
      if (!cart.length) { toast(T().cannot_settle_empty); return; }
      const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
      logTransaction('cash', null, total);
      toast(T().settle_cash_success);
      cart = [];
      renderNewTransaction(sub);
    });
  }

  function logTransaction(method, roomNumber, total) {
    ld().transactions.push({
      transaction_id: U.genId('ldtx'),
      line_items: cart.map((c) => ({ tier_id: c.tier_id, item_name: c.item_name, processing_type: c.processing_type, price: c.price, qty: c.qty })),
      total, method, room_number: roomNumber, created_at: new Date().toISOString()
    });
    Alaseel.store.touch();
  }

  /* =========================================================== */
  /*  Pricing (tier CRUD)                                          */
  /* =========================================================== */

  function renderPricing(sub) {
    const tiers = ld().tiers;
    sub.innerHTML =
      '<section class="panel"><div class="panel-head"><div class="panel-title">' + T().pricing_title + '</div></div>' +
        '<div class="settings-body">' +
          (tiers.length ? tiers.map(tierRow).join('') : '<div class="empty-note">' + T().no_tiers + '</div>') +
          '<div class="inline-form" style="margin-top:14px;">' +
            '<div class="inline-form-row">' +
              '<div><label class="field-label">' + T().tier_item_name + '</label><input class="field-input" id="newTierName" type="text" placeholder="' + T().tier_item_placeholder + '"></div>' +
              '<div><label class="field-label">' + T().tier_processing_type + '</label><select class="field-input" id="newTierType">' +
                Object.keys(T().processing_types).map((k) => '<option value="' + k + '">' + T().processing_types[k] + '</option>').join('') +
              '</select></div>' +
            '</div>' +
            '<label class="field-label">' + T().tier_price + '</label>' +
            '<input class="field-input" id="newTierPrice" type="number" min="0" step="0.01">' +
            '<button class="btn btn-primary btn-sm" id="btnAddTier">' + T().add_tier + '</button>' +
          '</div>' +
        '</div>' +
      '</section>';

    document.getElementById('btnAddTier').addEventListener('click', () => {
      const name = document.getElementById('newTierName').value.trim();
      const type = document.getElementById('newTierType').value;
      const price = parseFloat(document.getElementById('newTierPrice').value);
      if (!name || !(price >= 0)) return;
      ld().tiers.push({ tier_id: U.genId('lt'), item_name: name, processing_type: type, price });
      Alaseel.store.touch();
      toast(T().tier_added);
      renderPricing(sub);
    });

    wireTierDeleteButtons(sub);
  }

  function tierRow(t) {
    return '<div class="mini-row"><span>' + U.esc(t.item_name) + ' \u00b7 ' + T().processing_types[t.processing_type] + '</span>' +
      '<span class="ltr-num" style="display:flex;align-items:center;gap:8px;">' + t.price.toFixed(2) +
      '<span id="delTierZone-' + t.tier_id + '"></span></span></div>';
  }

  function wireTierDeleteButtons(sub) {
    ld().tiers.forEach((t) => {
      const zone = document.getElementById('delTierZone-' + t.tier_id);
      if (!zone) return;
      zone.innerHTML = '<button class="btn btn-ghost btn-sm" data-del-tier="' + t.tier_id + '">\u00d7</button>';
      zone.querySelector('[data-del-tier]').addEventListener('click', () => {
        zone.innerHTML =
          '<button class="btn btn-danger btn-sm" data-confirm-del-tier="' + t.tier_id + '">' + Alaseel.i18n.guests.confirm_yes + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-cancel-del-tier="' + t.tier_id + '">' + Alaseel.i18n.guests.confirm_cancel + '</button>';
        zone.querySelector('[data-cancel-del-tier]').addEventListener('click', () => wireTierDeleteButtons(sub));
        zone.querySelector('[data-confirm-del-tier]').addEventListener('click', () => {
          ld().tiers = ld().tiers.filter((x) => x.tier_id !== t.tier_id);
          Alaseel.store.touch();
          toast(T().tier_deleted);
          renderPricing(sub);
        });
      });
    });
  }

  /* =========================================================== */
  /*  Transaction log                                               */
  /* =========================================================== */

  function renderLog(sub) {
    const txs = ld().transactions.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    sub.innerHTML =
      '<section class="panel"><div class="panel-head"><div class="panel-title">' + T().log_title + '<span class="count">' + txs.length + '</span></div></div>' +
        '<div class="settings-body">' +
          (txs.length ? txs.map(txRow).join('') : '<div class="empty-note">' + T().log_empty + '</div>') +
        '</div>' +
      '</section>';
  }

  function txRow(tx) {
    const desc = tx.line_items.map((li) => li.item_name + ' \u00d7' + li.qty).join(', ');
    const methodLabel = tx.method === 'folio'
      ? T().method_folio + (tx.room_number ? ' (' + Alaseel.i18n.rooms.room_number + ' ' + tx.room_number + ')' : '')
      : T().method_cash;
    return '<div class="voucher-log-row"><span class="voucher-log-type">' + methodLabel + '</span>' +
      '<div class="voucher-log-body">' + desc + '<div class="voucher-log-meta">' + tx.total.toFixed(2) + ' \u00b7 ' + U.fmtDate(tx.created_at) + '</div></div></div>';
  }

  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }

  Alaseel.laundry = Laundry;
})();
