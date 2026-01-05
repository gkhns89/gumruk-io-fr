/**
 * Türkçe Dil Dosyası
 * Tüm UI metinleri burada tanımlanır
 */

export const tr = {
  // Genel
  common: {
    save: "Kaydet",
    cancel: "İptal",
    delete: "Sil",
    edit: "Düzenle",
    add: "Ekle",
    search: "Ara",
    filter: "Filtrele",
    clear: "Temizle",
    close: "Kapat",
    loading: "Yükleniyor...",
    noData: "Veri bulunamadı",
    yes: "Evet",
    no: "Hayır",
    confirm: "Onayla",
    back: "Geri",
    next: "İleri",
    submit: "Gönder",
    update: "Güncelle",
    view: "Görüntüle",
    download: "İndir",
    upload: "Yükle",
    select: "Seç",
    selectAll: "Tümünü Seç",
    required: "Zorunlu",
    optional: "Opsiyonel",
  },

  // Hat (Gate) Seçenekleri
  gates: {
    yellow: "SARI",
    red: "KIRMIZI",
    select: "Hat Seçin",
    legend: "Hat Renkleri",
  },

  // İşlem Durumları
  status: {
    pending: "Beklemede",
    inProgress: "İşlemde",
    inspection: "Muayene Sürecinde",
    completed: "Tamamlandı",
    withdrawn: "Çekildi",
    cancelled: "İptal Edildi",
  },

  // Kullanıcı Rolleri
  roles: {
    superAdmin: "Süper Admin",
    brokerAdmin: "Broker Yöneticisi",
    brokerUser: "Broker Kullanıcısı",
    clientUser: "Müşteri Kullanıcısı",
  },

  // Firma Tipleri
  companyTypes: {
    customsBroker: "Gümrük Müşavirliği",
    client: "Müşteri Firması",
  },

  // İşlem (Transaction) Alanları
  transaction: {
    title: "İşlemler",
    addNew: "Yeni İşlem Ekle",
    edit: "İşlem Düzenle",
    details: "İşlem Detayları",
    fileNo: "Dosya No",
    recipient: "Alıcı",
    sender: "Gönderici",
    customsWarehouse: "Antrepo",
    customsName: "Gümrük",
    gate: "Hat",
    containerAmount: "Kap",
    weight: "Kilo (Kg)",
    tax: "Vergi (TL)",
    warehouseArrivalDate: "Antrepo Varış Tarihi",
    registrationDate: "Tescil Tarihi",
    declarationNumber: "Beyanname No",
    lineClosureDate: "Kapanma Tarihi",
    importProcessingTime: "İthalat İşlem Süresi (Gün)",
    withdrawalDate: "Çekilme Tarihi",
    description: "Açıklama",
    delayReason: "Gecikme Nedeni",
    brokerCompany: "Broker Firması",
    clientCompany: "Müşteri Firması",
  },

  // Firma Alanları
  company: {
    title: "Firmalar",
    addNew: "Yeni Firma Ekle",
    name: "Firma Adı",
    shortName: "Kısa Ad",
    description: "Açıklama",
    type: "Firma Tipi",
  },

  // Kullanıcı Alanları
  user: {
    title: "Kullanıcılar",
    addNew: "Yeni Kullanıcı Ekle",
    firstName: "Ad",
    lastName: "Soyad",
    email: "E-posta",
    phone: "Telefon",
    role: "Rol",
    company: "Firma",
  },

  // Çalışan Yönetimi
  employee: {
    title: "Çalışanlar",
    addNew: "Yeni Çalışan Ekle",
    edit: "Çalışan Düzenle",
    delete: "Çalışan Sil",
    details: "Çalışan Detayları",
    firstName: "Ad",
    lastName: "Soyad",
    email: "Email",
    password: "Şifre",
    role: "Rol",
    status: "Durum",
    createdAt: "Kayıt Tarihi",
    lastLogin: "Son Giriş",
    company: "Firma",
    quota: "Kullanım",
    quotaExceeded: "Çalışan limiti doldu",
    cannotDeleteSelf: "Kendi hesabınızı silemezsiniz",
    cannotDeleteLastAdmin: "Son BROKER_ADMIN kullanıcısı silinemez",
    selectCompany: "Broker Firması Seçin",

    roles: {
      brokerAdmin: "Broker Yöneticisi",
      brokerUser: "Broker Kullanıcısı",
    },

    statuses: {
      active: "Aktif",
      pending: "Beklemede",
    },

    messages: {
      createSuccess: "Çalışan başarıyla eklendi!",
      updateSuccess: "Çalışan bilgileri başarıyla güncellendi!",
      deleteSuccess: "Çalışan başarıyla silindi!",
      createError: "Çalışan oluşturulamadı",
      updateError: "Çalışan güncellenemedi",
      deleteError: "Çalışan silinemedi",
    },

    placeholders: {
      searchEmployees: "İsim, soyisim veya email ile ara...",
      firstName: "AHMET",
      lastName: "YILMAZ",
      email: "ahmet.yilmaz@example.com",
      password: "En az 6 karakter",
    },
  },

  // Form Mesajları
  messages: {
    saveSuccess: "Başarıyla kaydedildi",
    saveError: "Kaydetme hatası",
    deleteSuccess: "Başarıyla silindi",
    deleteError: "Silme hatası",
    updateSuccess: "Başarıyla güncellendi",
    updateError: "Güncelleme hatası",
    confirmDelete: "Silmek istediğinize emin misiniz?",
    requiredField: "Bu alan zorunludur",
    invalidEmail: "Geçersiz e-posta adresi",
    invalidPhone: "Geçersiz telefon numarası",
  },

  // Placeholder Metinleri
  placeholders: {
    search: "Ara...",
    selectCompany: "Firma seçin...",
    selectGate: "Hat seçin...",
    enterFileNo: "Dosya No girin",
    enterDeclarationNumber: "Beyanname No girin",
    enterCustomsWarehouse: "Antrepo adı girin",
    enterCustomsName: "Gümrük adı girin",
    enterContainerAmount: "Kap miktarı girin",
    enterSender: "Gönderici girin",
    enterWeight: "Kilo girin",
    enterTax: "Vergi girin",
    enterImportProcessingTime: "İşlem süresi girin",
    enterName: "Ad girin",
    enterEmail: "E-posta girin",
    enterDescription: "Açıklama girin...",
    typeToSearch: "Aramak için yazın...",
    selectOrType: "Seçin veya yazın...",
    enterDelayReason: "Olası gecikme nedenlerini belirtin...",
    firstSelectClient: "Önce müşteri firması seçin",
  },

  // Zaman ile ilgili
  time: {
    today: "Bugün",
    yesterday: "Dün",
    thisWeek: "Bu Hafta",
    thisMonth: "Bu Ay",
    lastMonth: "Geçen Ay",
    custom: "Özel Tarih",
  },

  // Navigasyon
  nav: {
    dashboard: "Panel",
    transactions: "İşlemler",
    companies: "Firmalar",
    users: "Kullanıcılar",
    reports: "Raporlar",
    settings: "Ayarlar",
    logout: "Çıkış",
  },
};

export default tr;