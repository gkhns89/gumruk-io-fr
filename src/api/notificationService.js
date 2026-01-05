import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

/**
 * Notification Center API Service
 * Backend bildirim sistemi ile iletişim kurar
 *
 * Endpoint'ler:
 * - POST   /api/notifications          - Yeni bildirim oluştur
 * - GET    /api/notifications          - Kullanıcının tüm bildirimlerini getir
 * - GET    /api/notifications/unread   - Okunmamış bildirim sayısı
 * - PUT    /api/notifications/:id/read - Bildirimi okundu işaretle
 * - PUT    /api/notifications/read-all - Tümünü okundu işaretle
 * - DELETE /api/notifications/:id      - Bildirimi sil
 * - DELETE /api/notifications          - Tümünü sil
 */
export const notificationService = {
  // ==========================================
  // READ OPERATIONS
  // ==========================================

  /**
   * Kullanıcının tüm bildirimlerini getirir (en yeni başta)
   * GET /api/notifications
   */
  getAll: async () => {
    try {
      console.log("🔔 Tüm bildirimler getiriliyor...");

      const response = await axiosInstance.get('/notifications');

      const notifications = Array.isArray(response.data) ? response.data : [];

      console.log(`✅ ${notifications.length} bildirim getirildi`);

      return { success: true, data: notifications };
    } catch (error) {
      logError('NotificationService - getAll', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Bildirimler alınamadı',
      };
    }
  },

  /**
   * Kullanıcının okunmamış bildirim sayısını getirir
   * GET /api/notifications/unread
   */
  getUnreadCount: async () => {
    try {
      console.log("🔢 Okunmamış bildirim sayısı getiriliyor...");

      const response = await axiosInstance.get('/notifications/unread');

      const count = response.data?.count || 0;

      console.log(`✅ Okunmamış bildirim sayısı: ${count}`);

      return { success: true, data: count };
    } catch (error) {
      logError('NotificationService - getUnreadCount', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Okunmamış sayı alınamadı',
      };
    }
  },

  // ==========================================
  // CREATE OPERATION
  // ==========================================

  /**
   * Yeni bildirim oluşturur
   * POST /api/notifications
   *
   * @param {Object} notificationData - Bildirim verisi
   * @param {string} notificationData.type - SUCCESS, ERROR, INFO, WARNING
   * @param {string} notificationData.title - Başlık (opsiyonel)
   * @param {string} notificationData.message - Mesaj
   * @param {string} notificationData.entityType - Entity tipi (opsiyonel)
   * @param {number} notificationData.entityId - Entity ID (opsiyonel)
   */
  create: async (notificationData) => {
    try {
      console.log("📝 Yeni bildirim oluşturuluyor...", notificationData);

      const response = await axiosInstance.post('/notifications', notificationData);

      console.log("✅ Bildirim oluşturuldu:", response.data);

      return {
        success: true,
        data: response.data,
        message: 'Bildirim başarıyla oluşturuldu'
      };
    } catch (error) {
      logError('NotificationService - create', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Bildirim oluşturulamadı',
      };
    }
  },

  // ==========================================
  // UPDATE OPERATIONS
  // ==========================================

  /**
   * Bildirimi okundu olarak işaretler
   * PUT /api/notifications/:id/read
   *
   * @param {number} id - Bildirim ID
   */
  markAsRead: async (id) => {
    try {
      console.log(`✅ Bildirim ${id} okundu işaretleniyor...`);

      const response = await axiosInstance.put(`/notifications/${id}/read`);

      console.log("✅ Bildirim okundu işaretlendi:", response.data);

      return {
        success: true,
        data: response.data,
        message: 'Bildirim okundu işaretlendi'
      };
    } catch (error) {
      logError('NotificationService - markAsRead', error);

      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Bu bildirimi işaretleme yetkiniz yok.',
        };
      }

      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Bildirim bulunamadı.',
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Bildirim işaretlenemedi',
      };
    }
  },

  /**
   * Kullanıcının tüm bildirimlerini okundu olarak işaretler
   * PUT /api/notifications/read-all
   */
  markAllAsRead: async () => {
    try {
      console.log("✅ Tüm bildirimler okundu işaretleniyor...");

      const response = await axiosInstance.put('/notifications/read-all');

      const count = response.data?.count || 0;

      console.log(`✅ ${count} bildirim okundu işaretlendi`);

      return {
        success: true,
        data: response.data,
        message: response.data?.message || 'Tüm bildirimler okundu işaretlendi'
      };
    } catch (error) {
      logError('NotificationService - markAllAsRead', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Bildirimler işaretlenemedi',
      };
    }
  },

  // ==========================================
  // DELETE OPERATIONS
  // ==========================================

  /**
   * Bildirimi siler
   * DELETE /api/notifications/:id
   *
   * @param {number} id - Bildirim ID
   */
  delete: async (id) => {
    try {
      console.log(`🗑️ Bildirim ${id} siliniyor...`);

      const response = await axiosInstance.delete(`/notifications/${id}`);

      console.log("✅ Bildirim silindi");

      return {
        success: true,
        data: response.data,
        message: response.data?.message || 'Bildirim silindi'
      };
    } catch (error) {
      logError('NotificationService - delete', error);

      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Bu bildirimi silme yetkiniz yok.',
        };
      }

      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Bildirim bulunamadı.',
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Bildirim silinemedi',
      };
    }
  },

  /**
   * Kullanıcının tüm bildirimlerini siler
   * DELETE /api/notifications
   */
  deleteAll: async () => {
    try {
      console.log("🗑️ Tüm bildirimler siliniyor...");

      const response = await axiosInstance.delete('/notifications');

      const count = response.data?.count || 0;

      console.log(`✅ ${count} bildirim silindi`);

      return {
        success: true,
        data: response.data,
        message: response.data?.message || 'Tüm bildirimler silindi'
      };
    } catch (error) {
      logError('NotificationService - deleteAll', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Bildirimler silinemedi',
      };
    }
  },
};
