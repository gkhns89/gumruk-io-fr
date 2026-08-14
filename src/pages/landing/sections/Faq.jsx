import React, { useState } from "react";

// Cevaplar ticari taahhüt içerir — yayına çıkmadan önce gözden geçirilmeli.
const QUESTIONS = [
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
    q: "Konteyner takibi nasıl çalışıyor?",
    a: "İlgili gümrük dosyasına konteyner numarasını girmeniz yeterli. Sistem seferi izler; konum, uğranan limanlar ve tahmini varış tarihi dosyanın altında güncellenir. Ayrı bir yerde takip yapmanız gerekmez.",
  },
  {
    q: "Konteyner takibi abonelik fiyatına dahil mi?",
    a: "Hayır. Konteyner takibi tüm planlarda kullanılabilir ancak kullandığınız kadar, sorgu başına kredi ile ücretlendirilir; abonelik bedeline dahil değildir. Kredi birim fiyatı planınıza göre değişir ve satın alma anındaki TCMB kuruyla ₺'ye çevrilir. Takip etmediğiniz bir yük için ödeme yapmazsınız.",
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

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="sss" className="bg-background-light py-20 lg:py-28 dark:bg-brand-navy">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <span className="text-sm font-semibold tracking-wide text-brand-blue uppercase dark:text-brand-sky">
            SSS
          </span>
          <h2 className="font-brand mt-3 text-3xl font-extrabold text-brand-navy sm:text-4xl dark:text-white">
            Sık sorulan sorular
          </h2>
        </div>

        <div className="mt-12 divide-y divide-gray-200 border-y border-gray-200 dark:divide-white/10 dark:border-white/10">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="font-brand font-semibold text-brand-navy dark:text-white">
                    {item.q}
                  </span>
                  <span
                    className={`material-symbols-outlined flex-shrink-0 text-text-secondary transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {isOpen && (
                  <p className="-mt-1 pb-5 text-sm leading-relaxed text-text-secondary">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
