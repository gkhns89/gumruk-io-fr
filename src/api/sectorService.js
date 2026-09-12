import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';
import { t } from '../locales';

export const sectorService = {
  // Seçim listeleri için aktif sektörler
  getSectors: async () => {
    try {
      const response = await axiosInstance.get('/sectors');
      return { success: true, data: response.data.sectors || [] };
    } catch (error) {
      logError('SectorService - getSectors', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.sector.listError'),
      };
    }
  },

  // Yönetim ekranı: pasifler dahil, kullanım sayılarıyla (SUPER_ADMIN)
  getAllSectors: async () => {
    try {
      const response = await axiosInstance.get('/sectors/all');
      return { success: true, data: response.data.sectors || [] };
    } catch (error) {
      logError('SectorService - getAllSectors', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.sector.listError'),
      };
    }
  },

  createSector: async ({ name, displayOrder }) => {
    try {
      const response = await axiosInstance.post('/sectors', { name, displayOrder });
      return { success: true, data: response.data.sector };
    } catch (error) {
      logError('SectorService - createSector', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.sector.createError'),
      };
    }
  },

  updateSector: async (id, { name, displayOrder, isActive }) => {
    try {
      const response = await axiosInstance.put(`/sectors/${id}`, { name, displayOrder, isActive });
      return { success: true, data: response.data.sector };
    } catch (error) {
      logError('SectorService - updateSector', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.sector.updateError'),
      };
    }
  },

  /**
   * Siler. Sektör bir firmaya atanmışsa backend 409 dönüyor —
   * çağıran tarafın "pasife al" önerebilmesi için ayrıca işaretleniyor.
   */
  deleteSector: async (id) => {
    try {
      await axiosInstance.delete(`/sectors/${id}`);
      return { success: true };
    } catch (error) {
      logError('SectorService - deleteSector', error);
      return {
        success: false,
        inUse: error.response?.status === 409,
        error: error.response?.data?.error || t('api.sector.deleteError'),
      };
    }
  },
};
