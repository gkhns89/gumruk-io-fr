/**
 * Türkçe Dil Dosyası
 * Tüm UI metinleri burada tanımlanır. Yeni bir anahtar en.js'e de eklenmeli —
 * `npm run i18n:check` iki sözlüğün aynı anahtarları taşıdığını denetler.
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

  // Ödeme
  payment: {
    title: "Ödeme Yap",
    management: "Ödeme Yönetimi",
    bankInfo: "Banka Bilgileri",
    paymentMethod: "Ödeme Yöntemi",
    referenceNumber: "Referans No",
    receipt: "Dekont",
    uploadReceipt: "Dekont Yükle",
    amount: "Tutar",
    billingPeriodStart: "Dönem Başlangıç",
    billingPeriodEnd: "Dönem Bitiş",
    notes: "Notlar",
    submit: "Ödeme Bildir",
    history: "Ödeme Geçmişi",
    pending: "İnceleme Bekliyor",
    confirmed: "Onaylandı",
    rejected: "Reddedildi",
    confirm: "Onayla",
    reject: "Reddet",
    rejectionReason: "Red Gerekçesi",
    paymentResponsible: "Ödeme Sorumlusu",
    setPaymentResponsible: "Ödeme Sorumlusu Yap",
    restrictionWarning: "Ödeme gecikmesi nedeniyle yeni kayıt eklenemiyor",
    restrictionReadOnly: "Ödeme gecikmesi nedeniyle tüm değişiklikler engellenmiştir",
    pendingPayments: "Bekleyen Ödemeler",
    allPayments: "Tüm Ödemeler",
    bankAccounts: "Banka Hesapları",
    addBankAccount: "Banka Hesabı Ekle",
    bankName: "Banka Adı",
    accountHolder: "Hesap Sahibi",
    iban: "IBAN",
    copyIban: "IBAN Kopyala",
    copied: "Kopyalandı",
  },

  // Yük takibinde ödeme durumu
  paymentStatus: {
    none: "Ödeme Yok",
    paid: "Ödendi",
    paidByCompany: "Firma Tarafından Ödendi",
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
    guaranteeAmount: "Teminat (TL)",
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
    enterTax: "Vergi girin",
    enterGuaranteeAmount: "Teminat girin",
    enterImportProcessingTime: "İşlem süresi girin",
    enterName: "Ad girin",
    enterEmail: "E-posta girin",
    enterDescription: "Açıklama girin...",
    typeToSearch: "Aramak için yazın...",
    selectOrType: "Seçin veya yazın...",
    enterDelayReason: "Olası gecikme nedenlerini belirtin...",
    firstSelectClient: "Önce müşteri firması seçin",

    // Cargo placeholders (BÜYÜK HARF)
    enterLicensePlate: "PLAKA GİRİN",
    enterConsignmentNumber: "KONŞİMENTO GİRİN",
    enterBillOfLading: "B/L GİRİN",
    enterContainerNumber: "KONTEYNER NUMARASI GİRİN",
    enterContainerCount: "KAP SAYISI GİRİN",
    enterWeight: "AĞIRLIK GİRİN (KG)",
    enterSenderCompany: "GÖNDERİCİ FİRMA GİRİN",
    enterCarrierName: "NAKLİYECİ ADI GİRİN",
    enterLokalAmount: "LOKAL MASRAF GİRİN",
    enterDepositoAmount: "DEPOZİTO MASRAF GİRİN",
    enterOrdinoAmount: "ORDİNO MASRAF GİRİN",
    enterCostsAmount: "MASRAF TUTARI GİRİN",
    enterDocumentReceiver: "EVRAK TESLİM ALAN GİRİN",
    enterTransportInfo: "TAŞIMA BİLGİLERİ GİRİN",
    selectVehicleType: "ARAÇ TİPİ SEÇİN",
    selectClientCompany: "ALICI FİRMA SEÇİN",
    selectBrokerCompany: "GÜMRÜK FİRMASI SEÇİN",
  },

  // Cargo-specific translations
  cargo: {
    title: "Yük Takip",
    addNew: "Yeni Yük Ekle",
    edit: "Yük Düzenle",
    status: {
      tracking: "Takip",
      arrived: "Varış Yaptı",
      completed: "Tamamlandı",
    },
    vehicleType: {
      ship: "Gemi",
      truck: "Kamyon",
      airplane: "Uçak",
    },
    fields: {
      vehicleType: "Araç Tipi",
      clientCompany: "Alıcı Firma",
      brokerCompany: "Gümrük Firması",
      senderCompany: "Gönderici Firma",
      carrierName: "Nakliyeci",
      containerCount: "Kap Sayısı",
      weight: "Ağırlık (kg)",
      billOfLading: "B/L Numarası",
      licensePlate: "Plaka",
      consignmentNumber: "Konşimento",
      containerNumbers: "Konteyner Numaraları",
      transportInfo: "Taşıma Bilgileri",
      documentReceiver: "Evrak Teslim Alan",
      documentDeliveryDate: "Dosya Teslim Tarihi",
      estimatedArrivalDate: "Tahmini Varış Tarihi (ETA)",
      cargoArrivalDate: "Varış Tarihi",
      initialEstimatedArrivalDate: "İlk ETA (Gecikme Baz Tarihi)",
      lokalCosts: "Lokal Masrafı",
      depositoCosts: "Depozito Masrafı",
      ordinoCosts: "Ordino Masrafı",
      paymentStatus: "Ödeme Durumu",
      status: "Durum",
    },
  },

  // Evrak teslim tipleri
  documentDelivery: {
    person: { label: "Şahıs", description: "Evraklar kişi adına teslim" },
    eOrdino: { label: "E-Ordino", description: "Sanal teslim, şahıs adı gerekmez" },
    eOrdinoPerson: { label: "E-Ordino + Şahıs", description: "Sanal teslim ve şahıs bilgisi" },
    sentToCustoms: { label: "Gümrüğe Gönderildi", description: "Evraklar gümrüğe iletildi" },
    receivedByUs: { label: "Tarafımıza Geldi", description: "Evraklar firmamıza ulaştı" },
    noOriginal: { label: "Orijinal Evrak Yok", description: "Sadece tarih yeterli" },
  },

  // Bakiye hareketi türleri
  balanceTransaction: {
    credit: { label: "Kredi", short: "Kredi" },
    addonDebit: { label: "Ek Ödeme", short: "Ek Ödeme" },
    periodDebit: { label: "Dönem Ödemesi", short: "Dönem" },
    gRadarCreditPurchase: { label: "G-Radar Kredisi", short: "G-Radar" },
  },

  // Para birimleri
  currency: {
    try: "Türk Lirası",
    usd: "Amerikan Doları",
    eur: "Euro",
  },

  // Günler (1 = Pazartesi)
  days: {
    long: {
      1: "Pazartesi",
      2: "Salı",
      3: "Çarşamba",
      4: "Perşembe",
      5: "Cuma",
      6: "Cumartesi",
      7: "Pazar",
    },
    short: {
      1: "Pzt",
      2: "Sal",
      3: "Çar",
      4: "Per",
      5: "Cum",
      6: "Cmt",
      7: "Paz",
    },
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
    home: "Ana Sayfa",
    transactionTracking: "İşlem Takip",
    warehouseTracking: "Antrepo Takip",
    cargoTracking: "Yük Takip",
    news: "Haberler",
    announcements: "Duyurular",
    profile: "Hesabım",
    contact: "İletişim",
    help: "Yardım",
    agreements: "Vekalet Yönetimi",
    clients: "Müşteri Firmaları",
    employees: "Çalışan Yönetimi",
    couriers: "Kurye Yönetimi",
    companySettings: "Firma Ayarları",
    subscriptionAndPayment: "Abonelik & Ödeme",
    sessions: "Session Yönetimi",
    payments: "Ödeme Yönetimi",
    brokerSubscriptions: "Abonelik Yönetimi",
    addonCatalog: "Hizmet Kataloğu",
    plans: "Plan Yönetimi",
    feedbackTasks: "Feedback Taskları",
  },

  // Kenar çubuğu ve mobil menü
  layout: {
    other: "Diğer",
    otherMenuItems: "Diğer Menü Öğeleri",
    otherManagementItems: "Diğer Yönetim Öğeleri",
    management: "Yönetim",
    userFallback: "Kullanıcı",
    company: "Firma",
    pinAndExpand: "Sabitle ve Genişlet",
    expand: "Genişlet",
    collapse: "Daralt",
    signOut: "Oturumu Kapat",
    pin: "Sabitle",
    unpin: "Sabitlemeyi Kaldır",
    reportIssue: "Sorun Bildir / Öneri",
  },

  // Dil seçimi
  language: {
    title: "Dil",
    description: "Arayüz dili. Değiştirdiğinizde sayfa yeniden yüklenir.",
    inProgress: "Çeviri sürüyor; bazı ekranlar henüz Türkçe görünebilir.",
  },
};

export default tr;
