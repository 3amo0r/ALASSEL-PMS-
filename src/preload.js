// src/preload.js - النسخة الشاملة لنسخة الويب ديمو
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
      
      // الهيكل الافتراضي لأول مرة
      return Promise.resolve({
        settings: { theme: 'dark', language: 'ar' },
        auth: { isLoggedIn: false }
      });
    } catch (error) {
      console.error('[Web Mock] Error loading data:', error);
      return Promise.resolve({ settings: { theme: 'dark' } });
    }
  },

  // الدالة المطلوبة لإعداد الحساب أول مرة (تثبيت الـ Admin)
  authSetup: (username, password) => {
    console.log(`[Web Mock] authSetup called for username: ${username}`);
    try {
      // محاكاة لإنشاء ملف إعدادات وحساب أدمن
      const mockData = {
        settings: { theme: 'dark', language: 'ar' },
        auth: { 
          isLoggedIn: true, 
          currentUser: username 
        },
        users: [{ username: username, role: 'admin' }]
      };
      // حفظ البيانات في المتصفح تلقائياً
      localStorage.setItem('alaseel_pms_data', JSON.stringify(mockData));
      return Promise.resolve({ success: true, data: mockData });
    } catch (error) {
      return Promise.resolve({ success: false, error: error.message });
    }
  },

  // التحقق من وجود ملف
  fileExists: (path) => {
    console.log(`[Web Mock] fileExists called for path: ${path}`);
    return Promise.resolve(false);
  }
};

window.alaseelAPI = window.api;