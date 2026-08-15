/**
 * Sayfa başına SEO etiketleri.
 *
 * Uygulama tek sayfalık (SPA) olduğu için `index.html`'deki başlık/açıklama tüm rotalar
 * için varsayılan. Yasal sayfalar Google'da tanıtım sayfasıyla aynı başlıkla listelenmesin
 * diye kendi değerlerini burada yazıyor.
 *
 * NOT: Bu etiketler JavaScript çalıştıktan sonra yazılıyor. Googlebot sayfayı render
 * ettiği için sorun değil; ancak WhatsApp/LinkedIn gibi paylaşım botları JS çalıştırmaz.
 * Bu yüzden OG etiketleri `index.html`'de STATİK duruyor ve burada değiştirilmiyor —
 * paylaşımda her zaman tanıtım sayfasının kartı görünür, ki istenen de bu.
 */

const SITE = "https://gumruk.io";

/** <head> içindeki bir meta/link etiketini bulur, yoksa oluşturur */
function upsert(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

/**
 * Başlık, açıklama ve canonical adresi ayarlar.
 * @param {{ title: string, description: string, path: string }} meta
 */
export function applyDocumentHead({ title, description, path }) {
  document.title = title;

  const desc = upsert('meta[name="description"]', () => {
    const el = document.createElement("meta");
    el.setAttribute("name", "description");
    return el;
  });
  desc.setAttribute("content", description);

  const canonical = upsert('link[rel="canonical"]', () => {
    const el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    return el;
  });
  canonical.setAttribute("href", `${SITE}${path}`);
}

/**
 * Verilen JSON-LD nesnesini sayfaya ekler ve kaldıran fonksiyonu döner.
 * `id` ile işaretleniyor: aynı şema iki kez eklenmesin, rota değişince temizlensin.
 */
export function injectJsonLd(id, data) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);

  return () => script.remove();
}

/** Abonelik planlarından SoftwareApplication şeması — fiyatlar tek kaynaktan gelir */
export function softwareApplicationSchema(plans) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE}/#software`,
    name: "Gümrük.io",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Gümrük müşavirliği takip yazılımı",
    operatingSystem: "Web tarayıcısı",
    inLanguage: "tr-TR",
    url: `${SITE}/`,
    description:
      "Gümrük müşavirlikleri için ithalat ve ihracat işlem takibi, antrepo, kurye evrak takibi, canlı konteyner takibi, vekalet yönetimi ve raporlama.",
    publisher: { "@id": `${SITE}/#organization` },
    // Fiyatlar KDV hariç; aylık abonelik bedeli. Kullanım başına ücretlenen konteyner
    // takibi burada yok — sabit bir tutarı olmadığı için offer olarak verilemez.
    offers: plans.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      description: plan.description,
      price: plan.monthlyPrice,
      priceCurrency: "TRY",
      category: "Aylık abonelik",
      url: `${SITE}/#fiyatlandirma`,
      availability: "https://schema.org/InStock",
    })),
  };
}

/** SSS bölümünden FAQPage şeması — Google'da açılır soru bloğu çıkarabilir */
export function faqPageSchema(questions) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE}/#faq`,
    inLanguage: "tr-TR",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** Yasal sayfalar için basit kırıntı yolu */
export function breadcrumbSchema(name, path) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name, item: `${SITE}${path}` },
    ],
  };
}
