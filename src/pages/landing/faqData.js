/**
 * SSS içeriği — tek kaynak.
 *
 * Hem sayfadaki akordiyon (`sections/Faq.jsx`) hem de Google'a verilen FAQPage yapısal
 * verisi (`LandingPage`) bu listeden besleniyor. Metni değiştirmek arama sonucundaki
 * zengin bloğu da değiştirir.
 *
 * DİKKAT: Cevaplar ticari taahhüt içerir. Yeni soru eklerken sistemin gerçekten yaptığı
 * şeyi yazın — Google'a yapısal veri olarak da gittiği için tutarsızlık iki kat maliyetli.
 * Ayrı dosyada durmasının sebebi: bileşen dosyasından sabit dışa aktarmak fast-refresh'i
 * bozuyor (react-refresh/only-export-components).
 */
export const QUESTIONS = [
  {
    q: "Kurulum gerekiyor mu, ne kadar sürede başlarız?",
    a: "Sistem tamamen tarayıcı üzerinden çalışır; ofisinize program kurulmaz. Hesabınız açıldıktan sonra kullanıcılarınız ve müşteri firmalarınız tanımlanır, aynı gün işlem girmeye başlayabilirsiniz.",
  },
  {
    q: "Ekibimdeki herkes her şeyi görebilir mi?",
    a: "Hayır. Kullanıcılar rollerine göre yetkilendirilir; firma yöneticisi ile çalışan yetkileri ayrıdır. Açık oturumlar sistem tarafından kayıt altına alınır; yetkisiz erişim şüphesi hâlinde talebiniz üzerine sistem yöneticisi tarafından uzaktan sonlandırılır.",
  },
  {
    q: "Vekaletleri nasıl takip ediyoruz?",
    a: "Her müşteri firmayla olan vekalet ilişkiniz sistemde kayıtlı tutulur; başlangıç ve bitiş tarihleriyle birlikte listelenir ve kalan gün sayısı otomatik hesaplanır. Süresi dolmak üzere olan vekaletler listede öne çıkar, böylece süresi geçmiş bir vekaletle işlem yapma riski ortadan kalkar.",
  },
  {
    q: "G-Radar nedir, yük takibi nasıl çalışıyor?",
    a: "G-Radar, Gümrük.io içindeki canlı yük takip özelliğidir. İlgili gümrük dosyasına deniz taşımasında konteyner numarasını, hava taşımasında hava konşimento (AWB) numarasını girmeniz yeterli. Sistem seferi izler; konum, uğranan limanlar veya uçuş durumu ve tahmini varış tarihi dosyanın altında güncellenir. Ayrı bir yerde takip yapmanız gerekmez.",
  },
  {
    q: "G-Radar abonelik fiyatına dahil mi?",
    a: "Hayır. G-Radar tüm planlarda kullanılabilir ancak kullandığınız kadar, sorgu başına kredi ile ücretlendirilir; abonelik bedeline dahil değildir. Kredi birim fiyatı planınıza göre değişir ve satın alma anındaki TCMB kuruyla ₺'ye çevrilir. Takip etmediğiniz bir yük için ödeme yapmazsınız.",
  },
  {
    q: "Kullanıcı veya müşteri firma limitim dolarsa ne olur?",
    a: "Planınızı istediğiniz zaman üst pakete yükseltebilirsiniz. İhtiyacınız hazır paketlerin dışındaysa kurumsal kapsamda birlikte belirleriz.",
  },
  {
    q: "Mevcut kayıtlarımızı sisteme aktarabilir miyiz?",
    a: "Devreye alma sırasında elinizdeki müşteri ve dosya bilgilerinin aktarımını birlikte planlıyoruz. Kapsamı görüşmede netleştiriyoruz.",
  },
  {
    q: "Fiyatlara KDV dahil mi?",
    a: "Hayır, tablodaki tutarlara KDV dahil değildir. Yıllık ödemeyi seçtiğinizde sözleşme süresi boyunca fiyatınız sabit kalır.",
  },
];
