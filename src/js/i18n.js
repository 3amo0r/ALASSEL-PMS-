// i18n.js — centralized Arabic strings + the fixed room-asset catalog.
// The UI is Arabic-only per spec, so this file exists mainly to keep every
// label in one place (no hunting through render functions to fix a word).

window.Alaseel = window.Alaseel || {};

Alaseel.i18n = {
  app_name: 'الأصيل — نظام إدارة الفندق',

  // ---- auth ----
  auth: {
    setup_title: 'إعداد النظام لأول مرة',
    setup_subtitle: 'أنشئ حساب المسؤول الرئيسي لبدء استخدام النظام',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    confirm_password: 'تأكيد كلمة المرور',
    create_account: 'إنشاء الحساب',

    recovery_reveal_title: 'احفظ رمز الاسترداد الخاص بك',
    recovery_reveal_body: 'لن يظهر هذا الرمز مرة أخرى بعد الآن. احتفظ به في مكان آمن — ستحتاجه لاستعادة الدخول إذا نسيت كلمة المرور مستقبلاً.',
    recovery_copy: 'نسخ الرمز',
    recovery_copied: 'تم نسخ الرمز',
    recovery_confirm_saved: 'لقد حفظت الرمز، متابعة',

    login_title: 'تسجيل الدخول',
    login_subtitle: 'مرحباً بعودتك',
    login_button: 'دخول',
    forgot_password: 'نسيت كلمة المرور؟',
    invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',

    recovery_title: 'استعادة الوصول',
    recovery_subtitle: 'أدخل رمز الاسترداد المكوّن من 16 خانة الذي حصلت عليه عند إعداد النظام',
    recovery_code_label: 'رمز الاسترداد',
    recovery_verify: 'تحقّق من الرمز',
    recovery_invalid: 'رمز الاسترداد غير صحيح',
    back_to_login: 'العودة لتسجيل الدخول',

    reset_title: 'تعيين بيانات دخول جديدة',
    reset_subtitle: 'لأسباب أمنية، يجب تعيين اسم مستخدم وكلمة مرور جديدين قبل المتابعة',
    new_username: 'اسم المستخدم الجديد',
    new_password: 'كلمة المرور الجديدة',
    save_continue: 'حفظ والمتابعة',

    password_mismatch: 'كلمتا المرور غير متطابقتين',
    fill_all_fields: 'يرجى تعبئة جميع الحقول',
    logout: 'تسجيل الخروج'
  },

  // ---- sidebar / modules ----
  nav: {
    dashboard: 'لوحة المعلومات',
    rooms: 'الغرف',
    guests: 'النزلاء والحجوزات',
    coffee_shop: 'نقطة البيع - المقهى',
    laundry: 'المغسلة',
    inventory: 'المخزون والمستودع',
    hr: 'الموظفون والرواتب',
    accounting: 'الحسابات والتدقيق الليلي',
    corporate: 'الشركات',
    maintenance: 'الصيانة',
    settings: 'الإعدادات'
  },

  stub: {
    heading_suffix: '',
    body: 'هذه الوحدة قيد الإعداد ضمن المرحلة القادمة من تطوير النظام، وستُفعَّل بالكامل بعد استكمال الوحدات المرتبطة بها.',
    phase_label: 'المرحلة القادمة'
  },

  // ---- topbar ----
  topbar: {
    search_placeholder: 'ابحث عن غرفة أو نزيل…',
    theme_dark: 'الوضع الداكن',
    theme_light: 'الوضع الفاتح'
  },

  // ---- dashboard (lightweight, real, Phase 1) ----
  dashboard: {
    title: 'نظرة عامة',
    occupancy: 'نسبة الإشغال',
    ready: 'غرف جاهزة',
    needs_cleaning: 'بحاجة لتنظيف',
    maintenance: 'قيد الصيانة',
    total_rooms: 'إجمالي الغرف',
    corporate_alerts_title: 'تنبيهات الشيكات البنكية المتأخرة',
    no_corporate_alerts: 'لا توجد شيكات متأخرة حالياً',
    overdue_by_prefix: 'متأخر',
    overdue_by_suffix: 'يوم'
  },

  // ---- rooms module ----
  rooms: {
    title: 'خريطة الغرف',
    all_floors: 'جميع الطوابق',
    floor: 'الطابق',
    ground_floor: 'الدور الأرضي',
    special_rooms: 'غرف خاصة',
    all_models: 'كل النماذج',
    no_model: 'بدون نموذج',
    model_label: 'نموذج الغرفة',
    models: { a: 'نموذج أ', b: 'نموذج ب', c: 'نموذج ج' },
    add_room: 'إضافة غرفة جديدة',
    export_csv: 'تصدير بيانات الغرف (CSV)',
    exporting: 'جارٍ التصدير…',
    export_success_prefix: 'تم حفظ الملف في:',
    reveal_file: 'إظهار في المجلد',

    status: {
      clean: 'جاهزة',
      occupied: 'مشغولة',
      dirty: 'بحاجة لتنظيف',
      maint: 'صيانة',
      oo: 'خارج الخدمة'
    },

    back_to_grid: 'العودة إلى خريطة الغرف',
    room_number: 'رقم الغرفة',
    room_id: 'معرّف الغرفة',
    floor_label: 'الطابق',
    room_type: 'نوع الغرفة',
    room_type_placeholder: 'مثال: غرفة قياسية، جناح ملكي…',
    capacity: 'السعة (عدد الأشخاص)',
    price: 'السعر لليلة الواحدة',
    not_set: 'لم يُحدد',
    status_label: 'الحالة',
    notes: 'ملاحظات',
    notes_placeholder: 'أي تفاصيل إضافية عن الغرفة…',

    save_changes: 'حفظ التعديلات',
    saved: 'تم حفظ التعديلات',
    delete_room: 'حذف الغرفة',
    delete_confirm_q: 'هل أنت متأكد من حذف هذه الغرفة؟ لا يمكن التراجع عن هذا الإجراء.',
    confirm_yes: 'نعم، احذف',
    confirm_cancel: 'إلغاء',
    room_deleted: 'تم حذف الغرفة',

    new_room_floor: 'الطابق',
    new_room_number: 'رقم الغرفة',
    create: 'إنشاء',
    cancel: 'إلغاء',
    room_number_taken: 'رقم الغرفة مستخدم بالفعل في هذا الطابق',
    room_created: 'تم إنشاء الغرفة',

    inventory_title: 'محتويات الغرفة (الأصول الثابتة)',
    inventory_hint: 'أدخل الكميات الفعلية الموجودة في هذه الغرفة الآن. تبدأ جميع الكميات من صفر حتى تُدخلها بنفسك.',
    total_items: 'إجمالي القطع',

    special_type: {
      manager_office: 'مكتب المدير',
      coffee_shop: 'المقهى',
      laundry: 'المغسلة',
      storage: 'المخزن'
    },
    special_not_bookable_office: 'هذه الغرفة تشغيلية ولا تُحجز ولا تُدر إيرادات ضيافة مباشرة.',
    special_not_bookable_module: 'هذه المساحة التشغيلية مرتبطة بوحدة مستقلة (المقهى أو المغسلة) — يمكن إدارة قوائمها وفواتيرها من تلك الوحدة مباشرة. المخزون الأساسي للغرفة متاح أدناه.',
    storage_hint: 'الكميات أدناه تمثل المخزون الحالي المتوفر في المخزن، وستُستخدم لاحقاً كأساس لسندات الصرف والتحويل.',

    sentiment_title: 'مؤشر رضا النزلاء عن هذه الغرفة',
    sentiment_count_suffix: 'تقييم',
    sentiment_flagged: 'تنبيه: هذه الغرفة تلقّت شكاوى متكررة — راجع حالتها وصيانتها',
    new_reservation_hint: 'لحجز نزيل لهذه الغرفة، انتقل إلى وحدة النزلاء والحجوزات.'
  },

  // ---- settings module ----
  settings: {
    title: 'الإعدادات',
    brand_section: 'بيانات الفندق',
    hotel_name: 'اسم الفندق',
    hotel_name_placeholder: 'أدخل اسم الفندق',
    logo: 'شعار الفندق',
    logo_hint: 'يظهر هذا الشعار في أعلى النظام وفي الملفات المُصدَّرة. يمكن استبداله في أي وقت.',
    logo_upload: 'رفع شعار جديد',
    logo_variant: 'نسخة الشعار المستخدمة',
    logo_variant_color: 'ملوّن',
    logo_variant_white: 'أبيض (للخلفيات الداكنة)',
    logo_variant_black: 'أسود (للطباعة)',
    save_brand: 'حفظ بيانات الفندق',
    brand_saved: 'تم حفظ بيانات الفندق',

    security_section: 'أمان الحساب',
    current_password: 'كلمة المرور الحالية',
    new_username: 'اسم المستخدم',
    new_password: 'كلمة مرور جديدة (اتركها فارغة إن لم ترغب بتغييرها)',
    save_security: 'حفظ بيانات الدخول',
    security_saved: 'تم تحديث بيانات الدخول بنجاح',
    wrong_current_password: 'كلمة المرور الحالية غير صحيحة'
  },

  common: {
    toggle_theme: 'تبديل المظهر'
  }
};

// Fixed catalog of 23 baseline room assets — identical across every room,
// per spec. `slug` is the stable internal key; `label` is the Arabic
// display name. This single list drives the inventory editor, the CSV
// export headers, and the data model default — one source of truth.
Alaseel.i18n.inventoryTypes = [
  { slug: 'bed', label: 'سرير' },
  { slug: 'wardrobe', label: 'خزانة ملابس' },
  { slug: 'tv_unit', label: 'وحدة تلفاز' },
  { slug: 'armchair', label: 'كرسي بذراعين' },
  { slug: 'nightstand', label: 'طاولة جانبية' },
  { slug: 'table', label: 'طاولة' },
  { slug: 'refrigerator', label: 'ثلاجة' },
  { slug: 'tv_screen', label: 'شاشة تلفاز' },
  { slug: 'kettle', label: 'غلاية' },
  { slug: 'exhaust_fan', label: 'مروحة شفط' },
  { slug: 'fan', label: 'مروحة' },
  { slug: 'ac', label: 'مكيف هواء' },
  { slug: 'water_heater', label: 'سخان مياه' },
  { slug: 'bedsheet', label: 'ملاءة سرير' },
  { slug: 'mattress', label: 'مرتبة' },
  { slug: 'pillow', label: 'وسادة' },
  { slug: 'mattress_cover', label: 'غطاء مرتبة' },
  { slug: 'duvet', label: 'لحاف' },
  { slug: 'duvet_cover', label: 'غطاء لحاف' },
  { slug: 'towel', label: 'منشفة' },
  { slug: 'bathroom_mirror', label: 'مرآة حمام' },
  { slug: 'curtain', label: 'ستارة' },
  { slug: 'coat_hanger', label: 'علّاقة ملابس' }
];

// ---- Phase 2: Guests & Reservations ----

Alaseel.i18n.moduleTabs = {
  guests: 'النزلاء',
  reservations: 'الحجوزات'
};

Alaseel.i18n.guests = {
  title: 'النزلاء',
  add_guest: 'إضافة نزيل جديد',
  empty_list: 'لا يوجد نزلاء مسجلون بعد',
  list_head: { name: 'الاسم', nationality: 'الجنسية', phone: 'الهاتف', vip: 'الفئة', flags: '' },
  back_to_list: 'العودة إلى قائمة النزلاء',

  fields: {
    full_name: 'الاسم الكامل',
    nationality: 'الجنسية',
    passport_number: 'رقم جواز السفر',
    visa_number: 'رقم التأشيرة',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    profession: 'المهنة',
    vip_level: 'فئة النزيل',
    preferences: 'التفضيلات',
    preferences_placeholder: 'مثال: طابق مرتفع، وسادة إضافية، غرفة هادئة…',
    emergency_contact: 'جهة اتصال للطوارئ',
    notes: 'ملاحظات',
    notes_placeholder: 'أي معلومات إضافية عن النزيل…'
  },

  vip: { none: 'عادي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني' },

  blacklist_toggle: 'قائمة الحظر',
  blacklist_reason: 'سبب الإدراج في قائمة الحظر',
  blacklist_reason_placeholder: 'اذكر السبب بإيجاز…',
  blacklisted_badge: 'محظور',

  save: 'حفظ بيانات النزيل',
  saved: 'تم حفظ بيانات النزيل',
  name_required: 'الاسم الكامل مطلوب',
  delete: 'حذف النزيل',
  delete_confirm_q: 'هل أنت متأكد من حذف بيانات هذا النزيل؟ الحجوزات والتقييمات السابقة المرتبطة به تبقى محفوظة كسجل تاريخي.',
  confirm_yes: 'نعم، احذف',
  confirm_cancel: 'إلغاء',
  deleted: 'تم حذف النزيل',

  stay_history: 'سجل الإقامات',
  no_stay_history: 'لا يوجد سجل إقامات بعد',
  review_history: 'سجل التقييمات',
  no_review_history: 'لا توجد تقييمات سابقة',
  new_reservation_for_guest: 'حجز جديد لهذا النزيل'
};

Alaseel.i18n.reservations = {
  title: 'الحجوزات',
  new_reservation: 'حجز جديد',
  back_to_list: 'العودة إلى قائمة الحجوزات',
  empty_list: 'لا توجد حجوزات مطابقة',

  filters: { all: 'الكل', confirmed: 'قادمة', checked_in: 'داخل الفندق', checked_out: 'غادرت', cancelled: 'ملغاة', no_show: 'لم يحضر' },
  list_head: { guest: 'النزيل', room: 'الغرفة', check_in: 'الوصول', check_out: 'المغادرة', status: 'الحالة', payment: 'الدفع' },

  guest_section: 'بيانات النزيل',
  select_guest_placeholder: 'ابحث بالاسم أو رقم الهاتف أو جواز السفر…',
  no_guest_selected: 'لم يتم اختيار نزيل بعد',
  change_guest: 'تغيير النزيل',
  add_new_guest_link: 'لا يوجد؟ أضف نزيلاً جديداً',
  view_guest_profile: 'عرض ملف النزيل',
  blacklist_warning: 'تنبيه: هذا النزيل مدرج على قائمة الحظر',

  room_section: 'بيانات الغرفة',
  select_room_placeholder: 'اختر الغرفة',
  room_sentiment_warning: 'تنبيه: هذه الغرفة تلقّت تقييمات سلبية متكررة',

  stay_section: 'تفاصيل الإقامة',
  check_in_date: 'تاريخ الوصول',
  check_out_date: 'تاريخ المغادرة',
  arrival_time: 'وقت الوصول المتوقع',
  adults: 'عدد البالغين',
  children: 'عدد الأطفال',

  financial_section: 'التفاصيل المالية',
  total_amount: 'المبلغ الإجمالي',
  currency: 'العملة',
  deposit_amount: 'مبلغ العربون',
  promo_code: 'كود الخصم',
  special_requests: 'طلبات خاصة',
  special_requests_placeholder: 'أي طلبات إضافية من النزيل…',

  reservation_status: 'حالة الحجز',
  payment_status: 'حالة الدفع',
  status: { confirmed: 'مؤكد', checked_in: 'داخل الفندق', checked_out: 'غادر', cancelled: 'ملغى', no_show: 'لم يحضر' },
  payment: { unpaid: 'غير مدفوع', partial: 'مدفوع جزئياً', paid: 'مدفوع بالكامل', refunded: 'مسترد' },

  create: 'إنشاء الحجز',
  save_changes: 'حفظ التعديلات',
  saved: 'تم حفظ الحجز',
  created: 'تم إنشاء الحجز بنجاح',
  overlap_error: 'هذه الغرفة محجوزة بالفعل خلال هذه الفترة',
  dates_error: 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول',
  guest_room_required: 'يرجى اختيار النزيل والغرفة',

  do_checkin: 'تسجيل الوصول',
  do_checkout: 'تسجيل المغادرة',
  do_cancel: 'إلغاء الحجز',
  cancel_confirm_q: 'هل تريد إلغاء هذا الحجز؟',
  confirm_yes: 'نعم، تأكيد',
  confirm_cancel: 'تراجع',
  checked_in_toast: 'تم تسجيل الوصول — الغرفة الآن مشغولة',
  checkout_blocked_unpaid: 'لا يمكن تسجيل المغادرة قبل تسوية المبلغ المستحق بالكامل — حدّث حالة الدفع إلى "مدفوع بالكامل" أو "مسترد" أولاً',
  checkout_payment_warning: 'يجب تسوية حالة الدفع بالكامل قبل تسجيل المغادرة',
  checked_out_toast: 'تم تسجيل المغادرة — الغرفة بحاجة للتنظيف',
  cancelled_toast: 'تم إلغاء الحجز',
  locked_notice: 'هذا الحجز مغلق (مكتمل أو ملغى) ولا يمكن تعديل بياناته.',
  room_status_notice_prefix: 'الحالة الحالية لهذه الغرفة:',
  delete: 'حذف الحجز',
  delete_confirm_q: 'حذف الحجز نهائياً؟ يُفضّل استخدام "إلغاء الحجز" بدلاً من الحذف للاحتفاظ بالسجل.',
  deleted: 'تم حذف الحجز',

  review_capture_title: 'تقييم سريع للإقامة (اختياري)',
  review_capture_hint: 'يساعد هذا التقييم في رصد أي ملاحظات متكررة حول الغرفة أو مستوى الخدمة.',
  review_category: 'التصنيف',
  review_categories: {
    general: 'عام', cleanliness: 'النظافة', staff: 'الخدمة',
    room_condition: 'حالة الغرفة وصيانتها', noise: 'الضوضاء', amenities: 'المرافق'
  },
  review_comment_placeholder: 'أي ملاحظات من النزيل (اختياري)…',
  review_save: 'حفظ التقييم',
  review_skip: 'تخطي',
  review_saved_toast: 'تم حفظ التقييم',

  guest_review_summary_title: 'التقييمات السابقة لهذا النزيل',
  no_past_reviews: 'لا توجد تقييمات سابقة لهذا النزيل',
  avg_score_label: 'المتوسط',
  past_reviews_count_label: 'عدد التقييمات',

  folio_title: 'فاتورة الإقامة (الفولیو)',
  folio_room_charge: 'رسوم الغرفة',
  folio_extra_charges: 'رسوم إضافية',
  folio_no_charges: 'لا توجد رسوم إضافية على هذا الحجز بعد',
  folio_grand_total: 'الإجمالي شاملاً الإضافات',
  folio_add_charge: 'إضافة رسوم يدوية',
  folio_charge_source: 'المصدر',
  folio_charge_sources: { coffee_shop: 'المقهى', laundry: 'المغسلة', maintenance: 'صيانة', other: 'أخرى' },
  folio_charge_description: 'الوصف',
  folio_charge_description_placeholder: 'مثال: كابتشينو × 2',
  folio_charge_amount: 'المبلغ',
  folio_add_charge_btn: 'إضافة إلى الفاتورة',
  folio_charge_added_toast: 'تمت إضافة الرسوم إلى الفاتورة',
  folio_only_when_checked_in: 'تُفعَّل الفاتورة عند تسجيل وصول النزيل، وتُقفل تلقائياً عند تسجيل المغادرة.',

  folio_transfer_btn: 'نقل',
  folio_transfer_title: 'نقل الرسوم إلى غرفة أخرى',
  folio_transfer_target_room: 'رقم الغرفة الصحيحة',
  folio_transfer_reason: 'سبب النقل',
  folio_transfer_reason_placeholder: 'مثال: تم ترحيل الطلب بالخطأ إلى هذه الغرفة…',
  folio_transfer_reason_required: 'سبب النقل مطلوب',
  folio_transfer_confirm: 'تأكيد النقل',
  folio_transfer_cancel: 'إلغاء',
  folio_transfer_success: 'تم نقل الرسوم إلى الغرفة الصحيحة بنجاح',
  folio_transfer_room_not_found: 'رقم الغرفة غير موجود',
  folio_transfer_no_active_guest: 'لا يوجد نزيل مسجّل دخول حالياً في هذه الغرفة',
  folio_transfer_same_room: 'هذه هي نفس الغرفة الحالية للرسوم',
  folio_transferred_from_prefix: 'محوّل من الغرفة'
};

// ---- Phase 3: Inventory Control & Vouchers ----

Alaseel.i18n.inventory = {
  title: 'المخزون والمستودع',
  tabs: { overview: 'نظرة عامة', intake: 'سند استلام', issuance: 'سند صرف', exchange: 'سند تبديل', maintenance: 'سند صيانة', waste: 'سند تالف/فاقد', log: 'سجل الحركات' },

  locations: {
    lobby: 'اللوبي', corridors: 'الممرات', roof: 'السطح',
    workshop: 'الورشة (قيد الصيانة)', laundry_transit: 'المغسلة الخارجية',
    sp_storage: 'المخزن (المخزون المركزي)'
  },

  overview_stock_title: 'المخزون المركزي (المخزن)',
  overview_stock_hint: 'الكميات المتاحة حالياً في المخزن لكل صنف. عدّل الحد الأدنى لتفعيل تنبيه النقص.',
  col_item: 'الصنف', col_in_storage: 'في المخزن', col_min_threshold: 'الحد الأدنى', col_in_rooms: 'موزّع على الغرف',
  low_stock_banner_prefix: 'تنبيه نقص مخزون:',
  low_stock_banner_suffix: 'صنف وصل إلى الحد الأدنى أو أقل',
  low_stock_toast_prefix: 'تنبيه مخزون: كمية',
  low_stock_toast_suffix: 'وصلت إلى الحد الأدنى في المخزن',
  no_low_stock: 'لا توجد أصناف منخفضة المخزون حالياً',
  save_thresholds: 'حفظ الحدود الدنيا',
  thresholds_saved: 'تم حفظ الحدود الدنيا',

  workshop_stock_title: 'الأصناف الموجودة حالياً في الورشة',
  return_to_storage: 'استرجاع إلى المخزن',
  returned_toast: 'تم استرجاع الصنف إلى المخزن',

  form_item: 'الصنف',
  form_qty: 'الكمية',
  form_destination: 'الوجهة',
  form_source: 'المصدر',
  form_location: 'الموقع',
  form_notes: 'ملاحظات',
  form_notes_placeholder: 'أي تفاصيل إضافية…',
  select_room_or_location: 'اختر غرفة أو موقعاً',

  intake_title: 'سند استلام مخزون (توريد جديد)',
  intake_hint: 'يسجّل توريداً جديداً وارداً من خارج النظام (مورّد خارجي) ويضيفه مباشرة إلى المخزون المركزي.',
  intake_notes_placeholder: 'مثال: رقم أمر التوريد، اسم المورّد…',
  intake_submit: 'تسجيل الاستلام',
  intake_success: 'تم تسجيل استلام الصنف وإضافته إلى المخزن',

  issuance_title: 'سند صرف (إخراج من المخزن)',
  issuance_hint: 'يخصم الصنف من المخزن المركزي ويضيفه إلى الوجهة المختارة (غرفة، لوبي، ممرات، أو سطح).',
  issuance_submit: 'تنفيذ الصرف',
  issuance_success: 'تم صرف الصنف بنجاح',
  insufficient_stock: 'الكمية المطلوبة أكبر من المتوفر في المخزن',
  insufficient_stock_at_location: 'الكمية المطلوبة أكبر من المتوفر في هذا الموقع',

  exchange_title: 'سند تبديل (استبدال صنف في الخدمة)',
  exchange_hint: 'يسحب صنفاً من الخدمة ويعيده للمخزن كصالح للاستخدام، ثم يستبدله بصنف جديد من المخزن.',
  exchange_old_item: 'الصنف المسحوب',
  exchange_old_qty: 'الكمية المسحوبة',
  exchange_new_item: 'الصنف البديل (من المخزن)',
  exchange_new_qty: 'الكمية البديلة',
  exchange_submit: 'تنفيذ التبديل',
  exchange_success: 'تم تنفيذ سند التبديل — الصنف القديم عاد للمخزن والجديد صُرف من المخزن',

  maintenance_title: 'سند صيانة (إرسال إلى الورشة)',
  maintenance_hint: 'يسحب الصنف من موقعه الحالي ويحدّث حالته إلى "قيد الصيانة" في الورشة.',
  maintenance_submit: 'إرسال إلى الورشة',
  maintenance_success: 'تم إرسال الصنف إلى الورشة',

  waste_title: 'سند تالف / فاقد',
  waste_hint: 'يسجّل صنفاً تالفاً أو مفقوداً بشكل نهائي في سجل الفاقد، مع سبب إلزامي. لا تتم إعادته إلى أي مخزون.',
  waste_qty: 'الكمية التالفة/المفقودة',
  waste_reason: 'سبب التلف أو الفقد',
  waste_reason_placeholder: 'اذكر السبب بوضوح — مطلوب…',
  waste_reason_required: 'سبب التلف أو الفقد مطلوب',
  waste_submit: 'تسجيل الفاقد',
  waste_success: 'تم تسجيل الصنف في سجل التالف والفاقد',

  log_title: 'سجل حركات المخزون',
  log_empty: 'لا توجد حركات مسجّلة بعد',
  log_waste_title: 'سجل التالف والفاقد',
  log_waste_empty: 'لا يوجد أصناف تالفة أو مفقودة مسجّلة',
  voucher_types: { issuance: 'صرف', exchange: 'تبديل', maintenance: 'صيانة', waste: 'تالف/فاقد' }
};

// ---- Phase 3: Coffee Shop POS ----

Alaseel.i18n.coffeeShop = {
  title: 'نقطة البيع \u2014 المقهى',
  tabs: { tables: 'الطاولات', menu: 'القائمة', history: 'سجل الطلبات' },

  tables_title: 'الطاولات المفتوحة',
  add_table: 'إضافة طاولة',
  table_name_placeholder: 'مثال: طاولة 1، شرفة 2…',
  no_tables: 'لا توجد طاولات حالياً',
  table_status_open: 'مفتوحة',
  table_status_settled: 'مغلقة',
  back_to_tables: 'العودة إلى الطاولات',
  delete_empty_table: 'حذف الطاولة',
  cannot_delete_nonempty: 'لا يمكن حذف طاولة تحتوي على طلبات \u2014 أغلق الحساب أولاً',

  order_title: 'الطلب الحالي',
  cart_empty: 'لم تُضف أي أصناف لهذه الطاولة بعد',
  no_categories_yet: 'لم تُضف أي فئات أو أصناف بعد. انتقل إلى تبويب "القائمة" لبنائها.',
  running_total: 'الإجمالي',
  qty: 'الكمية',
  remove_item: 'إزالة',

  settle_title: 'إغلاق الحساب',
  settle_hint: 'يجب إغلاق كل طلب إمّا بترحيله لفاتورة غرفة نزيل أو بتحصيله نقداً \u2014 لا يمكن تجاوز هذه الخطوة.',
  settle_folio_title: 'ترحيل إلى فاتورة الغرفة',
  settle_folio_room_label: 'رقم الغرفة',
  settle_folio_btn: 'ترحيل المبلغ',
  settle_folio_success: 'تم ترحيل الحساب إلى فاتورة الغرفة بنجاح',
  settle_folio_room_not_found: 'رقم الغرفة غير موجود',
  settle_folio_no_active_guest: 'لا يوجد نزيل مسجّل دخول حالياً في هذه الغرفة \u2014 لا يمكن الترحيل',
  settle_cash_title: 'دفع نقدي',
  settle_cash_btn: 'تحصيل نقداً وإغلاق الحساب',
  settle_cash_success: 'تم تحصيل الحساب نقداً',
  cannot_settle_empty: 'لا يمكن إغلاق طاولة لا تحتوي على أي أصناف',

  settle_company_title: 'ترحيل إلى فاتورة شركة',
  settle_company_select: 'اختر الشركة',
  settle_company_btn: 'ترحيل إلى الشركة',
  settle_company_success: 'تم ترحيل الحساب إلى فاتورة الشركة بنجاح',
  settle_company_required: 'يرجى اختيار شركة',
  settle_company_contract_expired: 'عقد هذه الشركة منتهٍ \u2014 لا يمكن ترحيل رسوم جديدة إليها',
  no_companies_yet: 'لا توجد شركات مسجّلة بعد. أضف شركة من وحدة الشركات أولاً.',

  order_history_tab: 'سجل الطلبات',
  order_history_empty: 'لا توجد طلبات مكتملة بعد',

  menu_title: 'إدارة القائمة',
  categories_title: 'الفئات',
  add_category: 'إضافة فئة',
  category_name_placeholder: 'مثال: مشروبات ساخنة',
  no_categories: 'لا توجد فئات بعد',
  delete_category_confirm: 'حذف هذه الفئة سيحذف جميع أصنافها أيضاً. متابعة؟',
  add_item: 'إضافة صنف',
  item_name_placeholder: 'اسم الصنف',
  item_price_placeholder: 'السعر',
  no_items_in_category: 'لا توجد أصناف في هذه الفئة',
  item_added: 'تمت إضافة الصنف',
  item_deleted: 'تم حذف الصنف',
  category_added: 'تمت إضافة الفئة',
  category_deleted: 'تم حذف الفئة'
};

// ---- Phase 3: Laundry ----

Alaseel.i18n.laundry = {
  title: 'المغسلة',
  tabs: { newTransaction: 'معاملة جديدة', pricing: 'الأصناف والأسعار', log: 'سجل المعاملات' },

  processing_types: { wash: 'غسيل', dry_clean: 'تنظيف جاف', press: 'كي' },

  pricing_title: 'إدارة الأصناف والأسعار',
  add_tier: 'إضافة صنف',
  tier_item_name: 'اسم الصنف',
  tier_item_placeholder: 'مثال: بدلة، فستان، ملاءة…',
  tier_processing_type: 'نوع المعالجة',
  tier_price: 'السعر',
  no_tiers: 'لم تُضف أي أصناف تسعير بعد',
  tier_added: 'تمت إضافة الصنف',
  tier_deleted: 'تم حذف الصنف',

  new_transaction_title: 'بناء طلب جديد',
  pick_tier_hint: 'اختر الأصناف والكميات لهذا الطلب',
  no_tiers_yet: 'لم تُضف أي أصناف تسعير بعد. انتقل إلى تبويب "الأصناف والأسعار" لإضافتها.',
  cart_empty: 'لم تُضف أي أصناف للطلب بعد',
  cart_total: 'الإجمالي',

  settle_folio_title: 'ترحيل إلى فاتورة الغرفة',
  settle_folio_room_label: 'رقم الغرفة',
  settle_folio_btn: 'ترحيل المبلغ',
  settle_folio_success: 'تم ترحيل مبلغ المغسلة إلى فاتورة الغرفة',
  settle_folio_room_not_found: 'رقم الغرفة غير موجود',
  settle_folio_no_active_guest: 'لا يوجد نزيل مسجّل دخول حالياً في هذه الغرفة \u2014 لا يمكن الترحيل',
  settle_cash_title: 'دفع نقدي',
  settle_cash_btn: 'تحصيل نقداً',
  settle_cash_success: 'تم تحصيل المبلغ نقداً',
  cannot_settle_empty: 'أضف صنفاً واحداً على الأقل قبل إتمام العملية',

  settle_company_title: 'ترحيل إلى فاتورة شركة',
  settle_company_select: 'اختر الشركة',
  settle_company_btn: 'ترحيل إلى الشركة',
  settle_company_success: 'تم ترحيل مبلغ المغسلة إلى فاتورة الشركة',
  settle_company_required: 'يرجى اختيار شركة',
  no_companies_yet: 'لا توجد شركات مسجّلة بعد. أضف شركة من وحدة الشركات أولاً.',

  log_title: 'سجل معاملات المغسلة',
  log_empty: 'لا توجد معاملات مسجّلة بعد',
  method_folio: 'فاتورة غرفة',
  method_cash: 'نقدي'
};

// ---- Phase 3: Property Maintenance ----

Alaseel.i18n.maintenance = {
  title: 'الصيانة',
  new_ticket: 'بلاغ صيانة جديد',
  back_to_list: 'العودة إلى قائمة البلاغات',
  empty_list: 'لا توجد بلاغات صيانة',
  filters: { all: 'الكل', open: 'مفتوحة', in_progress: 'قيد التنفيذ', resolved: 'تم الحل' },
  list_head: { location: 'الموقع', category: 'النوع', status: 'الحالة' },

  category: { ac: 'تكييف', plumbing: 'سباكة', electrical: 'كهرباء', general: 'صيانة عامة' },
  status: { open: 'مفتوحة', in_progress: 'قيد التنفيذ', resolved: 'تم الحل' },
  guest_caused_badge: 'بسبب النزيل',

  field_location: 'الموقع',
  select_location: 'اختر الموقع',
  field_category: 'نوع العطل',
  field_description: 'وصف العطل',
  field_description_placeholder: 'صف المشكلة بالتفصيل…',
  field_price: 'تكلفة الإصلاح',
  field_guest_caused: 'سبّبه النزيل',
  guest_caused_hint: 'إذا كان العطل بسبب النزيل، يمكن ترحيل تكلفته إلى فاتورة غرفته.',
  auto_maint_hint: 'ستتحول حالة الغرفة إلى "صيانة" تلقائياً عند فتح البلاغ إذا كانت شاغرة حالياً، وإلى "بحاجة لتنظيف" عند إغلاقه. لا تتأثر حالة غرفة بها نزيل مقيم حالياً.',

  create: 'إنشاء البلاغ',
  save_changes: 'حفظ التعديلات',
  created: 'تم إنشاء بلاغ الصيانة',
  saved: 'تم حفظ التعديلات',
  location_required: 'يرجى اختيار الموقع',

  start_work: 'بدء العمل',
  mark_resolved: 'تحديد كمُصلَح',
  reopen: 'إعادة فتح البلاغ',

  bill_section_title: 'ترحيل التكلفة',
  bill_to_folio_btn: 'ترحيل التكلفة إلى فاتورة الغرفة',
  bill_success: 'تم ترحيل تكلفة الإصلاح إلى فاتورة الغرفة',
  bill_room_not_found: 'رقم الغرفة غير موجود',
  bill_no_active_guest: 'لا يوجد نزيل مسجّل دخول حالياً في هذه الغرفة',
  bill_needs_price: 'أدخل تكلفة الإصلاح أولاً لتفعيل الترحيل',
  already_billed: 'تم ترحيل هذه التكلفة بالفعل إلى فاتورة الغرفة',
  bill_not_applicable_location: 'هذا الموقع ليس غرفة نزيل — لا يمكن الترحيل لفاتورة',

  delete: 'حذف البلاغ',
  delete_confirm_q: 'هل تريد حذف هذا البلاغ نهائياً؟',
  confirm_yes: 'نعم، احذف',
  confirm_cancel: 'إلغاء',
  deleted: 'تم حذف البلاغ'
};

// ---- Phase 3: HR, Payroll & Shifts ----

Alaseel.i18n.hr = {
  title: 'الموظفون والرواتب',
  tabs: { directory: 'دليل الموظفين', payroll: 'حساب الرواتب', shifts: 'جدولة الورديات' },

  add_employee: 'إضافة موظف جديد',
  empty_list: 'لا يوجد موظفون مسجلون بعد',
  list_head: { name: 'الاسم', role: 'الوظيفة', department: 'القسم', national_id: 'الرقم القومي', salary: 'الراتب الأساسي' },
  back_to_list: 'العودة إلى دليل الموظفين',

  field_full_name: 'الاسم الكامل',
  field_national_id: 'الرقم القومي',
  field_role: 'الوظيفة / المسمى الوظيفي',
  field_role_placeholder: 'مثال: موظف استقبال، مدير مناوبة…',
  field_department: 'القسم',
  no_department: 'بدون قسم محدد',
  field_hired_date: 'تاريخ التعيين',
  field_base_salary: 'الراتب الأساسي',
  field_permissions: 'الصلاحيات (سجل تعريفي)',
  permissions_hint: 'سجل تعريفي فقط لتوثيق صلاحيات الموظف داخل الفريق؛ النظام حالياً يعمل بحساب دخول إداري واحد ولا يفرض هذه الصلاحيات تلقائياً على تسجيل الدخول.',
  permission_modules: { rooms: 'الغرف', guests: 'النزلاء والحجوزات', inventory: 'المخزون', coffee_shop: 'المقهى', laundry: 'المغسلة', maintenance: 'الصيانة', hr: 'الموظفون', accounting: 'الحسابات', settings: 'الإعدادات' },

  save_employee: 'حفظ بيانات الموظف',
  saved: 'تم حفظ بيانات الموظف',
  name_required: 'الاسم الكامل مطلوب',
  delete_employee: 'حذف الموظف',
  delete_confirm_q: 'هل تريد حذف بيانات هذا الموظف؟ سجلات الرواتب والورديات السابقة تبقى محفوظة كسجل تاريخي.',
  confirm_yes: 'نعم، احذف',
  confirm_cancel: 'إلغاء',
  deleted: 'تم حذف الموظف',

  attendance_title: 'سجل الحضور والغياب',
  check_in_today: 'تسجيل حضور اليوم',
  check_out_today: 'تسجيل انصراف اليوم',
  already_checked_in_today: 'تم تسجيل حضور اليوم بالفعل',
  add_attendance_entry: 'إضافة قيد يدوي',
  attendance_date: 'التاريخ',
  attendance_status: 'الحالة',
  attendance_statuses: { present: 'حاضر', absent: 'غائب', late: 'متأخر', leave: 'إجازة' },
  no_attendance: 'لا يوجد سجل حضور بعد',

  payroll_title: 'كشف الرواتب الشهري',
  payroll_month: 'الشهر',
  payroll_no_employees: 'لا يوجد موظفون لحساب رواتبهم. أضف موظفين من دليل الموظفين أولاً.',
  col_employee: 'الموظف', col_base: 'الراتب الأساسي', col_tips: 'الإكراميات المخصصة',
  col_advances: 'السلف النقدية', col_deductions: 'خصومات الإجازات/الغياب (يدوي)', col_net: 'صافي الراتب',
  save_payroll_run: 'حفظ كشف الرواتب',
  payroll_saved: 'تم حفظ كشف الرواتب لهذا الشهر',
  deductions_manual_hint: 'خصومات الإجازات والغياب تُدخل يدوياً من قبل المدير ولا تُحسب تلقائياً من سجل الحضور.',
  approve_payroll: 'اعتماد كشف الرواتب',
  payroll_approved_badge: 'معتمد',
  payroll_draft_badge: 'مسودة',
  payroll_approved_toast: 'تم اعتماد كشف الرواتب لهذا الشهر — الأرقام مقفلة الآن',
  payroll_locked_hint: 'هذا الكشف معتمد ومقفل. لتعديله، ألغِ الاعتماد أولاً.',
  unapprove_payroll: 'إلغاء الاعتماد للتعديل',

  shifts_title: 'جدولة الورديات',
  departments: { front_desk: 'الاستقبال', security: 'الأمن', housekeeping: 'التدبير المنزلي' },
  add_shift: 'إضافة وردية',
  shift_employee: 'الموظف',
  shift_date: 'التاريخ',
  shift_start: 'وقت البداية',
  shift_end: 'وقت النهاية',
  shift_cost_type: 'نوع التكلفة',
  cost_type_flat: 'مبلغ ثابت',
  cost_type_hourly: 'بالساعة',
  shift_cost_amount: 'قيمة التكلفة',
  no_shifts_this_week: 'لا توجد ورديات مجدولة لهذا الأسبوع',
  week_total_cost: 'إجمالي تكلفة الأسبوع',
  prev_week: 'الأسبوع السابق',
  next_week: 'الأسبوع التالي',
  create_shift: 'إضافة',
  delete_shift: 'حذف',
  shift_created: 'تمت إضافة الوردية',
  shift_deleted: 'تم حذف الوردية',
  select_employee_first: 'يرجى اختيار موظف',
  no_employees_yet: 'أضف موظفين من دليل الموظفين أولاً لتتمكن من جدولتهم'
};

// ---- Phase 3: Night Audit & Accounting ----

Alaseel.i18n.accounting = {
  title: 'الحسابات والتدقيق الليلي',
  tabs: { overview: 'نظرة عامة', ledger: 'دفتر الأستاذ العام', night_audit: 'التدقيق الليلي', folio_audit: 'سجل تصحيحات الفواتير' },

  overview_title: 'الأداء المالي',
  kpi_revenue: 'إجمالي الإيرادات',
  kpi_expenses: 'إجمالي المصروفات',
  kpi_net_profit: 'صافي الربح',
  kpi_entries_count: 'عدد القيود',

  ledger_title: 'دفتر الأستاذ العام',
  add_manual_entry: 'إضافة قيد يدوي',
  entry_type: 'النوع',
  entry_type_revenue: 'إيراد',
  entry_type_expense: 'مصروف',
  entry_source: 'المصدر',
  sources: { room: 'إقامة غرفة', coffee_shop: 'المقهى', laundry: 'المغسلة', maintenance: 'الصيانة', waste: 'فاقد ومخزون تالف', manual: 'يدوي' },
  entry_description: 'الوصف',
  entry_description_placeholder: 'وصف مختصر للقيد…',
  entry_amount: 'المبلغ',
  entry_auto_badge: 'تلقائي',
  entry_manual_badge: 'يدوي',
  add_entry_btn: 'إضافة القيد',
  entry_added: 'تمت إضافة القيد',
  no_entries: 'لا توجد قيود مسجّلة بعد',
  amount_required: 'يرجى إدخال مبلغ صحيح أكبر من صفر',
  export_ledger_csv: 'تصدير دفتر الأستاذ (CSV)',
  exporting: 'جارٍ التصدير…',
  export_success_prefix: 'تم حفظ الملف في:',
  reveal_file: 'إظهار في المجلد',

  night_audit_title: 'التدقيق الليلي وإقفال اليوم التشغيلي',
  operational_date_label: 'التاريخ التشغيلي الحالي',
  night_audit_hint: 'يقوم التدقيق الليلي بترحيل إيرادات جميع الحجوزات التي غادرت، ومعاملات المقهى والمغسلة المدفوعة نقداً، وقيود الفاقد من المخزون — كل ذلك دون تكرار أي مبلغ سبق ترحيله — ثم يقفل اليوم التشغيلي الحالي وينتقل لليوم التالي.',
  run_night_audit: 'تشغيل التدقيق الليلي وإقفال اليوم',
  night_audit_running: 'جارٍ التدقيق…',
  night_audit_success_prefix: 'تم إقفال اليوم بنجاح — تم ترحيل',
  night_audit_success_suffix: 'قيد جديد. التاريخ التشغيلي الآن',
  night_audit_none_new: 'تم إقفال اليوم — لا توجد معاملات جديدة لترحيلها',
  audit_log_title: 'سجل عمليات التدقيق السابقة',
  no_audit_runs: 'لم يتم تشغيل أي تدقيق ليلي بعد',
  audit_run_row_prefix: 'تم إقفال',
  audit_run_row_middle: '— تم ترحيل',
  audit_run_row_suffix: 'قيد',

  folio_audit_title: 'سجل تصحيحات الفواتير (نقل الرسوم)',
  folio_audit_hint: 'سجل كامل لكل عملية نقل رسوم بين الغرف: من قام بالنقل، من أي غرفة، إلى أي غرفة، بأي مبلغ، ولأي سبب.',
  no_folio_transfers: 'لا توجد عمليات نقل رسوم مسجّلة بعد',
  col_from_room: 'من غرفة', col_to_room: 'إلى غرفة', col_amount: 'المبلغ', col_reason: 'السبب', col_performed_by: 'بواسطة', col_when: 'التاريخ'
};

// ---- Phase 4: Corporate Accounts (minimal slice — registry + charges + bank checks) ----

Alaseel.i18n.corporate = {
  title: 'الشركات',
  tabs: { directory: 'سجل الشركات' },
  add_company: 'إضافة شركة جديدة',
  empty_list: 'لا توجد شركات مسجّلة بعد',
  list_head: { name: 'اسم الشركة', housing: 'مسؤول الإسكان', accounting: 'مسؤول الحسابات', discount: 'الخصم الثابت' },
  back_to_list: 'العودة إلى سجل الشركات',

  field_company_name: 'اسم الشركة',
  field_housing_officer: 'مسؤول الإسكان',
  field_housing_phone: 'هاتف مسؤول الإسكان',
  field_accounting_officer: 'مسؤول الحسابات',
  field_accounting_phone: 'هاتف مسؤول الحسابات',
  field_fixed_discount: 'الخصم الثابت (مبلغ نقدي وليس نسبة)',
  fixed_discount_hint: 'مبلغ نقدي ثابت يُخصم من فاتورة العقد — وليس نسبة مئوية.',

  contract_section: 'مدة العقد',
  contract_term: 'مدة العقد',
  contract_terms: { none: 'بدون عقد طويل الأجل', month: 'شهر', quarter: 'ربع سنة', half_year: 'نصف سنة', season: 'موسم', year: 'سنة' },
  activation_date: 'تاريخ التفعيل',
  expiration_date: 'تاريخ الانتهاء (محسوب تلقائياً)',
  expiration_auto_hint: 'يُحسب تاريخ الانتهاء تلقائياً بناءً على تاريخ التفعيل ومدة العقد المختارة.',
  contract_expired_badge: 'العقد منتهٍ',

  save_company: 'حفظ بيانات الشركة',
  saved: 'تم حفظ بيانات الشركة',
  name_required: 'اسم الشركة مطلوب',
  delete_company: 'حذف الشركة',
  delete_confirm_q: 'هل تريد حذف بيانات هذه الشركة؟ الرسوم والشيكات المسجّلة تبقى محفوظة كسجل تاريخي.',
  confirm_yes: 'نعم، احذف',
  confirm_cancel: 'إلغاء',
  deleted: 'تم حذف الشركة',

  charges_title: 'الرسوم المرحّلة على الشركة',
  no_charges: 'لا توجد رسوم مرحّلة على هذه الشركة بعد',
  charges_total: 'إجمالي الرسوم',

  checks_title: 'الشيكات البنكية',
  add_check: 'إضافة شيك',
  check_number: 'رقم الشيك',
  bank_name: 'اسم البنك',
  account_number: 'رقم الحساب',
  check_amount: 'المبلغ',
  maturity_date: 'تاريخ الاستحقاق',
  no_checks: 'لا توجد شيكات مسجّلة',
  check_status: { pending: 'قيد الانتظار', paid: 'مدفوع' },
  check_added: 'تمت إضافة الشيك',
  mark_check_paid: 'تحديد الشيك كمدفوع',
  check_marked_paid: 'تم تحديد الشيك كمدفوع',
  days_overdue_prefix: 'متأخر',
  days_overdue_suffix: 'يوم',
  add_penalty: 'إضافة ضريبة تأخير',
  penalty_amount_placeholder: 'قيمة الضريبة',
  penalty_added: 'تمت إضافة ضريبة التأخير إلى فاتورة الشركة',
  penalty_amount_required: 'أدخل قيمة صحيحة للضريبة'
};
