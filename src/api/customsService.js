import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

/**
 * Customs API Service
 * Handles API calls for customs offices (Gümrük İdareleri)
 */
export const customsService = {

  /**
   * Get all active customs offices (for dropdown)
   */
  getActiveCustoms: async () => {
    try {
      console.log("📋 Fetching active customs offices...");

      const response = await axiosInstance.get('/customs/active');

      console.log(`✅ ${response.data.length} active customs loaded`);

      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - getActiveCustoms', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Failed to load customs offices',
      };
    }
  },

  /**
   * Get all customs offices (for admin panel)
   */
  getAllCustoms: async () => {
    try {
      console.log("📋 Fetching all customs offices...");

      const response = await axiosInstance.get('/customs/all');

      console.log(`✅ ${response.data.length} customs loaded`);

      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - getAllCustoms', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Failed to load customs offices',
      };
    }
  },

  /**
   * Get customs by ID
   */
  getCustomsById: async (id) => {
    try {
      const response = await axiosInstance.get(`/customs/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - getCustomsById', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Customs not found',
      };
    }
  },

  /**
   * Manual refresh (admin only)
   */
  manualRefresh: async () => {
    try {
      console.log("🔄 Triggering manual customs refresh...");

      const response = await axiosInstance.patch('/customs/refresh');

      console.log("✅ Customs refresh completed:", response.data);

      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - manualRefresh', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Failed to refresh customs',
      };
    }
  },

  /**
   * Test scheduled job (admin only)
   * Manually trigger the same update that runs every 15 days
   */
  testScheduledUpdate: async () => {
    try {
      console.log("🧪 Testing scheduled job (15-day update)...");

      const response = await axiosInstance.patch('/customs/test-scheduled-update');

      console.log("✅ Scheduled job test completed:", response.data);

      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - testScheduledUpdate', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Failed to test scheduled job',
      };
    }
  }
};
