// accounting.js
// Night Audit posts only what can be honestly computed from real data:
// (1) each checked-out reservation's full folio total (room + all extras,
// regardless of which module posted them — this is the ONE place that
// revenue is counted, so a coffee-shop charge posted to a room folio is
// never also counted separately), (2) cash-settled Coffee Shop / Laundry
// transactions that never touched any folio, and (3) hotel-paid (not
// guest-caused) resolved maintenance costs. Every auto-posted entry is
// deduplicated against a stable reference id so re-running the audit never
// double-counts. Waste-ledger losses are deliberately NOT auto-posted as
// expenses — there's no per-item unit cost anywhere in the data model, and
// inventing one would mean presenting a made-up number as real accounting.

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.accounting;
  const U = Alaseel.util;

  let pane, toast;
  let activeTab = 'overview';

  const Accounting = {
    mount(contentPaneEl, toastFn) {
      pane = contentPaneEl;
      toast = toastFn;
      render();
    },
    onSearch() { /* no search surface in this module */ }
  };

  function data() { return Alaseel.store.get(); }
  function ledger() { return data().ledgerEntries; }

  function render() {
    pane.innerHTML =
      '<div class="module-tabs">' +
        Object.keys(T().tabs).map((k) => '<button class="module-tab' + (activeTab === k ? ' active' : '') + '" data-acc-tab="' + k + '">' + T().tabs[k] + '</button>').join('') +
      '</div>' +
      '<div id="accSubPane"></div>';
    Array.prototype.forEach.call(pane.querySelectorAll('[data-acc-tab]'), (btn) => {
      btn.addEventListener('click', () => { activeTab = btn.getAttribute('data-acc-tab'); renderActiveTab(); });
    });
    renderActiveTab();
  }

  function renderActiveTab() {
    const sub = document.getElementById('accSubPane');
    if (activeTab === 'ledger') return renderLedger(sub);
    if (activeTab === 'night_audit') return renderNightAudit(sub);
    if (activeTab === 'folio_audit') return renderFolioAudit(sub);
    return renderOverview(sub);
  }

  /* =========================================================== */
  /*  Overview: KPI cards, grouped honestly by currency             */
  /* =========================================================== */

  function currencyTotals() {
    const groups = {};
    ledger().forEach((e) => {
      if (!groups[e.currency]) groups[e.currency] = { revenue: 0, expense: 0 };
      if (e.type === 'revenue') groups[e.currency].revenue += e.amount;
      else groups[e.currency].expense += e.amount;
    });
    return groups;
  }

  function renderOverview(sub) {
    const groups = currencyTotals();
    const currencies = Object.keys(groups);

    sub.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head"><div class="panel-title">' + T().overview_title + '</div></div>' +
        '<div class="settings-body">' +
          (currencies.length ? currencies.map((cur) => currencyCardsHtml(cur, groups[cur])).join('') : '<div class="empty-note">' + T().no_entries + '</div>') +
        '</div>' +
      '</section>';
  }

  function currencyCardsHtml(cur, totals) {
    const net = totals.revenue - totals.expense;
    return '<div style="margin-bottom:18px;">' +
      '<h3 class="form-section-label" style="margin-top:0;">' + cur + '</h3>' +
      '<div class="kpi-strip">' +
        '<div class="kpi"><div class="kpi-label">' + T().kpi_revenue + '</div><div class="kpi-value clean-c">' + totals.revenue.toFixed(2) + '</div></div>' +
        '<div class="kpi"><div class="kpi-label">' + T().kpi_expenses + '</div><div class="kpi-value dirty-c">' + totals.expense.toFixed(2) + '</div></div>' +
        '<div class="kpi"><div class="kpi-label">' + T().kpi_net_profit + '</div><div class="kpi-value ' + (net >= 0 ? 'clean-c' : 'maint-c') + '">' + net.toFixed(2) + '</div></div>' +
      '</div>' +
    '</div>';
  }

  /* =========================================================== */
  /*  Ledger: manual vouchers + full list + CSV export              */
  /* =========================================================== */

  function renderLedger(sub) {
    const entries = ledger().slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    sub.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + T().ledger_title + '<span class="count">' + entries.length + '</span></div>' +
          '<button class="btn btn-secondary btn-sm" id="btnExportLedger">' + T().export_ledger_csv + '</button>' +
        '</div>' +
        '<div class="settings-body">' +
          '<div class="inline-form">' +
            '<h3 class="form-section-label" style="margin-top:0;">' + T().add_manual_entry + '</h3>' +
            '<div class="detail-form">' +
              selectField('ledType', T().entry_type, [['revenue', T().entry_type_revenue], ['expense', T().entry_type_expense]], 'revenue') +
              selectField('ledSource', T().entry_source, Object.keys(T().sources).map((k) => [k, T().sources[k]]), 'manual') +
              numField('ledAmount', T().entry_amount, null) +
            '</div>' +
            '<label class="field-label">' + T().entry_description + '</label>' +
            '<input class="field-input" id="ledDesc" type="text" placeholder="' + T().entry_description_placeholder + '">' +
            '<div class="auth-error" id="ledErr" hidden></div>' +
            '<button class="btn btn-primary btn-sm" id="btnAddEntry">' + T().add_entry_btn + '</button>' +
          '</div>' +
          '<div style="margin-top:16px;">' +
            (entries.length ? entries.map(entryRow).join('') : '<div class="empty-note">' + T().no_entries + '</div>') +
          '</div>' +
        '</div>' +
      '</section>';

    document.getElementById('btnAddEntry').addEventListener('click', () => addManualEntry(sub));
    document.getElementById('btnExportLedger').addEventListener('click', () => exportLedger());
  }

  function entryRow(e) {
    const cls = e.type === 'revenue' ? 'clean' : 'maint';
    return '<div class="voucher-log-row">' +
      '<span class="voucher-log-type" style="background:var(--' + cls + '-soft);color:var(--' + cls + ');">' + (e.type === 'revenue' ? T().entry_type_revenue : T().entry_type_expense) + '</span>' +
      '<div class="voucher-log-body">' + U.esc(e.description || T().sources[e.source]) +
        ' <span class="ltr-num">' + e.amount.toFixed(2) + ' ' + e.currency + '</span>' +
        ' <span class="badge ' + (e.auto ? 'badge-vip-gold' : 'badge-vip-none') + '">' + (e.auto ? T().entry_auto_badge : T().entry_manual_badge) + '</span>' +
        '<div class="voucher-log-meta">' + T().sources[e.source] + ' \u00b7 ' + U.fmtDate(e.created_at) + '</div>' +
      '</div>' +
    '</div>';
  }

  function addManualEntry(sub) {
    const err = document.getElementById('ledErr');
    err.hidden = true;
    const amount = parseFloat(document.getElementById('ledAmount').value);
    if (!amount || amount <= 0) { err.textContent = T().amount_required; err.hidden = false; return; }

    data().ledgerEntries.push({
      entry_id: U.genId('le'), type: document.getElementById('ledType').value, source: document.getElementById('ledSource').value,
      description: document.getElementById('ledDesc').value.trim(), amount, currency: 'EGP', auto: false,
      created_at: new Date().toISOString()
    });
    Alaseel.store.touch();
    toast(T().entry_added);
    renderLedger(sub);
  }

  async function exportLedger() {
    const btn = document.getElementById('btnExportLedger');
    const original = btn.textContent;
    btn.textContent = T().exporting;
    btn.disabled = true;
    const res = await window.alaseelAPI.exportLedgerCsv({ entries: ledger() });
    btn.textContent = original;
    btn.disabled = false;
    if (res.ok) {
      toast(T().export_success_prefix + ' ' + res.path, { actionLabel: T().reveal_file, onAction: () => window.alaseelAPI.revealInFolder({ filePath: res.path }) });
    } else {
      toast('Export failed: ' + res.error);
    }
  }

  function selectField(id, label, options, value) {
    return '<div class="field-group"><label class="field-label">' + label + '</label><select class="field-input" id="' + id + '">' +
      options.map(([v, l]) => '<option value="' + v + '"' + (v === value ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>';
  }
  function numField(id, label, value) {
    return '<div class="field-group"><label class="field-label">' + label + '</label><input class="field-input" id="' + id + '" type="number" min="0" step="0.01" value="' + (value === null || value === undefined ? '' : value) + '"></div>';
  }

  /* =========================================================== */
  /*  Night Audit                                                   */
  /* =========================================================== */

  function renderNightAudit(sub) {
    const d = data();
    const runs = (d.nightAuditRuns || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    sub.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head"><div class="panel-title">' + T().night_audit_title + '</div></div>' +
        '<div class="settings-body">' +
          '<div class="folio-row"><span>' + T().operational_date_label + '</span><span class="ltr-num" style="font-weight:700;">' + U.fmtDate(d.operationalDate) + '</span></div>' +
          '<p class="hint">' + T().night_audit_hint + '</p>' +
          '<button class="btn btn-primary" id="btnRunAudit">' + T().run_night_audit + '</button>' +
        '</div>' +
      '</section>' +
      '<section class="panel" style="margin-top:14px;">' +
        '<div class="panel-head"><div class="panel-title">' + T().audit_log_title + '</div></div>' +
        '<div class="settings-body">' +
          (runs.length ? runs.map(runRow).join('') : '<div class="empty-note">' + T().no_audit_runs + '</div>') +
        '</div>' +
      '</section>';

    document.getElementById('btnRunAudit').addEventListener('click', () => {
      const btn = document.getElementById('btnRunAudit');
      btn.textContent = T().night_audit_running;
      btn.disabled = true;
      const result = runNightAudit();
      toast(result.newEntries > 0
        ? T().night_audit_success_prefix + ' ' + result.newEntries + ' ' + T().night_audit_success_suffix + ' ' + result.newOperationalDate
        : T().night_audit_none_new);
      renderNightAudit(sub);
    });
  }

  function runRow(run) {
    return '<div class="mini-row"><span>' + T().audit_run_row_prefix + ' ' + U.fmtDate(run.date) + ' ' + T().audit_run_row_middle + ' ' + run.entries_created + ' ' + T().audit_run_row_suffix + '</span>' +
      '<span class="hint" style="margin:0;">' + U.fmtDate(run.created_at) + '</span></div>';
  }

  function runNightAudit() {
    const d = data();
    if ((d.nightAuditRuns || []).some((r) => r.date === d.operationalDate)) {
      return { locked: true };
    }

    let newEntries = 0;
    const push = (entry) => { d.ledgerEntries.push(Object.assign({ entry_id: U.genId('le'), auto: true, currency: 'EGP', created_at: new Date().toISOString() }, entry)); newEntries++; };
    const alreadyPosted = (source, refField, refValue) => d.ledgerEntries.some((e) => e.source === source && e[refField] === refValue);

    // 1. Revenue: checked-out reservations, full folio total (room + all extras)
    d.reservations.filter((r) => r.reservation_status === 'checked_out').forEach((r) => {
      if (alreadyPosted('room', 'reservation_id', r.reservation_id)) return;
      const total = U.folioGrandTotal(r);
      if (total <= 0) return;
      push({ type: 'revenue', source: 'room', reservation_id: r.reservation_id, description: T().sources.room, amount: total, currency: r.currency });
    });

    // 2. Revenue: Coffee Shop orders archived to history on settle — folio-settled
    // ones are already captured above as part of the guest's room total (never
    // counted twice); cash AND company-settled orders are both real earned
    // revenue for the hotel, so both post here (company charges are ALSO kept
    // on that company's own ledger separately — that's a receivable-tracking
    // view, not a second revenue count; this is the ledger's revenue view).
    (d.coffeeShop.orderHistory || []).filter((o) => o.settle_method === 'cash' || o.settle_method === 'company').forEach((o) => {
      if (alreadyPosted('coffee_shop', 'ref_id', o.order_id)) return;
      if (!o.total || o.total <= 0) return;
      push({ type: 'revenue', source: 'coffee_shop', ref_id: o.order_id, description: T().sources.coffee_shop, amount: o.total });
    });

    // 3. Revenue: cash Laundry transactions
    (d.laundry.transactions || []).filter((tx) => tx.method === 'cash').forEach((tx) => {
      if (alreadyPosted('laundry', 'ref_id', tx.transaction_id)) return;
      if (!tx.total || tx.total <= 0) return;
      push({ type: 'revenue', source: 'laundry', ref_id: tx.transaction_id, description: T().sources.laundry, amount: tx.total });
    });

    // 4. Expense: hotel-paid (not guest-caused) resolved maintenance tickets
    (d.maintenanceTickets || []).filter((tk) => tk.status === 'resolved' && !tk.guest_caused && tk.price).forEach((tk) => {
      if (alreadyPosted('maintenance', 'ref_id', tk.ticket_id)) return;
      push({ type: 'expense', source: 'maintenance', ref_id: tk.ticket_id, description: T().sources.maintenance, amount: tk.price });
    });

    const closedDate = d.operationalDate;
    const next = new Date(closedDate + 'T00:00:00');
    next.setDate(next.getDate() + 1);
    d.operationalDate = next.toISOString().slice(0, 10);
    d.nightAuditRuns.push({ run_id: U.genId('na'), date: closedDate, entries_created: newEntries, created_at: new Date().toISOString() });

    Alaseel.store.touch();
    return { newEntries, newOperationalDate: d.operationalDate };
  }

  /* =========================================================== */
  /*  Global Folio Audit View                                       */
  /* =========================================================== */

  function renderFolioAudit(sub) {
    const rows = (data().folioAudit || []).slice().sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at));
    sub.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head"><div class="panel-title">' + T().folio_audit_title + '<span class="count">' + rows.length + '</span></div></div>' +
        '<div class="settings-body">' +
          '<p class="hint">' + T().folio_audit_hint + '</p>' +
          (rows.length
            ? '<div class="list-row list-row-head res-row-cols" style="grid-template-columns:0.8fr 0.8fr 1fr 1.4fr 1fr 1.2fr;">' +
                ['col_from_room', 'col_to_room', 'col_amount', 'col_reason', 'col_performed_by', 'col_when'].map((k) => '<div class="list-cell">' + T()[k] + '</div>').join('') +
              '</div>' +
              '<div class="list-body">' + rows.map(auditRow).join('') + '</div>'
            : '<div class="empty-note">' + T().no_folio_transfers + '</div>') +
        '</div>' +
      '</section>';
  }

  function auditRow(a) {
    return '<div class="list-row res-row-cols" style="grid-template-columns:0.8fr 0.8fr 1fr 1.4fr 1fr 1.2fr;">' +
      '<div class="list-cell ltr-num">' + (a.from_room_number || '\u2014') + '</div>' +
      '<div class="list-cell ltr-num">' + a.to_room_number + '</div>' +
      '<div class="list-cell ltr-num">' + a.amount + ' ' + a.currency + '</div>' +
      '<div class="list-cell">' + U.esc(a.reason) + '</div>' +
      '<div class="list-cell">' + U.esc(a.performed_by || '\u2014') + '</div>' +
      '<div class="list-cell">' + U.fmtDate(a.performed_at) + '</div>' +
    '</div>';
  }

  Alaseel.accounting = Accounting;
})();
