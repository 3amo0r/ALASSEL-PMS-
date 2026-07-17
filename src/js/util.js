// util.js — small shared helpers for Phase 2+ modules.
window.Alaseel = window.Alaseel || {};

Alaseel.util = {
  esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  },

  genId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // Read-only star display, e.g. stars(4) -> "★★★★☆"
  stars(score, max) {
    max = max || 5;
    const full = Math.round(score);
    let out = '';
    for (let i = 1; i <= max; i++) out += (i <= full) ? '\u2605' : '\u2606';
    return out;
  },

  fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return iso;
    }
  },

  // Standard half-open interval overlap test: [aStart,aEnd) vs [bStart,bEnd)
  datesOverlap(aStart, aEnd, bStart, bEnd) {
    const as = new Date(aStart).getTime(), ae = new Date(aEnd).getTime();
    const bs = new Date(bStart).getTime(), be = new Date(bEnd).getTime();
    return as < be && bs < ae;
  },

  emptyInventory() {
    const inv = {};
    Alaseel.i18n.inventoryTypes.forEach((t) => { inv[t.slug] = 0; });
    return inv;
  },

  // Every stock "location" is either a room_id (any room, including the 4
  // special ones — Storage's own inventory IS the central warehouse stock)
  // or one of five virtual, non-room buckets. Returns the live object so
  // callers can mutate it directly, then call Alaseel.store.touch().
  VIRTUAL_LOCATIONS: ['lobby', 'corridors', 'roof', 'workshop', 'laundry_transit'],

  getStockBucket(locationKey) {
    const d = Alaseel.store.get();
    if (Alaseel.util.VIRTUAL_LOCATIONS.indexOf(locationKey) !== -1) {
      if (!d.locationStock) d.locationStock = {};
      if (!d.locationStock[locationKey]) d.locationStock[locationKey] = Alaseel.util.emptyInventory();
      return d.locationStock[locationKey];
    }
    const room = d.rooms.find((r) => r.room_id === locationKey);
    return room ? room.inventory : null;
  },

  // Room-level sentiment from guest reviews. Requires >=2 reviews before
  // flagging, so a single bad review from a small sample can't permanently
  // brand a room — the threshold is a deliberate, stated design choice.
  roomSentiment(roomId) {
    const list = (Alaseel.store.get().reviews || []).filter((r) => r.room_id === roomId);
    if (!list.length) return null;
    const avg = list.reduce((s, r) => s + r.score, 0) / list.length;
    const negatives = list.filter((r) => r.score <= 2).length;
    const flagged = list.length >= 2 && (avg < 3 || (negatives / list.length) >= 0.34);
    return { avg, count: list.length, negatives, flagged };
  },

  guestReviewSummary(guestId) {
    const list = (Alaseel.store.get().reviews || []).filter((r) => r.guest_id === guestId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!list.length) return { count: 0, avg: null, recent: [] };
    const avg = list.reduce((s, r) => s + r.score, 0) / list.length;
    return { count: list.length, avg, recent: list.slice(0, 5) };
  },

  // ---- Folio router ----
  // The single place any charge-generating module (Coffee Shop, Laundry,
  // guest-caused Maintenance) posts a charge against a guest's stay. Takes
  // a room NUMBER (what staff actually think in terms of), resolves the
  // currently checked-in reservation for that room, and appends the charge.
  // A folio only exists while a reservation is 'checked_in' — once checked
  // out, this lookup naturally stops finding it, closing the folio with no
  // extra state needed.
  postFolioCharge(roomNumber, charge) {
    const d = Alaseel.store.get();
    const room = d.rooms.find((r) => r.room_number === roomNumber && !r.is_special);
    if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' };

    const openRes = d.reservations.find((r) => r.room_id === room.room_id && r.reservation_status === 'checked_in');
    if (!openRes) return { ok: false, error: 'NO_ACTIVE_GUEST' };

    if (!Array.isArray(openRes.folio_charges)) openRes.folio_charges = [];
    const entry = {
      charge_id: Alaseel.util.genId('ch'),
      source: charge.source || 'other',
      description: charge.description || '',
      amount: Number(charge.amount) || 0,
      currency: charge.currency || openRes.currency || 'EGP',
      created_at: new Date().toISOString()
    };
    openRes.folio_charges.push(entry);
    Alaseel.store.touch();
    return { ok: true, reservation_id: openRes.reservation_id, charge: entry, folioTotal: Alaseel.util.folioGrandTotal(openRes) };
  },

  folioGrandTotal(reservation) {
    const extras = (reservation.folio_charges || []).reduce((s, c) => s + (c.amount || 0), 0);
    return (reservation.total_amount || 0) + extras;
  },

  // Moves a single posted charge from one reservation's folio to another —
  // the correction path for a charge posted to the wrong room. Requires a
  // reason (same mandatory-reason discipline as the Waste voucher) and
  // always logs a full audit entry: who, what, from where, to where, why.
  transferFolioCharge(fromReservationId, chargeId, toRoomNumber, reason) {
    const d = Alaseel.store.get();
    if (!reason || !reason.trim()) return { ok: false, error: 'REASON_REQUIRED' };

    const fromRes = d.reservations.find((r) => r.reservation_id === fromReservationId);
    if (!fromRes) return { ok: false, error: 'SOURCE_NOT_FOUND' };
    const chargeIdx = (fromRes.folio_charges || []).findIndex((c) => c.charge_id === chargeId);
    if (chargeIdx === -1) return { ok: false, error: 'CHARGE_NOT_FOUND' };

    const toRoom = d.rooms.find((r) => r.room_number === toRoomNumber && !r.is_special);
    if (!toRoom) return { ok: false, error: 'ROOM_NOT_FOUND' };
    if (toRoom.room_id === fromRes.room_id) return { ok: false, error: 'SAME_ROOM' };
    const toRes = d.reservations.find((r) => r.room_id === toRoom.room_id && r.reservation_status === 'checked_in');
    if (!toRes) return { ok: false, error: 'NO_ACTIVE_GUEST' };

    const charge = fromRes.folio_charges[chargeIdx];
    const fromRoom = d.rooms.find((r) => r.room_id === fromRes.room_id);

    fromRes.folio_charges.splice(chargeIdx, 1);
    const movedCharge = Object.assign({}, charge, {
      charge_id: Alaseel.util.genId('ch'),
      transferred_from_room: fromRoom ? fromRoom.room_number : null,
      created_at: new Date().toISOString()
    });
    if (!Array.isArray(toRes.folio_charges)) toRes.folio_charges = [];
    toRes.folio_charges.push(movedCharge);

    if (!Array.isArray(d.folioAudit)) d.folioAudit = [];
    d.folioAudit.push({
      audit_id: Alaseel.util.genId('aud'),
      original_charge_id: chargeId,
      from_reservation_id: fromReservationId,
      from_room_number: fromRoom ? fromRoom.room_number : null,
      to_reservation_id: toRes.reservation_id,
      to_room_number: toRoomNumber,
      amount: charge.amount,
      currency: charge.currency,
      description: charge.description,
      reason: reason.trim(),
      performed_by: (d.auth && d.auth.username) || null,
      performed_at: new Date().toISOString()
    });

    Alaseel.store.touch();
    return { ok: true, toReservationId: toRes.reservation_id };
  }
};
