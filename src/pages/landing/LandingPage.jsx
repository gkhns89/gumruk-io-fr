import React, { useEffect } from "react";
import LandingHeader from "./sections/LandingHeader";
import Hero from "./sections/Hero";
import Features from "./sections/Features";
import LiveTracking from "./sections/LiveTracking";
import Screens from "./sections/Screens";
import Roadmap from "./sections/Roadmap";
import Pricing from "./sections/Pricing";
import Faq from "./sections/Faq";
import Contact from "./sections/Contact";
import LandingFooter from "./sections/LandingFooter";
import CookieConsent from "./sections/CookieConsent";
import { PLANS } from "./pricingPlans";
import { QUESTIONS } from "./faqData";
import {
  applyDocumentHead,
  injectJsonLd,
  softwareApplicationSchema,
  faqPageSchema,
} from "../../utils/seo";

// Tanıtım sayfası: public, PublicRoute ile SARMALANMAZ.
// Giriş yapmış kullanıcı da bu sayfayı görebilmeli (CTA "Panele Git"e döner).
export default function LandingPage() {
  useEffect(() => {
    // index.html'deki varsayılanla aynı — başka bir rotadan dönüldüğünde geri yazılsın diye
    applyDocumentHead({
      title: "Gümrük Müşavirliği Takip Programı | Gümrük.io",
      description:
        "İthalat, ihracat, antrepo, kurye ve canlı konteyner takibi tek ekranda. Gümrük müşavirlikleri için vekalet, raporlama ve cari hesap takibi dahil.",
      path: "/",
    });

    // Fiyat ve SSS şemaları koddaki tek kaynaktan üretiliyor, index.html'e kopyalanmıyor
    const removeApp = injectJsonLd("ld-software", softwareApplicationSchema(PLANS));
    const removeFaq = injectJsonLd("ld-faq", faqPageSchema(QUESTIONS));

    return () => {
      removeApp();
      removeFaq();
    };
  }, []);

  return (
    <div className="landing-root min-h-screen bg-white transition-colors duration-300 dark:bg-brand-navy">
      <LandingHeader />
      <main>
        <Hero />
        <Features />
        <LiveTracking />
        <Screens />
        <Roadmap />
        <Pricing />
        <Faq />
        <Contact />
      </main>
      <LandingFooter />
      {/* Ölçümleme yalnızca pazarlama sayfalarında; panelde hiç yüklenmez */}
      <CookieConsent />
    </div>
  );
}
