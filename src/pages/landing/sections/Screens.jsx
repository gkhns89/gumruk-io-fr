import React, { useState } from "react";

// Tamamı sahte veri. Kolonlar sistemdeki gerçek ekranların yapısını izler,
// ancak hiçbir müşteri kaydı kullanılmaz.
const TABS = [
  {
    id: "islem",
    label: "İşlem Takip",
    icon: "fact_check",
    caption: "Açık dosyalarınız, aşamalarıyla birlikte tek listede.",
    columns: ["Dosya No", "Müşteri", "Tür", "Aşama", "Tarih"],
    rows: [
      ["IM-2026-0418", "Alemdar Tekstil A.Ş.", "İthalat", { text: "Beyanname tescil", tone: "blue" }, "12.08.2026"],
      ["IM-2026-0417", "Karahanlı Kimya Ltd.", "İthalat", { text: "Muayene", tone: "amber" }, "11.08.2026"],
      ["EX-2026-0231", "Akbey Makine San.", "İhracat", { text: "Yüklendi", tone: "sky" }, "11.08.2026"],
      ["IM-2026-0415", "Baş Gıda A.Ş.", "İthalat", { text: "Teslim edildi", tone: "green" }, "08.08.2026"],
      ["EX-2026-0229", "Büyük Otomotiv A.Ş.", "İhracat", { text: "Evrak bekleniyor", tone: "gray" }, "07.08.2026"],
    ],
  },
  {
    id: "antrepo",
    label: "Antrepo Takip",
    icon: "warehouse",
    caption: "Antrepodaki yükün süresi dolmadan haberiniz olsun.",
    columns: ["Beyanname", "Müşteri", "Giriş", "Kalan Süre", "Durum"],
    rows: [
      ["26341200AN000412", "Alemdar Tekstil A.Ş.", "24.07.2026", { text: "38 gün", tone: "green" }, "Antrepoda"],
      ["26341200AN000408", "Baş Gıda A.Ş.", "02.07.2026", { text: "12 gün", tone: "amber" }, "Antrepoda"],
      ["26341200AN000401", "Karahanlı Kimya Ltd.", "18.06.2026", { text: "4 gün", tone: "red" }, "Antrepoda"],
      ["26341200AN000396", "Akbey Makine San.", "05.06.2026", { text: "—", tone: "gray" }, "İşleme aktarıldı"],
    ],
  },
  {
    id: "kurye",
    label: "Kurye Takip",
    icon: "local_shipping",
    caption: "Evrakın kimde olduğu ve nasıl teslim edildiği kayıt altında.",
    columns: ["Kurye", "Güzergah", "Evrak", "Teslim", "Durum"],
    rows: [
      ["Memati B.", "Ofis → Gümrük Müdürlüğü", "Beyanname dosyası", "Elden", { text: "Teslim edildi", tone: "green" }],
      ["Abdülhey Ç.", "Ofis → Alemdar Tekstil", "Orijinal konşimento", "Elden", { text: "Yolda", tone: "blue" }],
      ["Kargo", "Ofis → Akbey Makine", "Fatura seti", "Kargo", { text: "Yolda", tone: "blue" }],
      ["Memati B.", "Liman → Ofis", "Ordino", "Elden", { text: "Planlandı", tone: "gray" }],
    ],
  },
];

const TONES = {
  blue: "bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/25 dark:text-brand-sky",
  sky: "bg-brand-sky/15 text-sky-600 dark:bg-brand-sky/20 dark:text-brand-sky",
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-300",
  green: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300",
  red: "bg-red-500/10 text-red-600 dark:bg-red-400/20 dark:text-red-300",
  gray: "bg-gray-200/70 text-text-secondary dark:bg-white/10",
};

/** Hücre ya düz metin ya da {text, tone} rozetidir */
function Cell({ value }) {
  if (typeof value === "string") return value;
  return (
    <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-medium ${TONES[value.tone]}`}>
      {value.text}
    </span>
  );
}

export default function Screens() {
  const [active, setActive] = useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === active);

  return (
    <section id="ekranlar" className="bg-background-light py-20 lg:py-28 dark:bg-brand-navy">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold tracking-wide text-brand-blue uppercase dark:text-brand-sky">
            Ekranlar
          </span>
          <h2 className="font-brand mt-3 text-3xl font-extrabold text-brand-navy sm:text-4xl dark:text-white">
            Aradığınız bilgi, aramadan önünüzde
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Her modül aynı mantıkla çalışır: liste, filtre, detay. Ekibiniz bir ekranı öğrenince
            diğerlerini de biliyor olur.
          </p>
        </div>

        {/* Sekmeler */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              aria-pressed={active === t.id}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                active === t.id
                  ? "bg-brand-blue text-white shadow-sm dark:bg-brand-sky dark:text-brand-navy"
                  : "border border-gray-200 bg-white text-text-main hover:border-brand-blue hover:text-brand-blue dark:border-white/15 dark:bg-white/5 dark:hover:border-brand-sky dark:hover:text-brand-sky"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Sahte uygulama penceresi */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-brand-navy/10 dark:border-white/10 dark:bg-background-dark dark:shadow-black/40">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-white/10">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs font-medium text-text-secondary">
              Gümrük.io — {tab.label}
            </span>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">{tab.caption}</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-text-secondary dark:border-white/15">
                  <span className="material-symbols-outlined text-[16px]">filter_list</span>
                  Filtrele
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-text-secondary dark:border-white/15">
                  <span className="material-symbols-outlined text-[16px]">search</span>
                  Ara
                </span>
              </div>
            </div>

            {/* Dar ekranda tablo kendi içinde kayar, sayfa yatay kaymaz */}
            <div className="-mx-5 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    {tab.columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-xs font-semibold tracking-wider text-text-secondary uppercase"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tab.rows.map((row) => (
                    <tr
                      key={row[0]}
                      className="border-b border-gray-100 last:border-0 dark:border-white/5"
                    >
                      {row.map((cell, i) => (
                        <td
                          key={i}
                          className={`px-4 py-3.5 text-sm ${
                            i === 0
                              ? "font-mono text-xs font-medium text-text-main"
                              : "text-text-main"
                          }`}
                        >
                          <Cell value={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-text-secondary">
          Ekranlar temsilidir; gösterilen kayıtlar örnek veridir.
        </p>
      </div>
    </section>
  );
}
