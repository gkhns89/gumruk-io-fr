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

  // Hesabım > Profil tab: kendi kullanıcı adımı güncelle
  updateMyProfile: async ({ username }) => {
    try {
      const response = await axiosInstance.put('/users/me/profile', { username });
      return { success: true, data: response.data };
    } catch (error) {
      logError('UserService - updateMyProfile', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Profil güncellenemedi',
      };
    }
  },

  // Hesabım > Güvenlik tab: kendi şifremi değiştir
  changeMyPassword: async ({ currentPassword, newPassword, confirmPassword }) => {
    try {
      const response = await axiosInstance.post('/users/me/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      return { success: true, data: response.data };
    } catch (error) {
      logError('UserService - changeMyPassword', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Şifre değiştirilemedi',
      };
    }
  },
};