import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../../components/common/ThemeToggle";
import CookieConsent from "../landing/sections/CookieConsent";
import { LEGAL, hasPlaceholders } from "./legalInfo";
import { applyDocumentHead, injectJsonLd, breadcrumbSchema } from "../../utils/seo";
import emblemLight from "../../assets/brand/emblem-light.png";
import emblemDark from "../../assets/brand/emblem-dark.png";
import lockupLight from "../../assets/brand/lockup-light.png";
import lockupDark from "../../assets/brand/lockup-dark.png";

/**
 * Yasal sayfaların ortak çerçevesi.
 *
 * Tanıtım sayfasının header'ı burada kullanılmıyor: oradaki menü `#ozellikler` gibi
 * çapa bağlantılarından oluşuyor ve ayrı bir route'ta hiçbir yere gitmiyor. Bu yüzden
 * yasal sayfalara sade, kendi başına yeten bir üst çubuk veriliyor.
 */

/** Numaralı başlık + içerik bloğu */
export function Section({ no, title, children }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-brand text-lg font-bold text-brand-navy dark:text-white">
        {no}. {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

/** Madde listesi */
export function List({ items, ordered = false }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={`ml-5 space-y-2 ${ordered ? "list-decimal" : "list-disc"} marker:text-brand-blue dark:marker:text-brand-sky`}
    >
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  );
}

/** Tanım/eşleşme tablosu — "veri kategorisi → içerik" gibi ikili listeler için */
export function DefList({ rows }) {
  return (
    <dl className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 dark:divide-white/10 dark:border-white/10">
      {rows.map((row) => (
        <div key={row.term} className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-semibold text-text-main">{row.term}</dt>
          <dd className="text-sm text-text-secondary sm:col-span-2">{row.desc}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function LegalLayout({ title, intro, path, description, children }) {
  // Kendi başlığını yazmazsa Google bu sayfayı tanıtım sayfasıyla aynı başlıkla listeler
  useEffect(() => {
    applyDocumentHead({
      title: `${title} | Gümrük.io`,
      description,
      path,
    });
    return injectJsonLd("ld-breadcrumb", breadcrumbSchema(title, path));
  }, [title, description, path]);

  // Yer tutucularla yayına çıkmayı önlemek için geliştirme uyarısı
  useEffect(() => {
    if (import.meta.env.DEV && hasPlaceholders()) {
      console.warn(
        "[legal] legalInfo.js içinde doldurulmamış yer tutucu var — yasal sayfalar bu hâliyle yayına alınmamalı."
      );
    }
  }, []);

  return (
    <div className="landing-root min-h-screen bg-white transition-colors duration-300 dark:bg-brand-navy">
      <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/85 backdrop-blur-md dark:border-white/10 dark:bg-brand-navy/85">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          {/* Tanıtım sayfasının header'ıyla aynı: dar ekranda amblem, sm ve üstünde lockup */}
          <Link to="/" className="flex items-center" title={LEGAL.brand}>
            <span className="sm:hidden">
              <img src={emblemLight} alt={LEGAL.brand} className="h-9 w-9 dark:hidden" />
              <img src={emblemDark} alt={LEGAL.brand} className="hidden h-9 w-9 dark:block" />
            </span>
            <span className="hidden sm:block">
              <img src={lockupLight} alt={LEGAL.brand} className="h-8 w-auto dark:hidden" />
              <img src={lockupDark} alt={LEGAL.brand} className="hidden h-8 w-auto dark:block" />
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-text-main transition-colors hover:border-brand-blue hover:text-brand-blue dark:border-white/20 dark:hover:border-brand-sky dark:hover:text-brand-sky"
            >
              Ana Sayfa
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">
        <h1 className="font-brand text-3xl font-extrabold text-brand-navy sm:text-4xl dark:text-white">
          {title}
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Son güncelleme: {LEGAL.lastUpdated}
        </p>
        {intro && <p className="mt-6 text-base leading-relaxed text-text-secondary">{intro}</p>}

        <div className="mt-12">{children}</div>
      </main>

      <footer className="border-t border-gray-200 dark:border-white/10">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
          <p className="text-sm text-text-secondary">
            © {new Date().getFullYear()} {LEGAL.brand} — {LEGAL.operator}
          </p>
          <div className="flex items-center gap-5">
            <Link
              to="/kullanim-kosullari"
              className="text-sm text-text-secondary hover:text-brand-blue dark:hover:text-brand-sky"
            >
              Kullanım Koşulları
            </Link>
            <Link
              to="/gizlilik"
              className="text-sm text-text-secondary hover:text-brand-blue dark:hover:text-brand-sky"
            >
              Gizlilik Politikası
            </Link>
          </div>
        </div>
      </footer>

      {/* Yasal sayfalar da pazarlama tarafında; onay bandı burada da görünür */}
      <CookieConsent />
    </div>
  );
}
