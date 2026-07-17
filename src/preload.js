// src/preload.js - النسخة النهائية لإصلاح استقبال الكائن
console.log('✅ Preload.js (Web Mock) loaded successfully!');

window.api = {
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

  loadData: (key) => {
    console.log(`[Web Mock] Loading data for key: ${key}`);
    try {
      const data = localStorage.getItem(key);
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

  // تعديل الدالة لتقبل كائن (Object) تفكيكاً لهيكل المشروع
  authSetup: (authData) => {
    // استخراج اسم المستخدم سواء مبعوث ككائن أو كنص مباشر
    const username = authData && typeof authData === 'object' ? authData.username : authData;
    console.log(`[Web Mock] authSetup successfully called for: ${username}`);
    
    try {
      const mockData = {
        settings: { theme: 'dark', language: 'ar' },
        auth: { 
          isLoggedIn: true, 
          currentUser: username || 'admin'
        },
        users: [{ username: username || 'admin', role: 'admin' }]
      };
      
      // حفظ البيانات في المتصفح
      localStorage.setItem('alaseel_pms_data', JSON.stringify(mockData));
      
      // الرد بنجاح العملية
      return Promise.resolve({ success: true, data: mockData });
    } catch (error) {
      return Promise.resolve({ success: false, error: error.message });
    }
  },

  fileExists: (path) => {
    console.log(`[Web Mock] fileExists called for path: ${path}`);
    return Promise.resolve(false);
  }
};

window.alaseelAPI = window.api;