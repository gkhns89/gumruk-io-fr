import axiosInstance from './axios';

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
        error: error.response?.data?.error || 'Anlaşma kontrolü yapılamadı',
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
        error: error.response?.data?.error || 'Anlaşma bilgisi alınamadı',
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
        error: error.response?.data?.error || 'Anlaşmalar alınamadı',
        data: []
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
        message: response.data.message || 'Anlaşma oluşturuldu'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Anlaşma oluşturulamadı',
      };
    }
  },

  // Vekalet belgesi yükle (INACTIVE → PENDING)
  uploadDocument: async (agreementId, file) => {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await axiosInstance.post(
        `/agreements/${agreementId}/upload-document`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Vekalet belgesi yüklendi'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Belge yüklenemedi',
      };
    }
  },

  // Anlaşmayı aktifleştir (PENDING → ACTIVE)
  activateAgreement: async (agreementId, activationData) => {
    try {
      const response = await axiosInstance.post(
        `/agreements/${agreementId}/activate`,
        activationData
      );
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Anlaşma aktifleştirildi'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Anlaşma aktifleştirilemedi',
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
        message: response.data.message || 'Anlaşma oluşturuldu ve aktifleştirildi'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'İşlem başarısız',
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

      // Blob'u dosya olarak indir
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vekalet-${agreementId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Belge indirilemedi',
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
        message: response.data.message || 'Anlaşma başarıyla güncellendi'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Anlaşma güncellenemedi',
      };
    }
  },
};
