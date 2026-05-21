import React, { useState, useEffect, useRef } from 'react';
import { courierService } from '../../api/courierService';
import { companyService } from '../../api/companyService';
import { useAuth } from '../../hooks/useAuth';

/**
 * Kurye Takip Kartı (Dashboard)
 * Compact sol panel (geri sayım) + genişletilebilir sağ panel (detaylar)
 *
 * Görünürlük: SUPER_ADMIN, BROKER_ADMIN, BROKER_USER
 */
export default function CourierTrackingCard({ expanded = false, onToggleExpand, isLargeScreen = false }) {
  const { user } = useAuth();
  const [courierData, setCourierData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdownDisplay, setCountdownDisplay] = useState({ main: '', seconds: null, refreshing: false });
  const isRefreshingRef = useRef(false);
  const retryCountRef = useRef(0);

  const canViewCourier = ['SUPER_ADMIN', 'BROKER_ADMIN', 'BROKER_USER'].includes(user?.globalRole);
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';

  const [brokers, setBrokers] = useState([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [selectedBrokerId, setSelectedBrokerId] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) return;
    setBrokersLoading(true);
    companyService.getAllBrokerCompanies()
      .then(result => {
        if (result.success) setBrokers(result.data || []);
      })
      .finally(() => setBrokersLoading(false));
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!canViewCourier) return;
    if (isSuperAdmin && !selectedBrokerId) {
      setLoading(false);
      setCourierData(null);
      return;
    }

    const brokerIdParam = isSuperAdmin ? Number(selectedBrokerId) : null;

    setLoading(true);
    retryCountRef.current = 0;
    isRefreshingRef.current = false;

    const fetchCourierData = async () => {
      try {
        const result = await courierService.getNextDepartures(brokerIdParam);
        if (result.success && result.data) {
          setCourierData(result.data);
        } else {
          setCourierData(null);
        }
      } catch (err) {
        console.error('Kurye verileri yüklenemedi:', err);
        setCourierData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCourierData();
  }, [canViewCourier, isSuperAdmin, selectedBrokerId]);

  useEffect(() => {
    if (!courierData?.nextDepartures?.length) return;

    const updateCountdown = () => {
      const now = new Date();
      const firstDeparture = courierData.nextDepartures[0];
      const backendTime = new Date(courierData.calculatedAt);
      const totalInitialSeconds = firstDeparture.secondsUntilDeparture;
      const elapsedMs = now - backendTime;
      const elapsedTotalSeconds = Math.floor(elapsedMs / 1000);
      const remainingTotalSeconds = totalInitialSeconds - elapsedTotalSeconds;

      if (remainingTotalSeconds <= 0) {
        if (!isRefreshingRef.current && retryCountRef.current < 2) {
          isRefreshingRef.current = true;
          retryCountRef.current += 1;
          setCountdownDisplay({ main: '', seconds: null, refreshing: true });

          const brokerIdParam = isSuperAdmin ? Number(selectedBrokerId) : null;

          setTimeout(async () => {
            try {
              const result = await courierService.getNextDepartures(brokerIdParam);
              if (result.success && result.data) {
                if (result.data.nextDepartures && result.data.nextDepartures.length > 0) {
                  retryCountRef.current = 0;
                }
                setCourierData(result.data);
              }
            } catch (err) {
              console.error('Kurye verileri güncellenemedi:', err);
            } finally {
              isRefreshingRef.current = false;
            }
          }, 2000);
        } else if (retryCountRef.current >= 2) {
          setCourierData({ nextDepartures: [] });
        }
        return;
      }

      const days = Math.floor(remainingTotalSeconds / (24 * 3600));
      const hours = Math.floor((remainingTotalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((remainingTotalSeconds % 3600) / 60);
      const seconds = remainingTotalSeconds % 60;

      const mainParts = [];
      if (days > 0) mainParts.push(`${days} gün`);
      if (hours > 0) mainParts.push(`${hours} saat`);
      if (minutes > 0) mainParts.push(`${minutes} dk`);

      setCountdownDisplay({ main: mainParts.join(' '), seconds, refreshing: false });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [courierData]);

  if (!canViewCourier) return null;


  // Yardımcı fonksiyonlar — her zaman tanımlanır (erken return yok)
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const getDayName = (secondsUntil) => {
    const now = new Date();
    const targetDate = new Date(now.getTime() + secondsUntil * 1000);
    const isSameDay =
      now.getDate() === targetDate.getDate() &&
      now.getMonth() === targetDate.getMonth() &&
      now.getFullYear() === targetDate.getFullYear();
    if (isSameDay) return 'Bugün';
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      tomorrow.getDate() === targetDate.getDate() &&
      tomorrow.getMonth() === targetDate.getMonth() &&
      tomorrow.getFullYear() === targetDate.getFullYear();
    if (isTomorrow) return 'Yarın';
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return dayNames[targetDate.getDay()];
  };

  const formatDepartureTime = (departure) => {
    const dayName = getDayName(departure.secondsUntilDeparture);
    const time = formatTime(departure.departureTime);
    return `${dayName} ${time}`;
  };

  const hasDepartures = !loading && courierData?.nextDepartures?.length > 0;
  const primaryDeparture = hasDepartures ? courierData.nextDepartures[0] : null;
  const hasMultipleCouriers = hasDepartures && courierData.nextDepartures.length > 1;

  const groupedByCourier = hasDepartures
    ? courierData.nextDepartures.reduce((acc, departure) => {
        const key = departure.courierCompanyName;
        if (!acc[key]) acc[key] = [];
        acc[key].push(departure);
        return acc;
      }, {})
    : {};

  const expandIcon = expanded
    ? (isLargeScreen ? 'chevron_right' : 'expand_less')
    : (isLargeScreen ? 'chevron_left' : 'expand_more');

  // Sol panel içerik bölgesi
  const renderLeftContent = () => {
    if (loading) {
      return (
        <div className="space-y-2 animate-pulse">
          <div className="h-5 bg-blue-200/60 dark:bg-blue-700/40 rounded w-3/4" />
          <div className="h-3 bg-blue-200/40 dark:bg-blue-700/30 rounded w-1/2" />
          <div className="h-3 bg-blue-200/40 dark:bg-blue-700/30 rounded w-2/3 mt-1" />
        </div>
      );
    }

    if (isSuperAdmin && !selectedBrokerId) {
      return (
        <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400">
          <span className="material-symbols-outlined text-base">info</span>
          <p className="text-xs">Detaylar bölümünden firma seçin</p>
        </div>
      );
    }

    if (!hasDepartures) {
      return (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-base">two_wheeler</span>
          <p className="text-xs">Planlanmış kurye bulunmuyor</p>
        </div>
      );
    }

    return (
      <>
        {/* Çakışma uyarısı */}
        {hasMultipleCouriers && (
          <div className="mb-2 p-2 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-r-lg">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-base">warning</span>
              <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">
                {courierData.nextDepartures.length} kurye aynı saatte!
              </p>
            </div>
          </div>
        )}

        {/* Geri sayım */}
        {countdownDisplay.refreshing ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">Güncelleniyor...</p>
        ) : countdownDisplay.seconds !== null ? (
          <>
            {countdownDisplay.main && (
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 leading-tight">
                {countdownDisplay.main}
              </p>
            )}
            <p className={`font-semibold text-blue-500 dark:text-blue-400/80 leading-tight ${countdownDisplay.main ? 'text-sm mt-0.5' : 'text-2xl font-bold'}`}>
              {countdownDisplay.seconds} saniye
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">Hesaplanıyor...</p>
        )}

        {/* Kalkış zamanı */}
        <div className="flex items-center gap-1 mt-1.5">
          <span className="material-symbols-outlined text-xs text-gray-500 dark:text-gray-400">schedule</span>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {formatDepartureTime(primaryDeparture)}
          </p>
        </div>

        {/* Gidilecek konumlar */}
        <div className="mt-2 space-y-0.5">
          {courierData.nextDepartures.map((d, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 flex-shrink-0" style={{ fontSize: '13px' }}>location_on</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{d.customsName}</p>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700 shadow-md overflow-hidden h-full flex flex-col lg:flex-row">

      {/* Sol panel — yapısı her zaman aynı, yükseklik değişmez */}
      <div className="flex flex-col p-4 lg:p-5 flex-1 min-w-0">
        {/* Başlık */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">two_wheeler</span>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Kurye Takip</h3>
          </div>
          {hasDepartures && courierData.totalActiveCouriers > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-full flex-shrink-0">
              {courierData.totalActiveCouriers} Kayıtlı
            </span>
          )}
        </div>

        {/* İçerik — koşula göre değişir ama flex-1 ile alana yayılır */}
        <div className="flex-1 flex flex-col justify-start pt-1 min-h-0">
          {renderLeftContent()}
        </div>

        {/* Genişlet / Kapat butonu */}
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="mt-3 self-start flex items-center gap-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-sm">{expandIcon}</span>
            {expanded ? 'Kapat' : 'Detaylar'}
          </button>
        )}
      </div>

      {/* Sağ panel — genişletilebilir detaylar */}
      <div
        className="overflow-hidden border-t lg:border-t-0 lg:border-l border-blue-200 dark:border-blue-700"
        style={
          isLargeScreen
            ? { width: expanded ? '240px' : '0px', transition: 'width 400ms ease-in-out', flexShrink: 0 }
            : { maxHeight: expanded ? '500px' : '0px', transition: 'max-height 400ms ease-in-out' }
        }
      >
        <div className="p-4 min-w-[220px] space-y-3 overflow-y-auto h-full">

          {/* SUPER_ADMIN: Broker seçici sağ panelde */}
          {isSuperAdmin && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                Gümrük Firması
              </p>
              <select
                value={selectedBrokerId}
                onChange={(e) => setSelectedBrokerId(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={brokersLoading}
              >
                <option value="">-- Firma seçin --</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Kurye firmaları */}
          {hasDepartures && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                Firmalar
              </p>
              <div className="space-y-2">
                {Object.entries(groupedByCourier).map(([courierName, departures], idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-blue-200 dark:border-blue-600/30"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">two_wheeler</span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{courierName}</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-base mt-0.5">location_on</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {departures.map(d => d.customsName).join(' | ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sonraki kurye */}
          {hasDepartures && courierData.upcomingDeparture && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                Sonraki Kurye
              </p>
              <div className="bg-white dark:bg-gray-800/30 rounded-lg p-3 border border-blue-200 dark:border-blue-600/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-base">schedule</span>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatDepartureTime(courierData.upcomingDeparture)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-sm">location_on</span>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {courierData.upcomingDeparture.customsName}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">two_wheeler</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {courierData.upcomingDeparture.courierCompanyName}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
