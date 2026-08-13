import React from "react";
import { Link } from "react-router-dom";
import { CONTACT } from "../contactInfo";
import emblemLight from "../../../assets/brand/emblem-light.png";
import emblemDark from "../../../assets/brand/emblem-dark.png";

const COLUMNS = [
  {
    title: "Ürün",
    links: [
      { href: "#ozellikler", label: "Özellikler" },
      { href: "#canli-takip", label: "Canlı Takip" },
      { href: "#ekranlar", label: "Ekranlar" },
      { href: "#fiyatlandirma", label: "Fiyatlandırma" },
    ],
  },
  {
    title: "Destek",
    links: [
      { href: "#sss", label: "Sık Sorulan Sorular" },
      { href: "#iletisim", label: "Demo Talebi" },
      { href: `mailto:${CONTACT.email}`, label: "E-posta" },
    ],
  },
];

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-white/10 dark:bg-brand-navy">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Marka */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <img src={emblemLight} alt="Gümrük.io" className="h-9 w-9 dark:hidden" />
              <img src={emblemDark} alt="Gümrük.io" className="hidden h-9 w-9 dark:block" />
              <span className="font-brand text-lg font-bold text-brand-navy dark:text-white">
                Gümrük.io
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-text-secondary">
              Gümrük müşavirlikleri için uçtan uca takip sistemi. Beyannameden antrepoya, kurye
              evrakından tahsilata kadar operasyonun tamamı tek ekranda.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-brand text-sm font-semibold text-brand-navy dark:text-white">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-text-secondary transition-colors hover:text-brand-blue dark:hover:text-brand-sky"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 sm:flex-row dark:border-white/10">
          <p className="text-sm text-text-secondary">
            © {year} Gümrük.io — G.Codes. Tüm hakları saklıdır.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link
              to="/kullanim-kosullari"
              className="text-sm text-text-secondary transition-colors hover:text-brand-blue dark:hover:text-brand-sky"
            >
              Kullanım Koşulları
            </Link>
            <Link
              to="/gizlilik"
              className="text-sm text-text-secondary transition-colors hover:text-brand-blue dark:hover:text-brand-sky"
            >
              Gizlilik Politikası
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-brand-blue hover:underline dark:text-brand-sky"
            >
              Sisteme Giriş
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
