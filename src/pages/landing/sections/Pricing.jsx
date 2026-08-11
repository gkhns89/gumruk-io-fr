import React, { useState } from "react";
import { PLANS, INCLUDED_FEATURES, formatTRY, yearlySavingRatio } from "../pricingPlans";

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="fiyatlandirma" className="bg-background-light py-20 lg:py-28 dark:bg-brand-navy">
      <div className="mx-auto max-w-7xl px-6">
        {/* Başlık */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold tracking-wide text-brand-blue uppercase dark:text-brand-sky">
            Fiyatlandırma
          </span>
          <h2 className="font-brand mt-3 text-3xl font-extrabold text-brand-navy sm:text-4xl dark:text-white">
            Ofisinizin ölçeğine göre net fiyat
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Tüm planlarda sistemin tamamı açık. Planlar yalnızca kullanıcı ve müşteri firma
            limitiyle ayrışıyor — kullanmadığınız modül için ödeme yapmazsınız.
          </p>
        </div>

        {/* Aylık / Yıllık geçişi */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span
            className={`text-sm font-medium ${!yearly ? "text-text-main" : "text-text-secondary"}`}
          >
            Aylık
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Yıllık fiyatlandırmaya geç"
            onClick={() => setYearly((v) => !v)}
            className={`relative h-7 w-13 flex-shrink-0 rounded-full transition-colors ${
              yearly ? "bg-brand-blue" : "bg-gray-300 dark:bg-white/20"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                yearly ? "left-7" : "left-1"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${yearly ? "text-text-main" : "text-text-secondary"}`}
          >
            Yıllık
          </span>
        </div>

        {/* Planlar */}
        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const saving = yearlySavingRatio(plan);
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-7 transition-shadow dark:bg-white/5 ${
                  plan.highlighted
                    ? "border-brand-blue shadow-xl shadow-brand-blue/10 dark:border-brand-sky"
                    : "border-gray-200 hover:shadow-lg dark:border-white/10"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-7 rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold text-white">
                    En çok tercih edilen
                  </span>
                )}

                <h3 className="font-brand text-xl font-bold text-brand-navy dark:text-white">
                  {plan.name}
                </h3>
                <p className="mt-2 min-h-[2.5rem] text-sm text-text-secondary">
                  {plan.description}
                </p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-brand text-4xl font-extrabold text-brand-navy dark:text-white">
                      {formatTRY(yearly ? plan.yearlyPrice : plan.monthlyPrice)}
                    </span>
                    <span className="text-sm text-text-secondary">{yearly ? "/yıl" : "/ay"}</span>
                  </div>
                  {yearly && saving > 0 && (
                    <span className="mt-2 inline-block rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
                      %{saving} tasarruf
                    </span>
                  )}
                </div>

                {/* Planı ayıran limitler */}
                <div className="mt-6 grid grid-cols-2 gap-3 border-y border-gray-100 py-4 dark:border-white/10">
                  <div>
                    <p className="font-brand text-2xl font-bold text-brand-blue dark:text-brand-sky">
                      {plan.userLimit}
                    </p>
                    <p className="text-xs text-text-secondary">kullanıcı</p>
                  </div>
                  <div>
                    <p className="font-brand text-2xl font-bold text-brand-blue dark:text-brand-sky">
                      {plan.clientLimit}
                    </p>
                    <p className="text-xs text-text-secondary">müşteri firma</p>
                  </div>
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {[...INCLUDED_FEATURES, ...plan.extras].map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-text-main">
                      <span className="material-symbols-outlined mt-px text-[18px] text-brand-blue dark:text-brand-sky">
                        check_circle
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href="#iletisim"
                  className={`mt-7 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-brand-blue text-white hover:bg-brand-navy dark:hover:bg-brand-sky dark:hover:text-brand-navy"
                      : "border border-gray-300 text-text-main hover:border-brand-blue hover:text-brand-blue dark:border-white/20 dark:hover:border-brand-sky dark:hover:text-brand-sky"
                  }`}
                >
                  Teklif Al
                </a>
              </div>
            );
          })}

          {/* Hibrit: kurumsal / özel kapsam kartı */}
          <div className="flex flex-col justify-between rounded-2xl bg-brand-navy p-7 text-white dark:border dark:border-white/15 dark:bg-white/10">
            <div>
              <h3 className="font-brand text-xl font-bold">Kurumsal</h3>
              <p className="mt-2 min-h-[2.5rem] text-sm text-white/70">
                Daha geniş kapsam, özel entegrasyon veya çok şubeli yapı için
              </p>

              <p className="font-brand mt-6 text-3xl font-extrabold">Size özel</p>
              <p className="mt-2 text-sm text-white/70">İhtiyacınıza göre fiyatlandırılır</p>

              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "Sınırsız kullanıcı ve müşteri firma",
                  "Kuruma özel entegrasyon geliştirme",
                  "Özel eğitim ve kurulum desteği",
                  "Öncelikli teknik destek",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-white/90">
                    <span className="material-symbols-outlined mt-px text-[18px] text-brand-sky">
                      check_circle
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href="#iletisim"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-sky"
            >
              Demo Talep Et
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-text-secondary">
          Fiyatlara KDV dahil değildir. Yıllık ödemede sözleşme süresi boyunca fiyat sabitlenir.
        </p>
      </div>
    </section>
  );
}
