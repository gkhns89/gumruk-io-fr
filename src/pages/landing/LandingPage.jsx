import React from "react";
import LandingHeader from "./sections/LandingHeader";
import Hero from "./sections/Hero";
import Features from "./sections/Features";
import LiveTracking from "./sections/LiveTracking";
import Pricing from "./sections/Pricing";

// Tanıtım sayfası: public, PublicRoute ile SARMALANMAZ.
// Giriş yapmış kullanıcı da bu sayfayı görebilmeli (CTA "Panele Git"e döner).
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white transition-colors duration-300 dark:bg-brand-navy">
      <LandingHeader />
      <main>
        <Hero />
        <Features />
        <LiveTracking />
        <Pricing />
      </main>
    </div>
  );
}
