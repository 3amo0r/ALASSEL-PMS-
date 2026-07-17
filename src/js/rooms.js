// rooms.js
// The Room Grid & Matrix module. Clicking a room does NOT open an overlay —
// it swaps the content pane from "grid" to "detail", per the single-frame
// rule. Both views live in the same #contentPane.

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.rooms;
  const STATUS_META = {
    clean: { cls: 'clean' }, occupied: { cls: 'occupied' }, dirty: { cls: 'dirty' },
    maint: { cls: 'maint' }, oo: { cls: 'oo' }
  };

  let pane;
  let toast;
  let view = { mode: 'grid', roomId: null };
  let activeFloor = 'all';
  let activeModel = 'all';
  let searchTerm = '';

  const Rooms = {
    mount(contentPaneEl, toastFn) {
      pane = contentPaneEl;
      toast = toastFn;
      view = { mode: 'grid', roomId: null };
      render();
    },
    onSearch(term) {
      searchTerm = (term || '').trim().toLowerCase();
      if (view.mode === 'grid') render();
    },
    computeKpis
  };

  function rooms() { return Alaseel.store.get().rooms; }

  function computeKpis(list) {
    const bookable = list.filter((r) => r.bookable);
    const occupied = bookable.filter((r) => r.status === 'occupied').length;
    const ready = bookable.filter((r) => r.status === 'clean').length;
    const needsCleaning = bookable.filter((r) => r.status === 'dirty').length;
    const maintenance = list.filter((r) => r.status === 'maint').length;
    const occupancyPct = bookable.length ? Math.round((occupied / bookable.length) * 100) : 0;
    return { occupancyPct, ready, needsCleaning, maintenance, totalRooms: list.length, totalBookable: bookable.length };
  }

  function render() {
    if (view.mode === 'detail') renderDetail(view.roomId);
    else renderGrid();
  }

  /* =========================================================== */
  /*  GRID VIEW                                                    */
  /* =========================================================== */

  function renderGrid() {
    const all = rooms();
    const k = computeKpis(all);

    const floorList = list().filter((r) => {
      if (activeFloor === 'special') { if (!r.is_special) return false; }
      else if (activeFloor !== 'all') { if (r.floor !== activeFloor || r.is_special) return false; }
      if (activeModel !== 'all') {
        if (activeModel === 'none') { if (r.room_model) return false; }
        else if (r.room_model !== activeModel) return false;
      }
      return true;
    });

    pane.innerHTML =
      '<div class="kpi-strip">' +
        kpi(Alaseel.i18n.dashboard.occupancy, k.occupancyPct + '%', 'gold') +
        kpi(T().status.clean, k.ready, 'clean-c') +
        kpi(T().status.dirty, k.needsCleaning, 'dirty-c') +
        kpi(T().status.maint, k.maintenance, 'maint-c') +
        kpi(Alaseel.i18n.dashboard.total_rooms, k.totalRooms, '') +
      '</div>' +

      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + T().title + '<span class="count">' + floorList.length + '</span></div>' +
          '<div class="head-actions">' +
            '<button class="btn btn-secondary btn-sm" id="btnExport">' + T().export_csv + '</button>' +
            '<button class="btn btn-primary btn-sm" id="btnAddRoom">' + T().add_room + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="floor-chips" id="floorChips"></div>' +
        '<div class="floor-chips" id="modelChips"></div>' +
        '<div class="legend">' +
          Object.keys(STATUS_META).map((s) => legendItem(s)).join('') +
        '</div>' +
        '<div class="room-grid" id="roomGrid"></div>' +
        '<div id="addRoomZone"></div>' +
      '</section>';

    renderFloorChips();
    renderModelChips();
    renderTiles(floorList);

    document.getElementById('btnAddRoom').addEventListener('click', toggleAddRoomForm);
    document.getElementById('btnExport').addEventListener('click', handleExport);
  }

  function kpi(label, value, colorCls) {
    return '<div class="kpi"><div class="kpi-label">' + label + '</div>' +
      '<div class="kpi-value ' + (colorCls || '') + '">' + value + '</div></div>';
  }

  function legendItem(statusKey) {
    return '<div class="legend-item"><span class="dot ' + STATUS_META[statusKey].cls + '"></span>' + T().status[statusKey] + '</div>';
  }

  function list() {
    // sorted: floor 0 (special) last for readability when "all" selected
    return rooms().slice().sort((a, b) => {
      if (a.floor !== b.floor) return (a.floor === 0 ? 1 : 0) - (b.floor === 0 ? 1 : 0) || a.floor - b.floor;
      return a.room_number - b.room_number;
    });
  }

  function renderFloorChips() {
    const wrap = document.getElementById('floorChips');
    const chips = [
      { key: 'all', label: T().all_floors },
      { key: 1, label: T().floor + ' 1' },
      { key: 2, label: T().floor + ' 2' },
      { key: 3, label: T().floor + ' 3' },
      { key: 'special', label: T().special_rooms }
    ];
    wrap.innerHTML = chips.map((c) =>
      '<button class="chip' + (activeFloor === c.key ? ' active' : '') + '" data-floor="' + c.key + '">' + c.label + '</button>'
    ).join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-floor]'), (btn) => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-floor');
        activeFloor = (v === 'all' || v === 'special') ? v : parseInt(v, 10);
        renderGrid();
      });
    });
  }

  function renderModelChips() {
    const wrap = document.getElementById('modelChips');
    const chips = [
      { key: 'all', label: T().all_models },
      { key: 'a', label: T().models.a },
      { key: 'b', label: T().models.b },
      { key: 'c', label: T().models.c },
      { key: 'none', label: T().no_model }
    ];
    wrap.innerHTML = chips.map((c) =>
      '<button class="chip' + (activeModel === c.key ? ' active' : '') + '" data-model="' + c.key + '">' + c.label + '</button>'
    ).join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-model]'), (btn) => {
      btn.addEventListener('click', () => { activeModel = btn.getAttribute('data-model'); renderGrid(); });
    });
  }

  function renderTiles(floorList) {
    const grid = document.getElementById('roomGrid');
    const filtered = floorList.filter((r) => {
      if (!searchTerm) return true;
      const hay = (String(r.room_number) + ' ' + (r.room_type || '') + ' ' +
        (r.is_special ? T().special_type[r.special_type] : '')).toLowerCase();
      return hay.indexOf(searchTerm) !== -1;
    });

    if (!filtered.length) {
      grid.innerHTML = '<div class="empty-note">لا توجد غرف مطابقة</div>';
      return;
    }

    grid.innerHTML = filtered.map((r) => {
      const meta = STATUS_META[r.status];
      const title = r.is_special ? T().special_type[r.special_type] : (r.room_type || T().not_set);
      const sentiment = Alaseel.util.roomSentiment(r.room_id);
      return (
        '<button class="room-tile ' + meta.cls + '" data-room="' + r.room_id + '">' +
          (sentiment && sentiment.flagged ? '<span class="tile-flag" title="' + T().sentiment_flagged + '">\u26A0</span>' : '') +
          '<div><div class="rnum">' + r.room_number + '</div><div class="rtype">' + esc(title) + '</div></div>' +
          '<div class="rstatus">' + T().status[r.status] + '</div>' +
        '</button>'
      );
    }).join('');

    Array.prototype.forEach.call(grid.querySelectorAll('[data-room]'), (btn) => {
      btn.addEventListener('click', () => {
        view = { mode: 'detail', roomId: btn.getAttribute('data-room') };
        render();
      });
    });
  }

  /* ---- add room (inline form, not a native prompt) ---- */
  function toggleAddRoomForm() {
    const zone = document.getElementById('addRoomZone');
    if (zone.dataset.open === '1') { zone.innerHTML = ''; zone.dataset.open = '0'; return; }
    zone.dataset.open = '1';

    const suggestedFloor = 1;
    zone.innerHTML =
      '<div class="inline-form">' +
        '<div class="inline-form-row">' +
          '<div><label class="field-label">' + T().new_room_floor + '</label>' +
          '<select class="field-input" id="nrFloor">' +
            '<option value="1">1</option><option value="2">2</option><option value="3">3</option>' +
          '</select></div>' +
          '<div><label class="field-label">' + T().new_room_number + '</label>' +
          '<input class="field-input" id="nrNumber" type="number" placeholder="' + nextSuggestedNumber(suggestedFloor) + '"></div>' +
        '</div>' +
        '<div class="auth-error" id="nrErr" hidden></div>' +
        '<div class="inline-form-actions">' +
          '<button class="btn btn-primary btn-sm" id="nrCreate">' + T().create + '</button>' +
          '<button class="btn btn-ghost btn-sm" id="nrCancel">' + T().cancel + '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('nrFloor').addEventListener('change', (e) => {
      document.getElementById('nrNumber').placeholder = nextSuggestedNumber(parseInt(e.target.value, 10));
    });
    document.getElementById('nrCancel').addEventListener('click', toggleAddRoomForm);
    document.getElementById('nrCreate').addEventListener('click', () => {
      const floor = parseInt(document.getElementById('nrFloor').value, 10);
      const numInput = document.getElementById('nrNumber');
      const number = parseInt(numInput.value || numInput.placeholder, 10);
      const err = document.getElementById('nrErr');
      const clash = rooms().some((r) => r.floor === floor && r.room_number === number);
      if (clash) { err.textContent = T().room_number_taken; err.hidden = false; return; }

      const newRoom = {
        room_id: 'rm_' + number + '_' + Date.now().toString(36),
        room_number: number, floor, room_type: '', capacity: null, price_per_night: null,
        status: 'clean', is_special: false, special_type: null, bookable: true,
        inventory: emptyInventory(), notes: ''
      };
      const data = Alaseel.store.get();
      data.rooms.push(newRoom);
      Alaseel.store.touch();
      toast(T().room_created);
      view = { mode: 'detail', roomId: newRoom.room_id };
      render();
    });
  }

  function nextSuggestedNumber(floor) {
    const used = rooms().filter((r) => r.floor === floor).map((r) => r.room_number);
    let n = floor * 100 + 1;
    while (used.indexOf(n) !== -1) n++;
    return n;
  }

  function emptyInventory() {
    const inv = {};
    Alaseel.i18n.inventoryTypes.forEach((t) => { inv[t.slug] = 0; });
    return inv;
  }

  /* ---- export ---- */
  async function handleExport() {
    const btn = document.getElementById('btnExport');
    const original = btn.textContent;
    btn.textContent = T().exporting;
    btn.disabled = true;

    const assetLabels = {};
    Alaseel.i18n.inventoryTypes.forEach((t) => { assetLabels[t.slug] = t.label; });

    const res = await window.alaseelAPI.exportRoomsCsv({ rooms: rooms(), assetLabels });
    btn.textContent = original;
    btn.disabled = false;

    if (res.ok) {
      toast(T().export_success_prefix + ' ' + res.path, {
        actionLabel: T().reveal_file,
        onAction: () => window.alaseelAPI.revealInFolder({ filePath: res.path })
      });
    } else {
      toast('تعذّر التصدير: ' + res.error);
    }
  }

  /* =========================================================== */
  /*  DETAIL VIEW                                                  */
  /* =========================================================== */

  function renderDetail(roomId) {
    const room = rooms().find((r) => r.room_id === roomId);
    if (!room) { view = { mode: 'grid', roomId: null }; return renderGrid(); }

    const statusOptions = (room.is_special ? ['clean', 'dirty', 'maint', 'oo'] : ['clean', 'occupied', 'dirty', 'maint', 'oo'])
      .map((s) => '<option value="' + s + '"' + (room.status === s ? ' selected' : '') + '>' + T().status[s] + '</option>').join('');

    const titleLabel = room.is_special ? T().special_type[room.special_type] : (T().room_number + ' ' + room.room_number);
    const floorLabel = room.floor === 0 ? T().ground_floor : (T().floor_label + ' ' + room.floor);

    pane.innerHTML =
      '<button class="back-link" id="btnBack"><span class="chevron rtl-flip">&#8250;</span>' + T().back_to_grid + '</button>' +

      '<section class="panel detail-panel">' +
        '<div class="panel-head">' +
          '<div><div class="panel-title">' + esc(titleLabel) + '</div>' +
          '<div class="panel-subtitle">' + floorLabel + '</div></div>' +
          '<span class="status-badge ' + STATUS_META[room.status].cls + '">' + T().status[room.status] + '</span>' +
        '</div>' +

        (room.is_special ? '<div class="notice-banner">' +
          (room.special_type === 'manager_office' ? T().special_not_bookable_office : T().special_not_bookable_module) +
        '</div>' : '') +

        sentimentSectionHtml(room) +

        '<div class="detail-form">' +
          fieldRow('roomNumber', T().room_number, 'number', room.room_number, room.is_special) +
          selectRow('floor', T().floor_label, [0, 1, 2, 3], room.floor, room.is_special) +
          (!room.is_special ? '<div class="field-group"><label class="field-label">' + T().model_label + '</label>' +
            '<select class="field-input" id="fRoomModel">' +
              '<option value=""' + (!room.room_model ? ' selected' : '') + '>' + T().no_model + '</option>' +
              ['a', 'b', 'c'].map((k) => '<option value="' + k + '"' + (room.room_model === k ? ' selected' : '') + '>' + T().models[k] + '</option>').join('') +
            '</select></div>' : '') +
          (!room.is_special ? textRow('roomType', T().room_type, room.room_type, T().room_type_placeholder) : '') +
          (!room.is_special ? numRow('capacity', T().capacity, room.capacity) : '') +
          (!room.is_special ? numRow('price', T().price, room.price_per_night) : '') +
          '<div class="field-group"><label class="field-label">' + T().status_label + '</label>' +
            '<select class="field-input" id="fStatus">' + statusOptions + '</select></div>' +
          '<div class="field-group field-group-wide"><label class="field-label">' + T().notes + '</label>' +
            '<textarea class="field-input" id="fNotes" rows="2" placeholder="' + T().notes_placeholder + '">' + esc(room.notes || '') + '</textarea></div>' +
        '</div>' +

        '<div class="inventory-section">' +
          '<div class="inventory-head">' +
            '<h3>' + T().inventory_title + '</h3>' +
            '<span class="inventory-total" id="invTotal"></span>' +
          '</div>' +
          '<p class="hint">' + (room.special_type === 'storage' ? T().storage_hint : T().inventory_hint) + '</p>' +
          '<div class="inventory-grid" id="invGrid"></div>' +
        '</div>' +

        '<div class="detail-actions">' +
          '<button class="btn btn-primary" id="btnSave">' + T().save_changes + '</button>' +
          (room.is_special ? '' : '<div id="deleteZone"></div>') +
        '</div>' +
      '</section>';

    document.getElementById('btnBack').addEventListener('click', () => { view = { mode: 'grid', roomId: null }; render(); });
    renderInventoryGrid(room);
    wireSaveButton(room);
    wireDeleteZone(room);
  }

  function sentimentSectionHtml(room) {
    const s = Alaseel.util.roomSentiment(room.room_id);
    if (!s) return '';
    return '<div class="notice-banner' + (s.flagged ? ' danger' : '') + '" style="margin:14px 16px 0;">' +
      '<strong>' + T().sentiment_title + ':</strong> ' + s.avg.toFixed(1) + '\u2605 (' + s.count + ' ' + T().sentiment_count_suffix + ')' +
      (s.flagged ? '<br>' + T().sentiment_flagged : '') +
    '</div>';
  }

  function fieldRow(id, label, type, value, disabled) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="f' + cap(id) + '" type="' + type + '" value="' + esc(value ?? '') + '"' + (disabled ? ' disabled' : '') + '></div>';
  }
  function textRow(id, label, value, placeholder) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="f' + cap(id) + '" type="text" value="' + esc(value || '') + '" placeholder="' + placeholder + '"></div>';
  }
  function numRow(id, label, value) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="f' + cap(id) + '" type="number" min="0" value="' + (value === null || value === undefined ? '' : value) + '" placeholder="' + T().not_set + '"></div>';
  }
  function selectRow(id, label, options, value, disabled) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<select class="field-input" id="f' + cap(id) + '"' + (disabled ? ' disabled' : '') + '>' +
      options.map((o) => '<option value="' + o + '"' + (o === value ? ' selected' : '') + '>' + (o === 0 ? Alaseel.i18n.rooms.ground_floor : o) + '</option>').join('') +
      '</select></div>';
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderInventoryGrid(room) {
    const grid = document.getElementById('invGrid');
    grid.innerHTML = Alaseel.i18n.inventoryTypes.map((t) =>
      '<div class="inv-row">' +
        '<span class="inv-label">' + t.label + '</span>' +
        '<div class="stepper">' +
          '<button class="stepper-btn" data-step="-1" data-slug="' + t.slug + '">&minus;</button>' +
          '<input class="stepper-input" type="number" min="0" data-slug="' + t.slug + '" value="' + (room.inventory[t.slug] || 0) + '">' +
          '<button class="stepper-btn" data-step="1" data-slug="' + t.slug + '">+</button>' +
        '</div>' +
      '</div>'
    ).join('');

    Array.prototype.forEach.call(grid.querySelectorAll('.stepper-btn'), (btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-slug');
        const input = grid.querySelector('.stepper-input[data-slug="' + slug + '"]');
        const delta = parseInt(btn.getAttribute('data-step'), 10);
        input.value = Math.max(0, (parseInt(input.value, 10) || 0) + delta);
        updateInvTotal(grid);
      });
    });
    Array.prototype.forEach.call(grid.querySelectorAll('.stepper-input'), (input) => {
      input.addEventListener('input', () => updateInvTotal(grid));
    });
    updateInvTotal(grid);
  }

  function updateInvTotal(grid) {
    const total = Array.prototype.reduce.call(grid.querySelectorAll('.stepper-input'), (sum, i) => sum + (parseInt(i.value, 10) || 0), 0);
    document.getElementById('invTotal').textContent = T().total_items + ': ' + total;
  }

  function wireSaveButton(room) {
    document.getElementById('btnSave').addEventListener('click', () => {
      const data = Alaseel.store.get();
      const target = data.rooms.find((r) => r.room_id === room.room_id);
      if (!target) return;

      if (!target.is_special) {
        target.room_type = document.getElementById('fRoomType').value.trim();
        target.room_model = document.getElementById('fRoomModel').value || null;
        const cap = document.getElementById('fCapacity').value;
        const price = document.getElementById('fPrice').value;
        target.capacity = cap === '' ? null : parseInt(cap, 10);
        target.price_per_night = price === '' ? null : parseFloat(price);
      }
      target.status = document.getElementById('fStatus').value;
      target.notes = document.getElementById('fNotes').value;

      const invGrid = document.getElementById('invGrid');
      Alaseel.i18n.inventoryTypes.forEach((t) => {
        const input = invGrid.querySelector('.stepper-input[data-slug="' + t.slug + '"]');
        target.inventory[t.slug] = Math.max(0, parseInt(input.value, 10) || 0);
      });

      Alaseel.store.touch();
      toast(T().saved);
      render();
    });
  }

  // Renders (and re-renders, on cancel) just the delete button/confirm area,
  // kept separate from wireSaveButton so re-arming it never double-binds
  // the save button's listener.
  function wireDeleteZone(room) {
    const deleteZone = document.getElementById('deleteZone');
    if (!deleteZone) return;
    deleteZone.innerHTML = '<button class="btn btn-danger" id="btnDelete">' + T().delete_room + '</button>';
    document.getElementById('btnDelete').addEventListener('click', () => {
      deleteZone.innerHTML =
        '<div class="inline-confirm">' +
          '<span>' + T().delete_confirm_q + '</span>' +
          '<button class="btn btn-danger btn-sm" id="confirmDelete">' + T().confirm_yes + '</button>' +
          '<button class="btn btn-ghost btn-sm" id="cancelDelete">' + T().confirm_cancel + '</button>' +
        '</div>';
      document.getElementById('cancelDelete').addEventListener('click', () => wireDeleteZone(room));
      document.getElementById('confirmDelete').addEventListener('click', () => {
        const data = Alaseel.store.get();
        data.rooms = data.rooms.filter((r) => r.room_id !== room.room_id);
        Alaseel.store.touch();
        toast(T().room_deleted);
        view = { mode: 'grid', roomId: null };
        render();
      });
    });
  }

  Alaseel.rooms = Rooms;
})();
