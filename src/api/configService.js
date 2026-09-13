import axiosInstance from './axios';
import { getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

// Backend multipart üst sınırı (10 MB). Aşan istek gövdesi tarayıcıda 413 yerine bağlantı sıfırlanması
// olarak dönebiliyor; bu yüzden her yükleme yolu dosyayı göndermeden önce bu sınırla denetler.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// /config/file-upload alınamazsa kullanılan varsayılanlar
const DEFAULT_UPLOAD_CONFIG = {
  maxFileSizeMB: 10,
  maxFileSizeBytes: MAX_UPLOAD_BYTES,
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.docx'],
  allowedFormats: '.pdf, .jpg, .jpeg, .png, .docx'
};

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
        error: getApiErrorMessage(error, t('api.file.configError')),
        // Fallback default değerler
        data: DEFAULT_UPLOAD_CONFIG
      };
    }
  },

  // Dosya boyutu kontrolü — sınır verilmezse ya da backend limitinden büyükse MAX_UPLOAD_BYTES geçerli
  validateFileSize: (file, maxSizeBytes = MAX_UPLOAD_BYTES) => {
    if (!file) return { valid: false, error: t('api.file.notSelected') };

    const limitBytes = Math.min(maxSizeBytes || MAX_UPLOAD_BYTES, MAX_UPLOAD_BYTES);
    if (file.size > limitBytes) {
      const maxSizeMB = (limitBytes / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: t('api.file.tooLarge', { size: fileSizeMB, max: maxSizeMB })
      };
    }

    return { valid: true };
  },

  // Dosya uzantısı kontrolü
  validateFileExtension: (file, allowedExtensions) => {
    if (!file) return { valid: false, error: t('api.file.notSelected') };

    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext.toLowerCase()));

    if (!isAllowed) {
      return {
        valid: false,
        error: t('api.file.unsupportedFormat', { formats: allowedExtensions.join(', ') })
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
