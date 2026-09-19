import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

/**
 * Zamanlanmış işlerin son durumu (SUPER_ADMIN, salt okunur).
 *
 * Uç `scheduled_job_runs` kaydını ve zamanlayıcı planını birleştirir: iş başına son koşu, sayılar, ardışık hata,
 * son hata özeti, son başarılı koşu, beklenen sonraki koşu ve `stale` (uyarıyla aynı kural). Hiç çalışmamış iş de
 * gelir, alanları boş olur. "Şimdi çalıştır" yok; sayfa yalnızca gösterir.
 */
export const scheduledJobService = {
  list: async () => {
    try {
      const response = await axiosInstance.get('/admin/scheduled-jobs');
      return { success: true, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      logError('ScheduledJobService - list', error);
      return { success: false, error: getApiErrorMessage(error, t('scheduledJobs.loadError')) };
    }
  },
};

export default scheduledJobService;
