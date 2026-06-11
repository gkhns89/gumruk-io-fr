import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { shipsGoService } from '../../api/shipsGoService';
import { showSuccess, showError } from '../../utils/toastUtils';

/**
 * Header bell + popover that lists every PENDING ShipsGo enable request for
 * the current broker. Visible only to BROKER_ADMIN and SUPER_ADMIN.
 *
 * Behaviour:
 *  - Polls /pending-requests every 60s while mounted so the badge stays
 *    fresh even when the user is on an unrelated page. Lightweight payload
 *    (request count + minimal fields) so polling has near-zero cost.
 *  - Clicking the bell toggles the popover. Each request row carries
 *    requester info, cargo identifier, free-form note, and three actions:
 *    "Onayla", "Onayla + Bilgileri Getir (1 kredi)", "Reddet".
 *  - Reject reveals a reason input (required) before sending.
 *  - All actions trigger a reload so the popover and badge stay in sync.
 *  - Closing happens on outside-click or ESC.
 */
export default function ShipsGoRequestsBell() {
  const { user } = useAuth();
  const isEligible = user?.globalRole === 'BROKER_ADMIN' || user?.globalRole === 'SUPER_ADMIN';

  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actingId, setActingId] = useState(null);
  const wrapperRef = useRef(null);

  const load = useCallback(async () => {
    if (!isEligible) return;
    setLoading(true);
    const res = await shipsGoService.listPendingRequests();
    setLoading(false);
    if (res.success) {
      setRequests(res.data?.requests || []);
    }
  }, [isEligible]);

  // Initial load + periodic refresh
  useEffect(() => {
    if (!isEligible) return;
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [isEligible, load]);

  // Outside click + ESC close
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setRejectingId(null);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setRejectingId(null);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!isEligible) return null;

  const approve = async (id, fetchImmediately) => {
    setActingId(id);
    const res = await shipsGoService.approveRequest(id, { fetchImmediately });
    setActingId(null);
    if (res.success) {
      showSuccess(res.data?.message || 'Talep onaylandı');
      load();
    } else {
      showError(res.error);
    }
  };

  const reject = async (id) => {
    if (!rejectReason.trim()) {
      showError('Red gerekçesi zorunludur');
      return;
    }
    setActingId(id);
    const res = await shipsGoService.rejectRequest(id, rejectReason.trim());
    setActingId(null);
    if (res.success) {
      showSuccess('Talep reddedildi');
      setRejectingId(null);
      setRejectReason('');
      load();
    } else {
      showError(res.error);
    }
  };

  const count = requests.length;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="ShipsGo Talepleri"
        aria-label="ShipsGo Talepleri"
      >
        <span className="material-symbols-outlined text-text-secondary">travel_explore</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-[420px] max-h-[520px] overflow-y-auto bg-white dark:bg-background-dark rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-background-dark">
            <h3 className="font-semibold text-text-main text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">travel_explore</span>
              ShipsGo Talepleri
            </h3>
            <button
              onClick={load}
              disabled={loading}
              className="text-xs text-text-secondary hover:text-text-main disabled:opacity-50"
            >
              {loading ? 'Yenileniyor...' : 'Yenile'}
            </button>
          </div>

          {loading && requests.length === 0 ? (
            <p className="text-center text-text-secondary text-sm py-8">Yükleniyor...</p>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 px-4">
              <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-1 block">
                inbox
              </span>
              <p className="text-sm text-text-secondary">Bekleyen talep yok</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {requests.map((r) => (
                <div key={r.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-main truncate">
                        {r.cargoVehicleType === 'AIRPLANE' ? '✈️' : '🚢'} {r.cargoIdentifier || `Yük #${r.cargoId}`}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        {r.requestedByUsername || r.requestedByEmail || 'Bilinmeyen kullanıcı'}
                        {' · '}
                        {new Date(r.requestedAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  {r.notes && (
                    <p className="text-xs italic text-text-secondary border-l-2 border-primary/40 pl-2">
                      "{r.notes}"
                    </p>
                  )}
                  {rejectingId === r.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Red gerekçesi (zorunlu)"
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-main"
                        >
                          İptal
                        </button>
                        <button
                          onClick={() => reject(r.id)}
                          disabled={actingId === r.id}
                          className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50"
                        >
                          {actingId === r.id ? '...' : 'Reddet'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => approve(r.id, false)}
                        disabled={actingId === r.id}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                        title="Talebi onayla — ShipsGo aktif edilir ama bilgi çekilmez (kredi düşmez)"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        Onayla
                      </button>
                      <button
                        onClick={() => approve(r.id, true)}
                        disabled={actingId === r.id}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-primary hover:opacity-90 text-white rounded-lg font-medium disabled:opacity-50"
                        title="Talebi onayla ve hemen ShipsGo'dan bilgileri çek (1 kredi düşer)"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Onayla + Bilgileri Getir (1 kredi)
                      </button>
                      <button
                        onClick={() => setRejectingId(r.id)}
                        disabled={actingId === r.id}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                        Reddet
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
