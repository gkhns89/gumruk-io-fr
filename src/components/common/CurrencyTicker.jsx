import { useEffect, useState } from 'react';
import { tcmbService } from '../../api/tcmbService';

/**
 * Horizontal scrolling currency ticker — runs the latest TCMB rates across
 * the top of NewsPage like a financial news channel chyron. Each entry is
 * "CODE 12.3456 ₺" with a flag emoji for quick recognition.
 *
 * Reads from /api/tcmb/rates (cached server-side; cron refreshes daily at
 * 09:00). Re-fetches on mount only — no polling, because the upstream feed
 * is itself daily.
 *
 * The marquee is built with a CSS keyframe and a duplicated list so the
 * scroll is seamless (no jump when it wraps). Pauses on hover so the user
 * can read a specific rate without chasing it.
 */
const FLAGS = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', CHF: '🇨🇭',
  JPY: '🇯🇵', CNY: '🇨🇳', RUB: '🇷🇺',
  SAR: '🇸🇦', AED: '🇦🇪',
  AUD: '🇦🇺', CAD: '🇨🇦', SEK: '🇸🇪', NOK: '🇳🇴', DKK: '🇩🇰',
};

const PRIORITY = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY', 'RUB', 'SAR', 'AED', 'AUD', 'CAD', 'SEK', 'NOK', 'DKK'];

function sortByPriority(a, b) {
  const ai = PRIORITY.indexOf(a.currencyCode);
  const bi = PRIORITY.indexOf(b.currencyCode);
  if (ai === -1 && bi === -1) return a.currencyCode.localeCompare(b.currencyCode);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

export default function CurrencyTicker() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceDate, setSourceDate] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await tcmbService.getLatestRates();
      if (!alive) return;
      if (res.success) {
        const list = (res.data?.rates || []).slice().sort(sortByPriority);
        setRates(list);
        if (list.length > 0) setSourceDate(list[0].sourceDate);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="h-10 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-y border-primary/20 flex items-center px-4 text-xs text-text-secondary">
        <span className="material-symbols-outlined text-base animate-spin mr-2">refresh</span>
        TCMB kurları yükleniyor...
      </div>
    );
  }

  if (rates.length === 0) {
    return null;
  }

  return (
    <div
      className="relative h-10 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 border-y border-primary/20 overflow-hidden group"
      title={sourceDate ? `TCMB kuru — ${new Date(sourceDate).toLocaleDateString('tr-TR')}` : 'TCMB kuru'}
    >
      {/* Static "₺" badge at the leading edge */}
      <div className="absolute left-0 top-0 bottom-0 z-10 px-3 flex items-center gap-1 bg-primary text-white text-[11px] font-semibold pointer-events-none">
        <span className="material-symbols-outlined text-sm">currency_lira</span>
        TCMB Kuru
      </div>

      {/* Scrolling track */}
      <div
        className="absolute inset-0 pl-32 pr-4 flex items-center whitespace-nowrap currency-marquee group-hover:[animation-play-state:paused]"
      >
        {[...rates, ...rates].map((r, i) => (
          <TickerItem key={`${r.currencyCode}-${i}`} rate={r} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ rate }) {
  const flag = FLAGS[rate.currencyCode] || '';
  const formatted = Number(rate.rate).toLocaleString('tr-TR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  return (
    <span className="inline-flex items-center gap-1.5 mx-4 text-xs text-text-main">
      <span className="text-base leading-none">{flag}</span>
      <span className="font-semibold text-text-secondary">{rate.currencyCode}</span>
      <span className="font-mono text-text-main">{formatted}</span>
      <span className="text-text-secondary text-[10px]">₺</span>
    </span>
  );
}
