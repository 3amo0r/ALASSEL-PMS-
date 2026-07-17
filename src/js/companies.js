// companies.js
// Minimal Corporate slice: a registry Coffee Shop/Laundry can route charges
// to instead of a guest room, plus bank check tracking with aging. The
// fixed_discount field is captured now but not consumed anywhere yet — it's
// reserved for the full contract-billing lifecycle (room blocks, contract
// terms) that remains a separate, later piece of work.

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.corporate;
  const U = Alaseel.util;

  let pane, toast;
  let view = { mode: 'list' };
  let draft = null;
  let searchTerm = '';

  const Corporate = {
    mount(contentPaneEl, toastFn) {
      pane = contentPaneEl;
      toast = toastFn;
      view = { mode: 'list' };
      render();
    },
    onSearch(term) {
      searchTerm = (term || '').trim().toLowerCase();
      if (view.mode === 'list') render();
    }
  };

  function data() { return Alaseel.store.get(); }
  function companies() { return data().companies; }

  function render() { view.mode === 'detail' ? renderDetail() : renderList(); }

  /* =========================================================== */
  /*  LIST                                                          */
  /* =========================================================== */

  function renderList() {
    const list = companies().filter((c) => {
      if (!searchTerm) return true;
      return c.company_name.toLowerCase().indexOf(searchTerm) !== -1;
    }).sort((a, b) => a.company_name.localeCompare(b.company_name, 'ar'));

    pane.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + T().title + '<span class="count">' + companies().length + '</span></div>' +
          '<button class="btn btn-primary btn-sm" id="btnAddCompany">' + T().add_company + '</button>' +
        '</div>' +
        (list.length ? tableHead() + '<div class="list-body">' + list.map(companyRow).join('') + '</div>' : '<div class="empty-note">' + T().empty_list + '</div>') +
      '</section>';

    document.getElementById('btnAddCompany').addEventListener('click', startDraft);
    Array.prototype.forEach.call(pane.querySelectorAll('[data-co]'), (row) => {
      row.addEventListener('click', () => { view = { mode: 'detail', companyId: row.getAttribute('data-co') }; draft = null; render(); });
    });
  }

  function tableHead() {
    const h = T().list_head;
    return '<div class="list-row list-row-head res-row-cols" style="grid-template-columns:1.6fr 1fr 1fr 1fr;">' +
      '<div class="list-cell">' + h.name + '</div><div class="list-cell">' + h.housing + '</div>' +
      '<div class="list-cell">' + h.accounting + '</div><div class="list-cell">' + h.discount + '</div></div>';
  }
  function companyRow(c) {
    return '<div class="list-row res-row-cols" style="grid-template-columns:1.6fr 1fr 1fr 1fr;" data-co="' + c.company_id + '">' +
      '<div class="list-cell">' + U.esc(c.company_name) + '</div>' +
      '<div class="list-cell">' + U.esc(c.housing_officer_name || '\u2014') + '</div>' +
      '<div class="list-cell">' + U.esc(c.accounting_officer_name || '\u2014') + '</div>' +
      '<div class="list-cell ltr-num">' + (c.fixed_discount || 0) + '</div>' +
    '</div>';
  }

  /* =========================================================== */
  /*  DETAIL: registry form + charges + bank checks                */
  /* =========================================================== */

  function startDraft() {
    draft = {
      company_id: U.genId('co'), company_name: '', housing_officer_name: '', housing_officer_phone: '',
      accounting_officer_name: '', accounting_officer_phone: '', fixed_discount: 0,
      contract_term: 'none', activation_date: new Date().toISOString().slice(0, 10), expiration_date: null,
      company_charges: [], bank_checks: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    view = { mode: 'detail', companyId: draft.company_id, isDraft: true };
    render();
  }

  function current() {
    if (view.isDraft) return draft;
    return companies().find((c) => c.company_id === view.companyId);
  }

  function renderDetail() {
    const c = current();
    if (!c) { view = { mode: 'list' }; return renderList(); }
    const isDraft = !!view.isDraft;

    pane.innerHTML =
      '<button class="back-link" id="btnBack"><span class="chevron rtl-flip">&#8250;</span>' + T().back_to_list + '</button>' +
      '<section class="panel detail-panel">' +
        '<div class="panel-head"><div class="panel-title">' + (isDraft ? T().add_company : U.esc(c.company_name || T().add_company)) + '</div>' +
          (!isDraft && c.expiration_date && c.expiration_date < new Date().toISOString().slice(0, 10) ? '<span class="badge badge-blacklist">' + T().contract_expired_badge + '</span>' : '') +
        '</div>' +
        '<div class="settings-body">' +
          '<div class="detail-form">' +
            textField('coName', T().field_company_name, c.company_name, true) +
            textField('coHousingName', T().field_housing_officer, c.housing_officer_name) +
            textField('coHousingPhone', T().field_housing_phone, c.housing_officer_phone) +
            textField('coAcctName', T().field_accounting_officer, c.accounting_officer_name) +
            textField('coAcctPhone', T().field_accounting_phone, c.accounting_officer_phone) +
            numField('coDiscount', T().field_fixed_discount, c.fixed_discount) +
          '</div>' +
          '<p class="hint">' + T().fixed_discount_hint + '</p>' +
          '<h3 class="form-section-label">' + T().contract_section + '</h3>' +
          '<div class="detail-form">' +
            '<div class="field-group"><label class="field-label">' + T().contract_term + '</label>' +
              '<select class="field-input" id="coTerm">' +
                Object.keys(T().contract_terms).map((k) => '<option value="' + k + '"' + (c.contract_term === k ? ' selected' : '') + '>' + T().contract_terms[k] + '</option>').join('') +
              '</select></div>' +
            '<div class="field-group"><label class="field-label">' + T().activation_date + '</label>' +
              '<input class="field-input" id="coActivation" type="date" value="' + (c.activation_date || '') + '"></div>' +
            '<div class="field-group"><label class="field-label">' + T().expiration_date + '</label>' +
              '<input class="field-input" id="coExpiration" type="date" value="' + (c.expiration_date || '') + '" disabled></div>' +
          '</div>' +
          '<p class="hint">' + T().expiration_auto_hint + '</p>' +
        '</div>' +
        '<div class="auth-error" id="coErr" hidden></div>' +
        '<div class="detail-actions" id="coActions"></div>' +
      '</section>' +
      (!isDraft ? chargesSectionHtml(c) + checksSectionHtml(c) : '');

    document.getElementById('btnBack').addEventListener('click', () => { draft = null; view = { mode: 'list' }; render(); });
    wireActions(c, isDraft);
    if (!isDraft) { wireChecks(c); }
    wireContractAutoCalc();
  }

  function wireContractAutoCalc() {
    const recalc = () => {
      const term = document.getElementById('coTerm').value;
      const activation = document.getElementById('coActivation').value;
      document.getElementById('coExpiration').value = computeExpiration(activation, term) || '';
    };
    document.getElementById('coTerm').addEventListener('change', recalc);
    document.getElementById('coActivation').addEventListener('change', recalc);
  }

  function chargesSectionHtml(c) {
    const charges = c.company_charges || [];
    const total = charges.reduce((s, ch) => s + ch.amount, 0);
    return '<section class="panel" style="margin-top:14px;">' +
      '<div class="panel-head"><div class="panel-title">' + T().charges_title + '</div></div>' +
      '<div class="settings-body">' +
        (charges.length ? charges.map((ch) =>
          '<div class="folio-row"><span>' + U.esc(ch.description) + ' <span class="hint" style="margin:0;">(' + Alaseel.i18n.reservations.folio_charge_sources[ch.source] || ch.source + ')</span></span>' +
          '<span class="ltr-num">' + ch.amount.toFixed(2) + ' ' + ch.currency + '</span></div>'
        ).join('') : '<div class="empty-note">' + T().no_charges + '</div>') +
        (charges.length ? '<div class="folio-row folio-total-row"><span>' + T().charges_total + '</span><span class="ltr-num">' + total.toFixed(2) + '</span></div>' : '') +
      '</div>' +
    '</section>';
  }

  function checksSectionHtml(c) {
    const checks = (c.bank_checks || []).slice().sort((a, b) => new Date(a.maturity_date) - new Date(b.maturity_date));
    return '<section class="panel" style="margin-top:14px;">' +
      '<div class="panel-head"><div class="panel-title">' + T().checks_title + '</div></div>' +
      '<div class="settings-body">' +
        (checks.length ? checks.map(checkRow).join('') : '<div class="empty-note">' + T().no_checks + '</div>') +
        '<div class="inline-form" style="margin-top:14px;">' +
          '<h3 class="form-section-label" style="margin-top:0;">' + T().add_check + '</h3>' +
          '<div class="detail-form">' +
            textField('chkNumber', T().check_number, '') +
            textField('chkBank', T().bank_name, '') +
            textField('chkAccount', T().account_number, '') +
            numField('chkAmount', T().check_amount, null) +
            '<div class="field-group"><label class="field-label">' + T().maturity_date + '</label><input class="field-input" id="chkMaturity" type="date"></div>' +
          '</div>' +
          '<button class="btn btn-secondary btn-sm" id="btnAddCheck">' + T().add_check + '</button>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function daysOverdue(maturityDate) {
    const ms = new Date().setHours(0, 0, 0, 0) - new Date(maturityDate + 'T00:00:00').getTime();
    return Math.floor(ms / 86400000);
  }

  // "Season" is treated as ~3 months, same span as a quarter — the common
  // hospitality convention (a high/low season block). Stated explicitly
  // since the term itself doesn't have one universal fixed length.
  const TERM_MONTHS = { none: null, month: 1, quarter: 3, half_year: 6, season: 3, year: 12 };

  function computeExpiration(activationDate, term) {
    const months = TERM_MONTHS[term];
    if (!months || !activationDate) return null;
    const d = new Date(activationDate + 'T00:00:00');
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  function checkRow(chk) {
    const overdue = chk.status === 'pending' ? daysOverdue(chk.maturity_date) : -1;
    const statusBadgeCls = chk.status === 'paid' ? 'clean' : (overdue > 0 ? 'maint' : 'occupied');
    return '<div class="mini-row" style="align-items:flex-start;">' +
      '<div>' +
        '<div><strong class="ltr-num">' + U.esc(chk.check_number) + '</strong> \u00b7 ' + U.esc(chk.bank_name) + '</div>' +
        '<div class="hint" style="margin:2px 0 0;">' + U.esc(chk.account_number) + ' \u00b7 <span class="ltr-num">' + chk.amount.toFixed(2) + '</span> \u00b7 ' + U.fmtDate(chk.maturity_date) + '</div>' +
        (overdue > 0 ? '<div class="hint" style="margin:2px 0 0;color:var(--danger-text);">' + T().days_overdue_prefix + ' ' + overdue + ' ' + T().days_overdue_suffix + '</div>' : '') +
      '</div>' +
      '<span class="status-badge ' + statusBadgeCls + '">' + T().check_status[chk.status] + '</span>' +
    '</div>';
  }

  function wireActions(c, isDraft) {
    const actions = document.getElementById('coActions');
    actions.innerHTML = '<button class="btn btn-primary" id="btnSaveCo">' + T().save_company + '</button>' + (!isDraft ? '<div id="deleteZoneCo"></div>' : '');
    document.getElementById('btnSaveCo').addEventListener('click', () => saveCompany(c, isDraft));
    if (!isDraft) wireDeleteZone(c);
  }

  function saveCompany(c, isDraft) {
    const err = document.getElementById('coErr');
    err.hidden = true;
    const name = document.getElementById('coName').value.trim();
    if (!name) { err.textContent = T().name_required; err.hidden = false; return; }

    const term = document.getElementById('coTerm').value;
    const activation = document.getElementById('coActivation').value;
    const updated = {
      company_id: c.company_id, company_name: name,
      housing_officer_name: document.getElementById('coHousingName').value.trim(),
      housing_officer_phone: document.getElementById('coHousingPhone').value.trim(),
      accounting_officer_name: document.getElementById('coAcctName').value.trim(),
      accounting_officer_phone: document.getElementById('coAcctPhone').value.trim(),
      fixed_discount: parseFloat(document.getElementById('coDiscount').value) || 0,
      contract_term: term, activation_date: activation, expiration_date: computeExpiration(activation, term),
      company_charges: c.company_charges || [], bank_checks: c.bank_checks || [],
      created_at: c.created_at || new Date().toISOString(), updated_at: new Date().toISOString()
    };

    const d = data();
    if (isDraft) { d.companies.push(updated); } else {
      const idx = d.companies.findIndex((x) => x.company_id === c.company_id);
      if (idx !== -1) d.companies[idx] = updated;
    }
    Alaseel.store.touch();
    draft = null;
    view = { mode: 'detail', companyId: updated.company_id, isDraft: false };
    toast(T().saved);
    render();
  }

  function wireDeleteZone(c) {
    const zone = document.getElementById('deleteZoneCo');
    if (!zone) return;
    zone.innerHTML = '<button class="btn btn-danger" id="btnDelCo">' + T().delete_company + '</button>';
    document.getElementById('btnDelCo').addEventListener('click', () => {
      zone.innerHTML = '<div class="inline-confirm"><span>' + T().delete_confirm_q + '</span>' +
        '<button class="btn btn-danger btn-sm" id="confirmDelCo">' + T().confirm_yes + '</button>' +
        '<button class="btn btn-ghost btn-sm" id="cancelDelCo">' + T().confirm_cancel + '</button></div>';
      document.getElementById('cancelDelCo').addEventListener('click', () => wireDeleteZone(c));
      document.getElementById('confirmDelCo').addEventListener('click', () => {
        const d = data();
        d.companies = d.companies.filter((x) => x.company_id !== c.company_id);
        Alaseel.store.touch();
        toast(T().deleted);
        view = { mode: 'list' };
        render();
      });
    });
  }

  function wireChecks(c) {
    document.getElementById('btnAddCheck').addEventListener('click', () => {
      const number = document.getElementById('chkNumber').value.trim();
      const bank = document.getElementById('chkBank').value.trim();
      const account = document.getElementById('chkAccount').value.trim();
      const amount = parseFloat(document.getElementById('chkAmount').value);
      const maturity = document.getElementById('chkMaturity').value;
      if (!number || !amount || !maturity) return;

      if (!Array.isArray(c.bank_checks)) c.bank_checks = [];
      c.bank_checks.push({
        check_id: U.genId('chk'), check_number: number, bank_name: bank, account_number: account,
        amount, maturity_date: maturity, status: 'pending', penalty_fees: [], created_at: new Date().toISOString()
      });
      Alaseel.store.touch();
      toast(T().check_added);
      renderDetail();
    });
  }

  /* ---- field builders ---- */
  function textField(id, label, value, wide) {
    return '<div class="field-group' + (wide ? ' field-group-wide' : '') + '"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="' + id + '" type="text" value="' + U.esc(value || '') + '"></div>';
  }
  function numField(id, label, value) {
    return '<div class="field-group"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="' + id + '" type="number" min="0" step="0.01" value="' + (value === null || value === undefined ? '' : value) + '"></div>';
  }

  // Shared so Dashboard (app.js) and Coffee Shop/Laundry can post to a
  // company's ledger without duplicating this logic.
  Corporate.postCompanyCharge = function (companyId, charge) {
    const d = Alaseel.store.get();
    const company = d.companies.find((c) => c.company_id === companyId);
    if (!company) return { ok: false, error: 'COMPANY_NOT_FOUND' };
    const today = new Date().toISOString().slice(0, 10);
    if (company.expiration_date && company.expiration_date < today) return { ok: false, error: 'CONTRACT_EXPIRED' };
    if (!Array.isArray(company.company_charges)) company.company_charges = [];
    const entry = {
      charge_id: U.genId('cch'), source: charge.source || 'other', description: charge.description || '',
      amount: Number(charge.amount) || 0, currency: charge.currency || 'EGP', created_at: new Date().toISOString()
    };
    company.company_charges.push(entry);
    Alaseel.store.touch();
    return { ok: true, charge: entry };
  };

  Corporate.markCheckPaid = function (companyId, checkId) {
    const d = Alaseel.store.get();
    const company = d.companies.find((c) => c.company_id === companyId);
    if (!company) return;
    const chk = (company.bank_checks || []).find((x) => x.check_id === checkId);
    if (chk) { chk.status = 'paid'; Alaseel.store.touch(); }
  };

  Corporate.addPenalty = function (companyId, checkId, amount) {
    const d = Alaseel.store.get();
    const company = d.companies.find((c) => c.company_id === companyId);
    if (!company) return { ok: false };
    const chk = (company.bank_checks || []).find((x) => x.check_id === checkId);
    if (!chk) return { ok: false };
    if (!Array.isArray(chk.penalty_fees)) chk.penalty_fees = [];
    chk.penalty_fees.push({ amount, added_at: new Date().toISOString() });
    Corporate.postCompanyCharge(companyId, { source: 'other', description: Alaseel.i18n.corporate.add_penalty + ' \u2014 ' + chk.check_number, amount });
    return { ok: true };
  };

  Corporate.overdueChecks = function () {
    const d = Alaseel.store.get();
    const results = [];
    (d.companies || []).forEach((c) => {
      (c.bank_checks || []).forEach((chk) => {
        if (chk.status !== 'pending') return;
        const overdue = daysOverdue(chk.maturity_date);
        if (overdue > 0) results.push({ company_id: c.company_id, company_name: c.company_name, check: chk, overdue });
      });
    });
    return results.sort((a, b) => b.overdue - a.overdue);
  };

  Corporate.expiredContracts = function () {
    const today = new Date().toISOString().slice(0, 10);
    return (Alaseel.store.get().companies || []).filter((c) => c.expiration_date && c.expiration_date < today);
  };

  Alaseel.corporate = Corporate;
})();
