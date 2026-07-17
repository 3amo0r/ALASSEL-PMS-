// reservations.js
// The Booking Engine. Two-column detail layout: booking form on the wide
// side, a live "guest history" sidebar on the narrow side that populates
// the moment a guest is selected — the dynamic-sidebar requirement from
// spec Module 5. Room picker only shows bookable rooms and labels ones
// that conflict with the chosen dates. Check-in/out mutate the shared
// room record directly (same store, same array Phase 1's rooms.js reads).

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.reservations;
  const U = Alaseel.util;
  const CURRENCIES = ['EGP', 'USD', 'EUR', 'SAR', 'AED'];

  let pane, toast;
  let view = { mode: 'list' };
  let filterStatus = 'all';
  let searchTerm = '';
  let draft = null;
  let guestPickerOpen = false;
  let guestPickerQuery = '';

  const Reservations = {
    mount(contentPaneEl, toastFn, intent) {
      pane = contentPaneEl;
      toast = toastFn;
      if (intent && intent.action === 'create') {
        startDraft(intent.guestId || '');
      } else {
        view = { mode: 'list' };
      }
      render();
    },
    onSearch(term) {
      searchTerm = (term || '').trim().toLowerCase();
      if (view.mode === 'list') render();
    }
  };

  function data() { return Alaseel.store.get(); }
  function reservations() { return data().reservations; }
  function guests() { return data().guests; }
  function rooms() { return data().rooms; }
  function findGuest(id) { return guests().find((g) => g.guest_id === id); }
  function findRoom(id) { return rooms().find((r) => r.room_id === id); }

  function render() { view.mode === 'detail' ? renderDetail() : renderList(); }

  /* =========================================================== */
  /*  LIST VIEW                                                    */
  /* =========================================================== */

  function renderList() {
    const filtered = reservations().filter((r) => {
      if (filterStatus !== 'all' && r.reservation_status !== filterStatus) return false;
      if (!searchTerm) return true;
      const g = findGuest(r.guest_id);
      const room = findRoom(r.room_id);
      const hay = [(g && g.full_name), (room && room.room_number)].join(' ').toLowerCase();
      return hay.indexOf(searchTerm) !== -1;
    }).sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date));

    pane.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + T().title + '<span class="count">' + reservations().length + '</span></div>' +
          '<button class="btn btn-primary btn-sm" id="btnNewRes">' + T().new_reservation + '</button>' +
        '</div>' +
        '<div class="floor-chips">' + Object.keys(T().filters).map(filterChip).join('') + '</div>' +
        (filtered.length ? tableHead() + '<div class="list-body">' + filtered.map(resRow).join('') + '</div>' : '<div class="empty-note">' + T().empty_list + '</div>') +
      '</section>';

    document.getElementById('btnNewRes').addEventListener('click', () => startDraft(''));
    Array.prototype.forEach.call(pane.querySelectorAll('[data-filter]'), (btn) => {
      btn.addEventListener('click', () => { filterStatus = btn.getAttribute('data-filter'); renderList(); });
    });
    Array.prototype.forEach.call(pane.querySelectorAll('[data-res]'), (row) => {
      row.addEventListener('click', () => {
        const target = reservations().find((x) => x.reservation_id === row.getAttribute('data-res'));
        if (target) target._totalAutoFill = false;
        view = { mode: 'detail', reservationId: row.getAttribute('data-res') };
        draft = null;
        render();
      });
    });
  }

  function filterChip(key) {
    return '<button class="chip' + (filterStatus === key ? ' active' : '') + '" data-filter="' + key + '">' + T().filters[key] + '</button>';
  }

  function tableHead() {
    const h = T().list_head;
    return '<div class="list-row list-row-head res-row-cols">' +
      ['guest', 'room', 'check_in', 'check_out', 'status', 'payment'].map((k) => '<div class="list-cell">' + h[k] + '</div>').join('') +
    '</div>';
  }

  function resRow(r) {
    const g = findGuest(r.guest_id);
    const room = findRoom(r.room_id);
    return '<div class="list-row res-row-cols" data-res="' + r.reservation_id + '">' +
      '<div class="list-cell">' + U.esc(g ? g.full_name : '\u2014') + (g && g.blacklisted ? ' <span class="badge badge-blacklist">' + Alaseel.i18n.guests.blacklisted_badge + '</span>' : '') + '</div>' +
      '<div class="list-cell ltr-num">' + (room ? room.room_number : '\u2014') + '</div>' +
      '<div class="list-cell ltr-num">' + U.fmtDate(r.check_in_date) + '</div>' +
      '<div class="list-cell ltr-num">' + U.fmtDate(r.check_out_date) + '</div>' +
      '<div class="list-cell">' + statusBadge(r.reservation_status) + '</div>' +
      '<div class="list-cell">' + paymentBadge(r.payment_status) + '</div>' +
    '</div>';
  }

  function statusBadge(s) {
    const cls = { confirmed: 'clean', checked_in: 'occupied', checked_out: 'oo', cancelled: 'maint', no_show: 'maint' }[s] || 'oo';
    return '<span class="status-badge ' + cls + '">' + T().status[s] + '</span>';
  }
  function paymentBadge(s) {
    const cls = { unpaid: 'maint', partial: 'dirty', paid: 'clean', refunded: 'oo' }[s] || 'oo';
    return '<span class="status-badge ' + cls + '">' + T().payment[s] + '</span>';
  }

  /* =========================================================== */
  /*  DETAIL / CREATE VIEW                                         */
  /* =========================================================== */

  function startDraft(preselectGuestId) {
    draft = {
      reservation_id: U.genId('rv'), guest_id: preselectGuestId || '', room_id: '',
      check_in_date: '', check_out_date: '', arrival_time: '', adults: 1, children: 0,
      reservation_status: 'confirmed', payment_status: 'unpaid',
      total_amount: null, currency: 'EGP', deposit_amount: null, promo_code: '',
      special_requests: '', folio_charges: [], _totalAutoFill: true,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    guestPickerOpen = !preselectGuestId;
    guestPickerQuery = '';
    view = { mode: 'detail', reservationId: draft.reservation_id, isDraft: true };
    render();
  }

  function current() {
    if (view.isDraft) return draft;
    return reservations().find((r) => r.reservation_id === view.reservationId);
  }

  // Full re-renders (triggered by picking a guest or reassigning the room)
  // rebuild the whole form from this object's stored values. Any field the
  // user already typed into needs to be captured back into it FIRST, or a
  // re-render would silently discard it.
  function syncFieldsToModel(target) {
    if (!target) return;
    const textLike = { rvCheckIn: 'check_in_date', rvCheckOut: 'check_out_date', rvArrival: 'arrival_time', rvPromo: 'promo_code', rvRequests: 'special_requests' };
    Object.keys(textLike).forEach((id) => {
      const el = document.getElementById(id);
      if (el) target[textLike[id]] = el.value;
    });
    const adultsEl = document.getElementById('rvAdults');
    if (adultsEl) target.adults = Math.max(1, parseInt(adultsEl.value, 10) || 1);
    const childrenEl = document.getElementById('rvChildren');
    if (childrenEl) target.children = Math.max(0, parseInt(childrenEl.value, 10) || 0);
    const totalEl = document.getElementById('rvTotal');
    if (totalEl) target.total_amount = totalEl.value === '' ? null : parseFloat(totalEl.value);
    const currencyEl = document.getElementById('rvCurrency');
    if (currencyEl) target.currency = currencyEl.value;
    const depositEl = document.getElementById('rvDeposit');
    if (depositEl) target.deposit_amount = depositEl.value === '' ? null : parseFloat(depositEl.value);
  }

  function renderDetail() {
    const r = current();
    if (!r) { view = { mode: 'list' }; return renderList(); }
    const isDraft = !!view.isDraft;
    const locked = !isDraft && (r.reservation_status === 'checked_out' || r.reservation_status === 'cancelled');
    const guest = r.guest_id ? findGuest(r.guest_id) : null;
    const room = r.room_id ? findRoom(r.room_id) : null;

    pane.innerHTML =
      '<button class="back-link" id="btnBack"><span class="chevron rtl-flip">&#8250;</span>' + T().back_to_list + '</button>' +
      '<div class="booking-layout">' +
        '<div class="booking-main">' + mainFormHtml(r, isDraft, locked, guest, room) + '</div>' +
        '<div class="booking-sidebar">' + sidebarHtml(guest, room) + '</div>' +
      '</div>';

    wireBackAndStatics(r, isDraft, locked, guest, room);
  }

  /* ---------------- main form ---------------- */
  function mainFormHtml(r, isDraft, locked, guest, room) {
    return (
      '<section class="panel detail-panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + (isDraft ? T().new_reservation : (guest ? U.esc(guest.full_name) : T().new_reservation)) + '</div>' +
          (!isDraft ? statusBadge(r.reservation_status) : '') +
        '</div>' +

        (locked ? '<div class="notice-banner">' + T().locked_notice + '</div>' : '') +
        (!isDraft && r.reservation_status === 'checked_in' && r.payment_status !== 'paid' && r.payment_status !== 'refunded'
          ? '<div class="notice-banner danger">' + T().checkout_payment_warning + '</div>' : '') +

        '<div class="settings-body">' +
          '<h3 class="form-section-label">' + T().guest_section + '</h3>' +
          '<div id="guestSection">' + guestSectionHtml(r, isDraft, guest) + '</div>' +

          '<h3 class="form-section-label">' + T().room_section + '</h3>' +
          '<div id="roomSection">' + roomSectionHtml(r, isDraft, locked, room) + '</div>' +

          '<h3 class="form-section-label">' + T().stay_section + '</h3>' +
          '<div class="detail-form">' +
            dateField('rvCheckIn', T().check_in_date, r.check_in_date, locked) +
            dateField('rvCheckOut', T().check_out_date, r.check_out_date, locked) +
            textField('rvArrival', T().arrival_time, r.arrival_time, locked) +
            numField('rvAdults', T().adults, r.adults, locked, 1) +
            numField('rvChildren', T().children, r.children, locked, 0) +
          '</div>' +

          '<h3 class="form-section-label">' + T().financial_section + '</h3>' +
          '<div class="detail-form">' +
            numField('rvTotal', T().total_amount, r.total_amount, locked) +
            selectField('rvCurrency', T().currency, CURRENCIES.map((c) => [c, c]), r.currency, locked) +
            numField('rvDeposit', T().deposit_amount, r.deposit_amount, locked) +
            textField('rvPromo', T().promo_code, r.promo_code, locked) +
          '</div>' +
          '<div class="field-group-wide"><label class="field-label">' + T().special_requests + '</label>' +
            '<textarea class="field-input" id="rvRequests" rows="2" placeholder="' + T().special_requests_placeholder + '"' + (locked ? ' disabled' : '') + '>' + U.esc(r.special_requests || '') + '</textarea></div>' +

          (!isDraft ? statusControlsHtml(r, locked) : '') +
        '</div>' +

        '<div class="auth-error" id="rvErr" hidden></div>' +

        '<div class="detail-actions" id="rvActions"></div>' +
      '</section>' +

      (!isDraft ? folioSectionHtml(r) : '') +
      (!isDraft ? '<div id="checkoutReviewZone"></div>' : '')
    );
  }

  function statusControlsHtml(r, locked) {
    return '<h3 class="form-section-label">' + T().reservation_status + ' / ' + T().payment_status + '</h3>' +
      '<div class="detail-form">' +
        selectField('rvResStatus', T().reservation_status, Object.keys(T().status).map((k) => [k, T().status[k]]), r.reservation_status, locked) +
        selectField('rvPayStatus', T().payment_status, Object.keys(T().payment).map((k) => [k, T().payment[k]]), r.payment_status, locked) +
      '</div>';
  }

  function guestSectionHtml(r, isDraft, guest) {
    const canChange = isDraft; // guest is locked once a reservation is saved — see design note in chat
    if (guest && !guestPickerOpen) {
      return guestCardHtml(guest, canChange);
    }
    if (!isDraft) {
      return '<div class="empty-note">' + T().no_guest_selected + '</div>';
    }
    return guestPickerHtml();
  }

  function guestCardHtml(guest, canChange) {
    return '<div class="selected-card">' +
      '<div><strong>' + U.esc(guest.full_name) + '</strong>' +
        '<div class="selected-card-badges">' +
          (guest.vip_level && guest.vip_level !== 'none' ? '<span class="badge badge-vip-' + guest.vip_level + '">' + Alaseel.i18n.guests.vip[guest.vip_level] + '</span>' : '') +
          (guest.blacklisted ? '<span class="badge badge-blacklist">' + Alaseel.i18n.guests.blacklisted_badge + '</span>' : '') +
        '</div>' +
        '<div class="hint" style="margin:4px 0 0;">' + U.esc(guest.phone || '') + '</div>' +
      '</div>' +
      (canChange ? '<button class="btn btn-ghost btn-sm" id="btnChangeGuest">' + T().change_guest + '</button>' : '') +
    '</div>' +
    (guest.blacklisted ? '<div class="notice-banner danger">' + T().blacklist_warning + (guest.blacklist_reason ? ' \u2014 ' + U.esc(guest.blacklist_reason) : '') + '</div>' : '');
  }

  function guestPickerHtml() {
    const matches = guestPickerQuery ? guests().filter((g) => {
      const hay = [g.full_name, g.phone, g.passport_number].join(' ').toLowerCase();
      return hay.indexOf(guestPickerQuery.toLowerCase()) !== -1;
    }).slice(0, 8) : [];

    return '<div class="guest-picker-box">' +
      '<input class="field-input" id="gpInput" type="text" placeholder="' + T().select_guest_placeholder + '" value="' + U.esc(guestPickerQuery) + '">' +
      '<div class="guest-picker-results" id="gpResults">' +
        (guestPickerQuery && matches.length === 0 ? '<div class="empty-note">\u2014</div>' : matches.map((g) =>
          '<div class="guest-picker-row" data-pick-guest="' + g.guest_id + '">' +
            '<span>' + U.esc(g.full_name) + '</span>' +
            '<span class="hint" style="margin:0;">' + U.esc(g.phone || '') + '</span>' +
          '</div>'
        ).join('')) +
      '</div>' +
      '<button class="link-btn" id="btnAddNewGuest" style="margin-top:8px;">' + T().add_new_guest_link + '</button>' +
    '</div>';
  }

  function roomSectionHtml(r, isDraft, locked, room) {
    const canChange = isDraft || (!locked && r.reservation_status === 'confirmed');
    let html = '';
    if (room) {
      const sentiment = U.roomSentiment(room.room_id);
      html += '<div class="selected-card">' +
        '<div><strong class="ltr-num">' + room.room_number + '</strong> \u00b7 ' + U.esc(room.room_type || Alaseel.i18n.rooms.not_set) +
          (room.price_per_night ? '<div class="hint" style="margin:4px 0 0;">' + room.price_per_night + ' / \u0644\u064a\u0644\u0629</div>' : '') +
        '</div>' +
        (canChange ? '<button class="btn btn-ghost btn-sm" id="btnChangeRoom">\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u063a\u0631\u0641\u0629</button>' : '') +
      '</div>';
      if (sentiment && sentiment.flagged) {
        html += '<div class="notice-banner danger">' + T().room_sentiment_warning + ' (' + sentiment.avg.toFixed(1) + '\u2605 \u00b7 ' + sentiment.count + ' ' + Alaseel.i18n.rooms.sentiment_count_suffix + ')</div>';
      }
      if (!room.bookable) {
        html += '<div class="notice-banner">' + Alaseel.i18n.rooms.special_not_bookable_office + '</div>';
      } else if (room.status === 'maint' || room.status === 'oo') {
        html += '<div class="notice-banner">' + T().room_status_notice_prefix + ' ' + Alaseel.i18n.rooms.status[room.status] + '</div>';
      }
    }
    if (!room || canChange) {
      html += roomPickerHtml(r, room);
    }
    return html;
  }

  function roomPickerHtml(r, currentRoom) {
    const ciEl = document.getElementById('rvCheckIn');
    const coEl = document.getElementById('rvCheckOut');
    const ci = ciEl ? ciEl.value : r.check_in_date;
    const co = coEl ? coEl.value : r.check_out_date;
    const bookable = rooms().filter((rm) => rm.bookable);

    const options = bookable.map((rm) => {
      let label = rm.room_number + ' \u2014 ' + (rm.room_type || Alaseel.i18n.rooms.not_set);
      if (ci && co && hasOverlap(rm.room_id, ci, co, r.reservation_id)) {
        label += ' (' + T().overlap_error + ')';
      }
      return '<option value="' + rm.room_id + '"' + (rm.room_id === (currentRoom && currentRoom.room_id) ? ' selected' : '') + '>' + label + '</option>';
    }).join('');

    return '<select class="field-input" id="rvRoomSelect"><option value="">' + T().select_room_placeholder + '</option>' + options + '</select>';
  }

  /* ---------------- sidebar: guest review history ---------------- */
  function sidebarHtml(guest, room) {
    if (!guest) {
      return '<div class="sidebar-panel"><div class="sidebar-panel-title">' + T().guest_review_summary_title + '</div>' +
        '<div class="empty-note">' + T().no_guest_selected + '</div></div>';
    }
    const summary = U.guestReviewSummary(guest.guest_id);
    let html = '<div class="sidebar-panel">' +
      '<div class="sidebar-panel-title">' + T().guest_review_summary_title + '</div>';

    if (!summary.count) {
      html += '<div class="empty-note">' + T().no_past_reviews + '</div>';
    } else {
      html += '<div class="review-summary-stat">' + summary.avg.toFixed(1) + ' <span class="review-summary-stars">' + U.stars(summary.avg) + '</span></div>' +
        '<div class="hint" style="margin:2px 0 12px;">' + T().past_reviews_count_label + ': ' + summary.count + '</div>';
      summary.recent.forEach((rv) => {
        const rm = findRoom(rv.room_id);
        html += '<div class="review-item">' +
          '<div class="review-item-score">' + U.stars(rv.score) + '</div>' +
          '<div class="review-item-meta">' + (rm ? '\u063a\u0631\u0641\u0629 ' + rm.room_number + ' \u00b7 ' : '') + T().review_categories[rv.category] + ' \u00b7 ' + U.fmtDate(rv.created_at) + '</div>' +
          (rv.comment ? '<div class="review-item-comment">' + U.esc(rv.comment) + '</div>' : '') +
        '</div>';
      });
    }
    html += '</div>';
    return html;
  }

  /* ---------------- folio ---------------- */
  function folioSectionHtml(r) {
    const isOpen = r.reservation_status === 'checked_in';
    const charges = r.folio_charges || [];
    const grandTotal = U.folioGrandTotal(r);

    let html = '<section class="panel" style="margin-top:14px;"><div class="panel-head"><div class="panel-title">' + T().folio_title + '</div></div>' +
      '<div class="settings-body">' +
        '<div class="folio-row"><span>' + T().folio_room_charge + '</span><span class="ltr-num">' + (r.total_amount || 0) + ' ' + r.currency + '</span></div>';

    if (!charges.length) {
      html += '<div class="empty-note">' + T().folio_no_charges + '</div>';
    } else {
      charges.forEach((c) => {
        html += '<div class="folio-row"><span>' + U.esc(c.description || T().folio_charge_sources[c.source]) +
          ' <span class="hint" style="margin:0;">(' + T().folio_charge_sources[c.source] +
          (c.transferred_from_room ? ' \u00b7 ' + T().folio_transferred_from_prefix + ' ' + c.transferred_from_room : '') + ')</span></span>' +
          '<span style="display:flex;align-items:center;gap:8px;">' +
            '<span class="ltr-num">' + c.amount + ' ' + c.currency + '</span>' +
            '<button class="btn btn-ghost btn-sm" data-transfer-charge="' + c.charge_id + '">' + T().folio_transfer_btn + '</button>' +
          '</span></div>' +
          '<div id="transferZone-' + c.charge_id + '"></div>';
      });
    }
    html += '<div class="folio-row folio-total-row"><span>' + T().folio_grand_total + '</span><span class="ltr-num">' + grandTotal.toFixed(2) + ' ' + r.currency + '</span></div>';

    if (isOpen) {
      html += '<div class="add-charge-form" id="addChargeForm">' +
        '<h3 class="form-section-label">' + T().folio_add_charge + '</h3>' +
        '<div class="inline-form-row">' +
          '<div><label class="field-label">' + T().folio_charge_source + '</label>' +
            '<select class="field-input" id="fcSource">' +
              Object.keys(T().folio_charge_sources).map((k) => '<option value="' + k + '">' + T().folio_charge_sources[k] + '</option>').join('') +
            '</select></div>' +
          '<div><label class="field-label">' + T().folio_charge_amount + '</label>' +
            '<input class="field-input" id="fcAmount" type="number" min="0" step="0.01"></div>' +
        '</div>' +
        '<label class="field-label">' + T().folio_charge_description + '</label>' +
        '<input class="field-input" id="fcDesc" type="text" placeholder="' + T().folio_charge_description_placeholder + '">' +
        '<button class="btn btn-secondary btn-sm" id="btnAddCharge">' + T().folio_add_charge_btn + '</button>' +
      '</div>';
    } else {
      html += '<p class="hint">' + T().folio_only_when_checked_in + '</p>';
    }

    html += '</div></section>';
    return html;
  }

  /* ---------------- field builders ---------------- */
  function textField(id, label, value, disabled) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="' + id + '" type="text" value="' + U.esc(value || '') + '"' + (disabled ? ' disabled' : '') + '></div>';
  }
  function dateField(id, label, value, disabled) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="' + id + '" type="date" value="' + (value || '') + '"' + (disabled ? ' disabled' : '') + '></div>';
  }
  function numField(id, label, value, disabled, min) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="' + id + '" type="number" min="' + (min !== undefined ? min : 0) + '" value="' + (value === null || value === undefined ? '' : value) + '"' + (disabled ? ' disabled' : '') + '></div>';
  }
  function selectField(id, label, options, value, disabled) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<select class="field-input" id="' + id + '"' + (disabled ? ' disabled' : '') + '>' +
      options.map(([v, l]) => '<option value="' + v + '"' + (v === value ? ' selected' : '') + '>' + l + '</option>').join('') +
      '</select></div>';
  }

  /* =========================================================== */
  /*  Wiring                                                       */
  /* =========================================================== */

  function wireBackAndStatics(r, isDraft, locked, guest, room) {
    document.getElementById('btnBack').addEventListener('click', () => { draft = null; view = { mode: 'list' }; render(); });

    const gpInput = document.getElementById('gpInput');
    if (gpInput) {
      gpInput.addEventListener('input', (e) => {
        guestPickerQuery = e.target.value;
        document.getElementById('guestSection').innerHTML = guestSectionHtml(r, isDraft, guest);
        wireGuestSectionOnly(r, isDraft, guest);
        const freshInput = document.getElementById('gpInput');
        if (freshInput) { freshInput.focus(); freshInput.setSelectionRange(freshInput.value.length, freshInput.value.length); }
      });
      gpInput.focus();
    }
    wireGuestSectionOnly(r, isDraft, guest);
    wireRoomSectionOnly(r);

    const totalEl = document.getElementById('rvTotal');
    if (totalEl && !totalEl.disabled) totalEl.addEventListener('input', () => { (view.isDraft ? draft : r)._totalAutoFill = false; });

    ['rvCheckIn', 'rvCheckOut'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.disabled) el.addEventListener('change', () => {
        syncFieldsToModel(r);
        maybeAutoFillTotal(r);
        document.getElementById('roomSection').innerHTML = roomSectionHtml(r, isDraft, locked, room);
        wireRoomSectionOnly(r);
      });
    });

    const actions = document.getElementById('rvActions');
    if (isDraft) {
      actions.innerHTML = '<button class="btn btn-primary" id="btnCreate">' + T().create + '</button>';
      document.getElementById('btnCreate').addEventListener('click', () => saveReservation(r, true));
    } else if (!locked) {
      actions.innerHTML =
        '<button class="btn btn-primary" id="btnSaveRes">' + T().save_changes + '</button>' +
        actionButtonsHtml(r) +
        '<div id="deleteZoneRv"></div>';
      document.getElementById('btnSaveRes').addEventListener('click', () => saveReservation(r, false));
      wireLifecycleButtons(r);
      wireDeleteZone(r);
    } else {
      actions.innerHTML = '<div id="deleteZoneRv"></div>';
      wireDeleteZone(r);
    }

    const btnAddCharge = document.getElementById('btnAddCharge');
    if (btnAddCharge) btnAddCharge.addEventListener('click', () => {
      const room2 = findRoom(r.room_id);
      const amount = parseFloat(document.getElementById('fcAmount').value);
      if (!room2 || !amount || amount <= 0) return;
      const res = U.postFolioCharge(room2.room_number, {
        source: document.getElementById('fcSource').value,
        description: document.getElementById('fcDesc').value.trim(),
        amount: amount,
        currency: r.currency
      });
      if (res.ok) { toast(T().folio_charge_added_toast); renderDetail(); }
    });

    wireFolioTransferButtons(r);
  }

  function wireFolioTransferButtons(r) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-transfer-charge]'), (btn) => {
      btn.addEventListener('click', () => {
        const chargeId = btn.getAttribute('data-transfer-charge');
        const zone = document.getElementById('transferZone-' + chargeId);
        if (!zone) return;
        zone.innerHTML =
          '<div class="inline-form">' +
            '<div class="inline-form-row">' +
              '<div><label class="field-label">' + T().folio_transfer_target_room + '</label>' +
                '<input class="field-input" id="tf-room-' + chargeId + '" type="number" min="1"></div>' +
              '<div><label class="field-label">' + T().folio_transfer_reason + '</label>' +
                '<input class="field-input" id="tf-reason-' + chargeId + '" type="text" placeholder="' + T().folio_transfer_reason_placeholder + '"></div>' +
            '</div>' +
            '<div class="auth-error" id="tf-err-' + chargeId + '" hidden></div>' +
            '<div class="inline-form-actions">' +
              '<button class="btn btn-primary btn-sm" id="tf-confirm-' + chargeId + '">' + T().folio_transfer_confirm + '</button>' +
              '<button class="btn btn-ghost btn-sm" id="tf-cancel-' + chargeId + '">' + T().folio_transfer_cancel + '</button>' +
            '</div>' +
          '</div>';

        document.getElementById('tf-cancel-' + chargeId).addEventListener('click', () => { zone.innerHTML = ''; });
        document.getElementById('tf-confirm-' + chargeId).addEventListener('click', () => {
          const err = document.getElementById('tf-err-' + chargeId);
          err.hidden = true;
          const targetRoom = parseInt(document.getElementById('tf-room-' + chargeId).value, 10);
          const reason = document.getElementById('tf-reason-' + chargeId).value;

          if (!reason || !reason.trim()) { showErr(err, T().folio_transfer_reason_required); return; }
          if (!targetRoom) { showErr(err, T().folio_transfer_room_not_found); return; }

          const result = U.transferFolioCharge(r.reservation_id, chargeId, targetRoom, reason);
          if (result.ok) {
            toast(T().folio_transfer_success);
            renderDetail();
          } else {
            const msgMap = {
              ROOM_NOT_FOUND: T().folio_transfer_room_not_found,
              NO_ACTIVE_GUEST: T().folio_transfer_no_active_guest,
              SAME_ROOM: T().folio_transfer_same_room,
              REASON_REQUIRED: T().folio_transfer_reason_required
            };
            showErr(err, msgMap[result.error] || result.error);
          }
        });
      });
    });
  }

  function wireGuestSectionOnly(r, isDraft, guest) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-pick-guest]'), (row) => {
      row.addEventListener('click', () => {
        syncFieldsToModel(r);
        draft.guest_id = row.getAttribute('data-pick-guest');
        guestPickerOpen = false;
        renderDetail();
      });
    });
    const btnAddNewGuest = document.getElementById('btnAddNewGuest');
    if (btnAddNewGuest) btnAddNewGuest.addEventListener('click', () => {
      syncFieldsToModel(r);
      Alaseel.app.navigateTo('guests', { tab: 'guests', action: 'create' });
    });
    const btnChangeGuest = document.getElementById('btnChangeGuest');
    if (btnChangeGuest) btnChangeGuest.addEventListener('click', () => {
      syncFieldsToModel(r);
      guestPickerOpen = true; guestPickerQuery = ''; renderDetail();
    });
  }

  function wireRoomSectionOnly(r) {
    const roomSelect = document.getElementById('rvRoomSelect');
    if (roomSelect) roomSelect.addEventListener('change', (e) => {
      syncFieldsToModel(r);
      (view.isDraft ? draft : r).room_id = e.target.value;
      maybeAutoFillTotal(view.isDraft ? draft : r);
      renderDetail();
    });
    const btnChangeRoom = document.getElementById('btnChangeRoom');
    if (btnChangeRoom) btnChangeRoom.addEventListener('click', () => {
      syncFieldsToModel(r);
      (view.isDraft ? draft : r).room_id = '';
      renderDetail();
    });
  }

  function actionButtonsHtml(r) {
    if (r.reservation_status === 'confirmed') {
      return '<button class="btn btn-secondary" id="btnCheckin">' + T().do_checkin + '</button>' +
        '<button class="btn btn-ghost" id="btnCancelRes">' + T().do_cancel + '</button>';
    }
    if (r.reservation_status === 'checked_in') {
      return '<button class="btn btn-secondary" id="btnCheckout">' + T().do_checkout + '</button>';
    }
    return '';
  }

  function wireLifecycleButtons(r) {
    const btnCheckin = document.getElementById('btnCheckin');
    if (btnCheckin) btnCheckin.addEventListener('click', () => {
      const room = findRoom(r.room_id);
      r.reservation_status = 'checked_in';
      r.updated_at = new Date().toISOString();
      if (room) room.status = 'occupied';
      Alaseel.store.touch();
      toast(T().checked_in_toast);
      renderDetail();
    });

    const btnCheckout = document.getElementById('btnCheckout');
    if (btnCheckout) btnCheckout.addEventListener('click', () => {
      if (r.payment_status !== 'paid' && r.payment_status !== 'refunded') {
        toast(T().checkout_blocked_unpaid);
        return;
      }
      const room = findRoom(r.room_id);
      r.reservation_status = 'checked_out';
      r.updated_at = new Date().toISOString();
      if (room) room.status = 'dirty';
      Alaseel.store.touch();
      toast(T().checked_out_toast);
      renderDetail();
      showCheckoutReviewCapture(r);
    });

    const btnCancel = document.getElementById('btnCancelRes');
    if (btnCancel) btnCancel.addEventListener('click', () => {
      r.reservation_status = 'cancelled';
      r.updated_at = new Date().toISOString();
      Alaseel.store.touch();
      toast(T().cancelled_toast);
      renderDetail();
    });
  }

  function showCheckoutReviewCapture(r) {
    const zone = document.getElementById('checkoutReviewZone');
    if (!zone) return;
    let selectedScore = 5;
    zone.innerHTML =
      '<section class="panel" style="margin-top:14px;"><div class="panel-head"><div class="panel-title">' + T().review_capture_title + '</div></div>' +
        '<div class="settings-body">' +
          '<p class="hint">' + T().review_capture_hint + '</p>' +
          '<div class="star-input" id="starInput">' + [1, 2, 3, 4, 5].map((n) => '<span data-star="' + n + '" class="star-on">\u2605</span>').join('') + '</div>' +
          '<label class="field-label">' + T().review_category + '</label>' +
          '<select class="field-input" id="revCategory">' +
            Object.keys(T().review_categories).map((k) => '<option value="' + k + '">' + T().review_categories[k] + '</option>').join('') +
          '</select>' +
          '<textarea class="field-input" id="revComment" rows="2" placeholder="' + T().review_comment_placeholder + '"></textarea>' +
          '<div class="inline-form-actions">' +
            '<button class="btn btn-primary btn-sm" id="btnSaveReview">' + T().review_save + '</button>' +
            '<button class="btn btn-ghost btn-sm" id="btnSkipReview">' + T().review_skip + '</button>' +
          '</div>' +
        '</div>' +
      '</section>';

    const starEls = zone.querySelectorAll('[data-star]');
    function paintStars() {
      starEls.forEach((el) => el.classList.toggle('star-on', parseInt(el.getAttribute('data-star'), 10) <= selectedScore));
    }
    paintStars();
    starEls.forEach((el) => el.addEventListener('click', () => { selectedScore = parseInt(el.getAttribute('data-star'), 10); paintStars(); }));

    document.getElementById('btnSkipReview').addEventListener('click', () => { zone.innerHTML = ''; });
    document.getElementById('btnSaveReview').addEventListener('click', () => {
      const d = data();
      d.reviews.push({
        review_id: U.genId('rev'), guest_id: r.guest_id, room_id: r.room_id, reservation_id: r.reservation_id,
        score: selectedScore, category: document.getElementById('revCategory').value,
        comment: document.getElementById('revComment').value.trim(), created_at: new Date().toISOString()
      });
      Alaseel.store.touch();
      toast(T().review_saved_toast);
      zone.innerHTML = '';
    });
  }

  function wireDeleteZone(r) {
    const zone = document.getElementById('deleteZoneRv');
    if (!zone) return;
    zone.innerHTML = '<button class="btn btn-danger" id="btnDeleteRv">' + T().delete + '</button>';
    document.getElementById('btnDeleteRv').addEventListener('click', () => {
      zone.innerHTML = '<div class="inline-confirm"><span>' + T().delete_confirm_q + '</span>' +
        '<button class="btn btn-danger btn-sm" id="confirmDeleteRv">' + T().confirm_yes + '</button>' +
        '<button class="btn btn-ghost btn-sm" id="cancelDeleteRv">' + T().confirm_cancel + '</button></div>';
      document.getElementById('cancelDeleteRv').addEventListener('click', () => wireDeleteZone(r));
      document.getElementById('confirmDeleteRv').addEventListener('click', () => {
        const d = data();
        d.reservations = d.reservations.filter((x) => x.reservation_id !== r.reservation_id);
        Alaseel.store.touch();
        toast(T().deleted);
        view = { mode: 'list' };
        render();
      });
    });
  }

  /* ---------------- save / validation ---------------- */
  // Fills the total field from nights x room rate, but only while the user
  // hasn't typed their own value — the flag flips off the moment they do,
  // so a negotiated rate or comp never gets silently overwritten.
  function maybeAutoFillTotal(target) {
    if (!target || !target._totalAutoFill) return;
    const room = findRoom(target.room_id);
    if (!room || !room.price_per_night) return;
    const ciEl = document.getElementById('rvCheckIn');
    const coEl = document.getElementById('rvCheckOut');
    const ci = ciEl ? ciEl.value : target.check_in_date;
    const co = coEl ? coEl.value : target.check_out_date;
    if (!ci || !co) return;
    const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
    if (nights <= 0) return;
    const totalEl = document.getElementById('rvTotal');
    if (totalEl) totalEl.value = (nights * room.price_per_night).toFixed(2);
  }

  function hasOverlap(roomId, checkIn, checkOut, excludeId) {
    return reservations().some((res) => {
      if (res.room_id !== roomId || res.reservation_id === excludeId) return false;
      if (res.reservation_status !== 'confirmed' && res.reservation_status !== 'checked_in') return false;
      return U.datesOverlap(checkIn, checkOut, res.check_in_date, res.check_out_date);
    });
  }

  function saveReservation(r, isDraft) {
    const err = document.getElementById('rvErr');
    err.hidden = true;

    const guestId = isDraft ? draft.guest_id : r.guest_id;
    const roomId = document.getElementById('rvRoomSelect') ? document.getElementById('rvRoomSelect').value : r.room_id;
    if (!guestId || !roomId) { err.textContent = T().guest_room_required; err.hidden = false; return; }

    const checkIn = document.getElementById('rvCheckIn').value;
    const checkOut = document.getElementById('rvCheckOut').value;
    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
      err.textContent = T().dates_error; err.hidden = false; return;
    }
    if (hasOverlap(roomId, checkIn, checkOut, isDraft ? null : r.reservation_id)) {
      err.textContent = T().overlap_error; err.hidden = false; return;
    }

    const updated = {
      reservation_id: r.reservation_id, guest_id: guestId, room_id: roomId,
      check_in_date: checkIn, check_out_date: checkOut,
      arrival_time: document.getElementById('rvArrival').value.trim(),
      adults: Math.max(1, parseInt(document.getElementById('rvAdults').value, 10) || 1),
      children: Math.max(0, parseInt(document.getElementById('rvChildren').value, 10) || 0),
      reservation_status: isDraft ? 'confirmed' : document.getElementById('rvResStatus').value,
      payment_status: isDraft ? 'unpaid' : document.getElementById('rvPayStatus').value,
      total_amount: numOrNull('rvTotal'), currency: document.getElementById('rvCurrency').value,
      deposit_amount: numOrNull('rvDeposit'), promo_code: document.getElementById('rvPromo').value.trim(),
      special_requests: document.getElementById('rvRequests').value.trim(),
      folio_charges: r.folio_charges || [],
      created_at: r.created_at || new Date().toISOString(), updated_at: new Date().toISOString()
    };

    const d = data();
    if (isDraft) {
      d.reservations.push(updated);
      toast(T().created);
    } else {
      const idx = d.reservations.findIndex((x) => x.reservation_id === r.reservation_id);
      if (idx !== -1) d.reservations[idx] = updated;
      toast(T().saved);
    }
    Alaseel.store.touch();
    draft = null;
    view = { mode: 'detail', reservationId: updated.reservation_id, isDraft: false };
    render();
  }

  function numOrNull(id) {
    const v = document.getElementById(id).value;
    return v === '' ? null : parseFloat(v);
  }

  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }

  Alaseel.reservations = Reservations;
})();
