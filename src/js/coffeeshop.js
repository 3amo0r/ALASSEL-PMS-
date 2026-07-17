// coffeeshop.js
// F&B POS. Tables hold a running cart of line items. A table can only move
// from 'open' to 'settled' through one of two explicit paths — post to a
// guest's room folio (verified against the live reservation ledger via
// util.js's router) or cash — never silently discarded.

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.coffeeShop;
  const U = Alaseel.util;

  let pane, toast;
  let activeTab = 'tables';
  let view = { mode: 'list' };

  const CoffeeShop = {
    mount(contentPaneEl, toastFn) {
      pane = contentPaneEl;
      toast = toastFn;
      view = { mode: 'list' };
      render();
    },
    onSearch() { /* no search surface in this module */ }
  };

  function data() { return Alaseel.store.get(); }
  function cs() { return data().coffeeShop; }

  function render() {
    pane.innerHTML =
      '<div class="module-tabs">' +
        '<button class="module-tab' + (activeTab === 'tables' ? ' active' : '') + '" data-cs-tab="tables">' + T().tabs.tables + '</button>' +
        '<button class="module-tab' + (activeTab === 'menu' ? ' active' : '') + '" data-cs-tab="menu">' + T().tabs.menu + '</button>' +
      '</div>' +
      '<div id="csSubPane"></div>';
    Array.prototype.forEach.call(pane.querySelectorAll('[data-cs-tab]'), (btn) => {
      btn.addEventListener('click', () => { activeTab = btn.getAttribute('data-cs-tab'); view = { mode: 'list' }; render(); });
    });
    renderActiveTab();
  }

  function renderActiveTab() {
    const sub = document.getElementById('csSubPane');
    if (activeTab === 'menu') return renderMenuTab(sub);
    return view.mode === 'detail' ? renderTableDetail(sub, view.tableId) : renderTablesList(sub);
  }

  /* =========================================================== */
  /*  Tables list                                                   */
  /* =========================================================== */

  function renderTablesList(sub) {
    const tables = cs().tables;
    sub.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head"><div class="panel-title">' + T().tables_title + '<span class="count">' + tables.length + '</span></div>' +
          '<div id="addTableZone"></div>' +
        '</div>' +
        (tables.length
          ? '<div class="table-grid">' + tables.map(tableCard).join('') + '</div>'
          : '<div class="empty-note">' + T().no_tables + '</div>') +
      '</section>';

    renderAddTableButton();
    Array.prototype.forEach.call(sub.querySelectorAll('[data-table]'), (card) => {
      card.addEventListener('click', () => { view = { mode: 'detail', tableId: card.getAttribute('data-table') }; render(); });
    });
  }

  function tableCard(t) {
    const total = t.line_items.reduce((s, li) => s + li.price * li.qty, 0);
    return '<button class="table-card ' + (t.status === 'open' ? 'open' : 'settled') + '" data-table="' + t.table_id + '">' +
      '<div class="table-card-name">' + U.esc(t.name) + '</div>' +
      '<div class="table-card-status">' + (t.status === 'open' ? T().table_status_open : T().table_status_settled) + '</div>' +
      '<div class="table-card-total ltr-num">' + total.toFixed(2) + '</div>' +
    '</button>';
  }

  function renderAddTableButton() {
    const zone = document.getElementById('addTableZone');
    zone.innerHTML = '<button class="btn btn-primary btn-sm" id="btnAddTable">' + T().add_table + '</button>';
    document.getElementById('btnAddTable').addEventListener('click', () => {
      zone.innerHTML =
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<input class="field-input" id="newTableName" type="text" placeholder="' + T().table_name_placeholder + '" style="margin-bottom:0;width:180px;">' +
          '<button class="btn btn-primary btn-sm" id="confirmAddTable">' + T().add_table + '</button>' +
        '</div>';
      document.getElementById('confirmAddTable').addEventListener('click', () => {
        const name = document.getElementById('newTableName').value.trim();
        if (!name) return;
        cs().tables.push({ table_id: U.genId('tbl'), name, status: 'open', line_items: [], opened_at: new Date().toISOString(), settled_at: null, settle_method: null, settled_room_number: null });
        Alaseel.store.touch();
        renderTablesList(document.getElementById('csSubPane'));
      });
    });
  }

  /* =========================================================== */
  /*  Table detail (order building + settle)                       */
  /* =========================================================== */

  function renderTableDetail(sub, tableId) {
    const table = cs().tables.find((t) => t.table_id === tableId);
    if (!table) { view = { mode: 'list' }; return renderTablesList(sub); }
    const total = table.line_items.reduce((s, li) => s + li.price * li.qty, 0);

    sub.innerHTML =
      '<button class="back-link" id="btnBackTables"><span class="chevron rtl-flip">&#8250;</span>' + T().back_to_tables + '</button>' +
      '<div class="booking-layout">' +
        '<div class="booking-main">' + menuPickerHtml() + '</div>' +
        '<div class="booking-sidebar">' +
          '<div class="sidebar-panel">' +
            '<div class="sidebar-panel-title">' + U.esc(table.name) + ' \u2014 ' + T().table_status_open + '</div>' +
            cartHtml(table) +
            '<div class="folio-row folio-total-row"><span>' + T().running_total + '</span><span class="ltr-num">' + total.toFixed(2) + '</span></div>' +
            settleZoneHtml(table) +
            (!table.line_items.length ? '<button class="btn btn-ghost btn-sm" id="btnDeleteEmptyTable" style="margin-top:10px;">' + T().delete_empty_table + '</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('btnBackTables').addEventListener('click', () => { view = { mode: 'list' }; render(); });
    wireMenuPicker(table);
    wireCart(table);
    wireSettle(table);

    const btnDelete = document.getElementById('btnDeleteEmptyTable');
    if (btnDelete) btnDelete.addEventListener('click', () => {
      cs().tables = cs().tables.filter((t) => t.table_id !== table.table_id);
      Alaseel.store.touch();
      view = { mode: 'list' };
      render();
    });
  }

  function menuPickerHtml() {
    const categories = cs().categories;
    if (!categories.length) return '<div class="empty-note">' + T().no_categories_yet + '</div>';
    return categories.map((cat) => {
      const items = cs().menu.filter((m) => m.category_id === cat.category_id);
      return '<div class="menu-category-block">' +
        '<h3 class="form-section-label" style="margin-top:0;">' + U.esc(cat.name) + '</h3>' +
        (items.length
          ? '<div class="table-grid">' + items.map((m) =>
              '<button class="table-card open" data-add-item="' + m.item_id + '"><div class="table-card-name">' + U.esc(m.name) + '</div><div class="table-card-total ltr-num">' + m.price.toFixed(2) + '</div></button>'
            ).join('')
          : '<div class="empty-note">' + T().no_items_in_category + '</div>') +
      '</div>';
    }).join('');
  }

  function wireMenuPicker(table) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-add-item]'), (btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-add-item');
        const menuItem = cs().menu.find((m) => m.item_id === itemId);
        if (!menuItem) return;
        const existing = table.line_items.find((li) => li.item_id === itemId);
        if (existing) existing.qty += 1;
        else table.line_items.push({ item_id: itemId, name: menuItem.name, price: menuItem.price, qty: 1 });
        Alaseel.store.touch();
        renderTableDetail(document.getElementById('csSubPane'), table.table_id);
      });
    });
  }

  function cartHtml(table) {
    if (!table.line_items.length) return '<div class="empty-note">' + T().cart_empty + '</div>';
    return table.line_items.map((li) =>
      '<div class="mini-row"><span>' + U.esc(li.name) + '</span>' +
      '<div class="stepper"><button class="stepper-btn" data-cart-step="-1" data-cart-item="' + li.item_id + '">\u2212</button>' +
        '<span class="stepper-input" style="width:22px;text-align:center;">' + li.qty + '</span>' +
        '<button class="stepper-btn" data-cart-step="1" data-cart-item="' + li.item_id + '">+</button></div>' +
      '</div>'
    ).join('');
  }

  function wireCart(table) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-step]'), (btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-cart-item');
        const delta = parseInt(btn.getAttribute('data-cart-step'), 10);
        const li = table.line_items.find((x) => x.item_id === itemId);
        if (!li) return;
        li.qty += delta;
        if (li.qty <= 0) table.line_items = table.line_items.filter((x) => x.item_id !== itemId);
        Alaseel.store.touch();
        renderTableDetail(document.getElementById('csSubPane'), table.table_id);
      });
    });
  }

  function settleZoneHtml(table) {
    const companies = data().companies || [];
    return '<div class="form-section-label">' + T().settle_title + '</div>' +
      '<p class="hint">' + T().settle_hint + '</p>' +
      '<div class="settle-option-card">' +
        '<strong>' + T().settle_folio_title + '</strong>' +
        '<input class="field-input" id="csRoomNumber" type="number" min="1" placeholder="' + T().settle_folio_room_label + '">' +
        '<button class="btn btn-secondary btn-sm" id="btnSettleFolio">' + T().settle_folio_btn + '</button>' +
        '<div class="auth-error" id="csFolioErr" hidden></div>' +
      '</div>' +
      '<div class="settle-option-card">' +
        '<strong>' + T().settle_company_title + '</strong>' +
        (companies.length
          ? '<select class="field-input" id="csCompanySelect"><option value="">' + T().settle_company_select + '</option>' +
              companies.map((c) => '<option value="' + c.company_id + '">' + U.esc(c.company_name) + '</option>').join('') +
            '</select>' +
            '<button class="btn btn-secondary btn-sm" id="btnSettleCompany">' + T().settle_company_btn + '</button>' +
            '<div class="auth-error" id="csCompanyErr" hidden></div>'
          : '<p class="hint">' + T().no_companies_yet + '</p>') +
      '</div>' +
      '<div class="settle-option-card">' +
        '<strong>' + T().settle_cash_title + '</strong>' +
        '<button class="btn btn-primary btn-sm" id="btnSettleCash" style="margin-top:8px;">' + T().settle_cash_btn + '</button>' +
      '</div>';
  }

  // Archives the completed order (for history + Night Audit's cash scan),
  // then resets the live table to a fresh, empty, immediately-reusable state.
  function archiveAndResetTable(table, settleMethod, extra) {
    const total = table.line_items.reduce((s, li) => s + li.price * li.qty, 0);
    if (!Array.isArray(cs().orderHistory)) cs().orderHistory = [];
    cs().orderHistory.push(Object.assign({
      order_id: U.genId('cso'), table_name: table.name, line_items: table.line_items.slice(),
      total, settle_method: settleMethod, settled_at: new Date().toISOString()
    }, extra || {}));

    table.line_items = [];
    table.status = 'open';
    table.settle_method = null;
    table.settled_room_number = null;
    table.settled_at = null;
    table.opened_at = new Date().toISOString();
    return total;
  }

  function wireSettle(table) {
    const btnFolio = document.getElementById('btnSettleFolio');
    if (btnFolio) btnFolio.addEventListener('click', () => {
      const err = document.getElementById('csFolioErr');
      err.hidden = true;
      if (!table.line_items.length) { showErr(err, T().cannot_settle_empty); return; }
      const roomNumber = parseInt(document.getElementById('csRoomNumber').value, 10);
      if (!roomNumber) { showErr(err, T().settle_folio_room_not_found); return; }

      const total = table.line_items.reduce((s, li) => s + li.price * li.qty, 0);
      const desc = table.line_items.map((li) => li.name + ' \u00d7' + li.qty).join(', ');
      const res = U.postFolioCharge(roomNumber, { source: 'coffee_shop', description: desc, amount: total });

      if (!res.ok) {
        showErr(err, res.error === 'ROOM_NOT_FOUND' ? T().settle_folio_room_not_found : T().settle_folio_no_active_guest);
        return;
      }
      archiveAndResetTable(table, 'folio', { settled_room_number: roomNumber });
      Alaseel.store.touch();
      toast(T().settle_folio_success);
      view = { mode: 'list' };
      render();
    });

    const btnCompany = document.getElementById('btnSettleCompany');
    if (btnCompany) btnCompany.addEventListener('click', () => {
      const err = document.getElementById('csCompanyErr');
      err.hidden = true;
      if (!table.line_items.length) { showErr(err, T().cannot_settle_empty); return; }
      const companyId = document.getElementById('csCompanySelect').value;
      if (!companyId) { showErr(err, T().settle_company_required); return; }

      const total = table.line_items.reduce((s, li) => s + li.price * li.qty, 0);
      const desc = table.line_items.map((li) => li.name + ' \u00d7' + li.qty).join(', ');
      const res = Alaseel.corporate.postCompanyCharge(companyId, { source: 'coffee_shop', description: desc, amount: total });
      if (!res.ok) {
        showErr(err, res.error === 'CONTRACT_EXPIRED' ? T().settle_company_contract_expired : T().settle_company_required);
        return;
      }

      archiveAndResetTable(table, 'company', { company_id: companyId });
      Alaseel.store.touch();
      toast(T().settle_company_success);
      view = { mode: 'list' };
      render();
    });

    const btnCash = document.getElementById('btnSettleCash');
    if (btnCash) btnCash.addEventListener('click', () => {
      if (!table.line_items.length) { toast(T().cannot_settle_empty); return; }
      archiveAndResetTable(table, 'cash', {});
      Alaseel.store.touch();
      toast(T().settle_cash_success);
      view = { mode: 'list' };
      render();
    });
  }

  /* =========================================================== */
  /*  Menu management (categories + items CRUD)                    */
  /* =========================================================== */

  function renderMenuTab(sub) {
    const categories = cs().categories;
    sub.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head"><div class="panel-title">' + T().categories_title + '</div><div id="addCatZone"></div></div>' +
        '<div class="settings-body">' +
          (categories.length ? categories.map(categoryBlock).join('') : '<div class="empty-note">' + T().no_categories + '</div>') +
        '</div>' +
      '</section>';

    renderAddCategoryButton(sub);
    wireCategoryDeleteButtons(sub);
    wireMenuCrud(sub);
  }

  function wireCategoryDeleteButtons(sub) {
    cs().categories.forEach((cat) => {
      const zone = document.getElementById('delCatZone-' + cat.category_id);
      if (!zone) return;
      zone.innerHTML = '<button class="btn btn-ghost btn-sm" data-del-cat="' + cat.category_id + '">\u00d7</button>';
      document.getElementById('delCatZone-' + cat.category_id) // re-grab after innerHTML set
        .querySelector('[data-del-cat]').addEventListener('click', () => {
          zone.innerHTML =
            '<div class="inline-confirm"><span>' + T().delete_category_confirm + '</span>' +
            '<button class="btn btn-danger btn-sm" data-confirm-del-cat="' + cat.category_id + '">' + Alaseel.i18n.guests.confirm_yes + '</button>' +
            '<button class="btn btn-ghost btn-sm" data-cancel-del-cat="' + cat.category_id + '">' + Alaseel.i18n.guests.confirm_cancel + '</button></div>';
          zone.querySelector('[data-cancel-del-cat]').addEventListener('click', () => wireCategoryDeleteButtons(sub));
          zone.querySelector('[data-confirm-del-cat]').addEventListener('click', () => {
            cs().categories = cs().categories.filter((c) => c.category_id !== cat.category_id);
            cs().menu = cs().menu.filter((m) => m.category_id !== cat.category_id);
            Alaseel.store.touch();
            toast(T().category_deleted);
            renderMenuTab(sub);
          });
        });
    });
  }

  function categoryBlock(cat) {
    const items = cs().menu.filter((m) => m.category_id === cat.category_id);
    return '<div class="menu-category-block">' +
      '<div class="panel-head" style="padding:0 0 8px;border:0;">' +
        '<div class="panel-title" style="font-size:13px;">' + U.esc(cat.name) + '</div>' +
        '<div id="delCatZone-' + cat.category_id + '"></div>' +
      '</div>' +
      (items.length ? items.map((m) =>
        '<div class="mini-row"><span>' + U.esc(m.name) + '</span><span class="ltr-num">' + m.price.toFixed(2) + ' <button class="btn btn-ghost btn-sm" data-del-item="' + m.item_id + '" style="margin-inline-start:8px;">\u00d7</button></span></div>'
      ).join('') : '<div class="empty-note">' + T().no_items_in_category + '</div>') +
      '<div class="inline-form-row" style="margin-top:8px;">' +
        '<input class="field-input" data-item-name-for="' + cat.category_id + '" type="text" placeholder="' + T().item_name_placeholder + '">' +
        '<input class="field-input" data-item-price-for="' + cat.category_id + '" type="number" min="0" step="0.01" placeholder="' + T().item_price_placeholder + '">' +
      '</div>' +
      '<button class="btn btn-secondary btn-sm" data-add-item-to="' + cat.category_id + '">' + T().add_item + '</button>' +
    '</div>';
  }

  function renderAddCategoryButton(sub) {
    const zone = document.getElementById('addCatZone');
    zone.innerHTML = '<button class="btn btn-primary btn-sm" id="btnAddCat">' + T().add_category + '</button>';
    document.getElementById('btnAddCat').addEventListener('click', () => {
      zone.innerHTML =
        '<div style="display:flex;gap:8px;">' +
          '<input class="field-input" id="newCatName" type="text" placeholder="' + T().category_name_placeholder + '" style="margin-bottom:0;width:180px;">' +
          '<button class="btn btn-primary btn-sm" id="confirmAddCat">' + T().add_category + '</button>' +
        '</div>';
      document.getElementById('confirmAddCat').addEventListener('click', () => {
        const name = document.getElementById('newCatName').value.trim();
        if (!name) return;
        cs().categories.push({ category_id: U.genId('cat'), name });
        Alaseel.store.touch();
        toast(T().category_added);
        renderMenuTab(sub);
      });
    });
  }

  function wireMenuCrud(sub) {
    Array.prototype.forEach.call(sub.querySelectorAll('[data-del-item]'), (btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-del-item');
        cs().menu = cs().menu.filter((m) => m.item_id !== itemId);
        Alaseel.store.touch();
        toast(T().item_deleted);
        renderMenuTab(sub);
      });
    });
    Array.prototype.forEach.call(sub.querySelectorAll('[data-add-item-to]'), (btn) => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-add-item-to');
        const nameInput = sub.querySelector('[data-item-name-for="' + catId + '"]');
        const priceInput = sub.querySelector('[data-item-price-for="' + catId + '"]');
        const name = nameInput.value.trim();
        const price = parseFloat(priceInput.value);
        if (!name || !(price >= 0)) return;
        cs().menu.push({ item_id: U.genId('mi'), category_id: catId, name, price });
        Alaseel.store.touch();
        toast(T().item_added);
        renderMenuTab(sub);
      });
    });
  }

  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }

  Alaseel.coffeeShop = CoffeeShop;
})();
