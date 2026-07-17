// inventory.js
// Storage Room Terminal & Electronic Vouchers. Storage's own room.inventory
// (already part of Phase 1's room schema) IS the central warehouse stock —
// no separate data structure invented for it. Lobby/Corridors/Roof/Workshop
// are virtual buckets (util.js) since they aren't rooms. Every voucher here
// is a pure stock-mutation + an append to the audit log (data.vouchers).

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.inventory;
  const U = Alaseel.util;
  const TYPES = () => Alaseel.i18n.inventoryTypes;

  let pane, toast;
  let activeTab = 'overview';

  const Inventory = {
    mount(contentPaneEl, toastFn) {
      pane = contentPaneEl;
      toast = toastFn;
      render();
    },
    onSearch() { /* no search surface in this module */ }
  };

  function data() { return Alaseel.store.get(); }
  function rooms() { return data().rooms; }
  function storageRoom() { return rooms().find((r) => r.special_type === 'storage'); }
  function storageInv() { return storageRoom().inventory; }

  function render() {
    pane.innerHTML =
      '<div class="module-tabs">' + Object.keys(T().tabs).map(tabBtn).join('') + '</div>' +
      '<div id="invSubPane"></div>';
    Array.prototype.forEach.call(pane.querySelectorAll('[data-inv-tab]'), (btn) => {
      btn.addEventListener('click', () => { activeTab = btn.getAttribute('data-inv-tab'); render(); });
    });
    renderActiveTab();
  }

  function tabBtn(key) {
    return '<button class="module-tab' + (activeTab === key ? ' active' : '') + '" data-inv-tab="' + key + '">' + T().tabs[key] + '</button>';
  }

  function renderActiveTab() {
    const sub = document.getElementById('invSubPane');
    if (activeTab === 'overview') return renderOverview(sub);
    if (activeTab === 'issuance') return renderIssuance(sub);
    if (activeTab === 'exchange') return renderExchange(sub);
    if (activeTab === 'maintenance') return renderMaintenance(sub);
    if (activeTab === 'waste') return renderWaste(sub);
    if (activeTab === 'log') return renderLog(sub);
  }

  /* =========================================================== */
  /*  Shared helpers                                                */
  /* =========================================================== */

  // includeStorage: whether Storage itself is a valid pick (only true for Waste)
  function locationOptions(includeStorage) {
    const opts = [];
    rooms().forEach((r) => {
      if (r.special_type === 'storage' && !includeStorage) return;
      const label = r.is_special ? Alaseel.i18n.rooms.special_type[r.special_type] : (Alaseel.i18n.rooms.room_number + ' ' + r.room_number);
      opts.push([r.room_id, label]);
    });
    ['lobby', 'corridors', 'roof'].forEach((k) => opts.push([k, T().locations[k]]));
    return opts;
  }

  function locationLabel(key) {
    if (Alaseel.util.VIRTUAL_LOCATIONS.indexOf(key) !== -1) return T().locations[key];
    const room = rooms().find((r) => r.room_id === key);
    if (!room) return key;
    return room.is_special ? Alaseel.i18n.rooms.special_type[room.special_type] : (Alaseel.i18n.rooms.room_number + ' ' + room.room_number);
  }

  function itemOptionsHtml(bucketForCounts) {
    return TYPES().map((t) => {
      const qty = bucketForCounts ? (bucketForCounts[t.slug] || 0) : null;
      return '<option value="' + t.slug + '">' + t.label + (qty !== null ? ' (' + qty + ')' : '') + '</option>';
    }).join('');
  }

  function itemLabel(slug) {
    const t = TYPES().find((x) => x.slug === slug);
    return t ? t.label : slug;
  }

  function logVoucher(type, details) {
    data().vouchers.push(Object.assign({ voucher_id: U.genId('v'), type, created_at: new Date().toISOString() }, details));
  }

  // Returns true if this decrement to Storage's stock just crossed at/below
  // its configured threshold — used to fire the real-time low-stock toast.
  function crossedThreshold(slug, locationKey, before, after) {
    if (locationKey !== storageRoom().room_id) return false;
    const threshold = (data().inventoryThresholds || {})[slug];
    if (!threshold || threshold <= 0) return false;
    return before > threshold && after <= threshold;
  }

  function toastWithThreshold(successMsg, thresholdHit, slug) {
    if (thresholdHit) {
      toast(successMsg + ' \u2014 ' + T().low_stock_toast_prefix + ' "' + itemLabel(slug) + '" ' + T().low_stock_toast_suffix, { long: true });
    } else {
      toast(successMsg);
    }
  }

  /* =========================================================== */
  /*  Overview                                                      */
  /* =========================================================== */

  function roomsSum(slug) {
    return rooms().filter((r) => r.special_type !== 'storage')
      .reduce((s, r) => s + (r.inventory[slug] || 0), 0);
  }

  function lowStockItems() {
    const thresholds = data().inventoryThresholds || {};
    return TYPES().filter((t) => {
      const min = thresholds[t.slug];
      return min && min > 0 && storageInv()[t.slug] <= min;
    });
  }

  function renderOverview(sub) {
    const low = lowStockItems();
    sub.innerHTML =
      (low.length
        ? '<div class="low-stock-banner">\u26A0 ' + T().low_stock_banner_prefix + ' ' + low.length + ' ' + T().low_stock_banner_suffix + '</div>'
        : '') +
      '<section class="panel" style="margin-top:12px;">' +
        '<div class="panel-head"><div class="panel-title">' + T().overview_stock_title + '</div></div>' +
        '<div class="settings-body">' +
          '<p class="hint">' + T().overview_stock_hint + '</p>' +
          '<table class="stock-table"><thead><tr>' +
            '<th>' + T().col_item + '</th><th>' + T().col_in_storage + '</th><th>' + T().col_min_threshold + '</th><th>' + T().col_in_rooms + '</th>' +
          '</tr></thead><tbody>' +
            TYPES().map((t) => {
              const qty = storageInv()[t.slug] || 0;
              const min = (data().inventoryThresholds || {})[t.slug] || '';
              const isLow = min && qty <= min;
              return '<tr>' +
                '<td>' + t.label + '</td>' +
                '<td class="ltr-num' + (isLow ? ' stock-qty-low' : '') + '">' + qty + '</td>' +
                '<td><input class="threshold-input" type="number" min="0" data-threshold-slug="' + t.slug + '" value="' + min + '"></td>' +
                '<td class="ltr-num">' + roomsSum(t.slug) + '</td>' +
              '</tr>';
            }).join('') +
          '</tbody></table>' +
          '<button class="btn btn-primary btn-sm" id="btnSaveThresholds" style="margin-top:14px;">' + T().save_thresholds + '</button>' +
        '</div>' +
      '</section>' +

      workshopSectionHtml();

    document.getElementById('btnSaveThresholds').addEventListener('click', () => {
      const thresholds = data().inventoryThresholds || {};
      Array.prototype.forEach.call(sub.querySelectorAll('[data-threshold-slug]'), (input) => {
        const v = parseInt(input.value, 10);
        thresholds[input.getAttribute('data-threshold-slug')] = v > 0 ? v : 0;
      });
      data().inventoryThresholds = thresholds;
      Alaseel.store.touch();
      toast(T().thresholds_saved);
      renderOverview(sub);
    });

    wireWorkshopReturns(sub);
  }

  function workshopSectionHtml() {
    const workshop = U.getStockBucket('workshop');
    const items = TYPES().filter((t) => (workshop[t.slug] || 0) > 0);
    return '<section class="panel" style="margin-top:14px;">' +
      '<div class="panel-head"><div class="panel-title">' + T().workshop_stock_title + '</div></div>' +
      '<div class="settings-body">' +
        (items.length ? items.map((t) =>
          '<div class="transit-row"><span>' + t.label + ' \u00d7 ' + workshop[t.slug] + '</span>' +
          '<button class="btn btn-ghost btn-sm" data-return-slug="' + t.slug + '">' + T().return_to_storage + '</button></div>'
        ).join('') : '<div class="empty-note">\u2014</div>') +
      '</div>' +
    '</section>';
  }

  function wireWorkshopReturns(sub) {
    Array.prototype.forEach.call(sub.querySelectorAll('[data-return-slug]'), (btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-return-slug');
        const workshop = U.getStockBucket('workshop');
        if (!workshop[slug]) return;
        workshop[slug] -= 1;
        storageInv()[slug] = (storageInv()[slug] || 0) + 1;
        logVoucher('maintenance_return', { item: slug, qty: 1 });
        Alaseel.store.touch();
        toast(T().returned_toast);
        renderOverview(sub);
      });
    });
  }

  /* =========================================================== */
  /*  Issuance Voucher                                              */
  /* =========================================================== */

  function renderIssuance(sub) {
    sub.innerHTML = voucherPanel(T().issuance_title, T().issuance_hint,
      '<div class="detail-form">' +
        selectGroup('ivItem', T().form_item, itemOptionsHtml(storageInv())) +
        numGroup('ivQty', T().form_qty, 1) +
        selectGroup('ivDest', T().form_destination, optsHtml(locationOptions(false))) +
      '</div>' +
      notesGroup('ivNotes') +
      '<div class="auth-error" id="ivErr" hidden></div>' +
      '<button class="btn btn-primary" id="btnIssuance">' + T().issuance_submit + '</button>'
    );

    document.getElementById('btnIssuance').addEventListener('click', () => {
      const item = document.getElementById('ivItem').value;
      const qty = parseInt(document.getElementById('ivQty').value, 10) || 0;
      const dest = document.getElementById('ivDest').value;
      const err = document.getElementById('ivErr');
      err.hidden = true;

      if (qty <= 0 || !dest) { showErr(err, T().insufficient_stock); return; }
      const before = storageInv()[item] || 0;
      if (qty > before) { showErr(err, T().insufficient_stock); return; }

      storageInv()[item] -= qty;
      const bucket = U.getStockBucket(dest);
      bucket[item] = (bucket[item] || 0) + qty;
      const after = storageInv()[item];

      logVoucher('issuance', { item, qty, destination: dest, destinationLabel: locationLabel(dest), notes: document.getElementById('ivNotes').value.trim() });
      Alaseel.store.touch();
      toastWithThreshold(T().issuance_success, crossedThreshold(item, storageRoom().room_id, before, after), item);
      renderIssuance(sub);
    });
  }

  /* =========================================================== */
  /*  Exchange Voucher                                              */
  /* =========================================================== */

  function renderExchange(sub) {
    sub.innerHTML = voucherPanel(T().exchange_title, T().exchange_hint,
      '<div class="detail-form">' +
        selectGroup('exLocation', T().form_location, optsHtml(locationOptions(false))) +
        selectGroup('exOldItem', T().exchange_old_item, itemOptionsHtml(null)) +
        numGroup('exOldQty', T().exchange_old_qty, 1) +
        selectGroup('exNewItem', T().exchange_new_item, itemOptionsHtml(storageInv())) +
        numGroup('exNewQty', T().exchange_new_qty, 1) +
      '</div>' +
      notesGroup('exNotes') +
      '<div class="auth-error" id="exErr" hidden></div>' +
      '<button class="btn btn-primary" id="btnExchange">' + T().exchange_submit + '</button>'
    );

    document.getElementById('btnExchange').addEventListener('click', () => {
      const location = document.getElementById('exLocation').value;
      const oldItem = document.getElementById('exOldItem').value;
      const oldQty = parseInt(document.getElementById('exOldQty').value, 10) || 0;
      const newItem = document.getElementById('exNewItem').value;
      const newQty = parseInt(document.getElementById('exNewQty').value, 10) || 0;
      const err = document.getElementById('exErr');
      err.hidden = true;

      if (!location || oldQty <= 0 || newQty <= 0) { showErr(err, T().insufficient_stock_at_location); return; }
      const locBucket = U.getStockBucket(location);
      if ((locBucket[oldItem] || 0) < oldQty) { showErr(err, T().insufficient_stock_at_location); return; }
      const newBefore = storageInv()[newItem] || 0;
      if (newBefore < newQty) { showErr(err, T().insufficient_stock); return; }

      locBucket[oldItem] -= oldQty;
      storageInv()[oldItem] = (storageInv()[oldItem] || 0) + oldQty;
      storageInv()[newItem] -= newQty;
      locBucket[newItem] = (locBucket[newItem] || 0) + newQty;
      const newAfter = storageInv()[newItem];

      logVoucher('exchange', {
        location, locationLabel: locationLabel(location), old_item: oldItem, old_qty: oldQty,
        new_item: newItem, new_qty: newQty, notes: document.getElementById('exNotes').value.trim()
      });
      Alaseel.store.touch();
      toastWithThreshold(T().exchange_success, crossedThreshold(newItem, storageRoom().room_id, newBefore, newAfter), newItem);
      renderExchange(sub);
    });
  }

  /* =========================================================== */
  /*  Maintenance Voucher                                          */
  /* =========================================================== */

  function renderMaintenance(sub) {
    sub.innerHTML = voucherPanel(T().maintenance_title, T().maintenance_hint,
      '<div class="detail-form">' +
        selectGroup('mtSource', T().form_source, optsHtml(locationOptions(true))) +
        selectGroup('mtItem', T().form_item, itemOptionsHtml(null)) +
        numGroup('mtQty', T().form_qty, 1) +
      '</div>' +
      notesGroup('mtNotes') +
      '<div class="auth-error" id="mtErr" hidden></div>' +
      '<button class="btn btn-primary" id="btnMaintenance">' + T().maintenance_submit + '</button>'
    );

    document.getElementById('btnMaintenance').addEventListener('click', () => {
      const source = document.getElementById('mtSource').value;
      const item = document.getElementById('mtItem').value;
      const qty = parseInt(document.getElementById('mtQty').value, 10) || 0;
      const err = document.getElementById('mtErr');
      err.hidden = true;

      if (!source || qty <= 0) { showErr(err, T().insufficient_stock_at_location); return; }
      const bucket = U.getStockBucket(source);
      const before = bucket[item] || 0;
      if (before < qty) { showErr(err, T().insufficient_stock_at_location); return; }

      bucket[item] -= qty;
      const workshop = U.getStockBucket('workshop');
      workshop[item] = (workshop[item] || 0) + qty;
      const after = bucket[item];

      logVoucher('maintenance', { source, sourceLabel: locationLabel(source), item, qty, notes: document.getElementById('mtNotes').value.trim() });
      Alaseel.store.touch();
      toastWithThreshold(T().maintenance_success, crossedThreshold(item, source, before, after), item);
      renderMaintenance(sub);
    });
  }

  /* =========================================================== */
  /*  Waste Voucher (standalone, mandatory reason)                 */
  /* =========================================================== */

  function renderWaste(sub) {
    sub.innerHTML = voucherPanel(T().waste_title, T().waste_hint,
      '<div class="detail-form">' +
        selectGroup('wsLocation', T().form_location, optsHtml(locationOptions(true))) +
        selectGroup('wsItem', T().form_item, itemOptionsHtml(null)) +
        numGroup('wsQty', T().waste_qty, 1) +
      '</div>' +
      '<div class="field-group-wide"><label class="field-label">' + T().waste_reason + '</label>' +
        '<textarea class="field-input" id="wsReason" rows="2" placeholder="' + T().waste_reason_placeholder + '"></textarea></div>' +
      '<div class="auth-error" id="wsErr" hidden></div>' +
      '<button class="btn btn-danger" id="btnWaste">' + T().waste_submit + '</button>'
    );

    document.getElementById('btnWaste').addEventListener('click', () => {
      const location = document.getElementById('wsLocation').value;
      const item = document.getElementById('wsItem').value;
      const qty = parseInt(document.getElementById('wsQty').value, 10) || 0;
      const reason = document.getElementById('wsReason').value.trim();
      const err = document.getElementById('wsErr');
      err.hidden = true;

      if (!location || qty <= 0) { showErr(err, T().insufficient_stock_at_location); return; }
      if (!reason) { showErr(err, T().waste_reason_required); return; }
      const bucket = U.getStockBucket(location);
      const before = bucket[item] || 0;
      if (before < qty) { showErr(err, T().insufficient_stock_at_location); return; }

      bucket[item] -= qty;
      const after = bucket[item];

      const d = data();
      d.wasteLedger.push({
        waste_id: U.genId('w'), item, item_label: itemLabel(item), qty, location, location_label: locationLabel(location),
        reason, created_at: new Date().toISOString()
      });
      logVoucher('waste', { location, locationLabel: locationLabel(location), item, qty, reason });
      Alaseel.store.touch();
      toastWithThreshold(T().waste_success, crossedThreshold(item, location, before, after), item);
      renderWaste(sub);
    });
  }

  /* =========================================================== */
  /*  Transaction log + waste ledger                                */
  /* =========================================================== */

  function renderLog(sub) {
    const vouchers = data().vouchers.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const waste = data().wasteLedger.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    sub.innerHTML =
      '<section class="panel"><div class="panel-head"><div class="panel-title">' + T().log_title + '<span class="count">' + vouchers.length + '</span></div></div>' +
        '<div class="settings-body">' +
          (vouchers.length ? vouchers.map(voucherLogRow).join('') : '<div class="empty-note">' + T().log_empty + '</div>') +
        '</div>' +
      '</section>' +
      '<section class="panel" style="margin-top:14px;"><div class="panel-head"><div class="panel-title">' + T().log_waste_title + '<span class="count">' + waste.length + '</span></div></div>' +
        '<div class="settings-body">' +
          (waste.length ? waste.map(wasteLogRow).join('') : '<div class="empty-note">' + T().log_waste_empty + '</div>') +
        '</div>' +
      '</section>';
  }

  function voucherLogRow(v) {
    let body = '';
    if (v.type === 'issuance') body = itemLabel(v.item) + ' \u00d7 ' + v.qty + ' \u2192 ' + v.destinationLabel;
    else if (v.type === 'exchange') body = itemLabel(v.old_item) + ' \u00d7 ' + v.old_qty + ' \u2194 ' + itemLabel(v.new_item) + ' \u00d7 ' + v.new_qty + ' (' + v.locationLabel + ')';
    else if (v.type === 'maintenance') body = itemLabel(v.item) + ' \u00d7 ' + v.qty + ' \u2190 ' + v.sourceLabel;
    else if (v.type === 'maintenance_return') body = itemLabel(v.item) + ' \u00d7 ' + v.qty + ' (\u0639\u0648\u062f\u0629 \u0645\u0646 \u0627\u0644\u0648\u0631\u0634\u0629)';
    else if (v.type === 'waste') body = itemLabel(v.item) + ' \u00d7 ' + v.qty + ' \u2014 ' + v.locationLabel;
    else body = JSON.stringify(v);

    const typeLabel = T().voucher_types[v.type] || v.type;
    return '<div class="voucher-log-row">' +
      '<span class="voucher-log-type">' + typeLabel + '</span>' +
      '<div class="voucher-log-body">' + body + '<div class="voucher-log-meta">' + U.fmtDate(v.created_at) + (v.notes ? ' \u00b7 ' + U.esc(v.notes) : '') + '</div></div>' +
    '</div>';
  }

  function wasteLogRow(w) {
    return '<div class="voucher-log-row">' +
      '<span class="voucher-log-type" style="background:var(--maint-soft);color:var(--danger-text);">' + T().voucher_types.waste + '</span>' +
      '<div class="voucher-log-body">' + w.item_label + ' \u00d7 ' + w.qty + ' \u2014 ' + w.location_label +
        '<div class="voucher-log-meta">' + U.esc(w.reason) + ' \u00b7 ' + U.fmtDate(w.created_at) + '</div></div>' +
    '</div>';
  }

  /* =========================================================== */
  /*  Small shared form builders                                    */
  /* =========================================================== */

  function voucherPanel(title, hint, formHtml) {
    return '<section class="panel"><div class="panel-head"><div class="panel-title">' + title + '</div></div>' +
      '<div class="settings-body"><p class="hint">' + hint + '</p>' + formHtml + '</div></section>';
  }
  function selectGroup(id, label, optionsHtml) {
    return '<div class="field-group"><label class="field-label">' + label + '</label><select class="field-input" id="' + id + '">' + optionsHtml + '</select></div>';
  }
  function numGroup(id, label, def) {
    return '<div class="field-group"><label class="field-label">' + label + '</label><input class="field-input" id="' + id + '" type="number" min="1" value="' + def + '"></div>';
  }
  function notesGroup(id) {
    return '<div class="field-group-wide"><label class="field-label">' + T().form_notes + '</label>' +
      '<input class="field-input" id="' + id + '" type="text" placeholder="' + T().form_notes_placeholder + '"></div>';
  }
  function optsHtml(pairs) {
    return '<option value="">' + T().select_room_or_location + '</option>' + pairs.map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('');
  }
  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }

  Alaseel.inventory = Inventory;
})();
