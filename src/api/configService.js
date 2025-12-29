import axiosInstance from './axios';

export const configService = {
  // Dosya yükleme konfigürasyonunu getir
  getFileUploadConfig: async () => {
    try {
      const response = await axiosInstance.get('/config/file-upload');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Konfigürasyon alınamadı',
        // Fallback default değerler
        data: {
          maxFileSizeMB: 10,
          maxFileSizeBytes: 10485760,
          allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.docx'],
          allowedFormats: '.pdf, .jpg, .jpeg, .png, .docx'
        }
      };
    }
  },

  // Dosya boyutu kontrolü
  validateFileSize: (file, maxSizeBytes) => {
    if (!file) return { valid: false, error: 'Dosya seçilmedi' };

    if (file.size > maxSizeBytes) {
      const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `Dosya boyutu çok büyük (${fileSizeMB} MB). Maksimum: ${maxSizeMB} MB`
      };
    }

    return { valid: true };
  },

  // Dosya uzantısı kontrolü
  validateFileExtension: (file, allowedExtensions) => {
    if (!file) return { valid: false, error: 'Dosya seçilmedi' };

    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext.toLowerCase()));

    if (!isAllowed) {
      return {
        valid: false,
        error: `Dosya formatı desteklenmiyor. İzin verilen formatlar: ${allowedExtensions.join(', ')}`
      };
    }

    return { valid: true };
  },

  // Tam dosya validasyonu
  validateFile: (file, config) => {
    // Dosya boyutu kontrolü
    const sizeCheck = configService.validateFileSize(file, config.maxFileSizeBytes);
    if (!sizeCheck.valid) return sizeCheck;

    // Dosya uzantısı kontrolü
    const extCheck = configService.validateFileExtension(file, config.allowedExtensions);
    if (!extCheck.valid) return extCheck;

    return { valid: true };
  }
};
