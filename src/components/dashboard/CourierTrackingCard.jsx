import React, { useState, useEffect, useRef } from 'react';
import { courierService } from '../../api/courierService';
import { companyService } from '../../api/companyService';
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
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';

  // SUPER_ADMIN: broker seçimi
  const [brokers, setBrokers] = useState([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [selectedBrokerId, setSelectedBrokerId] = useState('');

  // SUPER_ADMIN için broker listesini yükle
  useEffect(() => {
    if (!isSuperAdmin) return;
    setBrokersLoading(true);
    companyService.getAllBrokerCompanies()
      .then(result => {
        if (result.success) setBrokers(result.data || []);
      })
      .finally(() => setBrokersLoading(false));
  }, [isSuperAdmin]);

  // Kurye verilerini çek
  // - SUPER_ADMIN: sadece broker seçilince çek
  // - Diğerleri: mount'ta otomatik çek
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

  // Broker seçim combobox'ı (sadece SUPER_ADMIN)
  const BrokerSelector = () => (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        Gümrük Firması
      </label>
      <select
        value={selectedBrokerId}
        onChange={(e) => setSelectedBrokerId(e.target.value)}
        className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        disabled={brokersLoading}
      >
        <option value="">-- Firma seçin --</option>
        {brokers.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-40 border border-gray-200 dark:border-gray-700" />
    );
  }

  // SUPER_ADMIN: henüz firma seçmedi
  if (isSuperAdmin && !selectedBrokerId) {
    return (
      <div className="bg-white dark:bg-background-dark rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">two_wheeler</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Kurye Takip</h3>
        </div>
        <BrokerSelector />
        <p className="text-xs text-gray-400 dark:text-gray-500">Kurye bilgilerini görmek için gümrük firması seçin.</p>
      </div>
    );
  }

  // Kurye yok
  if (!courierData?.nextDepartures?.length) {
    return (
      <div className="bg-white dark:bg-background-dark rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        {isSuperAdmin && <BrokerSelector />}
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
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

  // Helper: Format time (HH:mm:ss -> HH:mm)
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  // Helper: Get day name based on seconds until departure
  const getDayName = (secondsUntil) => {
    const now = new Date();
    const targetDate = new Date(now.getTime() + secondsUntil * 1000);

    // Bugün mü kontrol et (aynı takvim günü)
    const isSameDay = now.getDate() === targetDate.getDate() &&
                      now.getMonth() === targetDate.getMonth() &&
                      now.getFullYear() === targetDate.getFullYear();

    if (isSameDay) {
      return 'Bugün';
    }

    // Yarın mı kontrol et
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isTomorrow = tomorrow.getDate() === targetDate.getDate() &&
                       tomorrow.getMonth() === targetDate.getMonth() &&
                       tomorrow.getFullYear() === targetDate.getFullYear();

    if (isTomorrow) {
      return 'Yarın';
    }

    // Diğer günler için gün adını döndür
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return dayNames[targetDate.getDay()];
  };

  // Helper: Format departure time with day
  const formatDepartureTime = (departure) => {
    const dayName = getDayName(departure.secondsUntilDeparture);
    const time = formatTime(departure.departureTime);
    return `${dayName} ${time}`;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700 shadow-md hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">
            two_wheeler
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

      {/* SUPER_ADMIN: Firma seçici */}
      {isSuperAdmin && <BrokerSelector />}

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

      {/* Ana İçerik: Countdown */}
      <div className="mb-4 pb-4 border-b border-blue-200 dark:border-blue-700">
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
          {countdown || 'Hesaplanıyor...'}
        </p>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-gray-600 dark:text-gray-400">
            schedule
          </span>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Kalkış Zamanı: <span className="font-semibold">{formatDepartureTime(primaryDeparture)}</span>
          </p>
        </div>
      </div>

      {/* Courier Cards - Kurye firmasına göre gruplanmış */}
      <div className="space-y-3">
        {(() => {
          // Kurye firmasına göre grupla
          const groupedByCourier = courierData.nextDepartures.reduce((acc, departure) => {
            const key = departure.courierCompanyName;
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(departure);
            return acc;
          }, {});

          return Object.entries(groupedByCourier).map(([courierName, departures], idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-blue-200 dark:border-blue-600/30 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all"
            >
              {/* Kurye Firması Başlığı */}
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">
                  two_wheeler
                </span>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {courierName}
                </p>
              </div>

              {/* Gümrükler - Tek satırda | ile ayrılmış */}
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-lg mt-0.5">
                  location_on
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {departures.map(d => d.customsName).join(' | ')}
                </p>
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Sonraki Kurye Preview - En Altta (Mobil için) */}
      {courierData.upcomingDeparture && (
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">Sonraki Kurye:</p>
          <div className="bg-white dark:bg-gray-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-600/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-lg">
                schedule
              </span>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatDepartureTime(courierData.upcomingDeparture)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="material-symbols-outlined text-gray-500 text-sm">
                location_on
              </span>
              <p className="text-gray-700 dark:text-gray-300">
                {courierData.upcomingDeparture.customsName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">
                two_wheeler
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {courierData.upcomingDeparture.courierCompanyName}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
