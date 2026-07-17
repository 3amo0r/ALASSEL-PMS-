// src/preload.js - نسخة الويب ديمو
console.log('✅ Preload.js (Web Mock) loaded successfully!');

window.api = {
  saveData: (key, data) => {
    console.log(`[Web Mock] saveData called for key: ${key}`);
    return Promise.resolve(true);
  },
  loadData: (key) => {
    console.log(`[Web Mock] loadData called for key: ${key}`);
    return Promise.resolve(null);
  },
  fileExists: (path) => {
    console.log(`[Web Mock] fileExists called for path: ${path}`);
    return Promise.resolve(false);
  }
};

window.alaseelAPI = window.api;