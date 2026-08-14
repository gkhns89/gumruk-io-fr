import React from "react";
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

// Tanıtım sayfası: public, PublicRoute ile SARMALANMAZ.
// Giriş yapmış kullanıcı da bu sayfayı görebilmeli (CTA "Panele Git"e döner).
export default function LandingPage() {
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
