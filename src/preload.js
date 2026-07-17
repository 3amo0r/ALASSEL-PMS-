// preload.js
// Runs in an isolated context with access to Node, but the renderer (our
// index.html/js) never gets Node access directly. Only the functions
// explicitly exposed below are reachable from the page — a deliberately
// narrow, auditable surface.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('alaseelAPI', {
  // data store
  loadData: () => ipcRenderer.invoke('store:load'),
  saveData: (data) => ipcRenderer.invoke('store:save', data),

  // auth
  authSetup: (payload) => ipcRenderer.invoke('auth:setup', payload),
  authLogin: (payload) => ipcRenderer.invoke('auth:login', payload),
  authVerifyRecovery: (payload) => ipcRenderer.invoke('auth:verifyRecovery', payload),
  authReset: (payload) => ipcRenderer.invoke('auth:reset', payload),
  authChangePassword: (payload) => ipcRenderer.invoke('auth:changePassword', payload),
  authCreateUser: (payload) => ipcRenderer.invoke('auth:createUser', payload),
  authDeleteUser: (payload) => ipcRenderer.invoke('auth:deleteUser', payload),

  // export
  exportRoomsCsv: (payload) => ipcRenderer.invoke('export:roomsCsv', payload),
  exportLedgerCsv: (payload) => ipcRenderer.invoke('export:ledgerCsv', payload),
  revealInFolder: (payload) => ipcRenderer.invoke('export:revealInFolder', payload),

  platform: process.platform
});
