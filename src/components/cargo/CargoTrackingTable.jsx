import { useState } from 'react';
import { CARGO_STATUS, VEHICLE_TYPES, getCargoStatus, formatCurrency } from '../../utils/constants';
import { useEdgeScroll } from '../../hooks/useEdgeScroll';
import { getCostBreakdown, formatCostsDisplay } from '../../utils/costsUtils';

export default function CargoTrackingTable({
  cargo,
  loading,
  error,
  onRetry,
  onRefresh,
  canDelete,
  isReadOnly,
  onRowClick,
  onEdit,
  onDelete,
  selectedVehicleType = "", // For dynamic column visibility
}) {
  const [selectedCargo, setSelectedCargo] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { containerRef: scrollContainerRef, scrollDirection } = useEdgeScroll({
    edgeZoneWidth: 25,
    scrollSpeed: 10,
  });

  // Dynamic column visibility based on vehicle type filter
  const getVisibleColumns = () => {
    const baseColumns = [
      "status",
      "vehicleType", // Moved earlier - before buyer company
      "estimatedArrivalDate", // Moved to be right after vehicle type
      "buyerCompany",
      "senderCompany",
      "containerCount",
      "weight",
      "costs",
      "paymentStatus",
      "carrier",
    ];

    const vehicleColumns = {
      "": ["billOfLading", "licensePlate", "consignmentNumber", "containerNumbers"], // Show all if no filter
      "AIRPLANE": ["consignmentNumber"],
      "SHIP": ["billOfLading", "containerNumbers"],
      "TRUCK": ["licensePlate"],
    };

    return [
      ...baseColumns,
      ...(vehicleColumns[selectedVehicleType] || vehicleColumns[""]),
      "transportInfo",
      "documentReceiver",
      "documentDeliveryDate",
      "actions",
    ];
  };

  const visibleColumns = getVisibleColumns();

  // Sort cargo by status: ARRIVED -> TRACKING -> COMPLETED
  const STATUS_PRIORITY = {
    'ARRIVED': 1,      // Varış Yaptı önce
    'TRACKING': 2,     // Takip ikinci
    'COMPLETED': 3,    // Tamamlandı son
  };

  const sortedCargo = [...cargo].sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status] || 999;
    const priorityB = STATUS_PRIORITY[b.status] || 999;
    return priorityA - priorityB;
  });

  // Status-based row styling
  const getRowClasses = (cargoItem) => {
    const statusInfo = getCargoStatus(cargoItem.status);
    // Add background color for COMPLETED status (like TransactionsTable)
    const bgClass = cargoItem.status === 'COMPLETED' ? statusInfo?.bgClass : '';
    return `border-l-4 ${statusInfo?.borderClass} ${bgClass} hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white dark:bg-background-dark rounded-lg shadow-sm p-8 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-text-secondary dark:text-gray-400">Yükler yükleniyor...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white dark:bg-background-dark rounded-lg shadow-sm p-8 transition-colors duration-300">
        <div className="text-center">
          <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
          <h3 className="text-lg font-semibold text-text-main dark:text-gray-100 mb-2">Bir Hata Oluştu</h3>
          <p className="text-text-secondary dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!cargo || cargo.length === 0) {
    return (
      <div className="bg-white dark:bg-background-dark rounded-lg shadow-sm p-8 transition-colors duration-300">
        <div className="text-center">
          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-6xl mb-4">inventory_2</span>
          <h3 className="text-lg font-semibold text-text-main dark:text-gray-100 mb-2">Yük Bulunamadı</h3>
          <p className="text-text-secondary dark:text-gray-400">
            Henüz yük kaydı oluşturulmamış. Yeni yük eklemek için "Yeni Yük Ekle" butonunu kullanın.
          </p>
        </div>
      </div>
    );
  }

  const handleRowClick = (e, cargoItem) => {
    // Prevent row click if clicking on button or selecting text
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
      return;
    }

    if (window.getSelection().toString().length > 0) {
      return;
    }

    if (onRowClick) {
      onRowClick(cargoItem);
    }
  };

  return (
    <div className="bg-white dark:bg-background-dark rounded-lg shadow-sm overflow-hidden transition-colors duration-300 relative">
      <div className="overflow-x-auto" ref={scrollContainerRef}>
        {/* Saydam overlay - tablo genişliğinin tamamını kaplar */}
        {scrollDirection && (
          <div className="absolute inset-0 bg-black/10 dark:bg-white/10 pointer-events-none z-10" style={{ width: '100%', minWidth: 'max-content' }} />
        )}

        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {visibleColumns.includes("status") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
              )}
              {visibleColumns.includes("vehicleType") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Araç Tipi
                </th>
              )}
              {visibleColumns.includes("estimatedArrivalDate") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ETA
                </th>
              )}
              {visibleColumns.includes("buyerCompany") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Alıcı Firma
                </th>
              )}
              {visibleColumns.includes("senderCompany") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Gönderici
                </th>
              )}
              {visibleColumns.includes("containerCount") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kap
                </th>
              )}
              {visibleColumns.includes("weight") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kilo (kg)
                </th>
              )}
              {visibleColumns.includes("costs") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Masraflar
                </th>
              )}
              {visibleColumns.includes("paymentStatus") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ödeme Durumu
                </th>
              )}
              {visibleColumns.includes("carrier") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nakliyeci
                </th>
              )}
              {visibleColumns.includes("billOfLading") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  B/L
                </th>
              )}
              {visibleColumns.includes("containerNumbers") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Konteyner Numaraları
                </th>
              )}
              {visibleColumns.includes("licensePlate") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plaka
                </th>
              )}
              {visibleColumns.includes("consignmentNumber") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Konşimento
                </th>
              )}
              {visibleColumns.includes("documentReceiver") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Evrak Teslim Alan
                </th>
              )}
              {visibleColumns.includes("documentDeliveryDate") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dosya Teslim
                </th>
              )}
              {visibleColumns.includes("actions") && !isReadOnly && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-background-dark divide-y divide-gray-200 dark:divide-gray-700">
            {sortedCargo.map((cargoItem) => {
              const statusInfo = getCargoStatus(cargoItem.status);
              const vehicleType = VEHICLE_TYPES.find(v => v.value === cargoItem.vehicleType);

              return (
                <tr
                  key={cargoItem.id}
                  className={getRowClasses(cargoItem)}
                  onClick={(e) => handleRowClick(e, cargoItem)}
                >
                  {visibleColumns.includes("status") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo?.badgeClass}`}>
                        {statusInfo?.displayName?.toUpperCase()}
                      </span>
                    </td>
                  )}
                  {visibleColumns.includes("vehicleType") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
                          {vehicleType?.icon}
                        </span>
                        <span className="text-sm text-text-main dark:text-gray-300">{vehicleType?.displayName}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.includes("estimatedArrivalDate") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-secondary dark:text-gray-400">
                        {cargoItem.estimatedArrivalDate ?
                          new Date(cargoItem.estimatedArrivalDate).toLocaleDateString('tr-TR') :
                          "-"
                        }
                      </div>
                      {/* Show warning if ETA is in past and status not COMPLETED */}
                      {cargoItem.estimatedArrivalDate &&
                       cargoItem.status !== 'COMPLETED' &&
                       new Date(cargoItem.estimatedArrivalDate) < new Date() && (
                        <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-1 animate-pulse">
                          <span className="material-symbols-outlined text-xs">warning</span>
                          Geçmiş
                        </span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes("buyerCompany") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-main dark:text-gray-300">
                        {cargoItem.clientCompany?.shortName || cargoItem.clientCompany?.name || "-"}
                      </div>
                    </td>
                  )}
                  {visibleColumns.includes("senderCompany") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-secondary dark:text-gray-400">
                        {cargoItem.senderCompany || "-"}
                      </div>
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
                    <td className="px-6 py-4">
                      {(() => {
                        const breakdown = getCostBreakdown(cargoItem);
                        if (breakdown.length === 0) return <span className="text-sm text-gray-400">-</span>;

                        return (
                          <div className="space-y-1">
                            {breakdown.map((cost, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[50px]">
                                  {cost.type}:
                                </span>
                                <span className="text-xs font-semibold text-text-main dark:text-gray-300">
                                  {Number(cost.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cost.currency}
                                </span>
                              </div>
                            ))}
                            {breakdown.length > 1 && (
                              <div className="pt-1 mt-1 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold text-primary dark:text-primary-light">
                                  Toplam: {formatCostsDisplay(cargoItem)}
                                </span>
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
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          ÖDENDİ
                        </span>
                      ) : cargoItem.paymentStatus === 'COMPANY_PAID' ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          FİRMA TARAFINDAN
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">
                          ÖDEME YOK
                        </span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes("carrier") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {cargoItem.carrierName || "-"}
                    </td>
                  )}
                  {visibleColumns.includes("billOfLading") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300">
                      {cargoItem.billOfLading || "-"}
                    </td>
                  )}
                  {visibleColumns.includes("containerNumbers") && (
                    <td className="px-6 py-4">
                      {cargoItem.containerNumbers && cargoItem.containerNumbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {cargoItem.containerNumbers.slice(0, 4).map((container, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                            >
                              {container}
                            </span>
                          ))}
                          {cargoItem.containerNumbers.length > 4 && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                              +{cargoItem.containerNumbers.length - 4} daha
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-text-secondary dark:text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes("licensePlate") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300">
                      {cargoItem.licensePlate || "-"}
                    </td>
                  )}
                  {visibleColumns.includes("consignmentNumber") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300">
                      {cargoItem.consignmentNumber || "-"}
                    </td>
                  )}
                  {visibleColumns.includes("documentReceiver") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {cargoItem.documentReceiver || "-"}
                    </td>
                  )}
                  {visibleColumns.includes("documentDeliveryDate") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {cargoItem.documentDeliveryDate ? new Date(cargoItem.documentDeliveryDate).toLocaleDateString('tr-TR') : "-"}
                    </td>
                  )}
                  {visibleColumns.includes("actions") && !isReadOnly && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit && onEdit(cargoItem);
                        }}
                        className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary mr-3 transition-colors"
                        title="Düzenle"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete && onDelete(cargoItem);
                          }}
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

      {/* Ok göstergesi - scroll container dışında, sabit pozisyon */}
      {scrollDirection && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-30">
          <div className="bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-full p-2 shadow-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-full p-6 shadow-lg animate-pulse w-20 h-20 flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-primary font-bold">
                {scrollDirection === 'left' ? 'arrow_back' : 'arrow_forward'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
