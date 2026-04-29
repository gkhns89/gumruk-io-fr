import axiosInstance from './axios';

export const addonService = {
  // Şablon kataloğu
  getAllTemplates: async () => {
    const res = await axiosInstance.get('/addons/templates');
    return res.data.templates || [];
  },
  getActiveTemplates: async () => {
    const res = await axiosInstance.get('/addons/templates/active');
    return res.data.templates || [];
  },
  createTemplate: async (data) => {
    const res = await axiosInstance.post('/addons/templates', data);
    return res.data;
  },
  updateTemplate: async (id, data) => {
    const res = await axiosInstance.put(`/addons/templates/${id}`, data);
    return res.data;
  },
  deleteTemplate: async (id) => {
    const res = await axiosInstance.delete(`/addons/templates/${id}`);
    return res.data;
  },

  // Broker ek ücretleri
  getBrokerAddons: async (brokerId) => {
    const res = await axiosInstance.get(`/addons/broker/${brokerId}`);
    return res.data.addons || [];
  },
  addBrokerAddon: async (brokerId, data) => {
    const res = await axiosInstance.post(`/addons/broker/${brokerId}`, data);
    return res.data;
  },
  updateAddon: async (addonId, data) => {
    const res = await axiosInstance.put(`/addons/${addonId}`, data);
    return res.data;
  },
  removeAddon: async (addonId) => {
    const res = await axiosInstance.delete(`/addons/${addonId}`);
    return res.data;
  },

  updatePayPreference: async (addonId, payFromBalance) => {
    const res = await axiosInstance.patch(`/addons/${addonId}/pay-preference`, { payFromBalance });
    return res.data;
  },
};
