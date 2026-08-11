import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import ThemeToggle from "../../../components/common/ThemeToggle";
import emblemLight from "../../../assets/brand/emblem-light.png";
import emblemDark from "../../../assets/brand/emblem-dark.png";

const NAV_LINKS = [
  { href: "#ozellikler", label: "Özellikler" },
  { href: "#canli-takip", label: "Canlı Takip" },
  { href: "#ekranlar", label: "Ekranlar" },
  { href: "#fiyatlandirma", label: "Fiyatlandırma" },
  { href: "#sss", label: "SSS" },
];

export default function LandingHeader() {
  const { isAuthenticated, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Giriş yapmış kullanıcı tanıtım sayfasını görebilir; buton ona göre değişir
  const cta = isAuthenticated
    ? { to: "/dashboard", label: "Panele Git" }
    : { to: "/login", label: "Sisteme Giriş" };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/80 bg-white/85 backdrop-blur-md dark:border-white/10 dark:bg-brand-navy/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-3">
          <img src={emblemLight} alt="Gümrük.io" className="h-9 w-9 flex-shrink-0 dark:hidden" />
          <img src={emblemDark} alt="Gümrük.io" className="hidden h-9 w-9 flex-shrink-0 dark:block" />
          <span className="font-brand text-lg font-bold text-brand-navy dark:text-white">
            Gümrük.io
          </span>
        </a>

        {/* Masaüstü menü */}
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text-secondary transition-colors hover:text-brand-blue dark:hover:text-brand-sky"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to={cta.to}
            className={`hidden rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-navy hover:shadow-md sm:inline-flex dark:hover:bg-brand-sky dark:hover:text-brand-navy ${
              loading ? "pointer-events-none opacity-70" : ""
            }`}
          >
            {cta.label}
          </Link>

          {/* Mobil menü butonu */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menüyü aç/kapat"
            aria-expanded={menuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-text-main transition-colors hover:bg-gray-100 lg:hidden dark:hover:bg-white/10"
          >
            <span className="material-symbols-outlined">{menuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobil menü */}
      {menuOpen && (
        <nav className="border-t border-gray-200 bg-white px-6 py-4 lg:hidden dark:border-white/10 dark:bg-brand-navy">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
            <Link
              to={cta.to}
              className="mt-2 rounded-lg bg-brand-blue px-3 py-2.5 text-center text-sm font-semibold text-white sm:hidden"
            >
              {cta.label}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
