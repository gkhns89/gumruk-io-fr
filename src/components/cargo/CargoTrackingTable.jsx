import { CARGO_STATUS, VEHICLE_TYPES, getCargoStatus, getDocumentDeliveryType } from '../../utils/constants';
import { useEdgeScroll } from '../../hooks/useEdgeScroll';
import { getCostBreakdown, calculateTotalCosts } from '../../utils/costsUtils';
import { gRadarStatusInfo } from '../../utils/gRadarLabels';
import { getCurrentLanguage } from '../../locales';

export default function CargoTrackingTable({
  cargo,
  loading,
  error,
  onRetry,
  canDelete,
  isReadOnly,
  onRowClick,
  onEdit,
  onDelete,
  selectedVehicleType = "",
  scrollHeight = null,
  onScroll = null,
  canManageGRadar = false,
  onGRadarFetch,
  onGRadarEnable,
  onGRadarRequest,
  onGRadarDetails,
  fetchingGRadar = {},
  enablingGRadar = {},
}) {
  const { containerRef: edgeScrollRef, scrollDirection } = useEdgeScroll({
    edgeZoneWidth: 25,
    scrollSpeed: 10,
  });

  // Dynamic column visibility based on vehicle type filter
  const getVisibleColumns = () => {
    const baseColumns = [
      "status",
      "vehicleType",
      "g-radar",
      "estimatedArrivalDate",
      "buyerCompany",
      "senderCompany",
      "containerCount",
      "weight",
      "costs",
      "paymentStatus",
      "carrier",
    ];

    const vehicleColumns = {
      "":         ["billOfLading", "licensePlate", "consignmentNumber", "containerNumbers"],
      "AIRPLANE": ["consignmentNumber"],
      "SHIP":     ["billOfLading", "containerNumbers"],
      "TRUCK":    ["licensePlate"],
    };

    return [
      ...baseColumns,
      ...(vehicleColumns[selectedVehicleType] || vehicleColumns[""]),
      "transportInfo",
      "documentReceiver",
      "documentDeliveryDate",
      "cargoArrivalDate",
      "actions",
    ];
  };

  const visibleColumns = getVisibleColumns();


  const handleBodyScroll = (e) => {
    const { scrollTop } = e.currentTarget;
    onScroll?.(scrollTop);
    window.dispatchEvent(new CustomEvent("innerTableScroll", { detail: { scrollTop } }));
  };

  // Status-based row background (border goes on first TD)
  const getRowBgClass = (cargoItem) => {
    const statusInfo = getCargoStatus(cargoItem.status);
    const bgClass = cargoItem.status === 'COMPLETED' ? statusInfo?.bgClass : '';
    return `${bgClass} hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer`;
  };

  const getFirstCellBorderClass = (cargoItem) => {
    const statusInfo = getCargoStatus(cargoItem.status);
    return `border-l-4 ${statusInfo?.borderClass}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white dark:bg-background-dark p-8 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-text-secondary dark:text-gray-400">Yükler yükleniyor...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white dark:bg-background-dark p-8 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <span className="material-symbols-outlined text-6xl text-red-500">error</span>
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Bir Hata Oluştu</p>
          <p className="text-text-secondary dark:text-gray-400 text-sm mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">refresh</span>
                Tekrar Dene
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!cargo || cargo.length === 0) {
    return (
      <div className="bg-white dark:bg-background-dark p-8 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <span className="material-symbols-outlined text-6xl text-text-secondary">inventory_2</span>
        <div className="text-center">
          <p className="text-text-main dark:text-gray-100 font-semibold mb-2">Yük Bulunamadı</p>
          <p className="text-text-secondary dark:text-gray-400 text-sm">
            Henüz yük kaydı oluşturulmamış. Yeni yük eklemek için "Yeni Yük Ekle" butonunu kullanın.
          </p>
        </div>
      </div>
    );
  }

  const handleRowClick = (e, cargoItem) => {
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;
    if (window.getSelection().toString().length > 0) return;
    if (onRowClick) onRowClick(cargoItem);
  };

  // ── Success state ──────────────────────────────────────────────
  return (
    <div
      className="bg-white dark:bg-background-dark transition-colors duration-300 relative"
    >
      {/* Ok göstergesi */}
      {scrollDirection && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 pointer-events-none z-50">
          <div className="bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-full p-2 shadow-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-full p-6 shadow-lg animate-pulse w-20 h-20 flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-primary font-bold">
                {scrollDirection === 'left' ? 'arrow_back' : 'arrow_forward'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tek kaydırmalı container, thead sticky ───────────────── */}
      <div
        ref={edgeScrollRef}
        className="overflow-auto relative"
        style={scrollHeight != null ? { maxHeight: scrollHeight } : undefined}
        onScroll={handleBodyScroll}
      >
        {scrollDirection && (
          <div
            className="absolute inset-0 bg-black/10 dark:bg-white/10 pointer-events-none z-10"
            style={{ width: '100%', minWidth: 'max-content' }}
          />
        )}

        <table className="w-full min-w-max text-left border-spacing-0 border-separate">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-20">
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {visibleColumns.includes("status") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Durum</th>
              )}
              {visibleColumns.includes("vehicleType") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Araç Tipi</th>
              )}
              {visibleColumns.includes("g-radar") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">G-Radar</th>
              )}
              {visibleColumns.includes("estimatedArrivalDate") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">ETA</th>
              )}
              {visibleColumns.includes("buyerCompany") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Alıcı Firma</th>
              )}
              {visibleColumns.includes("senderCompany") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Gönderici</th>
              )}
              {visibleColumns.includes("containerCount") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Kap</th>
              )}
              {visibleColumns.includes("weight") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Kilo (kg)</th>
              )}
              {visibleColumns.includes("costs") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Masraflar</th>
              )}
              {visibleColumns.includes("paymentStatus") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Ödeme Durumu</th>
              )}
              {visibleColumns.includes("carrier") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Nakliyeci</th>
              )}
              {visibleColumns.includes("billOfLading") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">B/L</th>
              )}
              {visibleColumns.includes("containerNumbers") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Konteyner Numaraları</th>
              )}
              {visibleColumns.includes("licensePlate") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Plaka</th>
              )}
              {visibleColumns.includes("consignmentNumber") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Konşimento</th>
              )}
              {visibleColumns.includes("documentReceiver") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Evrak Teslim Alan</th>
              )}
              {visibleColumns.includes("documentDeliveryDate") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Dosya Teslim</th>
              )}
              {visibleColumns.includes("cargoArrivalDate") && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Varış Tarihi</th>
              )}
              {visibleColumns.includes("actions") && !isReadOnly && (
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">İşlemler</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-background-dark divide-y divide-gray-200 dark:divide-gray-700">
            {cargo.map((cargoItem) => {
              const statusInfo  = getCargoStatus(cargoItem.status);
              const vehicleType = VEHICLE_TYPES.find(v => v.value === cargoItem.vehicleType);

              return (
                <tr
                  key={cargoItem.id}
                  className={getRowBgClass(cargoItem)}
                  onClick={(e) => handleRowClick(e, cargoItem)}
                >
                  {/* İlk hücre: durum renk şeridi burada */}
                  {visibleColumns.includes("status") && (
                    <td className={`px-6 py-4 whitespace-nowrap ${getFirstCellBorderClass(cargoItem)}`}>
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo?.badgeClass}`}>
                        {statusInfo?.displayName?.toUpperCase()}
                      </span>
                    </td>
                  )}
                  {visibleColumns.includes("vehicleType") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">{vehicleType?.icon}</span>
                        <span className="text-sm text-text-main dark:text-gray-300">{vehicleType?.displayName}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.includes("g-radar") && (
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <GRadarStatusCell
                        cargoItem={cargoItem}
                        canManage={canManageGRadar}
                        isReadOnly={isReadOnly}
                        fetching={!!fetchingGRadar[cargoItem.id]}
                        enabling={!!enablingGRadar[cargoItem.id]}
                        onFetch={() => onGRadarFetch?.(cargoItem)}
                        onEnable={() => onGRadarEnable?.(cargoItem)}
                        onRequest={() => onGRadarRequest?.(cargoItem)}
                        onOpenDetails={() => onGRadarDetails?.(cargoItem)}
                      />
                    </td>
                  )}
                  {visibleColumns.includes("estimatedArrivalDate") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-secondary dark:text-gray-400">
                        {cargoItem.estimatedArrivalDate
                          ? new Date(cargoItem.estimatedArrivalDate).toLocaleDateString('tr-TR')
                          : "-"}
                      </div>
                      {cargoItem.initialEstimatedArrivalDate &&
                        cargoItem.estimatedArrivalDate &&
                        cargoItem.initialEstimatedArrivalDate !== cargoItem.estimatedArrivalDate && (
                        <div className="text-xs text-text-secondary mt-0.5 opacity-70">
                          İlk: {new Date(cargoItem.initialEstimatedArrivalDate).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                      {(() => {
                        if (cargoItem.status === 'TRACKING') {
                          if (!cargoItem.estimatedArrivalDate) return (
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined text-xs">info</span>ETA Bilgisi Yok
                            </span>
                          );
                          const eta = new Date(cargoItem.estimatedArrivalDate);
                          eta.setHours(0, 0, 0, 0);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const diffInDays = Math.ceil((eta - today) / (1000 * 60 * 60 * 24));
                          if (diffInDays === 0) return (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1 animate-pulse font-semibold">
                              <span className="material-symbols-outlined text-xs">check_circle</span>Varış Günü
                            </span>
                          );
                          if (diffInDays === 1) return (
                            <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1 animate-pulse font-semibold">
                              <span className="material-symbols-outlined text-xs">schedule</span>Yaklaşıyor
                            </span>
                          );
                          if (diffInDays < 0) return (
                            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1 animate-pulse font-semibold">
                              <span className="material-symbols-outlined text-xs">error</span>{Math.abs(diffInDays)} gün gecikme
                            </span>
                          );
                          return null;
                        }
                        if ((cargoItem.status === 'ARRIVED' || cargoItem.status === 'COMPLETED') && cargoItem.cargoArrivalDate) {
                          const baseEtaStr = cargoItem.initialEstimatedArrivalDate || cargoItem.estimatedArrivalDate;
                          if (!baseEtaStr) return (
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined text-xs">info</span>ETA Bilgisi Yok
                            </span>
                          );
                          const baseEta = new Date(baseEtaStr);
                          baseEta.setHours(0, 0, 0, 0);
                          const arrivalDate = new Date(cargoItem.cargoArrivalDate);
                          arrivalDate.setHours(0, 0, 0, 0);
                          const diffInDays = Math.ceil((arrivalDate - baseEta) / (1000 * 60 * 60 * 24));
                          if (diffInDays === 0) return (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1 font-semibold">
                              <span className="material-symbols-outlined text-xs">check_circle</span>Zamanında
                            </span>
                          );
                          if (diffInDays < 0) return (
                            <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1 font-semibold">
                              <span className="material-symbols-outlined text-xs">flight_land</span>{Math.abs(diffInDays)} gün erken
                            </span>
                          );
                          return (
                            <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-1 font-semibold">
                              <span className="material-symbols-outlined text-xs">schedule</span>{diffInDays} gün gecikmeli
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </td>
                  )}
                  {visibleColumns.includes("buyerCompany") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-main dark:text-gray-300">
                        {(cargoItem.clientCompany?.shortName || cargoItem.clientCompany?.name || "-").toUpperCase()}
                      </div>
                    </td>
                  )}
                  {visibleColumns.includes("senderCompany") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-secondary dark:text-gray-400">{cargoItem.senderCompany || "-"}</div>
                    </td>
                  )}
                  {visibleColumns.includes("containerCount") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300">
                      {cargoItem.containerCount ? Number(cargoItem.containerCount).toLocaleString('tr-TR') : "-"}
                    </td>
                  )}
                  {visibleColumns.includes("weight") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300">
                      {cargoItem.weightKg ? cargoItem.weightKg.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                    </td>
                  )}
                  {visibleColumns.includes("costs") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const breakdown = getCostBreakdown(cargoItem);
                        if (breakdown.length === 0) return <span className="text-sm text-gray-400">-</span>;
                        const totals = calculateTotalCosts(cargoItem);
                        return (
                          <div className="space-y-0.5">
                            {breakdown.map((cost, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-400 dark:text-gray-500 w-[46px] shrink-0">{cost.type}</span>
                                <span className="text-xs font-semibold text-text-main dark:text-gray-300 tabular-nums">
                                  {Number(cost.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 leading-none">{cost.currency}</span>
                              </div>
                            ))}
                            {breakdown.length > 1 && (
                              <div className="pt-1 mt-1 border-t border-gray-200 dark:border-gray-700 space-y-0.5">
                                {totals.map((t, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5">
                                    <span className="text-xs text-primary dark:text-primary-light w-[46px] shrink-0 font-medium">{idx === 0 ? 'Toplam' : ''}</span>
                                    <span className="text-xs font-bold text-primary dark:text-primary-light tabular-nums">
                                      {Number(t.total).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light leading-none">{t.currency}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  )}
                  {visibleColumns.includes("paymentStatus") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cargoItem.paymentStatus === 'PAID' ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">ÖDENDİ</span>
                      ) : cargoItem.paymentStatus === 'COMPANY_PAID' ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">FİRMA TARAFINDAN</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">ÖDEME YOK</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes("carrier") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">{cargoItem.carrierName || "-"}</td>
                  )}
                  {visibleColumns.includes("billOfLading") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300">{cargoItem.billOfLading || "-"}</td>
                  )}
                  {visibleColumns.includes("containerNumbers") && (
                    <td className="px-6 py-4">
                      {cargoItem.containerNumbers && cargoItem.containerNumbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {cargoItem.containerNumbers.slice(0, 4).map((container, idx) => (
                            <span key={idx} className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">{container}</span>
                          ))}
                          {cargoItem.containerNumbers.length > 4 && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">+{cargoItem.containerNumbers.length - 4} daha</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-text-secondary dark:text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes("licensePlate") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300">{cargoItem.licensePlate || "-"}</td>
                  )}
                  {visibleColumns.includes("consignmentNumber") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300">{cargoItem.consignmentNumber || "-"}</td>
                  )}
                  {visibleColumns.includes("documentReceiver") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {(() => {
                        const dt = getDocumentDeliveryType(cargoItem.documentDeliveryType);
                        if (!dt) return cargoItem.documentReceiver || "-";
                        const label = getCurrentLanguage() === 'tr' ? dt.label : dt.labelEn;
                        if (dt.requiresPersonName && cargoItem.documentReceiver) {
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${dt.badgeClass}`}>
                                <span className="material-symbols-outlined text-xs">{dt.icon}</span>
                                {label}
                              </span>
                              <span className="text-xs text-text-main dark:text-gray-300 font-medium pl-0.5">{cargoItem.documentReceiver}</span>
                            </div>
                          );
                        }
                        if (dt.value === 'PERSON') return cargoItem.documentReceiver || "-";
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${dt.badgeClass}`}>
                            <span className="material-symbols-outlined text-xs">{dt.icon}</span>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                  )}
                  {visibleColumns.includes("documentDeliveryDate") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {cargoItem.documentDeliveryDate ? new Date(cargoItem.documentDeliveryDate).toLocaleDateString('tr-TR') : "-"}
                    </td>
                  )}
                  {visibleColumns.includes("cargoArrivalDate") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {cargoItem.cargoArrivalDate ? new Date(cargoItem.cargoArrivalDate).toLocaleDateString('tr-TR') : "-"}
                    </td>
                  )}
                  {visibleColumns.includes("actions") && !isReadOnly && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit && onEdit(cargoItem); }}
                        className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary mr-3 transition-colors"
                        title="Düzenle"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(cargoItem); }}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Sil"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Per-row G-Radar status display with the three states from the plan:
 *  - TRUCK or COMPLETED cargo → dash (G-Radar doesn't apply).
 *  - gRadarEnabled=false → muted "Kapalı" pill.
 *  - gRadarEnabled=true && gRadarTrackingId=null → "Bilgileri Getir"
 *    action button (only clickable by BROKER_ADMIN / SUPER_ADMIN; spent
 *    1 credit per click, confirmed in the parent).
 *  - gRadarEnabled=true && gRadarTrackingId set → green dot + last-sync
 *    tooltip indicating live tracking.
 *
 * Click handlers stopPropagation so the row click (which opens the edit
 * modal) doesn't fire when the user is operating the cell.
 */
function GRadarStatusCell({
  cargoItem, canManage, isReadOnly,
  fetching, enabling,
  onFetch, onEnable, onRequest, onOpenDetails,
}) {
  const vt = cargoItem.vehicleType;

  // Defensive debug: when the user reports "buttons don't react", the most
  // common cause is the cargo payload missing gRadarEnabled / gRadarTrackingId
  // — the cell then falls through to the "Kapalı" span (not a button), so
  // clicking does nothing. Log once per cargo so we can spot it in dev tools
  // without flooding the console.
  if (typeof window !== 'undefined' && !window.__gRadarCellDebugged) {
    window.__gRadarCellDebugged = new Set();
  }
  if (typeof window !== 'undefined'
      && (vt === 'SHIP' || vt === 'AIRPLANE')
      && !window.__gRadarCellDebugged.has(cargoItem.id)) {
    window.__gRadarCellDebugged.add(cargoItem.id);
    console.debug('[GRadarCell]', cargoItem.id, {
      vehicleType: vt,
      status: cargoItem.status,
      gRadarEnabled: cargoItem.gRadarEnabled,
      gRadarTrackingId: cargoItem.gRadarTrackingId,
      canManage,
      isReadOnly,
    });
  }

  if (vt !== 'SHIP' && vt !== 'AIRPLANE') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800/60 text-text-secondary text-xs italic"
        title="G-Radar sadece gemi ve uçak yüklerini takip eder — bu araç tipi için kullanılamaz"
      >
        <span className="material-symbols-outlined text-sm">block</span>
        Kullanılamaz
      </span>
    );
  }
  if (cargoItem.status === 'COMPLETED') {
    if (cargoItem.gRadarTrackingId) {
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenDetails?.(); }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-colors"
          title="Yük tamamlandı — G-Radar'ın son senkron ettiği veriyi görüntüleyin"
        >
          <span className="material-symbols-outlined text-sm">history</span>
          Geçmişi Göster
        </button>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800/60 text-text-secondary text-xs italic"
        title="Bu yük tamamlandı ve G-Radar'dan hiç senkron edilmedi — geçmiş veri yok"
      >
        <span className="material-symbols-outlined text-sm">block</span>
        Kullanılamaz
      </span>
    );
  }
  if (!cargoItem.gRadarEnabled) {
    // Read-only viewers (CLIENT_USER / payment-frozen) get the muted pill.
    if (isReadOnly) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
          <span className="material-symbols-outlined text-sm">toggle_off</span>
          Kapalı
        </span>
      );
    }
    // BROKER_ADMIN / SUPER_ADMIN can flip it on directly (no credit cost).
    if (canManage) {
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEnable?.(); }}
          disabled={enabling}
          title="G-Radar entegrasyonunu bu yük için aç — bu adımda kredi tüketilmez"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-primary/10 dark:bg-gray-700 dark:hover:bg-primary/20 text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary text-xs font-medium transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">toggle_off</span>
          {enabling ? 'Açılıyor...' : 'G-Radar\'ı Aç'}
        </button>
      );
    }
    // BROKER_USER cannot enable directly → opens a request flow.
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRequest?.(); }}
        disabled={enabling}
        title="Yöneticinizden G-Radar entegrasyonunu açmasını talep edin"
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-blue-900/30 text-gray-600 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-300 text-xs font-medium transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">send</span>
        {enabling ? 'Gönderiliyor...' : 'Talep Et'}
      </button>
    );
  }
  if (!cargoItem.gRadarTrackingId) {
    if (!canManage || isReadOnly) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs">
          Bilgi bekleniyor
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onFetch?.(); }}
        disabled={fetching}
        title="G-Radar'dan bilgileri çek (1 kredi)"
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">download</span>
        {fetching ? 'Çekiliyor...' : 'Bilgileri Getir (1 kredi)'}
      </button>
    );
  }
  // gRadarEnabled + trackingId set → live, clickable to open the drawer.
  // Rozette ham "Aktif" yerine yükün gerçek durumunu Türkçe gösteriyoruz —
  // kullanıcı listeden ayrılmadan "nerede" sorusunun cevabını görsün.
  const statusInfo = gRadarStatusInfo(cargoItem.gRadarStatus);
  const syncNote = cargoItem.gRadarLastSyncAt
    ? `Son sync: ${new Date(cargoItem.gRadarLastSyncAt).toLocaleString('tr-TR')}`
    : 'G-Radar aktif';
  const tooltip = statusInfo
    ? `${statusInfo.label} (${statusInfo.raw}) — ${syncNote} — detay için tıkla`
    : `${syncNote} — detay için tıkla`;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpenDetails?.(); }}
      title={tooltip}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
      {statusInfo?.short || 'Aktif'}
      <span className="material-symbols-outlined text-sm">open_in_new</span>
    </button>
  );
}
