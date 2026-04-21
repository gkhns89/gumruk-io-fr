import axiosInstance from './axios';

export const brokerSubscriptionService = {
  // Tüm broker aboneliklerini getir (SUPER_ADMIN)
  getAllBrokerSubscriptions: async () => {
    const response = await axiosInstance.get('/subscriptions/all');
    return response.data.brokers || [];
  },

  // Tekil broker aboneliğini getir
  getBrokerSubscription: async (brokerId) => {
    const response = await axiosInstance.get(`/subscriptions/broker/${brokerId}`);
    return response.data;
  },

  // Aboneliği güncelle
  updateBrokerSubscription: async (brokerId, data) => {
    const response = await axiosInstance.put(`/subscriptions/broker/${brokerId}`, data);
    return response.data;
  },

  // Aktif planları getir
  getActivePlans: async () => {
    const response = await axiosInstance.get('/subscriptions/plans/active');
    return response.data.plans || [];
  },

  // Firma kullanıcılarını getir
  getCompanyUsers: async (companyId) => {
    const response = await axiosInstance.get(`/users/company/${companyId}`);
    return response.data.users || [];
  },

  // Ödeme sorumlusu ayarla/kaldır
  setPaymentResponsible: async (userId, isPaymentResponsible) => {
    const response = await axiosInstance.put(`/users/${userId}/payment-responsible`, { isPaymentResponsible });
    return response.data;
  },

  // Manuel kredi ekle (SUPER_ADMIN)
  addManualCredit: async (brokerId, data) => {
    const response = await axiosInstance.post(`/subscriptions/broker/${brokerId}/add-credit`, data);
    return response.data;
  },
};
