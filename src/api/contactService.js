import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

export const contactService = {
  getContactInfo: async () => {
    try {
      const response = await axiosInstance.get('/contact');
      return { success: true, data: response.data };
    } catch (error) {
      logError('contactService - getContactInfo', error);
      return { success: false, error: error.message };
    }
  },

  getAllContactInfo: async () => {
    try {
      const response = await axiosInstance.get('/contact/all');
      return { success: true, data: response.data };
    } catch (error) {
      logError('contactService - getAllContactInfo', error);
      return { success: false, error: error.message };
    }
  },

  createContactInfo: async (data) => {
    try {
      const response = await axiosInstance.post('/contact', data);
      return { success: true, data: response.data };
    } catch (error) {
      logError('contactService - createContactInfo', error);
      return { success: false, error: getApiErrorMessage(error, t('api.contact.createError')) };
    }
  },

  updateContactInfo: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/contact/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      logError('contactService - updateContactInfo', error);
      return { success: false, error: getApiErrorMessage(error, t('api.contact.updateError')) };
    }
  },

  deleteContactInfo: async (id) => {
    try {
      await axiosInstance.delete(`/contact/${id}`);
      return { success: true };
    } catch (error) {
      logError('contactService - deleteContactInfo', error);
      return { success: false, error: t('api.contact.deleteError') };
    }
  },
};
