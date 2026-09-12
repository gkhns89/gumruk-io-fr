import axiosInstance from './axios';
import { t } from '../locales';

export const sessionService = {
  /**
   * Oturum politikası bilgisi — token ömürleri ve tek oturum kuralı (SUPER_ADMIN only).
   * Salt okunur; değerler backend ortam değişkenlerinden gelir.
   */
  getSessionPolicy: async () => {
    try {
      const response = await axiosInstance.get('/sessions/policy');
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('❌ Get session policy failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || t('api.session.policyLoadError')
      };
    }
  },

  /**
   * Tüm aktif session'ları getir (SUPER_ADMIN only)
   */
  getAllActiveSessions: async () => {
    try {
      const response = await axiosInstance.get('/sessions/all');
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('❌ Get all sessions failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || t('api.session.listError')
      };
    }
  },

  /**
   * Kullanıcının session'larını getir (SUPER_ADMIN only)
   */
  getUserSessions: async (userId) => {
    try {
      const response = await axiosInstance.get(`/sessions/user/${userId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error(`❌ Get user sessions failed (userId: ${userId}):`, error);
      return {
        success: false,
        error: error.response?.data?.message || t('api.session.userListError')
      };
    }
  },

  /**
   * Tek session invalidate et (SUPER_ADMIN only)
   */
  invalidateSession: async (sessionId) => {
    try {
      const response = await axiosInstance.delete(`/sessions/${sessionId}`);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error(`❌ Invalidate session failed (sessionId: ${sessionId}):`, error);
      return {
        success: false,
        error: error.response?.data?.message || t('api.session.invalidateError')
      };
    }
  },

  /**
   * Kullanıcının tüm session'larını invalidate et (SUPER_ADMIN only)
   */
  invalidateAllUserSessions: async (userId) => {
    try {
      const response = await axiosInstance.delete(`/sessions/user/${userId}/all`);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error(`❌ Invalidate all user sessions failed (userId: ${userId}):`, error);
      return {
        success: false,
        error: error.response?.data?.message || t('api.session.invalidateAllError')
      };
    }
  },

  /**
   * Toplu session invalidate (SUPER_ADMIN only)
   */
  bulkInvalidateSessions: async (sessionIds) => {
    try {
      const response = await axiosInstance.delete('/sessions/bulk', {
        data: sessionIds
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('❌ Bulk invalidate sessions failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || t('api.session.bulkInvalidateError')
      };
    }
  }
};
