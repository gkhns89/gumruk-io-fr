import { useState } from 'react';
import { CARGO_STATUS, VEHICLE_TYPES, getCargoStatus, formatCurrency } from '../../utils/constants';
import { useEdgeScroll } from '../../hooks/useEdgeScroll';

export default function CargoTrackingTable({
  cargo,
  loading,
  error,
  onRetry,
  onRefresh,
  canDelete,
  isReadOnly,
  onRowClick,
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
      "buyerCompany",
      "senderCompany",
      "containerCount",
      "weight",
      "costs",
      "paymentReceived",
      "carrier",
    ];

    const vehicleColumns = {
      "": ["billOfLading", "licensePlate", "consignmentNumber", "containerNumber"], // Show all if no filter
      "AIRPLANE": ["consignmentNumber"],
      "SHIP": ["billOfLading", "containerNumber"],
      "TRUCK": ["licensePlate"],
    };

    return [
      ...baseColumns,
      ...(vehicleColumns[selectedVehicleType] || vehicleColumns[""]),
      "transportInfo",
      "documentReceiver",
      "documentDeliveryDate",
      "vehicleType",
      "actions",
    ];
  };

  const visibleColumns = getVisibleColumns();

  // Status-based row styling
  const getRowClasses = (cargoItem) => {
    const statusInfo = getCargoStatus(cargoItem.status);
    return `border-l-4 ${statusInfo?.borderClass} hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer`;
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
              {visibleColumns.includes("paymentReceived") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ödeme
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
              {visibleColumns.includes("containerNumber") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Konteyner No
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
            {cargo.map((cargoItem) => {
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
                        {statusInfo?.displayName}
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
                  {visibleColumns.includes("buyerCompany") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-main dark:text-gray-300">
                        {cargoItem.clientCompany?.name || "-"}
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
                      {cargoItem.containerCount || "-"}
                    </td>
                  )}
                  {visibleColumns.includes("weight") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300">
                      {cargoItem.weightKg ? cargoItem.weightKg.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                    </td>
                  )}
                  {visibleColumns.includes("costs") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main dark:text-gray-300">
                      {cargoItem.costsAmount ? formatCurrency(cargoItem.costsAmount, cargoItem.costsCurrency) : "-"}
                    </td>
                  )}
                  {visibleColumns.includes("paymentReceived") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cargoItem.paymentReceived ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Alındı
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          Alınmadı
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
                  {visibleColumns.includes("containerNumber") && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300">
                      {cargoItem.containerNumber || "-"}
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
                          // Edit action
                        }}
                        className="text-primary hover:text-primary-dark mr-3 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Delete action
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
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
