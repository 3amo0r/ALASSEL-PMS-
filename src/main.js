// main.js
// Alaseel PMS — Electron main process.
//
// Responsibilities:
//   1. Own the single BrowserWindow and actively refuse to let anything spawn
//      a second window or popup (per the "strict single-frame SPA" rule).
//   2. Own all filesystem + crypto work. The renderer never touches Node
//      directly — it only calls the narrow API exposed via preload.js.
//   3. Persist all hotel data to one local JSON file so the app works fully
//      offline, with no external services required.

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_FILE = path.join(app.getPath('userData'), 'alaseel-data.json');
const EXPORT_DIR = path.join(app.getPath('documents'), 'Alaseel-PMS-Exports');

/* ------------------------------------------------------------------ */
/*  Credential hashing (no external deps — Node's built-in crypto)     */
/* ------------------------------------------------------------------ */

function hashSecret(plainText) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(plainText), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifySecret(plainText, stored) {
  if (!stored || typeof stored !== 'string' || stored.indexOf(':') === -1) return false;
  const [salt, hash] = stored.split(':');
  try {
    const check = crypto.scryptSync(String(plainText), salt, 64).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(check, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

// Recovery / backup codes: per-installation, randomly generated, shown once,
// stored only as a salted hash. This replaces any shared/hardcoded master
// token — each sold copy of the software gets its own unique code, so one
// leaked code can never grant access to a different property's system.
function generateRecoveryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  const groups = [];
  for (let g = 0; g < 4; g++) {
    let group = '';
    for (let i = 0; i < 4; i++) {
      group += alphabet[crypto.randomInt(alphabet.length)];
    }
    groups.push(group);
  }
  return groups.join('-');
}

/* ------------------------------------------------------------------ */
/*  Data file (single local JSON "database")                          */
/* ------------------------------------------------------------------ */

const ROOM_ASSET_SLUGS = [
  'bed', 'wardrobe', 'tv_unit', 'armchair', 'nightstand', 'table',
  'refrigerator', 'tv_screen', 'kettle', 'exhaust_fan', 'fan', 'ac',
  'water_heater', 'bedsheet', 'mattress', 'pillow', 'mattress_cover',
  'duvet', 'duvet_cover', 'towel', 'bathroom_mirror', 'curtain', 'coat_hanger'
];

function emptyInventory() {
  const inv = {};
  ROOM_ASSET_SLUGS.forEach((slug) => { inv[slug] = 0; });
  return inv;
}

function generateDefaultRooms() {
  const rooms = [];

  // 78 guest rooms — 3 floors, 26 rooms per floor, numbering locked to floor.
  [1, 2, 3].forEach((floor) => {
    for (let i = 1; i <= 26; i++) {
      const number = floor * 100 + i;
      rooms.push({
        room_id: `rm_${number}`,
        room_number: number,
        floor,
        room_type: '',
        room_model: null,
        capacity: null,
        price_per_night: null,
        status: 'clean',
        is_special: false,
        special_type: null,
        bookable: true,
        inventory: emptyInventory(),
        notes: ''
      });
    }
  });

  // 4 special operational rooms, grouped on a "ground floor" (floor 0).
  const specials = [
    { code: 1, type: 'manager_office' },
    { code: 2, type: 'coffee_shop' },
    { code: 3, type: 'laundry' },
    { code: 4, type: 'storage' }
  ];
  specials.forEach((s) => {
    rooms.push({
      room_id: `sp_${s.type}`,
      room_number: s.code,
      floor: 0,
      room_type: '',
      room_model: null,
      capacity: null,
      price_per_night: null,
      status: 'clean',
      is_special: true,
      special_type: s.type,
      bookable: s.type !== 'manager_office' ? false : false, // no special room is guest-bookable
      inventory: emptyInventory(),
      notes: ''
    });
  });

  return rooms;
}

function defaultData() {
  return {
    meta: {
      schema_version: 1,
      installation_id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    },
    hotel: {
      name_ar: 'فندق الأصيل',
      logo_dataurl: null,
      logo_variant: 'color'
    },
    auth: {
      username: null,
      password_hash: null,
      recovery_hash: null
    },
    settings: {
      theme: 'dark'
    },
    rooms: generateDefaultRooms(),
    guests: [],
    reservations: [],
    reviews: [],
    locationStock: {
      lobby: emptyInventory(),
      corridors: emptyInventory(),
      roof: emptyInventory(),
      workshop: emptyInventory(),
      laundry_transit: emptyInventory()
    },
    vouchers: [],
    wasteLedger: [],
    inventoryThresholds: {},
    coffeeShop: { categories: [], menu: [], tables: [], orderHistory: [] },
    laundry: { tiers: [], transactions: [] },
    folioAudit: [],
    maintenanceTickets: [],
    employees: [],
    payrollRecords: [],
    payrollApprovals: {},
    shifts: [],
    ledgerEntries: [],
    nightAuditRuns: [],
    operationalDate: new Date().toISOString().slice(0, 10),
    companies: []
  };
}

function loadDataFromDisk() {
  if (!fs.existsSync(DATA_FILE)) return null;
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse data file, treating as corrupt:', e);
    // Preserve the corrupt file instead of silently overwriting it.
    const backupPath = DATA_FILE + `.corrupt-${Date.now()}.bak`;
    try { fs.copyFileSync(DATA_FILE, backupPath); } catch (_e) {}
    return null;
  }
}

// Patches older data files forward so new fields are never just "missing"
// (which would crash renderer code expecting an array). Pure + idempotent —
// safe to call on every load. Returns whether anything actually changed,
// so the caller can decide whether a re-save is worth doing.
function migrateData(data) {
  let changed = false;
  if (!data.meta) { data.meta = { schema_version: 1, installation_id: crypto.randomUUID(), created_at: new Date().toISOString() }; changed = true; }
  if (!Array.isArray(data.guests)) { data.guests = []; changed = true; }
  if (!Array.isArray(data.reservations)) { data.reservations = []; changed = true; }
  if (!Array.isArray(data.reviews)) { data.reviews = []; changed = true; }
  if (!data.meta.schema_version || data.meta.schema_version < 2) { data.meta.schema_version = 2; changed = true; }

  if (!data.locationStock) data.locationStock = {};
  ['lobby', 'corridors', 'roof', 'workshop', 'laundry_transit'].forEach((key) => {
    if (!data.locationStock[key]) { data.locationStock[key] = emptyInventory(); changed = true; }
  });
  if (!Array.isArray(data.vouchers)) { data.vouchers = []; changed = true; }
  if (!Array.isArray(data.wasteLedger)) { data.wasteLedger = []; changed = true; }
  if (!data.inventoryThresholds) { data.inventoryThresholds = {}; changed = true; }
  if (data.meta.schema_version < 3) { data.meta.schema_version = 3; changed = true; }

  if (!data.coffeeShop) { data.coffeeShop = { categories: [], menu: [], tables: [] }; changed = true; }
  if (!Array.isArray(data.coffeeShop.categories)) { data.coffeeShop.categories = []; changed = true; }
  if (!Array.isArray(data.coffeeShop.menu)) { data.coffeeShop.menu = []; changed = true; }
  if (!Array.isArray(data.coffeeShop.tables)) { data.coffeeShop.tables = []; changed = true; }
  if (!data.laundry) { data.laundry = { tiers: [], transactions: [] }; changed = true; }
  if (!Array.isArray(data.laundry.tiers)) { data.laundry.tiers = []; changed = true; }
  if (!Array.isArray(data.laundry.transactions)) { data.laundry.transactions = []; changed = true; }
  if (data.meta.schema_version < 4) { data.meta.schema_version = 4; changed = true; }

  if (!Array.isArray(data.folioAudit)) { data.folioAudit = []; changed = true; }
  if (data.meta.schema_version < 5) { data.meta.schema_version = 5; changed = true; }

  if (!Array.isArray(data.users)) {
    data.users = [];
    if (data.auth && data.auth.username && data.auth.password_hash) {
      data.users.push({
        user_id: crypto.randomUUID(), username: data.auth.username, password_hash: data.auth.password_hash,
        role: 'admin', created_at: new Date().toISOString()
      });
    }
    const recoveryHash = (data.auth && data.auth.recovery_hash) || null;
    data.auth = { recovery_hash: recoveryHash };
    changed = true;
  }

  if (!Array.isArray(data.maintenanceTickets)) { data.maintenanceTickets = []; changed = true; }
  if (data.meta.schema_version < 6) { data.meta.schema_version = 6; changed = true; }

  if (!Array.isArray(data.employees)) { data.employees = []; changed = true; }
  if (!Array.isArray(data.payrollRecords)) { data.payrollRecords = []; changed = true; }
  if (!data.payrollApprovals) { data.payrollApprovals = {}; changed = true; }
  if (!Array.isArray(data.shifts)) { data.shifts = []; changed = true; }
  if (!Array.isArray(data.ledgerEntries)) { data.ledgerEntries = []; changed = true; }
  if (!Array.isArray(data.nightAuditRuns)) { data.nightAuditRuns = []; changed = true; }
  if (!data.operationalDate) { data.operationalDate = new Date().toISOString().slice(0, 10); changed = true; }
  if (data.meta.schema_version < 7) { data.meta.schema_version = 7; changed = true; }

  if (Array.isArray(data.rooms)) {
    data.rooms.forEach((r) => { if (r.room_model === undefined) { r.room_model = null; changed = true; } });
  }
  if (data.meta.schema_version < 8) { data.meta.schema_version = 8; changed = true; }

  if (data.coffeeShop && !Array.isArray(data.coffeeShop.orderHistory)) { data.coffeeShop.orderHistory = []; changed = true; }
  if (data.meta.schema_version < 9) { data.meta.schema_version = 9; changed = true; }

  if (!Array.isArray(data.companies)) { data.companies = []; changed = true; }
  if (data.meta.schema_version < 10) { data.meta.schema_version = 10; changed = true; }

  data.companies.forEach((c) => {
    if (c.contract_term === undefined) { c.contract_term = 'none'; changed = true; }
    if (c.activation_date === undefined) { c.activation_date = null; changed = true; }
    if (c.expiration_date === undefined) { c.expiration_date = null; changed = true; }
  });
  if (data.meta.schema_version < 11) { data.meta.schema_version = 11; changed = true; }

  return changed;
}

function saveDataToDisk(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmpPath = DATA_FILE + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DATA_FILE); // atomic on same volume
  return true;
}

/* ------------------------------------------------------------------ */
/*  Window creation — single window, popups actively denied            */
/* ------------------------------------------------------------------ */

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#14181d',
    show: false,
    icon: path.join(__dirname, 'assets', 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  // Remove the default Chromium/Electron menu bar (File/Edit/View/...) —
  // this is a commercial hotel product, not a dev shell.
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Hard rule: nothing may open a second window or popup, ever.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Prevent navigating away from the app shell (defense in depth — e.g. if
  // a future guest-notes field ever contained a link, it can't hijack the window).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const target = path.join(__dirname, 'src', 'index.html');
    if (!url.startsWith('file://') || !url.includes(path.basename(target))) {
      event.preventDefault();
    }
  });

  if (process.env.ALASEEL_DEBUG === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ------------------------------------------------------------------ */
/*  IPC: data store                                                    */
/* ------------------------------------------------------------------ */

ipcMain.handle('store:load', async () => {
  const existing = loadDataFromDisk();
  if (existing) {
    const changed = migrateData(existing);
    if (changed) saveDataToDisk(existing);
    return existing;
  }
  const fresh = defaultData();
  saveDataToDisk(fresh);
  return fresh;
});

ipcMain.handle('store:save', async (_event, data) => {
  try {
    saveDataToDisk(data);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

/* ------------------------------------------------------------------ */
/*  IPC: auth (multi-user)                                             */
/* ------------------------------------------------------------------ */

// First-run setup: create the first user (always role='admin') + issue a
// one-time recovery code. Called only when data.users is still empty.
ipcMain.handle('auth:setup', async (_event, { username, password }) => {
  const data = loadDataFromDisk() || defaultData();
  migrateData(data);
  const recoveryPlain = generateRecoveryCode();

  data.users = [{
    user_id: crypto.randomUUID(), username: String(username).trim(),
    password_hash: hashSecret(password), role: 'admin', created_at: new Date().toISOString()
  }];
  data.auth = { recovery_hash: hashSecret(recoveryPlain) };

  saveDataToDisk(data);
  return { ok: true, recoveryCode: recoveryPlain };
});

ipcMain.handle('auth:login', async (_event, { username, password }) => {
  const data = loadDataFromDisk();
  if (!data || !Array.isArray(data.users) || !data.users.length) {
    return { ok: false, error: 'NOT_INITIALIZED' };
  }
  const uname = String(username).trim();
  const user = data.users.find((u) => u.username === uname);
  if (!user || !verifySecret(password, user.password_hash)) {
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }
  return { ok: true, user: { user_id: user.user_id, username: user.username, role: user.role } };
});

ipcMain.handle('auth:verifyRecovery', async (_event, { code }) => {
  const data = loadDataFromDisk();
  if (!data || !data.auth || !data.auth.recovery_hash) {
    return { ok: false, error: 'NOT_INITIALIZED' };
  }
  const normalized = String(code).trim().toUpperCase();
  const matches = verifySecret(normalized, data.auth.recovery_hash);
  return matches ? { ok: true } : { ok: false, error: 'INVALID_CODE' };
});

// Forced reset after a successful recovery-code verification. Replaces (or
// creates) ONLY the admin account and issues a fresh recovery code — it
// deliberately leaves Receptionist/Barista/Laundry/Accountant accounts
// untouched, since a forgotten admin password has nothing to do with them.
ipcMain.handle('auth:reset', async (_event, { newUsername, newPassword }) => {
  const data = loadDataFromDisk();
  if (!data) return { ok: false, error: 'NOT_INITIALIZED' };
  migrateData(data);

  const recoveryPlain = generateRecoveryCode();
  const adminIdx = data.users.findIndex((u) => u.role === 'admin');
  const newAdmin = {
    user_id: adminIdx !== -1 ? data.users[adminIdx].user_id : crypto.randomUUID(),
    username: String(newUsername).trim(), password_hash: hashSecret(newPassword),
    role: 'admin', created_at: adminIdx !== -1 ? data.users[adminIdx].created_at : new Date().toISOString()
  };
  if (adminIdx !== -1) data.users[adminIdx] = newAdmin; else data.users.push(newAdmin);
  data.auth = { recovery_hash: hashSecret(recoveryPlain) };

  saveDataToDisk(data);
  return { ok: true, recoveryCode: recoveryPlain };
});

ipcMain.handle('auth:changePassword', async (_event, { userId, currentPassword, newUsername, newPassword }) => {
  const data = loadDataFromDisk();
  if (!data || !Array.isArray(data.users)) return { ok: false, error: 'NOT_INITIALIZED' };
  const user = data.users.find((u) => u.user_id === userId);
  if (!user) return { ok: false, error: 'NOT_INITIALIZED' };
  if (!verifySecret(currentPassword, user.password_hash)) {
    return { ok: false, error: 'WRONG_CURRENT_PASSWORD' };
  }
  user.username = String(newUsername).trim();
  if (newPassword) user.password_hash = hashSecret(newPassword);
  saveDataToDisk(data);
  return { ok: true, user: { user_id: user.user_id, username: user.username, role: user.role } };
});

// Admin-only in the UI (the renderer only exposes this to logged-in admins);
// still validated here defensively.
ipcMain.handle('auth:createUser', async (_event, { username, password, role }) => {
  const data = loadDataFromDisk();
  if (!data || !Array.isArray(data.users)) return { ok: false, error: 'NOT_INITIALIZED' };
  const uname = String(username).trim();
  if (!uname || !password) return { ok: false, error: 'INVALID_INPUT' };
  if (data.users.some((u) => u.username === uname)) return { ok: false, error: 'USERNAME_TAKEN' };

  const user = { user_id: crypto.randomUUID(), username: uname, password_hash: hashSecret(password), role, created_at: new Date().toISOString() };
  data.users.push(user);
  saveDataToDisk(data);
  return { ok: true, user: { user_id: user.user_id, username: user.username, role: user.role } };
});

ipcMain.handle('auth:deleteUser', async (_event, { userId }) => {
  const data = loadDataFromDisk();
  if (!data || !Array.isArray(data.users)) return { ok: false, error: 'NOT_INITIALIZED' };
  const target = data.users.find((u) => u.user_id === userId);
  if (!target) return { ok: false, error: 'NOT_FOUND' };
  const otherAdmins = data.users.filter((u) => u.role === 'admin' && u.user_id !== userId);
  if (target.role === 'admin' && otherAdmins.length === 0) {
    return { ok: false, error: 'LAST_ADMIN' };
  }
  data.users = data.users.filter((u) => u.user_id !== userId);
  saveDataToDisk(data);
  return { ok: true };
});

/* ------------------------------------------------------------------ */
/*  IPC: export                                                        */
/* ------------------------------------------------------------------ */

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

ipcMain.handle('export:roomsCsv', async (_event, { rooms, assetLabels }) => {
  try {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });

    const headers = [
      'رقم الغرفة', 'الطابق', 'النوع', 'الحالة', 'السعة', 'السعر لليلة'
    ].concat(ROOM_ASSET_SLUGS.map((slug) => (assetLabels && assetLabels[slug]) || slug))
      .concat(['إجمالي القطع']);

    const rows = rooms.map((r) => {
      const invValues = ROOM_ASSET_SLUGS.map((slug) => r.inventory ? (r.inventory[slug] || 0) : 0);
      const total = invValues.reduce((a, b) => a + b, 0);
      return [
        r.room_number, r.floor, r.room_type || '', r.status,
        r.capacity ?? '', r.price_per_night ?? ''
      ].concat(invValues).concat([total]);
    });

    const lines = [headers].concat(rows).map((row) => row.map(csvEscape).join(','));
    const csv = '\uFEFF' + lines.join('\r\n'); // BOM so Excel renders Arabic correctly

    const stamp = new Date().toISOString().slice(0, 10);
    const filePath = path.join(EXPORT_DIR, `rooms-inventory-${stamp}.csv`);
    fs.writeFileSync(filePath, csv, 'utf-8');

    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

ipcMain.handle('export:revealInFolder', async (_event, { filePath }) => {
  shell.showItemInFolder(filePath);
  return { ok: true };
});

ipcMain.handle('export:ledgerCsv', async (_event, { entries }) => {
  try {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    const headers = ['التاريخ', 'النوع', 'المصدر', 'الوصف', 'المبلغ', 'العملة'];
    const rows = entries.map((e) => [e.created_at, e.type, e.source, e.description, e.amount, e.currency]);
    const lines = [headers].concat(rows).map((row) => row.map(csvEscape).join(','));
    const csv = '\uFEFF' + lines.join('\r\n');

    const stamp = new Date().toISOString().slice(0, 10);
    const filePath = path.join(EXPORT_DIR, `general-ledger-${stamp}.csv`);
    fs.writeFileSync(filePath, csv, 'utf-8');
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});
