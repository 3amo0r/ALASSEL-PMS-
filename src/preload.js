// src/preload.js - النسخة المتوافقة مع المتصفح (Web Demo)

// هذا الملف يقوم فقط بتجهيز واجهة الـ API الوهمية على الـ window
// لضمان أن باقي أكواد المشروع (store.js, app.js) تعمل دون تعديل

console.log('✅ Preload.js (Web Mock) loaded successfully!');

// تعريف واجهة API وهمية في المتصفح
window.api = {
  // دالة وهمية لحفظ البيانات (لا تفعل شيئاً في نسخة الويب حالياً)
  saveData: (key, data) => {
    console.log(`[Web Mock] saveData called for key: ${key}`);
    return Promise.resolve(true);
  },

  // دالة وهمية لتحميل البيانات (تعيد null لفرض إنشاء حساب جديد)
  loadData: (key) => {
    console.log(`[Web Mock] loadData called for key: ${key}`);
    return Promise.resolve(null);
  },

  // دالة وهمية للتحقق من وجود ملف (تعيد false دائماً)
  fileExists: (path) => {
    console.log(`[Web Mock] fileExists called for path: ${path}`);
    return Promise.resolve(false);
  }
};

// تعريف الاسم البديل أيضاً (للتوافق)
window.alaseelAPI = window.api;