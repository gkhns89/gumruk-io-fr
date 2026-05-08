import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

export const feedbackService = {
  getClickUpStatus: async () => {
    try {
      const response = await axiosInstance.get('/clickup/status');
      return { success: true, data: response.data };
    } catch (error) {
      logError('feedbackService - getClickUpStatus', error);
      return { success: false, error: error.message };
    }
  },

  getClickUpSettings: async () => {
    try {
      const response = await axiosInstance.get('/clickup/settings');
      return { success: true, data: response.data };
    } catch (error) {
      logError('feedbackService - getClickUpSettings', error);
      return { success: false, error: error.message };
    }
  },

  saveClickUpSettings: async (data) => {
    try {
      const response = await axiosInstance.put('/clickup/settings', data);
      return { success: true, data: response.data };
    } catch (error) {
      logError('feedbackService - saveClickUpSettings', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Ayarlar kaydedilemedi',
      };
    }
  },

  testClickUpConnection: async () => {
    try {
      const response = await axiosInstance.post('/clickup/test');
      return { success: true, data: response.data };
    } catch (error) {
      logError('feedbackService - testClickUpConnection', error);
      return { success: false, error: error.message };
    }
  },

  getFeedbackTasks: async () => {
    try {
      const response = await axiosInstance.get('/feedback');
      return { success: true, data: response.data };
    } catch (error) {
      logError('feedbackService - getFeedbackTasks', error);
      return { success: false, error: error.message };
    }
  },

  getMyFeedback: async () => {
    try {
      const response = await axiosInstance.get('/feedback/my');
      return { success: true, data: response.data };
    } catch (error) {
      logError('feedbackService - getMyFeedback', error);
      return { success: false, error: error.message };
    }
  },

  submitFeedback: async (data, screenshot) => {
    try {
      const formData = new FormData();
      formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }

      const response = await axiosInstance.post('/feedback', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { success: true, data: response.data };
    } catch (error) {
      logError('feedbackService - submitFeedback', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Feedback gönderilemedi',
      };
    }
  },
};
