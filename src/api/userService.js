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

  // Hesabım: kendi profil fotoğrafımı yükle/değiştir
  uploadMyAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosInstance.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { success: true, data: response.data };
    } catch (error) {
      logError('UserService - uploadMyAvatar', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Fotoğraf yüklenemedi',
      };
    }
  },

  // Çalışan Yönetimi: bir kullanıcının profil fotoğrafını yükle (yetkili admin)
  uploadUserAvatar: async (userId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosInstance.post(`/users/${userId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { success: true, data: response.data };
    } catch (error) {
      logError('UserService - uploadUserAvatar', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Fotoğraf yüklenemedi',
      };
    }
  },

  // Profil fotoğrafını kaldır (kendisi veya yetkili admin)
  deleteUserAvatar: async (userId) => {
    try {
      const response = await axiosInstance.delete(`/users/${userId}/avatar`);
      return { success: true, data: response.data };
    } catch (error) {
      logError('UserService - deleteUserAvatar', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Fotoğraf kaldırılamadı',
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