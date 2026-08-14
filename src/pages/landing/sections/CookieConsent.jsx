import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isConfigured, loadAnalytics, readConsent, writeConsent } from "../analytics";

/**
 * Çerez onay bandı — yalnızca pazarlama sayfalarında görünür.
 *
 * Onay verilmeden Google'a hiçbir istek gitmez; script kabul anında yükleniyor.
 * Reddedildiğinde hiç yüklenmiyor ve tercih hatırlanıyor.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isConfigured()) return; // ölçüm kimliği girilmemişse bandı hiç gösterme

    const consent = readConsent();
    if (consent === "granted") {
      loadAnalytics();
    } else if (consent !== "denied") {
      setVisible(true);
    }
  }, []);

  const decide = (value) => {
    writeConsent(value);
    setVisible(false);
    if (value === "granted") loadAnalytics();
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Çerez tercihi"
      className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl shadow-brand-navy/15 sm:flex-row sm:items-center dark:border-white/15 dark:bg-background-dark dark:shadow-black/50">
        <p className="flex-1 text-sm leading-relaxed text-text-secondary">
          Bu tanıtım sayfasında, ziyaretçi sayısını ve hangi bölümlerin ilgi çektiğini
          ölçmek için isteğe bağlı analiz çerezleri kullanmak istiyoruz. Reddederseniz
          hiçbir ölçüm yapılmaz; sayfa aynı şekilde çalışır.{" "}
          <Link
            to="/gizlilik"
            className="font-medium text-brand-blue hover:underline dark:text-brand-sky"
          >
            Ayrıntılar
          </Link>
        </p>

        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-text-main transition-colors hover:border-brand-blue hover:text-brand-blue dark:border-white/20 dark:hover:border-brand-sky dark:hover:text-brand-sky"
          >
            Reddet
          </button>
          <button
            type="button"
            onClick={() => decide("granted")}
            className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-navy dark:hover:bg-brand-sky dark:hover:text-brand-navy"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}
