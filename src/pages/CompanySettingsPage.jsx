import React, { useEffect, useState, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { companyService } from '../api/companyService';
import ImageUploadField from '../components/common/ImageUploadField';

/**
 * Firma Ayarları — firma logosu yönetimi.
 *  - SUPER_ADMIN: combobox ile herhangi bir gümrük firmasını seçip logosunu değiştirir.
 *  - BROKER_ADMIN: yalnızca kendi gümrük firmasının logosunu değiştirir.
 * (Müşteri firmalarının logoları "Müşteri Firmaları" sayfasından yönetilir.)
 */
export default function CompanySettingsPage() {
  const { user, refreshUser } = useAuth();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  const isBrokerAdmin = user?.globalRole === 'BROKER_ADMIN';
  const hasAccess = isSuperAdmin || isBrokerAdmin;

  // SUPER_ADMIN: broker listesi + seçim
  const [brokers, setBrokers] = useState([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [selectedBrokerId, setSelectedBrokerId] = useState('');

  // Logo değişince AuthedImage'i tekrar yüklemeye zorla
  const [logoBust, setLogoBust] = useState(0);

  const loadBrokers = useCallback(async () => {
    setBrokersLoading(true);
    const res = await companyService.getAllBrokerCompanies();
    if (res.success) setBrokers(res.data);
    setBrokersLoading(false);
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadBrokers();
  }, [isSuperAdmin, loadBrokers]);

  // Hedef firma: BROKER_ADMIN → kendi firması; SUPER_ADMIN → seçilen broker
  const targetCompanyId = isBrokerAdmin ? user?.company?.id : (selectedBrokerId ? Number(selectedBrokerId) : null);
  const targetCompanyName = isBrokerAdmin
    ? (user?.company?.name || user?.companyDetails?.name)
    : brokers.find((b) => b.id === Number(selectedBrokerId))?.name;

  const handleLogoChanged = async () => {
    setLogoBust((n) => n + 1);
    if (isSuperAdmin) loadBrokers();
    // Kendi firmasıysa header/dashboard logosunun da güncellenmesi için profili tazele
    if (isBrokerAdmin) await refreshUser?.();
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary">domain</span>
            Firma Ayarları
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Firma logosunu buradan yönetin. Logo; header, kontrol paneli ve giriş ekranında görünür.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!hasAccess ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400 dark:text-gray-500 gap-3">
              <span className="material-symbols-outlined text-[56px]">lock</span>
              <p className="text-base">Bu sayfaya erişim yetkiniz yok.</p>
            </div>
          ) : (
            <div className="max-w-2xl">
              <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-primary">image</span>
                  <div>
                    <h2 className="font-semibold text-text-main">Firma Logosu</h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {isSuperAdmin
                        ? 'Bir gümrük firması seçin ve logosunu yükleyin/değiştirin.'
                        : 'Gümrük firmanızın logosunu yükleyin veya değiştirin.'}
                    </p>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* SUPER_ADMIN: gümrük firması seçimi */}
                  {isSuperAdmin && (
                    <div>
                      <label htmlFor="broker-select" className="block text-sm font-medium text-text-main mb-1.5">
                        Gümrük Firması
                      </label>
                      <select
                        id="broker-select"
                        value={selectedBrokerId}
                        onChange={(e) => { setSelectedBrokerId(e.target.value); setLogoBust((n) => n + 1); }}
                        disabled={brokersLoading}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600
                                   bg-white dark:bg-gray-800 text-text-main text-sm
                                   focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                      >
                        <option value="">{brokersLoading ? 'Yükleniyor...' : 'Firma seçin...'}</option>
                        {brokers.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Logo yükleme alanı */}
                  {targetCompanyId ? (
                    <div>
                      {targetCompanyName && (
                        <p className="text-xs text-text-secondary mb-3">
                          <span className="font-medium text-text-main">{targetCompanyName}</span> için logo
                        </p>
                      )}
                      <ImageUploadField
                        currentUrl={`/companies/${targetCompanyId}/logo`}
                        bustKey={`${targetCompanyId}-${logoBust}`}
                        uploadFn={(file) => companyService.uploadCompanyLogo(targetCompanyId, file)}
                        deleteFn={() => companyService.deleteCompanyLogo(targetCompanyId)}
                        onUploaded={handleLogoChanged}
                        shape="square"
                        size={120}
                        fallback={
                          <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">
                            image
                          </span>
                        }
                      />
                    </div>
                  ) : (
                    isSuperAdmin && (
                      <p className="text-sm text-text-secondary">Logosunu yönetmek için bir firma seçin.</p>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
