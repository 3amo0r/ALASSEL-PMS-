#!/usr/bin/env node
/*
 * reset-system.js — أداة تصفير بيانات نظام الأصيل (Alaseel PMS)
 *
 * تعمل بدون أي مكتبات خارجية، وتُشغَّل إما بـ Node.js أو بنواة Node المدمجة
 * داخل التطبيق نفسه (ELECTRON_RUN_AS_NODE=1) — انظر reset-system.cmd.
 *
 * الأوامر:
 *   report            جرد للقراءة فقط: مكان ملف البيانات + كل المفاتيح وعدد سجلاتها
 *   apply             تنفيذ التصفير (نسخة احتياطية أولاً، ثم كتابة ذرّية)
 *
 * الخيارات:
 *   --file <path>     مسار ملف البيانات يدوياً (بدلاً من البحث التلقائي)
 *   --dry-run         مع apply: اعرض ما سيحدث دون كتابة أي شيء
 *   --yes             تأكيد التنفيذ (مطلوب مع apply ما لم يكن --dry-run)
 *   --also a,b.c      امسح مفاتيح إضافية (يدعم المسار المتشعّب مثل coffeeShop.orderHistory)
 *   --keep-history    احتفظ بالسجلات التشغيلية القديمة (المقهى/المغسلة/الحجوزات المغادرة/الصيانة المقفولة)
 *
 * ملاحظة أمان: التطبيق يجب أن يكون مغلقاً تماماً قبل تشغيل apply، لأن النافذة
 * المفتوحة تحتفظ بنسخة من البيانات في الذاكرة وتعيد حفظها فوق أي تعديل.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const DATA_FILE_NAME = 'alaseel-data.json';

/* ------------------------------------------------------------------ */
/*  خطة التصفير                                                        */
/* ------------------------------------------------------------------ */

// مفاتيح تُفرَّغ بالكامل، مجمَّعة حسب الوحدة التي طلب المستخدم مسحها.
// لكل وحدة قائمة أسماء محتملة، لأن الإصدارات الأحدث قد تسمّي المفتاح باسم آخر.
const WIPE_GROUPS = [
  { module: 'الحسابات (دفتر الأستاذ)', keys: ['ledgerEntries', 'ledger', 'journalEntries', 'accountingEntries', 'accountEntries', 'accounts'] },
  { module: 'التدقيق الليلي', keys: ['nightAuditRuns', 'nightAudits', 'nightAuditLog', 'auditRuns'] },
  { module: 'الحسابات (سجل تصحيح الفواتير)', keys: ['folioAudit', 'folioAuditLog', 'folioTransfers'] },
  { module: 'المصروفات', keys: ['expenses', 'expenseEntries', 'expenseRecords', 'expenseLog'] },
  { module: 'الشركات', keys: ['companies', 'corporates', 'corporateAccounts'] },
  { module: 'التحليلات', keys: ['analytics', 'analyticsSnapshots', 'analyticsCache', 'analyticsHistory', 'kpiSnapshots', 'reportSnapshots'] },
  { module: 'التسعير الديناميكي', keys: ['dynamicPricing', 'dynamicPricingRules', 'pricingRules', 'pricingHistory', 'priceOverrides', 'rateRules', 'rateCalendar'] }
];

// سجلات تشغيلية قديمة تُغذّي التدقيق الليلي: لو بقيت، أول تشغيل للتدقيق الليلي
// بعد التصفير يعيد ترحيل كل إيرادها إلى دفتر الأستاذ فيُنقض التصفير.
const HISTORY_CLEAR_PATHS = [
  { path: 'coffeeShop.orderHistory', label: 'أرشيف أوردرات المقهى' },
  { path: 'laundry.transactions', label: 'معاملات المغسلة' }
];

const HISTORY_FILTERS = [
  {
    path: 'reservations',
    label: 'الحجوزات المغادرة/الملغاة',
    keep: (r) => r && r.reservation_status !== 'checked_out' && r.reservation_status !== 'cancelled' && r.reservation_status !== 'no_show'
  },
  {
    path: 'maintenanceTickets',
    label: 'تذاكر الصيانة المقفولة',
    keep: (t) => t && t.status !== 'resolved'
  }
];

// مفاتيح يجب ألا تُمس أبداً حتى لو مرّرها المستخدم في --also عن طريق الخطأ.
const PROTECTED_KEYS = ['meta', 'auth', 'users', 'hotel', 'settings'];

// مفاتيح النظام المعروفة التي تخص وحدات يريد المستخدم الإبقاء عليها — تُستثنى
// من كشف "المفاتيح المشبوهة" حتى لا يظهر إنذار كاذب لمفتاح سليم مثل wasteLedger.
const KNOWN_KEEP_KEYS = [
  'rooms', 'guests', 'reservations', 'reviews', 'locationStock', 'vouchers', 'wasteLedger',
  'inventoryThresholds', 'coffeeShop', 'laundry', 'maintenanceTickets', 'employees',
  'payrollRecords', 'payrollApprovals', 'shifts', 'operationalDate'
];

// تلميحات: أسماء توحي بأنها تخص وحدة مطلوب مسحها لكنها ليست في القائمة أعلاه.
const SUSPECT_PATTERN = /(expense|analytic|pricing|price|rate|ledger|audit|account|journal|compan|corporate|revenue|forecast|kpi|report)/i;

/* ------------------------------------------------------------------ */
/*  أدوات مساعدة                                                       */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = { command: 'report', file: null, dryRun: false, yes: false, also: [], keepHistory: false, force: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') { out.file = argv[++i]; }
    else if (a === '--dry-run') { out.dryRun = true; }
    else if (a === '--yes' || a === '-y') { out.yes = true; }
    else if (a === '--keep-history') { out.keepHistory = true; }
    else if (a === '--force') { out.force = true; }
    else if (a === '--also') { out.also = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean); }
    else if (a === '--help' || a === '-h') { out.command = 'help'; }
    else if (a.startsWith('-')) { rest.push(a); }
    else { rest.push(a); }
  }
  const cmd = rest.find((r) => !r.startsWith('-'));
  if (cmd) out.command = cmd;
  return out;
}

function appDataRoot() {
  if (process.platform === 'win32') return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support');
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}

// يبحث عن alaseel-data.json داخل مجلدات AppData (مستوى واحد للأسفل)، لأن اسم
// مجلد التطبيق يختلف حسب طريقة البناء (alaseel-pms أو Alaseel PMS ...).
function findDataFiles() {
  const root = appDataRoot();
  const hits = [];
  let entries = [];
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (e) { return hits; }
  entries.forEach((ent) => {
    if (!ent.isDirectory()) return;
    const candidate = path.join(root, ent.name, DATA_FILE_NAME);
    try {
      const st = fs.statSync(candidate);
      if (st.isFile()) hits.push({ file: candidate, size: st.size, mtime: st.mtime });
    } catch (e) { /* لا يوجد ملف هنا */ }
  });
  hits.sort((a, b) => b.mtime - a.mtime);
  return hits;
}

function resolveDataFile(explicit) {
  if (explicit) {
    if (!fs.existsSync(explicit)) fail('لم يتم العثور على الملف المحدد: ' + explicit);
    return explicit;
  }
  const hits = findDataFiles();
  if (!hits.length) {
    fail('لم أعثر على ' + DATA_FILE_NAME + ' داخل ' + appDataRoot() + '\n' +
         'شغّل الأمر مع مسار الملف يدوياً:  reset-system.cmd report --file "C:\\...\\alaseel-data.json"');
  }
  if (hits.length > 1) {
    log('تنبيه: وُجد أكثر من ملف بيانات — سيُستخدم الأحدث تعديلاً:');
    hits.forEach((h, i) => log('   ' + (i === 0 ? '>' : ' ') + ' ' + h.file + '   (' + fmtBytes(h.size) + '، آخر تعديل ' + h.mtime.toISOString().slice(0, 16).replace('T', ' ') + ')'));
  }
  return hits[0].file;
}

function readData(file) {
  const raw = fs.readFileSync(file, 'utf-8');
  const text = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw; // تجاهل BOM إن وُجد
  try {
    return { raw, data: JSON.parse(text) };
  } catch (e) {
    fail('ملف البيانات غير صالح كـ JSON — لم يُعدَّل أي شيء.\n' + String(e.message || e));
  }
}

function getAt(obj, dotPath) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

function setAt(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur === null || typeof cur !== 'object') return false;
    cur = cur[parts[i]];
  }
  if (cur === null || typeof cur !== 'object') return false;
  cur[parts[parts.length - 1]] = value;
  return true;
}

function sizeOf(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return null;
}

function describe(value) {
  if (Array.isArray(value)) return 'مصفوفة (' + value.length + ' سجل)';
  if (value === null) return 'null';
  if (typeof value === 'object') return 'كائن (' + Object.keys(value).length + ' مفتاح)';
  if (typeof value === 'string') return 'نص: ' + JSON.stringify(value.length > 40 ? value.slice(0, 40) + '…' : value);
  return String(value);
}

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function todayLocal() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function stamp() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

function log(msg) { process.stdout.write(msg + '\n'); }
function fail(msg) { process.stderr.write('\n[خطأ] ' + msg + '\n'); process.exit(1); }

/* ------------------------------------------------------------------ */
/*  أمر: report                                                        */
/* ------------------------------------------------------------------ */

function cmdReport(opts) {
  const file = resolveDataFile(opts.file);
  const st = fs.statSync(file);
  const { data } = readData(file);

  log('');
  log('════════ جرد بيانات النظام (قراءة فقط — لم يُعدَّل أي شيء) ════════');
  log('ملف البيانات : ' + file);
  log('الحجم        : ' + fmtBytes(st.size));
  log('آخر تعديل    : ' + st.mtime.toISOString().slice(0, 19).replace('T', ' '));
  log('إصدار المخطط : ' + ((data.meta && data.meta.schema_version) || 'غير معروف'));
  log('');

  const knownWipe = new Set();
  WIPE_GROUPS.forEach((g) => g.keys.forEach((k) => knownWipe.add(k)));

  const keys = Object.keys(data);
  log('── المفاتيح الموجودة في ملفك (' + keys.length + ') ──');
  keys.forEach((k) => {
    const mark = knownWipe.has(k) ? '[سيُمسح]     '
      : (k === 'operationalDate' ? '[يُعاد ضبطه] '
      : (PROTECTED_KEYS.indexOf(k) !== -1 ? '[محمي]       ' : '[سيبقى]      '));
    log('  ' + mark + padEnd(k, 24) + describe(data[k]));
  });

  log('');
  log('── ما سيمسحه الأمر apply من ملفك ──');
  let found = 0;
  WIPE_GROUPS.forEach((g) => {
    g.keys.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        found++;
        log('  • ' + padEnd(g.module, 30) + k + '  →  ' + describe(data[k]));
      }
    });
  });
  if (!found) log('  (لا شيء — مفاتيح الوحدات المطلوب مسحها غير موجودة بهذه الأسماء)');

  if (!opts.keepHistory) {
    log('');
    log('── سجلات تشغيلية قديمة سيمسحها apply (حتى لا يعيد التدقيق الليلي ترحيلها) ──');
    HISTORY_CLEAR_PATHS.forEach((h) => {
      const v = getAt(data, h.path);
      if (v !== undefined) log('  • ' + padEnd(h.label, 30) + h.path + '  →  ' + describe(v));
    });
    HISTORY_FILTERS.forEach((f) => {
      const arr = getAt(data, f.path);
      if (Array.isArray(arr)) {
        const drop = arr.length - arr.filter(f.keep).length;
        log('  • ' + padEnd(f.label, 30) + f.path + '  →  حذف ' + drop + ' من ' + arr.length + ' (يبقى ' + (arr.length - drop) + ')');
      }
    });
  }

  const suspects = keys.filter((k) => !knownWipe.has(k) && PROTECTED_KEYS.indexOf(k) === -1 &&
    KNOWN_KEEP_KEYS.indexOf(k) === -1 && SUSPECT_PATTERN.test(k));
  if (suspects.length) {
    log('');
    log('── مفاتيح اسمها يوحي بأنها تخص وحدة مطلوب مسحها، لكنها غير معروفة للأداة ──');
    log('   (لن تُمس تلقائياً. لو أردت مسحها أضِفها بـ  --also اسم1,اسم2)');
    suspects.forEach((k) => log('  ? ' + padEnd(k, 24) + describe(data[k])));
  }

  log('');
  log('الخطوة التالية: تأكد أن التطبيق مغلق تماماً، ثم:');
  log('   reset-system.cmd apply --dry-run     (معاينة بدون أي تعديل)');
  log('   reset-system.cmd apply --yes         (التنفيذ الفعلي مع نسخة احتياطية)');
  log('');
}

function padEnd(s, n) {
  s = String(s);
  return s.length >= n ? s + ' ' : s + ' '.repeat(n - s.length);
}

/* ------------------------------------------------------------------ */
/*  أمر: apply                                                         */
/* ------------------------------------------------------------------ */

function cmdApply(opts) {
  const file = resolveDataFile(opts.file);
  const { data } = readData(file);
  const changes = [];

  // 1) تفريغ مفاتيح الوحدات المطلوب مسحها
  const targets = [];
  WIPE_GROUPS.forEach((g) => g.keys.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(data, k)) targets.push({ path: k, label: g.module });
  }));
  opts.also.forEach((p) => {
    const head = p.split('.')[0];
    if (PROTECTED_KEYS.indexOf(head) !== -1) { log('تجاهُل --also ' + p + ' — مفتاح محمي لا يجوز مسحه.'); return; }
    if (getAt(data, p) === undefined) { log('تجاهُل --also ' + p + ' — غير موجود في الملف.'); return; }
    if (!targets.some((t) => t.path === p)) targets.push({ path: p, label: 'إضافي (--also)' });
  });

  targets.forEach((t) => {
    const before = getAt(data, t.path);
    const n = sizeOf(before);
    if (n === 0) return; // مُفرَّغ بالفعل — لا تسجّل تغييراً وهمياً
    if (Array.isArray(before)) { setAt(data, t.path, []); changes.push({ label: t.label, path: t.path, from: n + ' سجل', to: '0' }); }
    else if (before && typeof before === 'object') { setAt(data, t.path, {}); changes.push({ label: t.label, path: t.path, from: n + ' مفتاح', to: '0' }); }
    else { log('تحذير: ' + t.path + ' ليس مصفوفة ولا كائناً (' + describe(before) + ') — تُرك كما هو.'); }
  });

  // 2) السجلات التشغيلية التي تغذّي التدقيق الليلي
  if (!opts.keepHistory) {
    HISTORY_CLEAR_PATHS.forEach((h) => {
      const before = getAt(data, h.path);
      if (Array.isArray(before) && before.length) { setAt(data, h.path, []); changes.push({ label: h.label, path: h.path, from: before.length + ' سجل', to: '0' }); }
    });
    HISTORY_FILTERS.forEach((f) => {
      const arr = getAt(data, f.path);
      if (Array.isArray(arr)) {
        const kept = arr.filter(f.keep);
        if (kept.length !== arr.length) {
          setAt(data, f.path, kept);
          changes.push({ label: f.label, path: f.path, from: arr.length + ' سجل', to: kept.length + ' (حُذف ' + (arr.length - kept.length) + ')' });
        }
      }
    });
  }

  // 3) إعادة اليوم التشغيلي إلى تاريخ اليوم (التدقيق الليلي يبدأ من جديد)
  if (Object.prototype.hasOwnProperty.call(data, 'operationalDate')) {
    const before = data.operationalDate;
    const today = todayLocal();
    if (before !== today) { data.operationalDate = today; changes.push({ label: 'اليوم التشغيلي', path: 'operationalDate', from: String(before), to: today }); }
  }

  // تقرير التغييرات
  log('');
  log('════════ ' + (opts.dryRun ? 'معاينة (لن يُكتب أي شيء)' : 'تنفيذ التصفير') + ' ════════');
  log('ملف البيانات : ' + file);
  log('');
  if (!changes.length) {
    log('لا يوجد ما يُغيَّر — النظام مُصفَّر بالفعل.');
    return;
  }
  log(padEnd('الوحدة', 32) + padEnd('المفتاح', 26) + padEnd('قبل', 16) + 'بعد');
  log('─'.repeat(90));
  changes.forEach((c) => log(padEnd(c.label, 32) + padEnd(c.path, 26) + padEnd(c.from, 16) + c.to));
  log('');

  // ما تم الإبقاء عليه — تطمينة صريحة
  log('── تم الإبقاء عليه كما هو ──');
  [['rooms', 'شبكة الغرف'], ['guests', 'بيانات النزلاء الرسمية'], ['reservations', 'الحجوزات الحالية'],
   ['employees', 'الموظفون'], ['payrollRecords', 'سجلات الرواتب'], ['shifts', 'الورديات'],
   ['locationStock', 'مخزون المواقع'], ['vouchers', 'أذون المخزون'], ['wasteLedger', 'سجل التالف'],
   ['coffeeShop.menu', 'أصناف المقهى'], ['coffeeShop.tables', 'طاولات المقهى'], ['laundry.tiers', 'فئات أسعار المغسلة'],
   ['maintenanceTickets', 'تذاكر الصيانة المفتوحة'], ['users', 'حسابات المستخدمين'], ['settings', 'الإعدادات'], ['hotel', 'بيانات الفندق والشعار']
  ].forEach(([p, label]) => {
    const v = getAt(data, p);
    if (v !== undefined) log('  ✓ ' + padEnd(label, 30) + describe(v));
  });
  log('');

  if (opts.dryRun) { log('معاينة فقط — لم يُعدَّل الملف. للتنفيذ: أضِف --yes بدل --dry-run'); return; }
  if (!opts.yes) fail('التنفيذ يحتاج تأكيداً صريحاً. أعِد الأمر مع --yes (أو استخدم --dry-run للمعاينة).');
  if (!opts.force && appLooksRunning()) {
    fail('يبدو أن تطبيق الأصيل ما زال مفتوحاً. أغلقه تماماً (تأكد من إنهائه في مدير المهام) ثم أعِد الأمر.\n' +
         'النافذة المفتوحة تعيد حفظ بياناتها فوق التصفير فيضيع بلا أثر.\n' +
         '(لتخطي هذا الفحص عند التأكد أن التطبيق مغلق: أضِف --force)');
  }

  // نسخة احتياطية موثَّقة قبل أي كتابة
  const backup = path.join(path.dirname(file), 'alaseel-data.backup-' + stamp() + '.json');
  fs.copyFileSync(file, backup);
  const backupRaw = fs.readFileSync(backup, 'utf-8');
  try { JSON.parse(backupRaw.charCodeAt(0) === 0xFEFF ? backupRaw.slice(1) : backupRaw); }
  catch (e) { fail('فشل التحقق من النسخة الاحتياطية — أُلغيت العملية ولم يُعدَّل ملفك الأصلي.'); }
  log('نسخة احتياطية: ' + backup + '  (' + fmtBytes(fs.statSync(backup).size) + ')');

  // تسلسل + تحقق قبل الكتابة
  const out = JSON.stringify(data, null, 2);
  try { JSON.parse(out); } catch (e) { fail('الناتج غير صالح كـ JSON — أُلغيت العملية ولم يُعدَّل ملفك.'); }

  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, out, 'utf-8');
  fs.renameSync(tmp, file); // ذرّية على نفس القرص
  log('تم الحفظ: ' + file + '  (' + fmtBytes(fs.statSync(file).size) + ')');
  log('');
  log('تم التصفير بنجاح. افتح التطبيق وتأكد من الوحدات، ثم أغلقه وشغّل:  reset-system.cmd verify');
  log('للتراجع: أغلق التطبيق، احذف ' + DATA_FILE_NAME + '، ثم أعِد تسمية ملف النسخة الاحتياطية إلى ' + DATA_FILE_NAME);
  log('');
}

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  حارس: التطبيق يجب أن يكون مغلقاً                                   */
/* ------------------------------------------------------------------ */

// النافذة المفتوحة تحتفظ بنسخة من البيانات في الذاكرة وتعيد حفظها فوق أي تعديل،
// فيضيع التصفير بلا أثر. فحص أفضل جهد على ويندوز فقط.
function appLooksRunning() {
  if (process.platform !== 'win32') return false;
  try {
    const out = execSync('tasklist /FO CSV /NH', { encoding: 'utf-8', windowsHide: true });
    return out.split(/\r?\n/).some((line) => /^"[^"]*alas[a-z]*[^"]*\.exe"/i.test(line.trim()));
  } catch (e) {
    return false; // تعذّر الفحص — لا نمنع المستخدم بسببه
  }
}

/* ------------------------------------------------------------------ */
/*  أمر: verify — تأكد أن التصفير صمد بعد فتح التطبيق                  */
/* ------------------------------------------------------------------ */

function cmdVerify(opts) {
  const file = resolveDataFile(opts.file);
  const { data } = readData(file);
  const rows = [];

  WIPE_GROUPS.forEach((g) => g.keys.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(data, k)) rows.push([g.module + ' / ' + k, sizeOf(data[k])]);
  }));
  if (!opts.keepHistory) {
    HISTORY_CLEAR_PATHS.forEach((h) => {
      const v = getAt(data, h.path);
      if (Array.isArray(v)) rows.push([h.label, v.length]);
    });
    HISTORY_FILTERS.forEach((f) => {
      const arr = getAt(data, f.path);
      if (Array.isArray(arr)) rows.push([f.label + ' (متبقٍ)', arr.length - arr.filter(f.keep).length]);
    });
  }

  log('');
  log('════════ تحقّق بعد التصفير ════════');
  log('ملف البيانات : ' + file);
  log('');
  let bad = 0;
  rows.forEach(([label, n]) => {
    const ok = n === 0;
    if (!ok) bad++;
    log('  ' + (ok ? '✓ صفر   ' : '✗ عاد!  ') + padEnd(label, 44) + n);
  });
  log('');
  if (bad === 0) log('النتيجة: التصفير سليم — كل الوحدات المطلوبة أصبحت صفراً.');
  else {
    log('النتيجة: ' + bad + ' وحدة عادت فيها بيانات.');
    log('السبب الأغلب: التطبيق كان مفتوحاً وقت التصفير فأعاد حفظ نسخته من الذاكرة،');
    log('أو شُغِّل التدقيق الليلي بعد التصفير مع بقاء سجلات قديمة. أغلق التطبيق تماماً وأعد apply.');
  }
  log('');
}

function cmdHelp() {
  log([
    '',
    'أداة تصفير بيانات نظام الأصيل',
    '',
    '  reset-system.cmd report                      جرد للقراءة فقط',
    '  reset-system.cmd apply --dry-run             معاينة التصفير بدون كتابة',
    '  reset-system.cmd apply --yes                 تنفيذ التصفير (مع نسخة احتياطية)',
    '  reset-system.cmd verify                      تأكّد أن التصفير صمد بعد فتح التطبيق',
    '',
    'خيارات:',
    '  --file <path>      مسار ملف البيانات يدوياً',
    '  --also a,b.c       مفاتيح إضافية تُمسح (تُقرأ من مخرجات report)',
    '  --keep-history     لا تمسح السجلات التشغيلية القديمة',
    '  --force            تخطَّ فحص "التطبيق مفتوح" (ويندوز)',
    ''
  ].join('\n'));
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.command === 'report') return cmdReport(opts);
  if (opts.command === 'apply') return cmdApply(opts);
  if (opts.command === 'verify') return cmdVerify(opts);
  if (opts.command === 'help') return cmdHelp();
  fail('أمر غير معروف: ' + opts.command + '  (المتاح: report | apply | verify | help)');
}

main();
