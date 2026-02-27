import React, { useState, useEffect, useRef } from 'react';
import { courierService } from '../../api/courierService';
import { useAuth } from '../../hooks/useAuth';

/**
 * Kurye Takip Kartı (Dashboard)
 * Bir sonraki kurye kalkış saatini ve geri sayımı gösterir
 *
 * Görünürlük: SUPER_ADMIN, BROKER_ADMIN, BROKER_USER
 * CLIENT_USER bu kartı hiç görmez
 */
export default function CourierTrackingCard() {
  const { user } = useAuth();
  const [courierData, setCourierData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');
  const isRefreshingRef = useRef(false);
  const retryCountRef = useRef(0);

  // CLIENT_USER kontrolü
  const canViewCourier = ['SUPER_ADMIN', 'BROKER_ADMIN', 'BROKER_USER'].includes(user?.globalRole);

  // API'den kurye verilerini çek - SADECE component mount olduğunda
  useEffect(() => {
    if (!canViewCourier) return;

    const fetchCourierData = async () => {
      try {
        const result = await courierService.getNextDepartures();
        if (result.success && result.data) {
          setCourierData(result.data);
        }
      } catch (err) {
        console.error('Kurye verileri yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourierData();
  }, [canViewCourier]);

  // Countdown timer - her saniye client-side hesaplama
  useEffect(() => {
    if (!courierData?.nextDepartures?.length) return;

    const updateCountdown = () => {
      const now = new Date();
      const firstDeparture = courierData.nextDepartures[0];

      // Backend'den gelen calculatedAt zamanını referans al
      const backendTime = new Date(courierData.calculatedAt);

      // Backend'in hesapladığı saniye değerini al
      const totalInitialSeconds = firstDeparture.secondsUntilDeparture;

      // Şu ana kadar geçen süreyi saniye cinsinden hesapla
      const elapsedMs = now - backendTime;
      const elapsedTotalSeconds = Math.floor(elapsedMs / 1000);

      // Kalan toplam saniyeyi hesapla
      const remainingTotalSeconds = totalInitialSeconds - elapsedTotalSeconds;

      if (remainingTotalSeconds <= 0) {
        // Saat geçti - API'den yeni veriyi çek (maksimum 2 kere deneme)
        if (!isRefreshingRef.current && retryCountRef.current < 2) {
          isRefreshingRef.current = true;
          retryCountRef.current += 1;
          setCountdown('Güncelleniyor...');

          setTimeout(async () => {
            try {
              const result = await courierService.getNextDepartures();
              if (result.success && result.data) {
                // Yeni data varsa retry sayacını sıfırla
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
          // Maksimum deneme sayısına ulaşıldı, kartı gizle
          setCourierData({ nextDepartures: [] });
        }
        return;
      }

      // Gün, saat, dakika, saniye hesapla
      const days = Math.floor(remainingTotalSeconds / (24 * 3600));
      const hours = Math.floor((remainingTotalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((remainingTotalSeconds % 3600) / 60);
      const seconds = remainingTotalSeconds % 60;

      // Dinamik format (0 olanları gizle)
      let countdownText = '';

      if (days > 0) {
        // Gün varsa: "2 gün 12 saat 30 dakika 45 saniye" formatı
        countdownText = `${days} gün`;
        if (hours > 0) {
          countdownText += ` ${hours} saat`;
        }
        if (minutes > 0) {
          countdownText += ` ${minutes} dakika`;
        }
        if (seconds > 0) {
          countdownText += ` ${seconds} saniye`;
        }
      } else if (hours > 0) {
        // Sadece saat varsa: "5 saat 30 dakika 45 saniye" formatı
        countdownText = `${hours} saat`;
        if (minutes > 0) {
          countdownText += ` ${minutes} dakika`;
        }
        if (seconds > 0) {
          countdownText += ` ${seconds} saniye`;
        }
      } else if (minutes > 0) {
        // Sadece dakika varsa: "30 dakika 45 saniye" formatı
        countdownText = `${minutes} dakika`;
        if (seconds > 0) {
          countdownText += ` ${seconds} saniye`;
        }
      } else {
        // Sadece saniye varsa: "45 saniye" formatı
        countdownText = `${seconds} saniye`;
      }

      setCountdown(countdownText);
    };

    // İlk countdown'u hemen hesapla
    updateCountdown();

    // Her saniye güncelle
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [courierData]);

  // CLIENT_USER hiç görmez
  if (!canViewCourier) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-40 border border-gray-200 dark:border-gray-700" />
    );
  }

  // Kurye yok
  if (!courierData?.nextDepartures?.length) {
    return (
      <div className="bg-white dark:bg-background-dark rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-3xl">local_shipping</span>
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

  // Helper: Format time (HH:mm:ss -> HH:mm)
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  // Helper: Get day info based on seconds
  const getDayInfo = (secondsUntil) => {
    const hours = secondsUntil / 3600;

    if (hours < 24) {
      return 'Bugün';
    } else if (hours < 48) {
      return 'Yarın';
    } else {
      const days = Math.floor(hours / 24);
      return `${days} gün sonra`;
    }
  };

  const dayInfo = getDayInfo(primaryDeparture.secondsUntilDeparture);
  const showDayInfo = primaryDeparture.secondsUntilDeparture >= 3600 * 24; // 24 saatten fazlaysa göster

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700 shadow-md hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">
            local_shipping
          </span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Kurye Takip
          </h3>
        </div>
        {courierData.totalActiveCouriers > 0 && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-full">
            {courierData.totalActiveCouriers} Kayıtlı
          </span>
        )}
      </div>

      {/* Çakışma Uyarısı */}
      {hasMultipleCouriers && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-r-lg">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-xl">
              warning
            </span>
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              DİKKAT: {courierData.nextDepartures.length} kurye aynı saatte kalkıyor!
            </p>
          </div>
        </div>
      )}

      {/* Ana İçerik: Countdown ve Upcoming Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 pb-4 border-b border-blue-200 dark:border-blue-700">
        {/* Sol: Şu Anki Kurye - Countdown */}
        <div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {countdown || 'Hesaplanıyor...'}
          </p>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-gray-600 dark:text-gray-400">
              schedule
            </span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Kalkış Saati: <span className="font-semibold">{formatTime(primaryDeparture.departureTime)}</span>
              {showDayInfo && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                  {dayInfo}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Sağ: Bir Sonraki Kurye Preview */}
        {courierData.upcomingDeparture && (
          <div className="bg-white dark:bg-gray-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-600/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Sonraki Kurye:</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-lg">
                schedule
              </span>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatTime(courierData.upcomingDeparture.departureTime)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-gray-500 text-sm">
                location_on
              </span>
              <p className="text-gray-700 dark:text-gray-300">
                {courierData.upcomingDeparture.customsName}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {courierData.upcomingDeparture.courierCompanyName}
            </p>
          </div>
        )}
      </div>

      {/* Courier Cards - Her kurye için ayrı kart */}
      <div className="space-y-3">
        {courierData.nextDepartures.map((departure, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-blue-200 dark:border-blue-600/30 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Kurye Firması */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">
                    local_shipping
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {departure.courierCompanyName}
                  </p>
                </div>

                {/* Gümrük Konumu */}
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-lg">
                    location_on
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {departure.customsName}
                  </p>
                </div>
              </div>

              {/* Badge - İlk kurye için "Ana" göster */}
              {idx === 0 && hasMultipleCouriers && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded whitespace-nowrap">
                  Ana
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
