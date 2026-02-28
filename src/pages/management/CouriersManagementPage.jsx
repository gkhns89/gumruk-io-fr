import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { courierService } from '../../api/courierService';
import { showError } from '../../utils/toastUtils';
import MainLayout from '../../components/layout/MainLayout';
import AddCourierModal from '../../components/couriers/AddCourierModal';
import EditCourierModal from '../../components/couriers/EditCourierModal';
import DeleteCourierModal from '../../components/couriers/DeleteCourierModal';

/**
 * Kurye Yönetimi Sayfası
 * BROKER_ADMIN ve SUPER_ADMIN için
 */
export default function CouriersManagementPage() {
  const { user } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState(null);

  // Permission
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  const isBrokerAdmin = user?.globalRole === 'BROKER_ADMIN';
  const canManageCouriers = isSuperAdmin || isBrokerAdmin;

  // CLIENT_USER hiç görmemeli
  if (!canManageCouriers) {
    return (
      <MainLayout>
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400">Bu sayfaya erişim yetkiniz yok.</p>
        </div>
      </MainLayout>
    );
  }

  useEffect(() => {
    loadCouriers();
  }, []);

  const loadCouriers = async () => {
    setLoading(true);

    try {
      const result = await courierService.getCourierCompanies();
      if (result.success) {
        setCouriers(result.data || []);
      } else {
        // Backend'den gelen hata - Toast ile göster
        showError(result.error || 'Kurye firmaları yüklenemedi');
        setCouriers([]);
      }
    } catch (err) {
      // Network veya beklenmeyen hata - Toast ile göster
      console.error('Error loading couriers:', err);
      showError('Kurye firmaları yüklenirken bir hata oluştu');
      setCouriers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Kurye Yönetimi
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Kurye firmalarını ve kalkış saatlerini yönetin
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            <span className="material-symbols-outlined text-xl">add</span>
            <span>Yeni Kurye Firması</span>
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-48" />
            ))}
          </div>
        ) : couriers.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">
              two_wheeler
            </span>
            <p className="text-gray-500 dark:text-gray-400">
              Henüz kurye firması eklenmemiş
            </p>
            <button
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              onClick={() => setShowAddModal(true)}
            >
              İlk Kurye Firmasını Ekle
            </button>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {couriers.length} kurye firması bulundu
            </div>

            {/* Courier Companies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {couriers.map(courier => (
                <div
                  key={courier.id}
                  className="bg-white dark:bg-background-dark rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
                >
                  {/* Header - Firma Adı */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {courier.shortName || courier.name}
                      </h3>
                      {courier.shortName && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {courier.name}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      courier.active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                    }`}>
                      {courier.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>

                  {/* Schedules Summary */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-sm text-gray-600">schedule</span>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {courier.schedules?.length || 0} kalkış saati
                      </p>
                    </div>
                    {courier.contactPhone && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-gray-600">phone</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {courier.contactPhone}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setSelectedCourier(courier);
                        setShowEditModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span className="text-sm font-medium">Düzenle</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCourier(courier);
                        setShowDeleteModal(true);
                      }}
                      className="flex items-center justify-center px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddCourierModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(newCourier) => {
            setShowAddModal(false);
            loadCouriers();
          }}
        />
      )}

      {showEditModal && selectedCourier && (
        <EditCourierModal
          courier={selectedCourier}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCourier(null);
          }}
          onSuccess={(updatedCourier) => {
            setShowEditModal(false);
            setSelectedCourier(null);
            loadCouriers();
          }}
        />
      )}

      {showDeleteModal && selectedCourier && (
        <DeleteCourierModal
          courier={selectedCourier}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCourier(null);
          }}
          onSuccess={() => {
            setShowDeleteModal(false);
            setSelectedCourier(null);
            loadCouriers();
          }}
        />
      )}
    </MainLayout>
  );
}
