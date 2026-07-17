// hr.js
// Three tabs: Directory (employee CRUD + attendance log), Payroll (monthly
// calculator — Base + Tips - Advances - Deductions, deductions always
// hand-entered, never derived from attendance), and Shifts (weekly
// scheduling grid for Front Desk / Security / Housekeeping with cost
// tracking that the ledger can sum directly).

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.hr;
  const U = Alaseel.util;

  let pane, toast;
  let activeTab = 'directory';
  let view = { mode: 'list' };
  let draft = null;
  let searchTerm = '';
  let payrollMonth = currentMonthStr();
  let shiftDept = 'front_desk';
  let weekOffset = 0;

  const HR = {
    mount(contentPaneEl, toastFn) {
      pane = contentPaneEl;
      toast = toastFn;
      view = { mode: 'list' };
      render();
    },
    onSearch(term) {
      searchTerm = (term || '').trim().toLowerCase();
      if (activeTab === 'directory' && view.mode === 'list') renderActiveTab();
    }
  };

  function data() { return Alaseel.store.get(); }
  function employees() { return data().employees; }
  function payrollRecords() { return data().payrollRecords; }
  function shifts() { return data().shifts; }

  function currentMonthStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function render() {
    pane.innerHTML =
      '<div class="module-tabs">' +
        tabBtn('directory') + tabBtn('payroll') + tabBtn('shifts') +
      '</div>' +
      '<div id="hrSubPane"></div>';
    Array.prototype.forEach.call(pane.querySelectorAll('[data-hr-tab]'), (btn) => {
      btn.addEventListener('click', () => { activeTab = btn.getAttribute('data-hr-tab'); view = { mode: 'list' }; renderActiveTab(); });
    });
    renderActiveTab();
  }

  function tabBtn(key) {
    return '<button class="module-tab' + (activeTab === key ? ' active' : '') + '" data-hr-tab="' + key + '">' + T().tabs[key] + '</button>';
  }

  function renderActiveTab() {
    const sub = document.getElementById('hrSubPane');
    if (activeTab === 'payroll') return renderPayroll(sub);
    if (activeTab === 'shifts') return renderShifts(sub);
    return view.mode === 'detail' ? renderEmployeeDetail(sub) : renderDirectoryList(sub);
  }

  /* =========================================================== */
  /*  DIRECTORY: list                                              */
  /* =========================================================== */

  function renderDirectoryList(sub) {
    const list = employees().filter((e) => {
      if (!searchTerm) return true;
      const hay = [e.full_name, e.role, e.national_id].join(' ').toLowerCase();
      return hay.indexOf(searchTerm) !== -1;
    }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));

    sub.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + T().tabs.directory + '<span class="count">' + employees().length + '</span></div>' +
          '<button class="btn btn-primary btn-sm" id="btnAddEmployee">' + T().add_employee + '</button>' +
        '</div>' +
        (list.length ? empTableHead() + '<div class="list-body">' + list.map(empRow).join('') + '</div>' : '<div class="empty-note">' + T().empty_list + '</div>') +
      '</section>';

    document.getElementById('btnAddEmployee').addEventListener('click', startDraft);
    Array.prototype.forEach.call(sub.querySelectorAll('[data-emp]'), (row) => {
      row.addEventListener('click', () => { view = { mode: 'detail', employeeId: row.getAttribute('data-emp') }; draft = null; renderActiveTab(); });
    });
  }

  function empTableHead() {
    const h = T().list_head;
    return '<div class="list-row list-row-head res-row-cols" style="grid-template-columns:1.6fr 1fr 1fr 1fr 1fr;">' +
      '<div class="list-cell">' + h.name + '</div><div class="list-cell">' + h.role + '</div>' +
      '<div class="list-cell">' + h.department + '</div><div class="list-cell">' + h.national_id + '</div>' +
      '<div class="list-cell">' + h.salary + '</div></div>';
  }
  function empRow(e) {
    return '<div class="list-row res-row-cols" style="grid-template-columns:1.6fr 1fr 1fr 1fr 1fr;" data-emp="' + e.employee_id + '">' +
      '<div class="list-cell">' + U.esc(e.full_name) + '</div>' +
      '<div class="list-cell">' + U.esc(e.role || '\u2014') + '</div>' +
      '<div class="list-cell">' + (e.department ? T().departments[e.department] || U.esc(e.department) : T().no_department) + '</div>' +
      '<div class="list-cell ltr-num">' + U.esc(e.national_id || '\u2014') + '</div>' +
      '<div class="list-cell ltr-num">' + (e.base_salary || 0) + '</div>' +
    '</div>';
  }

  /* =========================================================== */
  /*  DIRECTORY: detail (create/edit + attendance)                  */
  /* =========================================================== */

  function startDraft() {
    draft = {
      employee_id: U.genId('emp'), full_name: '', national_id: '', role: '', department: '',
      hired_date: new Date().toISOString().slice(0, 10), base_salary: null, permissions: [],
      attendance: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    view = { mode: 'detail', employeeId: draft.employee_id, isDraft: true };
    renderActiveTab();
  }

  function current() {
    if (view.isDraft) return draft;
    return employees().find((e) => e.employee_id === view.employeeId);
  }

  function renderEmployeeDetail(sub) {
    const e = current();
    if (!e) { view = { mode: 'list' }; return renderDirectoryList(sub); }
    const isDraft = !!view.isDraft;

    sub.innerHTML =
      '<button class="back-link" id="btnBack"><span class="chevron rtl-flip">&#8250;</span>' + T().back_to_list + '</button>' +
      '<section class="panel detail-panel">' +
        '<div class="panel-head"><div class="panel-title">' + (isDraft ? T().add_employee : U.esc(e.full_name || T().add_employee)) + '</div></div>' +
        '<div class="settings-body">' +
          '<div class="detail-form">' +
            textField('empName', T().field_full_name, e.full_name, true) +
            textField('empNationalId', T().field_national_id, e.national_id) +
            textField('empRole', T().field_role, e.role, false, T().field_role_placeholder) +
            selectField('empDepartment', T().field_department, [['', T().no_department]].concat(Object.keys(T().departments).map((k) => [k, T().departments[k]])), e.department || '') +
            dateField('empHiredDate', T().field_hired_date, e.hired_date) +
            numField('empSalary', T().field_base_salary, e.base_salary) +
          '</div>' +
          '<div class="field-group-wide"><label class="field-label">' + T().field_permissions + '</label>' +
            '<div style="display:flex;flex-wrap:wrap;gap:12px;">' +
              Object.keys(T().permission_modules).map((k) =>
                '<label class="checkbox-row" style="padding:4px 0;"><input type="checkbox" class="perm-check" value="' + k + '"' + ((e.permissions || []).indexOf(k) !== -1 ? ' checked' : '') + '><span>' + T().permission_modules[k] + '</span></label>'
              ).join('') +
            '</div>' +
            '<p class="hint">' + T().permissions_hint + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="auth-error" id="empErr" hidden></div>' +
        '<div class="detail-actions" id="empActions"></div>' +
      '</section>' +
      (!isDraft ? attendanceSectionHtml(e) : '');

    document.getElementById('btnBack').addEventListener('click', () => { draft = null; view = { mode: 'list' }; renderActiveTab(); });
    wireEmployeeActions(e, isDraft);
    if (!isDraft) wireAttendance(e);
  }

  function attendanceSectionHtml(e) {
    const log = (e.attendance || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const today = new Date().toISOString().slice(0, 10);
    const checkedInToday = log.some((a) => a.date === today && a.status === 'present');

    return '<section class="panel" style="margin-top:14px;">' +
      '<div class="panel-head"><div class="panel-title">' + T().attendance_title + '</div>' +
        '<div style="display:flex;gap:8px;">' +
          (checkedInToday
            ? '<span class="badge badge-vip-gold">' + T().already_checked_in_today + '</span>'
            : '<button class="btn btn-secondary btn-sm" id="btnCheckInToday">' + T().check_in_today + '</button>') +
        '</div>' +
      '</div>' +
      '<div class="settings-body">' +
        '<div class="inline-form-row">' +
          '<div><label class="field-label">' + T().attendance_date + '</label><input class="field-input" id="attDate" type="date" value="' + today + '"></div>' +
          '<div><label class="field-label">' + T().attendance_status + '</label><select class="field-input" id="attStatus">' +
            Object.keys(T().attendance_statuses).map((k) => '<option value="' + k + '">' + T().attendance_statuses[k] + '</option>').join('') +
          '</select></div>' +
        '</div>' +
        '<button class="btn btn-secondary btn-sm" id="btnAddAttendance">' + T().add_attendance_entry + '</button>' +
        '<div style="margin-top:14px;">' +
          (log.length ? log.map((a) => '<div class="mini-row"><span>' + U.fmtDate(a.date) + '</span><span class="status-badge ' + attendanceBadgeCls(a.status) + '">' + T().attendance_statuses[a.status] + '</span></div>').join('') : '<div class="empty-note">' + T().no_attendance + '</div>') +
        '</div>' +
      '</div>' +
    '</section>';
  }
  function attendanceBadgeCls(status) {
    return { present: 'clean', late: 'dirty', leave: 'occupied', absent: 'maint' }[status] || 'oo';
  }

  function wireAttendance(e) {
    const btnCheckIn = document.getElementById('btnCheckInToday');
    if (btnCheckIn) btnCheckIn.addEventListener('click', () => {
      addAttendanceEntry(e, new Date().toISOString().slice(0, 10), 'present');
    });
    document.getElementById('btnAddAttendance').addEventListener('click', () => {
      const dateVal = document.getElementById('attDate').value;
      const statusVal = document.getElementById('attStatus').value;
      if (!dateVal) return;
      addAttendanceEntry(e, dateVal, statusVal);
    });
  }
  function addAttendanceEntry(e, dateVal, statusVal) {
    if (!Array.isArray(e.attendance)) e.attendance = [];
    const idx = e.attendance.findIndex((a) => a.date === dateVal);
    if (idx !== -1) e.attendance[idx] = { date: dateVal, status: statusVal };
    else e.attendance.push({ date: dateVal, status: statusVal });
    Alaseel.store.touch();
    renderEmployeeDetail(document.getElementById('hrSubPane'));
  }

  function wireEmployeeActions(e, isDraft) {
    const actions = document.getElementById('empActions');
    actions.innerHTML = '<button class="btn btn-primary" id="btnSaveEmp">' + T().save_employee + '</button>' + (!isDraft ? '<div id="deleteZoneEmp"></div>' : '');
    document.getElementById('btnSaveEmp').addEventListener('click', () => saveEmployee(e, isDraft));
    if (!isDraft) wireDeleteZone(e);
  }

  function saveEmployee(e, isDraft) {
    const err = document.getElementById('empErr');
    err.hidden = true;
    const fullName = document.getElementById('empName').value.trim();
    if (!fullName) { err.textContent = T().name_required; err.hidden = false; return; }

    const perms = Array.prototype.map.call(document.querySelectorAll('.perm-check:checked'), (c) => c.value);
    const updated = {
      employee_id: e.employee_id, full_name: fullName,
      national_id: document.getElementById('empNationalId').value.trim(),
      role: document.getElementById('empRole').value.trim(),
      department: document.getElementById('empDepartment').value,
      hired_date: document.getElementById('empHiredDate').value,
      base_salary: (function () { const v = document.getElementById('empSalary').value; return v === '' ? null : parseFloat(v); })(),
      permissions: perms, attendance: e.attendance || [],
      created_at: e.created_at || new Date().toISOString(), updated_at: new Date().toISOString()
    };

    const d = data();
    if (isDraft) { d.employees.push(updated); } else {
      const idx = d.employees.findIndex((x) => x.employee_id === e.employee_id);
      if (idx !== -1) d.employees[idx] = updated;
    }
    Alaseel.store.touch();
    draft = null;
    view = { mode: 'detail', employeeId: updated.employee_id, isDraft: false };
    toast(T().saved);
    renderActiveTab();
  }

  function wireDeleteZone(e) {
    const zone = document.getElementById('deleteZoneEmp');
    if (!zone) return;
    zone.innerHTML = '<button class="btn btn-danger" id="btnDelEmp">' + T().delete_employee + '</button>';
    document.getElementById('btnDelEmp').addEventListener('click', () => {
      zone.innerHTML = '<div class="inline-confirm"><span>' + T().delete_confirm_q + '</span>' +
        '<button class="btn btn-danger btn-sm" id="confirmDelEmp">' + T().confirm_yes + '</button>' +
        '<button class="btn btn-ghost btn-sm" id="cancelDelEmp">' + T().confirm_cancel + '</button></div>';
      document.getElementById('cancelDelEmp').addEventListener('click', () => wireDeleteZone(e));
      document.getElementById('confirmDelEmp').addEventListener('click', () => {
        const d = data();
        d.employees = d.employees.filter((x) => x.employee_id !== e.employee_id);
        Alaseel.store.touch();
        toast(T().deleted);
        view = { mode: 'list' };
        renderActiveTab();
      });
    });
  }

  /* ---- field builders ---- */
  function textField(id, label, value, wide, placeholder) {
    return '<div class="field-group' + (wide ? ' field-group-wide' : '') + '"><label class="field-label">' + label + '</label>' +
      '<input class="field-input" id="' + id + '" type="text" value="' + U.esc(value || '') + '" placeholder="' + (placeholder || '') + '"></div>';
  }
  function dateField(id, label, value) {
    return '<div class="field-group"><label class="field-label">' + label + '</label><input class="field-input" id="' + id + '" type="date" value="' + (value || '') + '"></div>';
  }
  function numField(id, label, value) {
    return '<div class="field-group"><label class="field-label">' + label + '</label><input class="field-input" id="' + id + '" type="number" min="0" step="0.01" value="' + (value === null || value === undefined ? '' : value) + '"></div>';
  }
  function selectField(id, label, options, value) {
    return '<div class="field-group"><label class="field-label">' + label + '</label><select class="field-input" id="' + id + '">' +
      options.map(([v, l]) => '<option value="' + v + '"' + (v === value ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>';
  }

  /* =========================================================== */
  /*  PAYROLL                                                       */
  /* =========================================================== */

  function renderPayroll(sub) {
    const emps = employees();
    if (!emps.length) { sub.innerHTML = '<section class="panel"><div class="settings-body"><div class="empty-note">' + T().payroll_no_employees + '</div></div></section>'; return; }

    const approved = !!(data().payrollApprovals || {})[payrollMonth];

    sub.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + T().payroll_title + '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<input class="field-input" id="payrollMonthInput" type="month" value="' + payrollMonth + '" style="margin-bottom:0;width:150px;">' +
            (approved ? '<span class="badge badge-vip-gold">' + T().payroll_approved_badge + '</span>' : '<span class="badge badge-vip-none">' + T().payroll_draft_badge + '</span>') +
          '</div>' +
        '</div>' +
        (approved ? '<div class="notice-banner" style="margin:12px 16px 0;">' + T().payroll_locked_hint + '</div>' : '') +
        '<div class="settings-body">' +
          '<p class="hint">' + T().deductions_manual_hint + '</p>' +
          '<table class="stock-table"><thead><tr>' +
            '<th>' + T().col_employee + '</th><th>' + T().col_base + '</th><th>' + T().col_tips + '</th>' +
            '<th>' + T().col_advances + '</th><th>' + T().col_deductions + '</th><th>' + T().col_net + '</th>' +
          '</tr></thead><tbody>' + emps.map((e) => payrollRow(e, approved)).join('') + '</tbody></table>' +
          '<div style="display:flex;gap:8px;margin-top:14px;">' +
            (approved
              ? '<button class="btn btn-ghost btn-sm" id="btnUnapprove">' + T().unapprove_payroll + '</button>'
              : ('<button class="btn btn-primary btn-sm" id="btnSavePayroll">' + T().save_payroll_run + '</button>' +
                 '<button class="btn btn-secondary btn-sm" id="btnApprovePayroll">' + T().approve_payroll + '</button>')) +
          '</div>' +
        '</div>' +
      '</section>';

    if (!approved) {
      wirePayrollInputs(sub);
      document.getElementById('btnSavePayroll').addEventListener('click', () => savePayrollRun(sub, false));
      document.getElementById('btnApprovePayroll').addEventListener('click', () => savePayrollRun(sub, true));
    } else {
      document.getElementById('btnUnapprove').addEventListener('click', () => {
        const approvals = data().payrollApprovals;
        delete approvals[payrollMonth];
        Alaseel.store.touch();
        renderPayroll(sub);
      });
    }
    document.getElementById('payrollMonthInput').addEventListener('change', (e2) => { payrollMonth = e2.target.value; renderPayroll(sub); });
  }

  function existingPayrollRecord(empId) {
    return payrollRecords().find((p) => p.employee_id === empId && p.month === payrollMonth);
  }

  function payrollRow(emp, disabled) {
    const existing = existingPayrollRecord(emp.employee_id);
    const base = emp.base_salary || 0;
    const tips = existing ? existing.tips_allocated : 0;
    const advances = existing ? existing.cash_advances : 0;
    const deductions = existing ? existing.leave_deductions : 0;
    const net = base + tips - advances - deductions;
    return '<tr>' +
      '<td>' + U.esc(emp.full_name) + '</td>' +
      '<td class="ltr-num">' + base + '</td>' +
      '<td><input class="threshold-input" type="number" min="0" data-field="tips" data-emp="' + emp.employee_id + '" value="' + tips + '"' + (disabled ? ' disabled' : '') + '></td>' +
      '<td><input class="threshold-input" type="number" min="0" data-field="advances" data-emp="' + emp.employee_id + '" value="' + advances + '"' + (disabled ? ' disabled' : '') + '></td>' +
      '<td><input class="threshold-input" type="number" min="0" data-field="deductions" data-emp="' + emp.employee_id + '" value="' + deductions + '"' + (disabled ? ' disabled' : '') + '></td>' +
      '<td class="ltr-num" id="net-' + emp.employee_id + '">' + net.toFixed(2) + '</td>' +
    '</tr>';
  }

  function wirePayrollInputs(sub) {
    Array.prototype.forEach.call(sub.querySelectorAll('[data-field]'), (input) => {
      input.addEventListener('input', () => recomputeRow(sub, input.getAttribute('data-emp')));
    });
  }
  function recomputeRow(sub, empId) {
    const emp = employees().find((e) => e.employee_id === empId);
    const tips = parseFloat(sub.querySelector('[data-field="tips"][data-emp="' + empId + '"]').value) || 0;
    const advances = parseFloat(sub.querySelector('[data-field="advances"][data-emp="' + empId + '"]').value) || 0;
    const deductions = parseFloat(sub.querySelector('[data-field="deductions"][data-emp="' + empId + '"]').value) || 0;
    const net = (emp.base_salary || 0) + tips - advances - deductions;
    document.getElementById('net-' + empId).textContent = net.toFixed(2);
  }

  function savePayrollRun(sub, approve) {
    const d = data();
    employees().forEach((emp) => {
      const tipsInput = sub.querySelector('[data-field="tips"][data-emp="' + emp.employee_id + '"]');
      const advInput = sub.querySelector('[data-field="advances"][data-emp="' + emp.employee_id + '"]');
      const dedInput = sub.querySelector('[data-field="deductions"][data-emp="' + emp.employee_id + '"]');
      const tips = parseFloat(tipsInput.value) || 0;
      const advances = parseFloat(advInput.value) || 0;
      const deductions = parseFloat(dedInput.value) || 0;
      const net = (emp.base_salary || 0) + tips - advances - deductions;

      const idx = d.payrollRecords.findIndex((p) => p.employee_id === emp.employee_id && p.month === payrollMonth);
      const record = {
        payroll_id: idx !== -1 ? d.payrollRecords[idx].payroll_id : U.genId('pr'),
        employee_id: emp.employee_id, month: payrollMonth, base_salary: emp.base_salary || 0,
        tips_allocated: tips, cash_advances: advances, leave_deductions: deductions, net_pay: net,
        created_at: new Date().toISOString()
      };
      if (idx !== -1) d.payrollRecords[idx] = record; else d.payrollRecords.push(record);
    });

    if (approve) {
      if (!d.payrollApprovals) d.payrollApprovals = {};
      d.payrollApprovals[payrollMonth] = { approved: true, approved_by: (d.auth && d.auth.username) || null, approved_at: new Date().toISOString() };
    }
    Alaseel.store.touch();
    toast(approve ? T().payroll_approved_toast : T().payroll_saved);
    renderPayroll(sub);
  }

  /* =========================================================== */
  /*  SHIFTS                                                        */
  /* =========================================================== */

  function weekDays(offset) {
    const days = [];
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  function renderShifts(sub) {
    if (!employees().length) {
      sub.innerHTML = '<section class="panel"><div class="settings-body"><div class="empty-note">' + T().no_employees_yet + '</div></div></section>';
      return;
    }
    const days = weekDays(weekOffset);
    const deptShifts = shifts().filter((s) => s.department === shiftDept && days.indexOf(s.date) !== -1);
    const weekTotal = deptShifts.reduce((sum, s) => sum + s.computed_cost, 0);

    sub.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="panel-title">' + T().shifts_title + '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-ghost btn-sm" id="btnPrevWeek">' + T().prev_week + '</button>' +
            '<button class="btn btn-ghost btn-sm" id="btnNextWeek">' + T().next_week + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="floor-chips">' + Object.keys(T().departments).map((k) => '<button class="chip' + (shiftDept === k ? ' active' : '') + '" data-dept="' + k + '">' + T().departments[k] + '</button>').join('') + '</div>' +
        '<div class="settings-body">' +
          days.map((day) => dayBlockHtml(day, deptShifts.filter((s) => s.date === day))).join('') +
          '<div class="folio-row folio-total-row"><span>' + T().week_total_cost + '</span><span class="ltr-num">' + weekTotal.toFixed(2) + '</span></div>' +
        '</div>' +
      '</section>' +
      addShiftFormHtml();

    wireShiftControls(sub);
  }

  function dayBlockHtml(day, dayShifts) {
    return '<div class="day-block">' +
      '<strong>' + U.fmtDate(day) + '</strong>' +
      (dayShifts.length ? dayShifts.map(shiftChipHtml).join('') : '<span class="hint" style="margin:6px 0 0;display:block;">' + T().no_shifts_this_week + '</span>') +
    '</div>';
  }

  function shiftChipHtml(s) {
    const emp = employees().find((e) => e.employee_id === s.employee_id);
    return '<div class="shift-chip">' +
      '<span>' + (emp ? U.esc(emp.full_name) : '?') + ' \u00b7 <span class="ltr-num">' + s.start_time + '-' + s.end_time + '</span></span>' +
      '<span class="ltr-num">' + s.computed_cost.toFixed(2) + '</span>' +
      '<button class="btn btn-ghost btn-sm" data-del-shift="' + s.shift_id + '">\u00d7</button>' +
    '</div>';
  }

  function addShiftFormHtml() {
    return '<div class="inline-form" style="margin-top:14px;">' +
      '<h3 class="form-section-label" style="margin-top:0;">' + T().add_shift + '</h3>' +
      '<div class="detail-form">' +
        selectField('shEmployee', T().shift_employee, employees().map((e) => [e.employee_id, e.full_name]), employees()[0].employee_id) +
        dateField('shDate', T().shift_date, new Date().toISOString().slice(0, 10)) +
        '<div class="field-group"><label class="field-label">' + T().shift_start + '</label><input class="field-input" id="shStart" type="time" value="09:00"></div>' +
        '<div class="field-group"><label class="field-label">' + T().shift_end + '</label><input class="field-input" id="shEnd" type="time" value="17:00"></div>' +
        selectField('shCostType', T().shift_cost_type, [['flat', T().cost_type_flat], ['hourly', T().cost_type_hourly]], 'flat') +
        numField('shCostAmount', T().shift_cost_amount, null) +
      '</div>' +
      '<div class="auth-error" id="shErr" hidden></div>' +
      '<button class="btn btn-primary btn-sm" id="btnAddShift">' + T().create_shift + '</button>' +
    '</div>';
  }

  function timeDiffHours(start, end) {
    const parts1 = start.split(':').map(Number);
    const parts2 = end.split(':').map(Number);
    let mins = (parts2[0] * 60 + parts2[1]) - (parts1[0] * 60 + parts1[1]);
    if (mins <= 0) mins += 24 * 60;
    return mins / 60;
  }

  function wireShiftControls(sub) {
    document.getElementById('btnPrevWeek').addEventListener('click', () => { weekOffset -= 1; renderShifts(sub); });
    document.getElementById('btnNextWeek').addEventListener('click', () => { weekOffset += 1; renderShifts(sub); });
    Array.prototype.forEach.call(sub.querySelectorAll('[data-dept]'), (btn) => {
      btn.addEventListener('click', () => { shiftDept = btn.getAttribute('data-dept'); renderShifts(sub); });
    });
    Array.prototype.forEach.call(sub.querySelectorAll('[data-del-shift]'), (btn) => {
      btn.addEventListener('click', () => {
        const d = data();
        d.shifts = d.shifts.filter((s) => s.shift_id !== btn.getAttribute('data-del-shift'));
        Alaseel.store.touch();
        toast(T().shift_deleted);
        renderShifts(sub);
      });
    });
    const btnAdd = document.getElementById('btnAddShift');
    if (btnAdd) btnAdd.addEventListener('click', () => {
      const err = document.getElementById('shErr');
      err.hidden = true;
      const empId = document.getElementById('shEmployee').value;
      if (!empId) { showErr(err, T().select_employee_first); return; }
      const dateVal = document.getElementById('shDate').value;
      const start = document.getElementById('shStart').value;
      const end = document.getElementById('shEnd').value;
      const costType = document.getElementById('shCostType').value;
      const costAmount = parseFloat(document.getElementById('shCostAmount').value) || 0;
      const computedCost = costType === 'flat' ? costAmount : costAmount * timeDiffHours(start, end);

      data().shifts.push({
        shift_id: U.genId('sh'), department: shiftDept, employee_id: empId, date: dateVal,
        start_time: start, end_time: end, cost_type: costType, cost_amount: costAmount,
        computed_cost: computedCost, created_at: new Date().toISOString()
      });
      Alaseel.store.touch();
      toast(T().shift_created);
      renderShifts(sub);
    });
  }

  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }

  Alaseel.hr = HR;
})();
