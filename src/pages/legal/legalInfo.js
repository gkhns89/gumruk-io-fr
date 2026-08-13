/**
 * Yasal metinlerde geçen kurumsal kimlik bilgileri.
 *
 * !!! ÖNEMLİ !!!
 * Köşeli parantezli değerler YER TUTUCUDUR. Kullanım Koşulları ve Gizlilik Politikası
 * yayına çıkmadan önce gerçek ticari unvan, adres ve vergi bilgileriyle doldurulmalı;
 * metinlerin tamamı bir hukukçu tarafından gözden geçirilmeli. Bu dosya doldurulmadan
 * sayfalar yayına alınmamalı.
 */
import { CONTACT } from "../landing/contactInfo";

export const LEGAL = {
  /** Markanın görünen adı */
  brand: "Gümrük.io",
  /** Hizmeti işleten geliştirici */
  operator: "G.Codes",

  // TODO: aşağıdaki beş alan doldurulacak
  legalName: "[Ticari unvan]",
  address: "[Açık adres]",
  taxOffice: "[Vergi dairesi]",
  taxNumber: "[Vergi numarası]",
  mersis: "[MERSİS numarası]",

  /** KVKK başvuruları ve genel iletişim */
  email: CONTACT.email,
  phone: CONTACT.phone,

  /** Yetkili mahkeme ve icra daireleri */
  jurisdiction: "[İl] Mahkemeleri ve İcra Daireleri",

  lastUpdated: "14 Ağustos 2026",
};

/** Yer tutucu kalmış mı? Geliştirme sırasında uyarı basmak için. */
export const hasPlaceholders = () =>
  Object.values(LEGAL).some((v) => typeof v === "string" && v.includes("["));
