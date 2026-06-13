import { useEffect, useState, useRef } from 'react';
import { tcmbService } from '../../api/tcmbService';

/**
 * News-channel ticker bug: vertical stack of every cached TCMB rate slides
 * upward one row at a time on a single inline transform transition.
 *
 * Layout per row: scrolling column "USD 34,2034" + small static "₺" pinned
 * right. Only the code/value rotates; the unit stays put.
 *
 * Wrap is seamless thanks to a duplicate of rates[0] appended to the stack:
 * we slide into it, disable the transition, snap offset back to 0.
 *
 * Pauses on hover. Read from /api/tcmb/rates once on mount (upstream
 * refreshes daily so polling would be wasteful).
 */
const PRIORITY = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY', 'RUB', 'SAR', 'AED', 'AUD', 'CAD', 'SEK', 'NOK', 'DKK'];

const ROW_HEIGHT_PX = 20;
const ROTATE_MS = 3500;
const SLIDE_MS = 500;

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
  const [offset, setOffset] = useState(0);
  const [withTransition, setWithTransition] = useState(true);
  const [sourceDate, setSourceDate] = useState(null);
  // paused lives in a ref instead of state so hover events don't tear down
  // the interval — the timer keeps running, the tick just skips while
  // paused. Avoids any race between effect re-runs and the rotation timer.
  const pausedRef = useRef(false);
  const timerRef = useRef(null);

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
    })();
    return () => { alive = false; };
  }, []);

  // Single rotation timer — depends only on rates.length so it keeps running
  // across pause/resume. Even with a single-row dataset (cron hasn't filled
  // in the other currencies yet) the interval still fires; rates.length=1
  // just means offset cycles 0→1(duplicate)→snap→0 endlessly with the same
  // visible row. The moment a multi-row fetch is in scope, the cycle picks
  // it up without restarting.
  useEffect(() => {
    if (rates.length === 0) return undefined;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setOffset((o) => o + 1);
    }, ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [rates.length]);

  // Seamless wrap: when the slide carries us past the last real row into
  // the duplicated first-row, let the slide finish then snap offset back
  // to 0 with the transition briefly disabled so the jump is invisible.
  useEffect(() => {
    if (rates.length === 0) return undefined;
    if (offset < rates.length) {
      if (!withTransition) setWithTransition(true);
      return undefined;
    }
    const t = setTimeout(() => {
      setWithTransition(false);
      setOffset(0);
    }, SLIDE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, rates.length]);

  if (rates.length === 0) {
    return null;
  }

  const stack = [...rates, rates[0]];

  return (
    <div
      className="hidden md:flex flex-shrink-0 items-center justify-center gap-1 h-9 lg:h-10 px-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      title={sourceDate
        ? `TCMB kuru — ${new Date(sourceDate).toLocaleDateString('tr-TR')} (üstüne gelince durur)`
        : 'TCMB kuru'}
    >
      {/* Scrolling column (code + rate). overflow-hidden + fixed height
          clips everything except the row currently in the viewport. */}
      <div
        // min-w sized for the widest probable "CODE n,nnnn" pair so the
        // badge frame doesn't jitter as the rates rotate, but tight
        // enough that there's no dead space on the left.
        className="relative overflow-hidden w-[88px]"
        style={{ height: `${ROW_HEIGHT_PX}px` }}
      >
        <div
          className="absolute inset-x-0 top-0 flex flex-col"
          style={{
            transform: `translateY(-${offset * ROW_HEIGHT_PX}px)`,
            transition: withTransition ? `transform ${SLIDE_MS}ms ease-in-out` : 'none',
            willChange: 'transform',
          }}
        >
          {stack.map((r, i) => (
            <CurrencyRow key={`${r.currencyCode}-${i}`} rate={r} />
          ))}
        </div>
      </div>

      {/* Static TL suffix — material-symbols lira glyph, primary tinted,
          pinned to the right of the rotating column. */}
      <span className="material-symbols-outlined text-base text-primary leading-none flex-shrink-0">
        currency_lira
      </span>
    </div>
  );
}

function CurrencyRow({ rate }) {
  const formatted = Number(rate.rate).toLocaleString('tr-TR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  return (
    <span
      // Column is now sized to the widest row so we can left-align here
      // (no dead space to compensate for).
      className="flex items-center gap-2 text-xs text-text-main whitespace-nowrap"
      style={{ height: `${ROW_HEIGHT_PX}px` }}
    >
      <span className="font-semibold text-text-secondary">{rate.currencyCode}</span>
      <span className="font-mono text-text-main">{formatted}</span>
    </span>
  );
}
