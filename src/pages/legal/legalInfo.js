/**
 * Yasal metinlerde geçen kimlik bilgileri.
 *
 * DURUM (14.08.2026): Hizmet, tüzel kişilik üzerinden değil, GERÇEK KİŞİ tarafından
 * sunuluyor. Şahıs şirketi kurulumu planlanıyor ancak henüz açılmadı; bu yüzden ticari
 * unvan, vergi numarası ve MERSİS alanları yok. Şirket kurulduğunda:
 *   - `isCompany` true yapılacak, `legalName` ticari unvanla değiştirilecek
 *   - `taxOffice` / `taxNumber` / `mersis` eklenip metinlerde gösterilecek
 *     (TermsPage 1. bölüm ve PrivacyPage 1. bölüm bu alanları koşullu yazıyor)
 *
 * !!! Yasal metinler TASLAKTIR — yayına çıkmadan önce hukukçu incelemesi şart. !!!
 */
import { CONTACT } from "../landing/contactInfo";

export const LEGAL = {
  /** Markanın görünen adı */
  brand: "Gümrük.io",
  /** Hizmeti işleten */
  operator: "Gökhan Şişman",

  /** Tüzel kişilik var mı? Şahıs şirketi kurulunca true olacak. */
  isCompany: false,

  /** Veri sorumlusu / hizmet sağlayıcı */
  legalName: "Gökhan Şişman",
  /** Serbest çalışan mühendis — unvan metinlerde bu şekilde geçiyor */
  title: "Bağımsız yazılım geliştirici",

  // TODO: KVKK'da yazılı başvuru için açık adres (mahalle, cadde, no, daire) gerekiyor.
  // Şu an yalnızca ilçe/il yazılı; başvuru kanalı olarak e-posta öne çıkarıldı.
  address: "Beylikdüzü / İstanbul",

  // TODO: Şahıs şirketi kurulduğunda doldurulacak
  taxOffice: null,
  taxNumber: null,
  mersis: null,

  /** KVKK başvuruları ve genel iletişim */
  email: CONTACT.email,
  phone: CONTACT.phone,

  // TODO: Beylikdüzü, Büyükçekmece Adliyesi yargı çevresinde görünüyor — hukukçuya doğrulatın.
  jurisdiction: "Büyükçekmece Mahkemeleri ve İcra Daireleri",

  lastUpdated: "14 Ağustos 2026",
};

/** Köşeli parantezli yer tutucu kalmış mı? Geliştirmede uyarı basmak için. */
export const hasPlaceholders = () =>
  Object.values(LEGAL).some((v) => typeof v === "string" && v.includes("["));
