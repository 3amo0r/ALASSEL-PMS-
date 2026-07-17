// src/preload.js - النسخة المتكاملة للويب ديمو
console.log('✅ Preload.js (Web Mock) loaded successfully!');

window.api = {
  // حفظ البيانات في ذاكرة المتصفح
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

  // قراءة البيانات من ذاكرة المتصفح مع تجهيز الهيكل الأساسي
  loadData: (key) => {
    console.log(`[Web Mock] Loading data for key: ${key}`);
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return Promise.resolve(JSON.parse(data));
      }
      
      // إذا كانت أول مرة والذاكرة فارغة، نرجع الهيكل المتوقع الافتراضي
      const defaultStructure = {
        settings: {
          theme: 'dark',
          language: 'ar'
        },
        auth: {
          isLoggedIn: false
        }
      };
      
      return Promise.resolve(defaultStructure);
    } catch (error) {
      console.error('[Web Mock] Error loading data:', error);
      return Promise.resolve({ settings: { theme: 'dark' } });
    }
  },

  // التحقق من وجود ملف
  fileExists: (path) => {
    console.log(`[Web Mock] fileExists called for path: ${path}`);
    return Promise.resolve(false);
  }
};

window.alaseelAPI = window.api;