// src/preload.js - النسخة النهائية لإصلاح استقبال الكائن
console.log('✅ Preload.js (Web Mock) loaded successfully!');

// مفتاح احتياطي ثابت لمنع الـ undefined
const DEFAULT_KEY = 'alaseel_pms_data';

window.api = {
  saveData: (key, data) => {
    console.log(`[Web Mock] Saving data for key: ${key}`, data);
    try {
      localStorage.setItem(safeKey, JSON.stringify(data));
      return Promise.resolve(true);
    } catch (error) {
      console.error('[Web Mock] Error saving data:', error);
      return Promise.resolve(false);
    }
  },

  loadData: (key) => {
    console.log(`[Web Mock] Loading data for key: ${key}`);
    try {
      const data = localStorage.getItem(safeKey);
      if (data) {
        return Promise.resolve(JSON.parse(data));
      }
      
      // الهيكل الافتراضي لو مفيش داتا خالص
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
        auth: { 
          isLoggedIn: true, 
          currentUser: username || 'omar'
        },
        users: [{ username: username || 'omar', role: 'admin' }]
      };
      
      // نحفظها في كل المفاتيح الممكنة لضمان الأمان التام
      localStorage.setItem(DEFAULT_KEY, JSON.stringify(mockData));
      localStorage.setItem('undefined', JSON.stringify(mockData));
      
      return Promise.resolve({ success: true, data: mockData });
    } catch (error) {
      return Promise.resolve({ success: false, error: error.message });
    }
  },

  fileExists: (path) => {
    return Promise.resolve(false);
  }
};

window.alaseelAPI = window.api;