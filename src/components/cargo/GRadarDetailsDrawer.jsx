import { useState, useEffect, useCallback } from 'react';
import { shipsGoService } from '../../api/shipsGoService';
import { showSuccess, showError } from '../../utils/toastUtils';
import CargoMap from './CargoMap';

/**
 * Slide-in panel that shows the live ShipsGo data for a single cargo.
 *
 * Reads everything from the cached GET /api/shipsgo/cargo/{id}/details so
 * opening the drawer never costs a credit. The "Yenile" button hits POST
 * /refresh which is also free — it just asks the backend to re-pull from
 * ShipsGo right now instead of waiting for the next sync cycle.
 *
 * Open / close is driven by the parent via the `cargo` prop: passing null
 * closes (with the slide-out animation falling through naturally).
 */
export default function ShipsGoDetailsDrawer({
  cargo,
  onClose,
  canRefresh = true,
}) {
  const isOpen = !!cargo;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (cargoId) => {
    if (!cargoId) return;
    setLoading(true);
    const res = await shipsGoService.getCargoDetails(cargoId);
    setLoading(false);
    if (res.success) {
      setDetails(res.data);
    } else {
      setDetails(null);
      showError(res.error || 'ShipsGo bilgileri alınamadı');
    }
  }, []);

  useEffect(() => {
    if (cargo?.id) {
      load(cargo.id);
    } else {
      setDetails(null);
    }
  }, [cargo?.id, load]);

  // ESC closes the drawer (matches the surrounding modal pattern)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleRefresh = async () => {
    if (!cargo?.id) return;
    setRefreshing(true);
    const res = await shipsGoService.refresh(cargo.id);
    setRefreshing(false);
    if (res.success) {
      showSuccess('ShipsGo verileri yenilendi');
      load(cargo.id);
    } else {
      showError(res.error || 'Yenileme başarısız');
    }
  };

  const movements = (() => {
    if (!details?.routeJson) return [];
    try {
      const parsed = JSON.parse(details.routeJson);
      const list = parsed?.movements || [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[560px] lg:w-[640px] bg-white dark:bg-background-dark shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-2xl">travel_explore</span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-main truncate">ShipsGo Detayı</h3>
              <p className="text-xs text-text-secondary truncate">
                {details?.identifier || '—'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !details ? (
            <p className="text-center text-text-secondary text-sm py-10 px-5">
              ShipsGo bilgisi bulunamadı.
            </p>
          ) : !details.shipsGoEnabled ? (
            <p className="text-center text-text-secondary text-sm py-10 px-5">
              Bu yük için ShipsGo entegrasyonu açık değil.
            </p>
          ) : !details.shipsGoTrackingId ? (
            <div className="m-5 rounded-xl border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                ShipsGo bu yük için açık ancak henüz veri çekilmedi.
                Liste üzerinde "Bilgileri Getir" butonunu kullanın.
              </p>
            </div>
          ) : (
            <>
              {/* Map — full width, sits above the data so it dominates the
                  first impression (marketing screenshots, primary CTA). */}
              <CargoMap
                geoJson={details.geoJson}
                vehicleType={details.vehicleType}
                height={320}
              />

              <div className="p-5 space-y-4">
              {/* Completed-archive banner — for COMPLETED cargo the sync is
                  frozen; we surface this once at the top so the user knows
                  the rest of the panel is a snapshot, not live data. */}
              {details.status === 'COMPLETED' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-lg flex-shrink-0">history</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Tamamlanmış yük — geçmiş ShipsGo verisi
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      ShipsGo bu yük için senkronu durdurdu. Aşağıdakiler son senkronlanan kayıttır; yeni güncelleme alınmaz.
                    </p>
                  </div>
                </div>
              )}

              {/* Status header */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-text-secondary uppercase tracking-wide">ShipsGo Durumu</p>
                    <p className="text-xl font-bold text-text-main">
                      {details.shipsGoStatus || '—'}
                    </p>
                  </div>
                  {details.lastSyncAt && (
                    <div className="text-right">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wide">Son Sync</p>
                      <p className="text-xs text-text-secondary">
                        {new Date(details.lastSyncAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Key facts grid */}
              <div className="grid grid-cols-2 gap-3">
                <Fact label="Gemi / Uçuş" value={details.vesselName} icon="directions_boat" />
                <Fact label="Taşıyıcı" value={details.shipsGoCarrier} icon="local_shipping" />
                <Fact label="Mevcut Konum" value={details.currentLocation} icon="my_location" full />
                <Fact
                  label="ETA"
                  value={details.estimatedArrivalDate
                    ? new Date(details.estimatedArrivalDate).toLocaleDateString('tr-TR')
                    : null}
                  icon="event"
                  highlight
                />
                <Fact
                  label="Varış"
                  value={details.cargoArrivalDate
                    ? new Date(details.cargoArrivalDate).toLocaleDateString('tr-TR')
                    : null}
                  icon="task_alt"
                />
              </div>

              {/* Override notice */}
              {details.manuallyOverriddenFields?.length > 0 && (
                <div className="rounded-xl border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">lock</span>
                    <span>
                      Manuel girilen alanlar (ShipsGo güncellemiyor):
                      {' '}
                      <strong>{details.manuallyOverriddenFields.map(humanFieldName).join(', ')}</strong>
                    </span>
                  </p>
                </div>
              )}

              {/* Movements timeline */}
              {movements.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-main mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">timeline</span>
                    Hareketler
                  </h4>
                  <div className="space-y-2">
                    {movements.slice().reverse().map((mv, idx) => (
                      <MovementRow key={idx} movement={mv} />
                    ))}
                  </div>
                </div>
              )}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center justify-between bg-gray-50/60 dark:bg-gray-900/40">
          <p className="text-[11px] text-text-secondary">
            {details?.status === 'COMPLETED'
              ? 'Tamamlanmış yüklerde ShipsGo senkronu durur.'
              : 'Yenileme ücretsizdir — kredi tüketmez.'}
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing || !canRefresh || !details?.shipsGoTrackingId || details?.status === 'COMPLETED'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main hover:bg-primary/10 hover:border-primary/40 hover:text-primary dark:hover:bg-primary/20 dark:hover:border-primary/60 dark:hover:text-primary transition-colors disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:text-text-main disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600"
          >
            <span className={`material-symbols-outlined text-base ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            {refreshing ? 'Yenileniyor...' : 'Yenile'}
          </button>
        </div>
      </aside>
    </>
  );
}

function Fact({ label, value, icon, highlight, full }) {
  return (
    <div className={`${full ? 'col-span-2' : ''} rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && (
          <span className="material-symbols-outlined text-sm text-text-secondary">{icon}</span>
        )}
        <span className="text-[10px] text-text-secondary uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-sm font-medium break-words ${highlight ? 'text-primary' : 'text-text-main'}`}>
        {value || '—'}
      </p>
    </div>
  );
}

function MovementRow({ movement }) {
  const ts = movement?.timestamp || movement?.date || movement?.event_date;
  const event = movement?.event || movement?.status;
  const location = movement?.location;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
      <span className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-main truncate">{event || 'Hareket'}</p>
        {location && (
          <p className="text-xs text-text-secondary truncate">{location}</p>
        )}
      </div>
      {ts && (
        <p className="text-xs text-text-secondary whitespace-nowrap">
          {new Date(ts).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      )}
    </div>
  );
}

function humanFieldName(field) {
  const labels = {
    estimatedArrivalDate: 'Tahmini Varış',
    cargoArrivalDate: 'Varış Tarihi',
    vesselName: 'Gemi/Uçuş',
    currentLocation: 'Mevcut Konum',
    shipsGoStatus: 'Durum',
    shipsGoCarrier: 'Taşıyıcı',
    shipsGoRouteJson: 'Rota',
  };
  return labels[field] || field;
}
