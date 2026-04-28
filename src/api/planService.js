import axiosInstance from './axios';

export const planService = {
  getAllPlans: async () => {
    const { data } = await axiosInstance.get('/subscriptions/plans');
    return data.plans || [];
  },

  createPlan: async (payload) => {
    const { data } = await axiosInstance.post('/subscriptions/plans', payload);
    return data;
  },

  updatePlan: async (id, payload) => {
    const { data } = await axiosInstance.put(`/subscriptions/plans/${id}`, payload);
    return data;
  },

  deactivatePlan: async (id) => {
    const { data } = await axiosInstance.delete(`/subscriptions/plans/${id}`);
    return data;
  },

  getPlanSubscribers: async (id) => {
    const { data } = await axiosInstance.get(`/subscriptions/plans/${id}/subscribers`);
    return data;
  },
};
