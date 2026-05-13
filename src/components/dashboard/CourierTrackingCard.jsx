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
  const [countdown, setCountdown] = useState('');
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
          setCountdown('Güncelleniyor...');

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

      let countdownText = '';
      if (days > 0) {
        countdownText = `${days} gün`;
        if (hours > 0) countdownText += ` ${hours} saat`;
        if (minutes > 0) countdownText += ` ${minutes} dakika`;
        if (seconds > 0) countdownText += ` ${seconds} saniye`;
      } else if (hours > 0) {
        countdownText = `${hours} saat`;
        if (minutes > 0) countdownText += ` ${minutes} dakika`;
        if (seconds > 0) countdownText += ` ${seconds} saniye`;
      } else if (minutes > 0) {
        countdownText = `${minutes} dakika`;
        if (seconds > 0) countdownText += ` ${seconds} saniye`;
      } else {
        countdownText = `${seconds} saniye`;
      }

      setCountdown(countdownText);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [courierData]);

  if (!canViewCourier) return null;

  const BrokerSelector = () => (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        Gümrük Firması
      </label>
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
  );

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-full min-h-32 border border-gray-200 dark:border-gray-700" />
    );
  }

  if (isSuperAdmin && !selectedBrokerId) {
    return (
      <div className="bg-white dark:bg-background-dark rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">two_wheeler</span>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Kurye Takip</h3>
        </div>
        <BrokerSelector />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-auto">
          Kurye bilgilerini görmek için gümrük firması seçin.
        </p>
      </div>
    );
  }

  if (!courierData?.nextDepartures?.length) {
    return (
      <div className="bg-white dark:bg-background-dark rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm h-full flex flex-col">
        {isSuperAdmin && <BrokerSelector />}
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 flex-1">
          <span className="material-symbols-outlined text-3xl">two_wheeler</span>
          <div>
            <p className="text-sm font-medium">Kurye Takip</p>
            <p className="text-xs mt-1">Yakında planlanmış kurye bulunmuyor</p>
          </div>
        </div>
      </div>
    );
  }

  const primaryDeparture = courierData.nextDepartures[0];
  const hasMultipleCouriers = courierData.nextDepartures.length > 1;

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

  const groupedByCourier = courierData.nextDepartures.reduce((acc, departure) => {
    const key = departure.courierCompanyName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(departure);
    return acc;
  }, {});

  const expandIcon = expanded
    ? (isLargeScreen ? 'chevron_right' : 'expand_less')
    : (isLargeScreen ? 'chevron_left' : 'expand_more');

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700 shadow-md overflow-hidden h-full flex flex-col lg:flex-row">

      {/* Sol panel — her zaman görünür */}
      <div className="flex flex-col p-4 lg:p-5 flex-1 lg:flex-none min-w-0">
        {/* Başlık */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">two_wheeler</span>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Kurye Takip</h3>
          </div>
          {courierData.totalActiveCouriers > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-full">
              {courierData.totalActiveCouriers} Kayıtlı
            </span>
          )}
        </div>

        {isSuperAdmin && <BrokerSelector />}

        {/* Çakışma uyarısı */}
        {hasMultipleCouriers && (
          <div className="mb-2 p-2 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-r-lg">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-lg">warning</span>
              <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">
                {courierData.nextDepartures.length} kurye aynı saatte!
              </p>
            </div>
          </div>
        )}

        {/* Geri sayım */}
        <div className="flex-1 flex flex-col justify-center py-2">
          <p className="text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1 leading-tight">
            {countdown || 'Hesaplanıyor...'}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-gray-500 dark:text-gray-400">schedule</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Kalkış: <span className="font-semibold">{formatDepartureTime(primaryDeparture)}</span>
            </p>
          </div>
        </div>

        {/* Genişlet / Kapat butonu */}
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="mt-3 self-start flex items-center gap-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
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

          {/* Kurye firmaları */}
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

          {/* Sonraki kurye */}
          {courierData.upcomingDeparture && (
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
