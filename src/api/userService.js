import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

export const userService = {
  // Kullanıcı profili
  getProfile: async () => {
    try {
      const response = await axiosInstance.get('/users/profile');
      return { success: true, data: response.data };
    } catch (error) {
      logError('UserService - getProfile', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Profil bilgileri alınamadı',
      };
    }
  },
};