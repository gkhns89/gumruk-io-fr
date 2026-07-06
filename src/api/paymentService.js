import axiosInstance from './axios';

export const paymentService = {
  // ===== ÖDEME YÖNTEMLERİ =====

  getActivePaymentMethods: async () => {
    const response = await axiosInstance.get('/payment-methods/active');
    return response.data;
  },

  createPaymentMethod: async (method) => {
    const response = await axiosInstance.post('/payment-methods', method);
    return response.data;
  },

  updatePaymentMethod: async (id, method) => {
    const response = await axiosInstance.put(`/payment-methods/${id}`, method);
    return response.data;
  },

  deletePaymentMethod: async (id) => {
    await axiosInstance.delete(`/payment-methods/${id}`);
  },

  // ===== ÖDEME BİLDİRİMİ =====

  submitPayment: async ({ paymentMethodId, amount, referenceNumber, billingPeriodStart, billingPeriodEnd, notes, receipt }) => {
    const formData = new FormData();
    formData.append('paymentMethodId', paymentMethodId);
    formData.append('amount', amount);
    if (billingPeriodStart) formData.append('billingPeriodStart', billingPeriodStart);
    if (billingPeriodEnd)   formData.append('billingPeriodEnd', billingPeriodEnd);
    if (referenceNumber) formData.append('referenceNumber', referenceNumber);
    if (notes) formData.append('notes', notes);
    if (receipt) formData.append('receipt', receipt);

    const response = await axiosInstance.post('/payments/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getMyCompanyPayments: async () => {
    const response = await axiosInstance.get('/payments/my-company');
    return response.data;
  },

  getPendingPayments: async () => {
    const response = await axiosInstance.get('/payments/pending');
    return response.data;
  },

  getAllPayments: async ({ status, brokerId } = {}) => {
    const params = {};
    if (status) params.status = status;
    if (brokerId) params.brokerId = brokerId;
    const response = await axiosInstance.get('/payments/all', { params });
    return response.data;
  },

  confirmPayment: async (id) => {
    const response = await axiosInstance.post(`/payments/${id}/confirm`);
    return response.data;
  },

  rejectPayment: async (id, rejectionReason) => {
    const response = await axiosInstance.post(`/payments/${id}/reject`, { rejectionReason });
    return response.data;
  },

  // Dekontu auth header'ı ile blob olarak indirir ve DEKONT_firma-tarih.uzanti adıyla kaydeder.
  // Not: Düz <a href> ile açmak Authorization: Bearer token'ını göndermediği için
  // backend isteği anonim sayıp 403 döner; bu yüzden axiosInstance üzerinden çekiyoruz.
  downloadReceipt: async (id) => {
    try {
      const response = await axiosInstance.get(`/payments/${id}/receipt`, {
        responseType: 'blob',
      });

      // Dosya adını backend'in Content-Disposition header'ından al
      let filename = `dekont-${id}`;
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

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch {
      return { success: false, error: 'Dekont indirilemedi' };
    }
  },

  // ===== KISITLAMA DURUMU =====

  getRestrictionStatus: async () => {
    const response = await axiosInstance.get('/payment-restriction/status');
    return response.data;
  },

  // ===== ÖDEME SORUMLUSU =====

  setPaymentResponsible: async (userId, isPaymentResponsible) => {
    const response = await axiosInstance.put(`/users/${userId}/payment-responsible`, { isPaymentResponsible });
    return response.data;
  },

  // ===== EK ÖDEMELER (ADDON'LAR) =====

  getMyCompanyAddons: async () => {
    const response = await axiosInstance.get('/addons/my-company');
    return response.data;
  },

  markAddonAsPaid: async (addonId, { useBalance }) => {
    const response = await axiosInstance.post(`/addons/${addonId}/mark-paid`, { useBalance });
    return response.data;
  },

  // ===== BAKİYE HAREKETLERİ =====

  getBalanceHistory: async (brokerId) => {
    const response = await axiosInstance.get(`/subscriptions/broker/${brokerId}/balance-history`);
    return response.data.transactions ?? [];
  },

  getMyCompanyBalanceHistory: async () => {
    const response = await axiosInstance.get('/subscriptions/my-company/balance-history');
    return response.data.transactions ?? [];
  },
};
