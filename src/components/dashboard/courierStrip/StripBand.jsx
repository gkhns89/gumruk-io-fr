import { useEffect, useState } from 'react';
import { getTrackingStatus } from '../../../utils/constants';
import { t } from '../../../locales';
import { countdownText, formatDistance, progressOf } from './stripModel';

/**
 * Şeridin kapalıyken görünen yüzü: tek satır bilgi + altında yol çizgisi ve üstünde soldan sağa
 * ilerleyen araç (todo 19 üstüne, 21.09.2026).
 *
 * Saniyelik sayaç **yalnızca bu bileşende** döner. Şeridin tamamı ya da çekmece saniyede bir
 * yeniden çizilmez; kalkış geri sayımı ve kalkış oranı zamana bağlı olduğu için burada tutulur.
 *
 * İlerleme oranı bir CSS değişkeni olarak verilir (`--courier-strip-progress`); aracın kayması ve
 * yolun dolması CSS'te, `prefers-reduced-motion`'da geçişsiz (bkz. index.css `.courier-strip*`).
 *
 * @param {Object|null} item - stripModel'in ürettiği şerit öğesi
 * @param {boolean} isSpotlight - canlı okuma nedeniyle sıraya girmiş öğe mi
 * @param {boolean} loading
 */
export default function StripBand({ item, isSpotlight = false, loading = false, emptyText }) {
  // Sayaç yalnızca zamana bağlı bir öğe varken döner: canlı satırda saniyelik tik yok.
  const ticking = Boolean(item && item.kind !== 'live' && item.departsAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  if (loading) {
    return (
      <span className="flex items-center gap-3 w-full animate-pulse">
        <span className="block h-8 w-8 rounded-full bg-blue-200/60 dark:bg-blue-700/40 flex-shrink-0" />
        <span className="block flex-1 space-y-1.5">
          <span className="block h-3.5 w-1/3 rounded bg-blue-200/60 dark:bg-blue-700/40" />
          <span className="block h-2.5 w-1/4 rounded bg-blue-200/40 dark:bg-blue-700/30" />
        </span>
      </span>
    );
  }

  if (!item) {
    return (
      <span className="flex items-center gap-2 w-full text-text-secondary">
        <span className="material-symbols-outlined text-xl">two_wheeler</span>
        <span className="block text-xs">{emptyText}</span>
      </span>
    );
  }

  const live = item.kind === 'live';
  const progress = progressOf(item, now);
  const countdown = live ? null : countdownText(item.departsAt, now);
  const status = live ? getTrackingStatus(item.status) : null;

  return (
    <span className="block w-full">
      <span className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <span
          className={`material-symbols-outlined text-xl sm:text-2xl flex-shrink-0 ${
            live ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
          }`}
        >
          {item.icon}
        </span>

        <span className="block min-w-0 flex-1 text-left">
          <span className="block text-sm font-semibold text-text-main truncate leading-tight">{item.title}</span>
          {item.subtitle && (
            <span className="block text-[11px] text-text-secondary truncate leading-tight mt-0.5">{item.subtitle}</span>
          )}
        </span>

        <span className="flex items-center gap-1.5 flex-shrink-0">
          {/* Canlı okuma nedeniyle sıraya girmiş satır: kullanıcı neden görünümün değiştiğini
              anlasın diye ayrıca işaretlenir. */}
          {isSpotlight && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>bolt</span>
              {t('dashboard.courierStrip.freshReading')}
            </span>
          )}

          {live && typeof item.distanceMeters === 'number' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 tabular-nums">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>straighten</span>
              {formatDistance(item.distanceMeters)}
            </span>
          )}

          {live && status && (
            <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.badgeClass}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{status.icon}</span>
              {status.label}
            </span>
          )}

          {countdown && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 tabular-nums">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
              {countdown}
            </span>
          )}
        </span>
      </span>

      {/* Yol: dolu kısım + aracın kendisi. Oran yoksa (uydurulamıyorsa) yol hiç çizilmez —
          yanlış bir ilerleme göstermektense hiç göstermemek. */}
      {progress !== null && (
        <span
          className={`courier-strip__rail ${live ? 'courier-strip__rail--live' : ''}`}
          style={{ '--courier-strip-progress': progress }}
          aria-hidden="true"
        >
          <span className="courier-strip__rail-fill" />
          <span className="courier-strip__vehicle">
            <span className="material-symbols-outlined">{item.icon}</span>
          </span>
        </span>
      )}
    </span>
  );
}
