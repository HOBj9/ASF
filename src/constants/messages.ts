/**
 * Application Messages
 * Centralized text content for the application
 * Supports i18n - can be extended for multiple languages
 */

export const messages = {
  // Common Messages
  common: {
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    success: 'تم بنجاح',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    create: 'إنشاء',
    update: 'تحديث',
    search: 'بحث',
    filter: 'تصفية',
    close: 'إغلاق',
    total: 'الإجمالي',
    required: 'مطلوب',
    processing: 'جاري المعالجة...',
    completedAt: 'تاريخ الإكمال',
    createdAt: 'تاريخ الإنشاء',
    details: 'التفاصيل',
  },

  // Authentication Messages
  auth: {
    login: {
      title: 'تسجيل الدخول',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      submit: 'تسجيل الدخول',
      error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      required: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور',
      invalidEmail: 'البريد الإلكتروني غير صحيح',
      invalidPassword: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    },
    register: {
      title: 'إنشاء حساب جديد',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      submit: 'إنشاء الحساب',
      success: 'تم إنشاء الحساب بنجاح',
      error: 'حدث خطأ أثناء إنشاء الحساب',
      emailExists: 'البريد الإلكتروني مستخدم بالفعل',
      passwordMismatch: 'كلمات المرور غير متطابقة',
      required: 'جميع الحقول مطلوبة',
    },
    logout: {
      success: 'تم تسجيل الخروج بنجاح',
    },
  },

  // User Messages
  users: {
    title: 'المستخدمون',
    create: 'إنشاء مستخدم',
    edit: 'تعديل مستخدم',
    delete: 'حذف مستخدم',
    deleteConfirm: 'هل أنت متأكد من حذف هذا المستخدم؟',
    activate: 'تفعيل المستخدم',
    deactivate: 'تعطيل المستخدم',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    role: 'الدور',
    status: 'الحالة',
    active: 'نشط',
    inactive: 'غير نشط',
    createdAt: 'تاريخ الإنشاء',
    notFound: 'المستخدم غير موجود',
    emailExists: 'البريد الإلكتروني مستخدم بالفعل',
    deleteSelf: 'لا يمكنك حذف حسابك الخاص',
  },

  // Role Messages
  roles: {
    title: 'الأدوار',
    create: 'إنشاء دور',
    edit: 'تعديل دور',
    delete: 'حذف دور',
    deleteConfirm: 'هل أنت متأكد من حذف هذا الدور؟',
    name: 'اسم الدور',
    nameAr: 'اسم الدور بالعربية',
    permissions: 'الصلاحيات',
    notFound: 'الدور غير موجود',
    exists: 'الدور موجود بالفعل',
    inUse: 'لا يمكن حذف الدور لأنه مستخدم من قبل {count} مستخدم',
  },

  // Permission Messages
  permissions: {
    title: 'الصلاحيات',
    create: 'إنشاء صلاحية',
    edit: 'تعديل صلاحية',
    delete: 'حذف صلاحية',
    deleteConfirm: 'هل أنت متأكد من حذف هذه الصلاحية؟',
    name: 'اسم الصلاحية',
    nameAr: 'اسم الصلاحية بالعربية',
    resource: 'المورد',
    action: 'الإجراء',
    notFound: 'الصلاحية غير موجودة',
    exists: 'الصلاحية موجودة بالفعل',
    inUse: 'لا يمكن حذف الصلاحية لأنها مستخدمة من قبل {count} دور',
  },

  // Dashboard Messages
  dashboard: {
    title: 'لوحة التحكم',
    welcome: 'مرحباً، {name}',
    description: 'مرحباً بك في لوحة التحكم',
  },

  // Error Messages
  errors: {
    unauthorized: 'غير مصرح',
    forbidden: 'غير مسموح',
    notFound: 'غير موجود',
    validation: 'خطأ في التحقق من البيانات',
    server: 'حدث خطأ في الخادم',
    network: 'خطأ في الاتصال',
    timeout: 'انتهت مهلة الاتصال',
  },

  // Success Messages
  success: {
    created: 'تم الإنشاء بنجاح',
    updated: 'تم التحديث بنجاح',
    deleted: 'تم الحذف بنجاح',
    activated: 'تم التفعيل بنجاح',
    deactivated: 'تم التعطيل بنجاح',
  },

  // Button Messages
  buttons: {
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    create: 'إنشاء',
    update: 'تحديث',
    confirm: 'تأكيد',
    close: 'إغلاق',
    search: 'بحث',
    filter: 'تصفية',
    refresh: 'تحديث',
    export: 'تصدير',
    import: 'استيراد',
    selectAll: 'تحديد الكل',
    deselectAll: 'إلغاء التحديد',
    deleteSelected: 'حذف المحدد',
    createCampaign: 'إنشاء الحملة',
    createContact: 'إضافة جهة اتصال',
    createSession: 'إنشاء جلسة',
    sendMessage: 'إرسال رسالة',
    bulkSend: 'إرسال جماعي',
    importExcel: 'استيراد من Excel',
    loading: 'جاري المعالجة...',
    creating: 'جاري الإنشاء...',
    updating: 'جاري التحديث...',
    deleting: 'جاري الحذف...',
    sending: 'جاري الإرسال...',
    terminate: 'إنهاء الجلسة',
    restart: 'إعادة تشغيل',
    addToContacts: 'إضافة إلى جهات الاتصال',
  },

  // Campaign Messages
  campaigns: {
    title: 'الحملات',
    create: 'إنشاء حملة',
    edit: 'تعديل حملة',
    delete: 'حذف حملة',
    deleteConfirm: 'هل أنت متأكد من حذف هذه الحملة؟',
    newCampaign: 'حملة جديدة',
    titleLabel: 'عنوان الحملة',
    campaignTitle: 'عنوان الحملة',
    messageLabel: 'نص الرسالة',
    messageContent: 'نص الرسالة',
    messagePlaceholder: 'أدخل نص الرسالة... يمكنك استخدام التنسيقات من شريط الأدوات',
    sessionLabel: 'الجلسة',
    selectSession: 'اختر الجلسة',
    contactsLabel: 'جهات الاتصال',
    selectContacts: 'اختر جهات الاتصال',
    selectGroup: 'اختر المجموعة',
    createWithCount: 'إنشاء الحملة ({count} رسالة)',
    noCampaigns: 'لا توجد حملات',
    statusLabel: 'الحالة',
    allStatuses: 'جميع الحالات',
    status: {
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      completed: 'مكتملة',
      failed: 'فاشلة',
      cancelled: 'ملغاة',
    },
    updateCampaignsSuccess: 'تم تحديث الحملات',
    updateCampaignsFailed: 'فشل في تحديث الحملات',
    campaignCreatedSuccess: 'تم إنشاء الحملة بنجاح',
    campaignCreateFailed: 'فشل في إنشاء الحملة',
    campaignCancelledSuccess: 'تم إلغاء الحملة بنجاح',
    campaignCancelFailed: 'فشل في إلغاء الحملة',
    fetchDeliveredFailed: 'فشل في جلب الرسائل المستلمة',
    fetchFailedFailed: 'فشل في جلب الرسائل الفاشلة',
    required: 'مطلوب',
    deliveredMessages: 'الرسائل المستلمة',
    failedMessages: 'الرسائل الفاشلة',
    fetchingMessages: 'جاري جلب البيانات...',
    noDeliveredMessages: 'لا توجد رسائل مستلمة',
    noFailedMessages: 'لا توجد رسائل فاشلة',
    deliveredDetails: 'قائمة بالأرقام التي استلمت الرسالة بنجاح',
    failedDetails: 'قائمة بالأرقام التي فشل إرسال الرسالة لها مع أسباب الفشل',
    noCampaignsYet: 'لا توجد حملات بعد',
    noMatchingCampaigns: 'لا توجد حملات تطابق الفلاتر المحددة',
  },

  // Messages
  messages: {
    title: 'الرسائل',
    sent: 'مرسلة',
    failed: 'فاشلة',
    delivered: 'تم التسليم',
    pending: 'قيد الانتظار',
    noMessages: 'لا توجد رسائل',
    noMessagesYet: 'لا توجد رسائل بعد',
    noMatchingMessages: 'لا توجد رسائل تطابق الفلاتر المحددة',
    addToContacts: 'إضافة إلى جهات الاتصال',
    errorDetails: 'تفاصيل الخطأ',
    bulkSend: 'إرسال جماعي',
    selectContacts: 'اختر جهات الاتصال',
    messageLabel: 'نص الرسالة',
    messageContent: 'نص الرسالة',
    sessionLabel: 'الجلسة',
    selectSession: 'اختر الجلسة',
    allSessions: 'جميع الجلسات',
    allStatuses: 'جميع الحالات',
    statusLabel: 'الحالة',
    updateMessagesSuccess: 'تم تحديث الرسائل',
    updateMessagesFailed: 'فشل في تحديث الرسائل',
    addToContactsSuccess: 'تم إضافة الرقم إلى دليل الهاتف بنجاح',
    addToContactsFailed: 'فشل في إضافة الرقم إلى دليل الهاتف',
    bulkSendStartedSuccess: 'تم بدء عملية الإرسال الجماعي',
    bulkSendFailed: 'فشل في بدء عملية الإرسال الجماعي',
    nameRequired: 'يرجى إدخال الاسم',
    phoneInvalid: 'رقم الهاتف غير صالح. يجب أن يحتوي على أرقام فقط (مثال: 963956888999)',
    sessionRequired: 'يرجى اختيار الجلسة',
    contactsRequired: 'يرجى اختيار جهة اتصال واحدة على الأقل',
    messageRequired: 'يرجى إدخال نص الرسالة',
    refreshLabel: 'تحديث القائمة',
    searchPlaceholder: 'ابحث برقم الهاتف أو نص الرسالة...',
    contactName: 'الاسم',
    contactPhone: 'رقم الهاتف',
    contactNamePlaceholder: 'أدخل اسم الشخص',
    addButton: 'إضافة',
    contactsCount: 'جهات الاتصال ({selected} من {total})',
  },

  // Contacts
  contacts: {
    title: 'دليل الهاتف',
    create: 'إضافة جهة اتصال',
    edit: 'تعديل جهة اتصال',
    delete: 'حذف جهة اتصال',
    deleteSelected: 'حذف المحدد ({count})',
    importExcel: 'استيراد من Excel',
    noContacts: 'لا توجد جهات اتصال',
    nameLabel: 'الاسم',
    phoneLabel: 'رقم الهاتف',
    count: 'قائمة بجهات الاتصال ({filtered} من {total})',
  },

  // Sessions
  sessions: {
    title: 'الجلسات',
    create: 'إنشاء جلسة',
    terminate: 'إنهاء الجلسة',
    restart: 'إعادة تشغيل الجلسة',
    terminateConfirm: 'هل أنت متأكد من إنهاء هذه الجلسة؟',
    restartConfirm: 'هل أنت متأكد من إعادة تشغيل هذه الجلسة؟',
    noSessions: 'لا توجد جلسات',
    status: {
      pending: 'قيد الانتظار',
      active: 'نشطة',
      terminated: 'منتهية',
    },
  },

  // Dialogs
  dialogs: {
    confirmDelete: 'هل أنت متأكد من الحذف؟',
    confirmTerminate: 'هل أنت متأكد من إنهاء هذه الجلسة؟',
    confirmRestart: 'هل أنت متأكد من إعادة تشغيل هذه الجلسة؟',
  },

  // Tables
  tables: {
    noData: 'لا توجد بيانات',
    loading: 'جاري التحميل...',
    searchPlaceholder: 'ابحث...',
    selectAll: 'تحديد الكل',
    deselectAll: 'إلغاء التحديد',
  },
} as const;

export type Messages = typeof messages;

// Helper function to get nested message
export function getMessage(path: string, params?: Record<string, string | number>): string {
  const keys = path.split('.');
  let value: any = messages;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return path;
  }
  
  if (typeof value !== 'string') return path;
  
  // Replace placeholders
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key]?.toString() || match;
    });
  }
  
  return value;
}

