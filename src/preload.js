// src/preload.js - النسخة الشاملة مع دعم الـ authLogin والتحقق من الدخول
console.log('✅ Preload.js (Web Mock) loaded successfully!');

const DEFAULT_KEY = 'alaseel_pms_data';

window.api = {
  saveData: (key, data) => {
    const safeKey = (!key || key === 'undefined') ? DEFAULT_KEY : key;
    console.log(`[Web Mock] Saving data for key: ${safeKey}`, data);
    try {
      localStorage.setItem(safeKey, JSON.stringify(data));
      return Promise.resolve(true);
    } catch (error) {
      console.error('[Web Mock] Error saving data:', error);
      return Promise.resolve(false);
    }
  },

  loadData: (key) => {
    const safeKey = (!key || key === 'undefined') ? DEFAULT_KEY : key;
    console.log(`[Web Mock] Loading data for key: ${safeKey}`);
    try {
      const data = localStorage.getItem(safeKey);
      if (data) {
        return Promise.resolve(JSON.parse(data));
      }
      return Promise.resolve({
        settings: { theme: 'dark', language: 'ar' },
        auth: { isLoggedIn: false }
      });
    } catch (error) {
      console.error('[Web Mock] Error loading data:', error);
      return Promise.resolve({ settings: { theme: 'dark' } });
    }
  },

  authSetup: (authData) => {
    const username = authData && typeof authData === 'object' ? authData.username : authData;
    console.log(`[Web Mock] authSetup successfully called for: ${username}`);
    try {
      const mockData = {
        settings: { theme: 'dark', language: 'ar' },
        auth: { isLoggedIn: true, currentUser: username || 'omar' },
        users: [{ username: username || 'omar', role: 'admin' }]
      };
      localStorage.setItem(DEFAULT_KEY, JSON.stringify(mockData));
      localStorage.setItem('undefined', JSON.stringify(mockData));
      return Promise.resolve({ success: true, data: mockData });
    } catch (error) {
      return Promise.resolve({ success: false, error: error.message });
    }
  },

  // 🌟 الدالة الجديدة المطلوبة لعملية تسجيل الدخول
  authLogin: (loginData) => {
    console.log('[Web Mock] authLogin called with:', loginData);
    try {
      // فك اسم المستخدم من الـ object المرسل
      const username = loginData ? (loginData.username || loginData._username) : 'omar';
      
      const mockData = {
        settings: { theme: 'dark', language: 'ar' },
        auth: { isLoggedIn: true, currentUser: username || 'omar' },
        users: [{ username: username || 'omar', role: 'admin' }]
      };
      
      // حفظ الجلسة نشطة في الـ LocalStorage
      localStorage.setItem(DEFAULT_KEY, JSON.stringify(mockData));
      localStorage.setItem('undefined', JSON.stringify(mockData));
      
      // نرجع الرد بـ ok: true عشان الكود الأصلي يكمل الدخول
      return Promise.resolve({ ok: true, data: mockData });
    } catch (error) {
      console.error('[Web Mock] authLogin error:', error);
      return Promise.resolve({ ok: false, error: error.message });
    }
  },

  fileExists: (path) => {
    return Promise.resolve(false);
  }
};

window.alaseelAPI = window.api;