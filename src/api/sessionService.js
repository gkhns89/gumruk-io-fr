import axiosInstance from './axios';

export const sessionService = {
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
        error: error.response?.data?.message || 'Session\'lar yüklenemedi'
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
        error: error.response?.data?.message || 'Kullanıcı session\'ları yüklenemedi'
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
        error: error.response?.data?.message || 'Session sonlandırılamadı'
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
        error: error.response?.data?.message || 'Kullanıcı session\'ları sonlandırılamadı'
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
        error: error.response?.data?.message || 'Toplu session sonlandırma başarısız'
      };
    }
  }
};
