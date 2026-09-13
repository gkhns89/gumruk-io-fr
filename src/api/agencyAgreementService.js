import axiosInstance from './axios';
import { getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

export const agencyAgreementService = {
  // Aktif anlaşma kontrolü
  checkActiveAgreement: async (brokerId, clientId) => {
    try {
      const response = await axiosInstance.get('/agreements/check', {
        params: { brokerId, clientId }
      });
      return {
        success: true,
        data: response.data,
        hasActiveAgreement: response.data.hasActiveAgreement
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.agreement.checkError')),
        hasActiveAgreement: false
      };
    }
  },

  // Broker-Client anlaşmasını getir
  getAgreementByBrokerClient: async (brokerId, clientId) => {
    try {
      const response = await axiosInstance.get(
        `/agreements/broker/${brokerId}/client/${clientId}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, data: null }; // Anlaşma yok
      }
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.agreement.loadError')),
      };
    }
  },

  // Broker'ın tüm anlaşmalarını getir
  getBrokerAgreements: async (brokerId, status = null) => {
    try {
      const params = status ? { status } : {};
      const response = await axiosInstance.get(
        `/agreements/broker/${brokerId}`,
        { params }
      );
      return {
        success: true,
        data: response.data.agreements || [],
        total: response.data.total || 0
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.agreement.listError')),
        data: []
      };
    }
  },

  // Kayıp belge temizliği (SUPER_ADMIN): dosyası diskte olmayan tüm vekalet yollarını temizler
  reconcileDocuments: async () => {
    try {
      const response = await axiosInstance.post('/agreements/reconcile-documents');
      return {
        success: true,
        clearedCount: response.data.clearedCount || 0,
        cleared: response.data.cleared || []
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, t('agreements.page.scanError')),
      };
    }
  },

  // Anlaşma oluştur (INACTIVE)
  createAgreement: async (agreementData) => {
    try {
      const response = await axiosInstance.post('/agreements', agreementData);
      return {
        success: true,
        data: response.data,
        message: response.data.message || t('api.agreement.created')
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.agreement.createError')),
      };
    }
  },

  // Vekalet belgesi yükle (INACTIVE → PENDING)
  uploadDocument: async (agreementId, file) => {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await axiosInstance.patch(
        `/agreements/${agreementId}/upload-document`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      return {
        success: true,
        data: response.data,
        message: response.data.message || t('api.agreement.documentUploaded')
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.agreement.documentUploadError')),
      };
    }
  },

  // Anlaşmayı aktifleştir (PENDING → ACTIVE)
  activateAgreement: async (agreementId, activationData) => {
    try {
      const response = await axiosInstance.patch(
        `/agreements/${agreementId}/activate`,
        activationData
      );
      return {
        success: true,
        data: response.data,
        message: response.data.message || t('api.agreement.activated')
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.agreement.activateError')),
      };
    }
  },

  // Tek adımda oluştur ve aktifleştir
  createAndActivateAgreement: async (formData) => {
    try {
      const response = await axiosInstance.post(
        '/agreements/create-and-activate',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      return {
        success: true,
        data: response.data,
        message: response.data.message || t('api.agreement.createdAndActivated')
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.agreement.createAndActivateError')),
      };
    }
  },

  // Belgeyi indir
  downloadDocument: async (agreementId) => {
    try {
      const response = await axiosInstance.get(
        `/agreements/${agreementId}/document`,
        { responseType: 'blob' }
      );

      // Dosya adını backend'in Content-Disposition header'ından al (VEK_firma-tarih.uzanti)
      let filename = `vekalet-${agreementId}`;
      const cd = response.headers?.['content-disposition'];
      if (cd) {
        const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
        const plain = /filename="?([^";]+)"?/i.exec(cd);
        if (star) {
          filename = decodeURIComponent(star[1]);
        } else if (plain) {
          filename = plain[1].trim();
        }
      }

      // Blob'u dosya olarak indir
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch {
      return {
        success: false,
        error: t('api.agreement.downloadError'),
      };
    }
  },

  // ✅ YENİ: Anlaşma güncelle
  updateAgreement: async (agreementId, agreementData) => {
    try {
      const response = await axiosInstance.put(`/agreements/${agreementId}`, agreementData);
      return {
        success: true,
        data: response.data,
        message: response.data.message || t('api.agreement.updated')
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.agreement.updateError')),
      };
    }
  },
};
