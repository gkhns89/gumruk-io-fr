import React from "react";

/**
 * Yol haritası — HENÜZ YAYINDA OLMAYAN çalışmalar.
 *
 * Buradaki her madde açıkça "geliştiriliyor / planlanıyor" olarak etiketlenmeli.
 * Yayına giren bir özellik bu bölümden çıkarılıp Özellikler'e taşınmalı; aksi hâlde
 * tanıtım sayfası karşılanmamış vaat listesine döner.
 */
const ITEMS = [
  {
    status: "Geliştiriliyor",
    tone: "active",
    icon: "account_balance",
    title: "GET-APP entegrasyonu",
    lead: "Ticaret Bakanlığı — Gümrük Eşya Takip ve Analitik Performans Programı",
    text: "Bakanlığın GET-APP sistemindeki işlem verilerinin Gümrük.io'ya aktarılması üzerinde çalışıyoruz. İlk aşamada ithalat işlemleri kapsanacak, ihracat sonraki aşamada eklenecek.",
    notes: [
      "Entegrasyon yazılımı her gümrük firması için ayrı kurulur; firmanın kendi ağı içinden çalışır.",
      "Bakanlığın lisans ve erişim kısıtları nedeniyle izin, yazılım geliştiricisine değil doğrudan gümrük firmasına verilir: statik IP izninin firma adına alınması gerekir.",
      "Sorgular firma içinden yapılır, sonuçlar Gümrük.io'daki ilgili dosyaya işlenir.",
    ],
  },
  {
    status: "Planlanıyor",
    tone: "planned",
    icon: "campaign",
    title: "Sektörel duyuru sistemi",
    lead: "Mevzuat bilgilendirmesini doğru müşteriye ulaştırın",
    text: "Gümrük müşavirliğinin, çalıştığı firmalara mevzuat değişikliklerini duyurabileceği bir bildirim katmanı. Duyurular müşteri firmanın sektörüne göre hedeflenebilecek; tekstil firmasını ilgilendiren bir tebliğ yalnızca ilgili firmalara iletilecek.",
    notes: [
      "Sektör bazlı hedefleme, tüm müşterilere toplu e-posta atma alışkanlığını ortadan kaldırır.",
      "Duyurular sistem içinde kayıtlı kalır; kime, ne zaman iletildiği görülebilir.",
    ],
  },
];

const TONES = {
  active: "bg-brand-sky/20 text-brand-sky",
  planned: "bg-white/10 text-white/70",
};

export default function Roadmap() {
  return (
    <section id="yakinda" className="bg-brand-navy py-20 lg:py-28 dark:bg-white/[0.04]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold tracking-wide text-brand-sky uppercase">
            Yakında
          </span>
          <h2 className="font-brand mt-3 text-3xl font-extrabold text-white sm:text-4xl">
            Üzerinde çalıştıklarımız
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Aşağıdakiler henüz yayında değil. Sistemin nereye gittiğini görmeniz için
            paylaşıyoruz — tarih taahhüdü vermiyoruz.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex flex-col rounded-2xl border border-white/15 bg-white/[0.06] p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-sky/15 text-brand-sky">
                  <span className="material-symbols-outlined">{item.icon}</span>
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${TONES[item.tone]}`}
                >
                  {item.status}
                </span>
              </div>

              <h3 className="font-brand mt-5 text-lg font-bold text-white">{item.title}</h3>
              <p className="mt-1 text-sm font-medium text-brand-sky">{item.lead}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{item.text}</p>

              <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
                {item.notes.map((note) => (
                  <li key={note} className="flex items-start gap-2.5 text-sm text-white/70">
                    <span className="material-symbols-outlined mt-px text-[18px] text-brand-sky">
                      arrow_right
                    </span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
