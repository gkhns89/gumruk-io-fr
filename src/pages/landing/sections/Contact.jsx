import React from "react";
import { CONTACT, DEMO_MAILTO } from "../contactInfo";

// Public bir "demo talebi" endpoint'i yok — form yerine doğrudan e-posta/telefon.
// Boşa giden bir form göstermektense çalışan bir kanal veriyoruz.
export default function Contact() {
  return (
    <section id="iletisim" className="bg-white py-20 lg:py-28 dark:bg-brand-navy">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand-navy px-8 py-14 text-center sm:px-14 dark:border dark:border-white/15 dark:bg-white/[0.07]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(56,189,248,0.22),transparent_70%)]"
          />

          <div className="relative">
            <h2 className="font-brand text-3xl font-extrabold text-white sm:text-4xl">
              Sistemi kendi işleyişiniz üzerinden görün
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
              Kısa bir demo planlayalım; ofisinizin dosya akışını ekranda birlikte gezelim.
              Sorularınızı da o sırada cevaplayalım.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={DEMO_MAILTO}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-brand-navy transition-colors hover:bg-brand-sky"
              >
                <span className="material-symbols-outlined text-[20px]">mail</span>
                Demo Talep Et
              </a>
              <a
                href={CONTACT.phoneHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[20px]">call</span>
                {CONTACT.phone}
              </a>
            </div>

            <p className="mt-6 text-sm text-white/60">
              Doğrudan yazmak isterseniz:{" "}
              <a href={`mailto:${CONTACT.email}`} className="text-brand-sky hover:underline">
                {CONTACT.email}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
