// maintenance.js
// Fault tickets against any property location (a room, or lobby/corridors/
// roof). Opening a ticket against a currently-vacant room flips it to
// 'maint'; resolving flips it to 'dirty' (inspect/clean before it's ready
// again). An occupied room is never touched automatically — a guest
// currently staying there shouldn't have their room silently marked
// unbookable. Guest-caused repairs can bill straight to that room's folio.

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.maintenance;
  const U = Alaseel.util;

  let pane, toast;
  let view = { mode: 'list' };
  let filterStatus = 'all';
  let draft = null;

  const Maintenance = {
    mount(contentPaneEl, toastFn) {
      pane = contentPaneEl;
      toast = toastFn;
      view = { mode: 'list' };
      render();
    },
    onSearch() { /* no search surface in this module */ }
  };

  function data() { return Alaseel.store.get(); }
  function tickets() { return data().maintenanceTickets; }
  function rooms() { return data().rooms; }
  function findRoom(id) { return rooms().find((r) => r.room_id === id); }

  function render() { view.mode === 'detail' ? renderDetail() : renderList(); }

  /* ---------------- shared location helpers ---------------- */
  function locationOptions() {
    const opts = [];
    rooms().forEach((r) => {
      const label = r.is_special ? Alaseel.i18n.rooms.special_type[r.special_type] : (Alaseel.i18n.rooms.room_number + ' ' + r.room_number);
      opts.push([r.room_id, label]);
    });
    ['lobby', 'corridors', 'roof'].forEach((k) => opts.push([k, Alaseel.i18n.inventory.locations[k]]));
    return opts;
  }
  function locationLabel(key) {
    const room = findRoom(key);
    if (room) return room.is_special ? Alaseel.i18n.rooms.special_type[room.special_type] : (Alaseel.i18n.rooms.room_number + ' ' + room.room_number);
    return Alaseel.i18n.inventory.locations[key] || key;
  }

  function applyRoomMaintenanceStatus(locationKey) {
    const room = findRoom(locationKey);
    if (!room || room.status === 'occupied') return;
    room.status = 'maint';
  }
  function releaseRoomFromMaintenance(locationKey) {
    const room = findRoom(locationKey);
    if (room && room.status === 'maint') room.status = 'dirty';
  }

  /* =========================================================== */
  /*  LIST VIEW                                                    */
  /* =========================================================== */

  function renderList() {
    const filtered = tickets().filter((t) => filterStatus === 'all' || t.status === filterStatus)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    pane.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + T().title + '<span class="count">' + tickets().length + '</span></div>' +
          '<button class="btn btn-primary btn-sm" id="btnNewTicket">' + T().new_ticket + '</button>' +
        '</div>' +
        '<div class="floor-chips">' + Object.keys(T().filters).map(filterChip).join('') + '</div>' +
        (filtered.length ? tableHead() + '<div class="list-body">' + filtered.map(ticketRow).join('') + '</div>' : '<div class="empty-note">' + T().empty_list + '</div>') +
      '</section>';

    document.getElementById('btnNewTicket').addEventListener('click', startDraft);
    Array.prototype.forEach.call(pane.querySelectorAll('[data-filter]'), (btn) => {
      btn.addEventListener('click', () => { filterStatus = btn.getAttribute('data-filter'); renderList(); });
    });
    Array.prototype.forEach.call(pane.querySelectorAll('[data-ticket]'), (row) => {
      row.addEventListener('click', () => { view = { mode: 'detail', ticketId: row.getAttribute('data-ticket') }; draft = null; render(); });
    });
  }

  function filterChip(key) {
    return '<button class="chip' + (filterStatus === key ? ' active' : '') + '" data-filter="' + key + '">' + T().filters[key] + '</button>';
  }
  function tableHead() {
    const h = T().list_head;
    return '<div class="list-row list-row-head res-row-cols" style="grid-template-columns:1.5fr 1fr 1fr 1fr;">' +
      '<div class="list-cell">' + h.location + '</div><div class="list-cell">' + h.category + '</div>' +
      '<div class="list-cell">' + h.status + '</div><div class="list-cell"></div></div>';
  }
  function ticketRow(t) {
    const cls = { open: 'dirty', in_progress: 'occupied', resolved: 'clean' }[t.status];
    return '<div class="list-row res-row-cols" style="grid-template-columns:1.5fr 1fr 1fr 1fr;" data-ticket="' + t.ticket_id + '">' +
      '<div class="list-cell">' + U.esc(locationLabel(t.location)) + '</div>' +
      '<div class="list-cell">' + T().category[t.category] + '</div>' +
      '<div class="list-cell"><span class="status-badge ' + cls + '">' + T().status[t.status] + '</span></div>' +
      '<div class="list-cell">' + (t.guest_caused ? '<span class="badge badge-blacklist" style="background:var(--accent-soft);color:var(--accent-ink);">' + T().guest_caused_badge + '</span>' : '') + '</div>' +
    '</div>';
  }

  /* =========================================================== */
  /*  DETAIL / CREATE VIEW                                         */
  /* =========================================================== */

  function startDraft() {
    draft = {
      ticket_id: U.genId('mt'), location: '', category: 'ac', description: '',
      price: null, guest_caused: false, status: 'open', folio_charge_id: null,
      created_at: new Date().toISOString(), resolved_at: null
    };
    view = { mode: 'detail', ticketId: draft.ticket_id, isDraft: true };
    render();
  }

  function current() {
    if (view.isDraft) return draft;
    return tickets().find((t) => t.ticket_id === view.ticketId);
  }

  function renderDetail() {
    const t = current();
    if (!t) { view = { mode: 'list' }; return renderList(); }
    const isDraft = !!view.isDraft;
    const room = findRoom(t.location);

    pane.innerHTML =
      '<button class="back-link" id="btnBack"><span class="chevron rtl-flip">&#8250;</span>' + T().back_to_list + '</button>' +
      '<section class="panel detail-panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + (isDraft ? T().new_ticket : U.esc(locationLabel(t.location)) + ' \u2014 ' + T().category[t.category]) + '</div>' +
          (!isDraft ? '<span class="status-badge ' + { open: 'dirty', in_progress: 'occupied', resolved: 'clean' }[t.status] + '">' + T().status[t.status] + '</span>' : '') +
        '</div>' +

        '<div class="settings-body">' +
          '<div class="detail-form">' +
            selectField('mtcLocation', T().field_location, locationOptions(), t.location, !isDraft) +
            selectField('mtcCategory', T().field_category, Object.keys(T().category).map((k) => [k, T().category[k]]), t.category, !isDraft) +
            numField('mtcPrice', T().field_price, t.price, false) +
          '</div>' +
          '<div class="field-group-wide"><label class="field-label">' + T().field_description + '</label>' +
            '<textarea class="field-input" id="mtcDesc" rows="2" placeholder="' + T().field_description_placeholder + '"' + (!isDraft ? ' disabled' : '') + '>' + U.esc(t.description || '') + '</textarea></div>' +
          '<label class="checkbox-row"><input type="checkbox" id="mtcGuestCaused"' + (t.guest_caused ? ' checked' : '') + '><span>' + T().field_guest_caused + '</span></label>' +
          '<p class="hint">' + T().guest_caused_hint + '</p>' +
          (isDraft ? '<p class="hint">' + T().auto_maint_hint + '</p>' : '') +
        '</div>' +

        '<div class="auth-error" id="mtcErr" hidden></div>' +
        '<div class="detail-actions" id="mtcActions"></div>' +
      '</section>' +

      (!isDraft ? billingSectionHtml(t, room) : '');

    document.getElementById('btnBack').addEventListener('click', () => { draft = null; view = { mode: 'list' }; render(); });
    wireActions(t, isDraft, room);
  }

  function billingSectionHtml(t, room) {
    let body;
    if (!t.guest_caused) return '';
    if (!room) body = '<p class="hint">' + T().bill_not_applicable_location + '</p>';
    else if (t.folio_charge_id) body = '<p class="hint">' + T().already_billed + '</p>';
    else if (!t.price) body = '<p class="hint">' + T().bill_needs_price + '</p>';
    else body = '<button class="btn btn-secondary btn-sm" id="btnBillFolio">' + T().bill_to_folio_btn + '</button>' +
      '<div class="auth-error" id="billErr" hidden></div>';

    return '<section class="panel" style="margin-top:14px;"><div class="panel-head"><div class="panel-title">' + T().bill_section_title + '</div></div>' +
      '<div class="settings-body">' + body + '</div></section>';
  }

  function selectField(id, label, options, value, disabled) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<select class="field-input" id="' + id + '"' + (disabled ? ' disabled' : '') + '>' +
      (id === 'mtcLocation' ? '<option value="">' + T().select_location + '</option>' : '') +
      options.map(([v, l]) => '<option value="' + v + '"' + (v === value ? ' selected' : '') + '>' + l + '</option>').join('') +
      '</select></div>';
  }
  function numField(id, label, value, disabled) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="' + id + '" type="number" min="0" step="0.01" value="' + (value === null || value === undefined ? '' : value) + '"' + (disabled ? ' disabled' : '') + '></div>';
  }

  function wireActions(t, isDraft, room) {
    const actions = document.getElementById('mtcActions');
    if (isDraft) {
      actions.innerHTML = '<button class="btn btn-primary" id="btnCreateTicket">' + T().create + '</button>';
      document.getElementById('btnCreateTicket').addEventListener('click', () => saveTicket(t, true));
    } else {
      let btns = '<button class="btn btn-primary" id="btnSaveTicket">' + T().save_changes + '</button>';
      if (t.status === 'open') btns += '<button class="btn btn-secondary" id="btnStartWork">' + T().start_work + '</button>';
      if (t.status === 'open' || t.status === 'in_progress') btns += '<button class="btn btn-secondary" id="btnResolve">' + T().mark_resolved + '</button>';
      if (t.status === 'resolved') btns += '<button class="btn btn-ghost" id="btnReopen">' + T().reopen + '</button>';
      actions.innerHTML = btns + '<div id="deleteZoneMt"></div>';

      document.getElementById('btnSaveTicket').addEventListener('click', () => saveTicket(t, false));
      const btnStart = document.getElementById('btnStartWork');
      if (btnStart) btnStart.addEventListener('click', () => { t.status = 'in_progress'; Alaseel.store.touch(); renderDetail(); });
      const btnResolve = document.getElementById('btnResolve');
      if (btnResolve) btnResolve.addEventListener('click', () => {
        t.status = 'resolved'; t.resolved_at = new Date().toISOString();
        releaseRoomFromMaintenance(t.location);
        Alaseel.store.touch();
        renderDetail();
      });
      const btnReopen = document.getElementById('btnReopen');
      if (btnReopen) btnReopen.addEventListener('click', () => {
        t.status = 'open'; t.resolved_at = null;
        applyRoomMaintenanceStatus(t.location);
        Alaseel.store.touch();
        renderDetail();
      });
      wireDeleteZone(t);
    }

    const btnBillFolio = document.getElementById('btnBillFolio');
    if (btnBillFolio) btnBillFolio.addEventListener('click', () => {
      const err = document.getElementById('billErr');
      err.hidden = true;
      if (!room) return;
      const res = U.postFolioCharge(room.room_number, {
        source: 'maintenance',
        description: T().category[t.category] + ': ' + (t.description || ''),
        amount: t.price
      });
      if (res.ok) {
        t.folio_charge_id = res.charge.charge_id;
        Alaseel.store.touch();
        toast(T().bill_success);
        renderDetail();
      } else {
        showErr(err, res.error === 'ROOM_NOT_FOUND' ? T().bill_room_not_found : T().bill_no_active_guest);
      }
    });
  }

  function saveTicket(t, isDraft) {
    const err = document.getElementById('mtcErr');
    err.hidden = true;
    const location = document.getElementById('mtcLocation').value;
    if (!location) { showErr(err, T().location_required); return; }

    const updated = {
      ticket_id: t.ticket_id,
      location,
      category: document.getElementById('mtcCategory').value,
      description: document.getElementById('mtcDesc').value.trim(),
      price: (function () { const v = document.getElementById('mtcPrice').value; return v === '' ? null : parseFloat(v); })(),
      guest_caused: document.getElementById('mtcGuestCaused').checked,
      status: t.status, folio_charge_id: t.folio_charge_id,
      created_at: t.created_at || new Date().toISOString(), resolved_at: t.resolved_at
    };

    const d = data();
    if (isDraft) {
      applyRoomMaintenanceStatus(location);
      d.maintenanceTickets.push(updated);
      toast(T().created);
    } else {
      const idx = d.maintenanceTickets.findIndex((x) => x.ticket_id === t.ticket_id);
      if (idx !== -1) d.maintenanceTickets[idx] = updated;
      toast(T().saved);
    }
    Alaseel.store.touch();
    draft = null;
    view = { mode: 'detail', ticketId: updated.ticket_id, isDraft: false };
    render();
  }

  function wireDeleteZone(t) {
    const zone = document.getElementById('deleteZoneMt');
    if (!zone) return;
    zone.innerHTML = '<button class="btn btn-danger btn-sm" id="btnDeleteTicket">' + T().delete + '</button>';
    document.getElementById('btnDeleteTicket').addEventListener('click', () => {
      zone.innerHTML = '<div class="inline-confirm"><span>' + T().delete_confirm_q + '</span>' +
        '<button class="btn btn-danger btn-sm" id="confirmDelMt">' + T().confirm_yes + '</button>' +
        '<button class="btn btn-ghost btn-sm" id="cancelDelMt">' + T().confirm_cancel + '</button></div>';
      document.getElementById('cancelDelMt').addEventListener('click', () => wireDeleteZone(t));
      document.getElementById('confirmDelMt').addEventListener('click', () => {
        const d = data();
        d.maintenanceTickets = d.maintenanceTickets.filter((x) => x.ticket_id !== t.ticket_id);
        Alaseel.store.touch();
        toast(T().deleted);
        view = { mode: 'list' };
        render();
      });
    });
  }

  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }

  Alaseel.maintenance = Maintenance;
})();
