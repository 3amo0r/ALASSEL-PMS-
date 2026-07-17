// src/preload.js - النسخة النهائية والذكية للويب ديمو
console.log('✅ Preload.js (Web Mock) loaded successfully!');

window.api = {
  // حفظ البيانات في ذاكرة المتصفح المحلية (Local Storage)
  saveData: (key, data) => {
    console.log(`[Web Mock] Saving data for key: ${key}`, data);
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return Promise.resolve(true);
    } catch (error) {
      console.error('[Web Mock] Error saving data:', error);
      return Promise.resolve(false);
    }
  },

  // قراءة البيانات من ذاكرة المتصفح المحلية
  loadData: (key) => {
    console.log(`[Web Mock] Loading data for key: ${key}`);
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return Promise.resolve(JSON.parse(data));
      }
      // إذا لم تكن هناك بيانات محفوظة، نرجع كائن فارغ بدلاً من null لتجنب الأخطاء
      return Promise.resolve({});
    } catch (error) {
      console.error('[Web Mock] Error loading data:', error);
      return Promise.resolve({});
    }
  },

  // التحقق من وجود ملف
  fileExists: (path) => {
    console.log(`[Web Mock] fileExists called for path: ${path}`);
    return Promise.resolve(false);
  }
};

window.alaseelAPI = window.api;