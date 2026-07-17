// guests.js
// Guest Relations module. List view + detail view, content-swapped into
// whatever pane app.js hands us (the "guests" tab of the composite
// Guests & Reservations sidebar entry). New guests are held as an
// in-memory draft until Save — nothing is written to the store on a
// half-filled form that the user backs out of.

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.guests;
  const U = Alaseel.util;

  let pane, toast;
  let view = { mode: 'list' };
  let draftGuest = null;
  let searchTerm = '';
  const AVATAR_CLASSES = ['avatar-c0', 'avatar-c1', 'avatar-c2', 'avatar-c3', 'avatar-c4'];

  const Guests = {
    mount(contentPaneEl, toastFn, intent) {
      pane = contentPaneEl;
      toast = toastFn;
      if (intent && intent.action === 'create') {
        startDraft();
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
  function guests() { return data().guests; }
  function reservationsData() { return data().reservations; }
  function reviewsData() { return data().reviews; }
  function rooms() { return data().rooms; }

  function render() {
    if (view.mode === 'detail') renderDetail();
    else renderList();
  }

  /* =========================================================== */
  /*  LIST VIEW                                                    */
  /* =========================================================== */

  function renderList() {
    const list = guests().filter((g) => {
      if (!searchTerm) return true;
      const hay = [g.full_name, g.nationality, g.phone, g.passport_number].join(' ').toLowerCase();
      return hay.indexOf(searchTerm) !== -1;
    }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));

    pane.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + T().title + '<span class="count">' + guests().length + '</span></div>' +
          '<button class="btn btn-primary btn-sm" id="btnAddGuest">' + T().add_guest + '</button>' +
        '</div>' +
        (list.length ? renderTableHead() + '<div class="list-body">' + list.map(guestRow).join('') + '</div>' : emptyState()) +
      '</section>';

    document.getElementById('btnAddGuest').addEventListener('click', startDraft);
    Array.prototype.forEach.call(pane.querySelectorAll('[data-guest]'), (row) => {
      row.addEventListener('click', () => {
        view = { mode: 'detail', guestId: row.getAttribute('data-guest') };
        draftGuest = null;
        render();
      });
    });
  }

  function renderTableHead() {
    const h = T().list_head;
    return '<div class="list-row list-row-head guest-row-cols">' +
      '<div class="list-cell">' + h.name + '</div>' +
      '<div class="list-cell">' + h.nationality + '</div>' +
      '<div class="list-cell">' + h.phone + '</div>' +
      '<div class="list-cell">' + h.vip + '</div>' +
      '<div class="list-cell"></div>' +
    '</div>';
  }

  function emptyState() {
    return '<div class="empty-note">' + T().empty_list + '</div>';
  }

  function guestRow(g) {
    const initial = (g.full_name || '?').trim().charAt(0).toUpperCase();
    const avatarCls = AVATAR_CLASSES[Math.abs(hashStr(g.guest_id)) % AVATAR_CLASSES.length];
    return '<div class="list-row guest-row-cols" data-guest="' + g.guest_id + '">' +
      '<div class="list-cell guest-name-cell"><span class="avatar-initial ' + avatarCls + '">' + U.esc(initial) + '</span>' +
        '<span>' + U.esc(g.full_name || '\u2014') + '</span></div>' +
      '<div class="list-cell">' + U.esc(g.nationality || '\u2014') + '</div>' +
      '<div class="list-cell ltr-num">' + U.esc(g.phone || '\u2014') + '</div>' +
      '<div class="list-cell">' + vipBadge(g.vip_level) + '</div>' +
      '<div class="list-cell">' + (g.blacklisted ? '<span class="badge badge-blacklist">' + T().blacklisted_badge + '</span>' : '') + '</div>' +
    '</div>';
  }

  function vipBadge(level) {
    if (!level || level === 'none') return '<span class="badge badge-vip-none">' + T().vip.none + '</span>';
    return '<span class="badge badge-vip-' + level + '">' + T().vip[level] + '</span>';
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }

  /* =========================================================== */
  /*  DETAIL VIEW (create draft OR edit existing)                  */
  /* =========================================================== */

  function startDraft() {
    draftGuest = {
      guest_id: U.genId('g'), full_name: '', nationality: '', passport_number: '', visa_number: '',
      phone: '', email: '', address: '', profession: '', vip_level: 'none',
      blacklisted: false, blacklist_reason: '', preferences: '', emergency_contact: '', notes: '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    view = { mode: 'detail', guestId: draftGuest.guest_id, isDraft: true };
    render();
  }

  function currentGuest() {
    if (view.isDraft) return draftGuest;
    return guests().find((g) => g.guest_id === view.guestId);
  }

  function renderDetail() {
    const g = currentGuest();
    if (!g) { view = { mode: 'list' }; return renderList(); }
    const isDraft = !!view.isDraft;

    pane.innerHTML =
      '<button class="back-link" id="btnBack"><span class="chevron rtl-flip">&#8250;</span>' + T().back_to_list + '</button>' +

      '<section class="panel detail-panel">' +
        '<div class="panel-head">' +
          '<div><div class="panel-title">' + (isDraft ? T().add_guest : U.esc(g.full_name || T().add_guest)) + '</div></div>' +
          (g.blacklisted ? '<span class="badge badge-blacklist">' + T().blacklisted_badge + '</span>' : '') +
        '</div>' +

        '<div class="detail-form">' +
          textField('gFullName', T().fields.full_name, g.full_name, '', true) +
          textField('gNationality', T().fields.nationality, g.nationality) +
          textField('gPassport', T().fields.passport_number, g.passport_number) +
          textField('gVisa', T().fields.visa_number, g.visa_number) +
          textField('gPhone', T().fields.phone, g.phone, '', false, 'tel') +
          textField('gEmail', T().fields.email, g.email, '', false, 'email') +
          textAreaField('gAddress', T().fields.address, g.address, '', true) +
          textField('gProfession', T().fields.profession, g.profession) +
          selectField('gVipLevel', T().fields.vip_level, [
            ['none', T().vip.none], ['silver', T().vip.silver], ['gold', T().vip.gold], ['platinum', T().vip.platinum]
          ], g.vip_level || 'none') +
          '<div class="field-group"><label class="field-label">&nbsp;</label>' +
            '<label class="checkbox-row"><input type="checkbox" id="gBlacklist"' + (g.blacklisted ? ' checked' : '') + '>' +
            '<span>' + T().blacklist_toggle + '</span></label></div>' +
          '<div class="field-group-wide" id="blacklistReasonWrap"' + (g.blacklisted ? '' : ' hidden') + '>' +
            '<label class="field-label">' + T().blacklist_reason + '</label>' +
            '<input class="field-input" id="gBlacklistReason" type="text" value="' + U.esc(g.blacklist_reason || '') + '" placeholder="' + T().blacklist_reason_placeholder + '"></div>' +
          textAreaField('gPreferences', T().fields.preferences, g.preferences, T().fields.preferences_placeholder, true) +
          textField('gEmergencyContact', T().fields.emergency_contact, g.emergency_contact, '', true) +
          textAreaField('gNotes', T().fields.notes, g.notes, T().fields.notes_placeholder, true) +
        '</div>' +

        '<div class="auth-error" id="gErr" hidden></div>' +

        '<div class="detail-actions">' +
          '<button class="btn btn-primary" id="btnSaveGuest">' + T().save + '</button>' +
          (!isDraft ? '<button class="btn btn-secondary" id="btnNewReservation">' + T().new_reservation_for_guest + '</button>' : '') +
          (!isDraft ? '<div id="deleteZone"></div>' : '') +
        '</div>' +
      '</section>' +

      (!isDraft ? historySections(g) : '');

    document.getElementById('btnBack').addEventListener('click', () => { draftGuest = null; view = { mode: 'list' }; render(); });

    document.getElementById('gBlacklist').addEventListener('change', (e) => {
      document.getElementById('blacklistReasonWrap').hidden = !e.target.checked;
    });

    document.getElementById('btnSaveGuest').addEventListener('click', () => saveGuest(g, isDraft));

    if (!isDraft) {
      document.getElementById('btnNewReservation').addEventListener('click', () => {
        Alaseel.app.navigateTo('guests', { tab: 'reservations', action: 'create', guestId: g.guest_id });
      });
      wireDeleteZone(g);
    }
  }

  function historySections(g) {
    const stays = reservationsData().filter((r) => r.guest_id === g.guest_id)
      .sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date));
    const reviews = reviewsData().filter((r) => r.guest_id === g.guest_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return (
      '<section class="panel" style="margin-top:14px;">' +
        '<div class="panel-head"><div class="panel-title">' + T().stay_history + '</div></div>' +
        '<div class="settings-body">' +
          (stays.length ? stays.map(stayRow).join('') : '<div class="empty-note">' + T().no_stay_history + '</div>') +
        '</div>' +
      '</section>' +
      '<section class="panel" style="margin-top:14px;">' +
        '<div class="panel-head"><div class="panel-title">' + T().review_history + '</div></div>' +
        '<div class="settings-body">' +
          (reviews.length ? reviews.map(reviewItem).join('') : '<div class="empty-note">' + T().no_review_history + '</div>') +
        '</div>' +
      '</section>'
    );
  }

  function stayRow(r) {
    const room = rooms().find((rm) => rm.room_id === r.room_id);
    const statusCls = { confirmed: 'clean', checked_in: 'occupied', checked_out: 'oo', cancelled: 'maint', no_show: 'maint' }[r.reservation_status] || 'oo';
    return '<div class="mini-row">' +
      '<span class="ltr-num">' + (room ? room.room_number : '\u2014') + '</span>' +
      '<span>' + U.fmtDate(r.check_in_date) + ' \u2192 ' + U.fmtDate(r.check_out_date) + '</span>' +
      '<span class="status-badge ' + statusCls + '">' + Alaseel.i18n.reservations.status[r.reservation_status] + '</span>' +
    '</div>';
  }

  function reviewItem(r) {
    const room = rooms().find((rm) => rm.room_id === r.room_id);
    return '<div class="review-item">' +
      '<div class="review-item-score">' + U.stars(r.score) + '</div>' +
      '<div class="review-item-meta">' +
        (room ? '\u0627\u0644\u063a\u0631\u0641\u0629 ' + room.room_number + ' \u00b7 ' : '') +
        Alaseel.i18n.reservations.review_categories[r.category] + ' \u00b7 ' + U.fmtDate(r.created_at) +
      '</div>' +
      (r.comment ? '<div class="review-item-comment">' + U.esc(r.comment) + '</div>' : '') +
    '</div>';
  }

  /* ---- field builders ---- */
  function textField(id, label, value, placeholder, wide, type) {
    return '<div class="field-group' + (wide ? ' field-group-wide' : '') + '"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="' + id + '" type="' + (type || 'text') + '" value="' + U.esc(value || '') + '" placeholder="' + (placeholder || '') + '"></div>';
  }
  function textAreaField(id, label, value, placeholder, wide) {
    return '<div class="field-group' + (wide ? ' field-group-wide' : '') + '"><label class="field-label">' + label + '</label>' +
      '<textarea class="field-input" id="' + id + '" rows="2" placeholder="' + (placeholder || '') + '">' + U.esc(value || '') + '</textarea></div>';
  }
  function selectField(id, label, options, value) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<select class="field-input" id="' + id + '">' +
      options.map(([v, l]) => '<option value="' + v + '"' + (v === value ? ' selected' : '') + '>' + l + '</option>').join('') +
      '</select></div>';
  }

  /* ---- save / delete ---- */
  function saveGuest(g, isDraft) {
    const err = document.getElementById('gErr');
    err.hidden = true;

    const fullName = document.getElementById('gFullName').value.trim();
    if (!fullName) { err.textContent = T().name_required; err.hidden = false; return; }

    const blacklisted = document.getElementById('gBlacklist').checked;
    const blacklistReason = document.getElementById('gBlacklistReason').value.trim();

    const updated = {
      guest_id: g.guest_id,
      full_name: fullName,
      nationality: document.getElementById('gNationality').value.trim(),
      passport_number: document.getElementById('gPassport').value.trim(),
      visa_number: document.getElementById('gVisa').value.trim(),
      phone: document.getElementById('gPhone').value.trim(),
      email: document.getElementById('gEmail').value.trim(),
      address: document.getElementById('gAddress').value.trim(),
      profession: document.getElementById('gProfession').value.trim(),
      vip_level: document.getElementById('gVipLevel').value,
      blacklisted: blacklisted,
      blacklist_reason: blacklisted ? blacklistReason : '',
      preferences: document.getElementById('gPreferences').value.trim(),
      emergency_contact: document.getElementById('gEmergencyContact').value.trim(),
      notes: document.getElementById('gNotes').value.trim(),
      created_at: g.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const d = data();
    if (isDraft) {
      d.guests.push(updated);
    } else {
      const idx = d.guests.findIndex((x) => x.guest_id === g.guest_id);
      if (idx !== -1) d.guests[idx] = updated;
    }
    Alaseel.store.touch();
    draftGuest = null;
    view = { mode: 'detail', guestId: updated.guest_id, isDraft: false };
    toast(T().saved);
    render();
  }

  function wireDeleteZone(g) {
    const zone = document.getElementById('deleteZone');
    if (!zone) return;
    zone.innerHTML = '<button class="btn btn-danger" id="btnDeleteGuest">' + T().delete + '</button>';
    document.getElementById('btnDeleteGuest').addEventListener('click', () => {
      zone.innerHTML =
        '<div class="inline-confirm"><span>' + T().delete_confirm_q + '</span>' +
        '<button class="btn btn-danger btn-sm" id="confirmDeleteGuest">' + T().confirm_yes + '</button>' +
        '<button class="btn btn-ghost btn-sm" id="cancelDeleteGuest">' + T().confirm_cancel + '</button></div>';
      document.getElementById('cancelDeleteGuest').addEventListener('click', () => wireDeleteZone(g));
      document.getElementById('confirmDeleteGuest').addEventListener('click', () => {
        const d = data();
        d.guests = d.guests.filter((x) => x.guest_id !== g.guest_id);
        Alaseel.store.touch();
        toast(T().deleted);
        view = { mode: 'list' };
        render();
      });
    });
  }

  Alaseel.guests = Guests;
})();
