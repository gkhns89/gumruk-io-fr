import React, { useState } from "react";

import { QUESTIONS } from "../faqData";

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="sss" className="bg-background-light py-20 lg:py-28 dark:bg-brand-navy">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <span className="text-sm font-semibold tracking-wide text-brand-blue uppercase dark:text-brand-sky">
            SSS
          </span>
          <h2 className="font-brand mt-3 text-3xl font-extrabold text-brand-navy sm:text-4xl dark:text-white">
            Sık sorulan sorular
          </h2>
        </div>

        <div className="mt-12 divide-y divide-gray-200 border-y border-gray-200 dark:divide-white/10 dark:border-white/10">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="font-brand font-semibold text-brand-navy transition-colors group-hover:text-brand-blue dark:text-white dark:group-hover:text-brand-sky">
                    {item.q}
                  </span>
                  <span
                    className={`material-symbols-outlined flex-shrink-0 transition-all group-hover:text-brand-blue dark:group-hover:text-brand-sky ${
                      isOpen ? "rotate-180 text-brand-blue dark:text-brand-sky" : "text-text-secondary"
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {isOpen && (
                  <p className="-mt-1 pb-5 text-sm leading-relaxed text-text-secondary">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
