import React from "react";

// Kartlar sistemdeki gerçek modüllerle birebir eşleşir (bkz. Sidebar).
// Sağlayıcı adı geçmez — yük takibi kendi adıyla anlatılır.
const FEATURES = [
  {
    icon: "fact_check",
    title: "İşlem Takip",
    text: "İthalat ve ihracat dosyalarını tek listede tutun. Beyanname, evrak ve maliyet kalemleri işlemin altında toplanır; hangi dosyanın hangi aşamada olduğunu aramadan görürsünüz.",
  },
  {
    icon: "public",
    title: "G-Radar ile yük takibi",
    text: "Konteyner numarasını ya da hava konşimentosunu girin; son konum, uğranan limanlar ve tahmini varış tarihi canlı haritada belirsin. Sefer ilerledikçe kayıt kendini günceller, müşteriyi aramaya gerek kalmaz.",
    // Abonelik bedeline dahil değil — Fiyatlandırma ve SSS ile tutarlı kalmalı
    note: "Kullanım başına ücretlendirilir",
  },
  {
    icon: "warehouse",
    title: "Antrepo Takip",
    text: "Antrepo giriş ve çıkışlarını beyannameyle birlikte kayıt altına alın. Antrepodaki yükü tek tıkla gümrük işlemine aktarın, çift veri girişini bırakın.",
  },
  {
    icon: "local_shipping",
    title: "Kurye ve Evrak Teslimi",
    text: "Evrakın kimde olduğunu, hangi kuryeye verildiğini ve nasıl teslim edildiğini kayıt altına alın. Teslim programlarını topluca planlayın.",
  },
  {
    icon: "handshake",
    title: "Vekalet ve Müşteri Yönetimi",
    text: "Müşteri firmalarınızı ve her biriyle olan vekalet ilişkinizi tek yerden yönetin. Süresi dolan vekaleti gözden kaçırmayın.",
  },
  {
    icon: "monitoring",
    title: "Raporlama ve Cari Takibi",
    text: "Operasyonun ve tahsilatın durumunu rapor ekranından okuyun. Müşteri bazında bakiye ve hareket geçmişi kayıt altında kalır.",
  },
];

const EXTRAS = [
  "Gümrük haberleri akışı",
  "Duyurular",
  "Anlık bildirimler",
  "Ekip ve rol yönetimi",
  "Oturum yönetimi",
  "Karanlık mod",
  "Mobil uyumlu arayüz",
];

export default function Features() {
  return (
    <section id="ozellikler" className="bg-background-light py-20 lg:py-28 dark:bg-brand-navy">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold tracking-wide text-brand-blue uppercase dark:text-brand-sky">
            Özellikler
          </span>
          <h2 className="font-brand mt-3 text-3xl font-extrabold text-brand-navy sm:text-4xl dark:text-white">
            Gümrük ofisinin işleyişine göre kurulmuş
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Genel amaçlı bir takip yazılımı değil. Beyannameden antrepoya, kurye evrakından
            tahsilata kadar müşavirliğin günlük akışı düşünülerek yazıldı.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-gray-200 bg-white p-7 transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-sky/40"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue transition-colors group-hover:bg-brand-blue group-hover:text-white dark:bg-brand-sky/15 dark:text-brand-sky dark:group-hover:bg-brand-sky dark:group-hover:text-brand-navy">
                <span className="material-symbols-outlined">{feature.icon}</span>
              </span>

              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h3 className="font-brand text-lg font-bold text-brand-navy dark:text-white">
                  {feature.title}
                </h3>
                {feature.note && (
                  <span className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-[11px] font-medium text-text-secondary dark:border-white/25">
                    {feature.note}
                  </span>
                )}
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-text-secondary">{feature.text}</p>
            </div>
          ))}
        </div>

        {/* Kart açmaya değmeyecek kadar küçük ama sayılması gereken şeyler */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm font-medium text-text-secondary">Ayrıca:</span>
          {EXTRAS.map((extra) => (
            <span
              key={extra}
              className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-text-main shadow-sm dark:border-white/15 dark:bg-white/5"
            >
              {extra}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
