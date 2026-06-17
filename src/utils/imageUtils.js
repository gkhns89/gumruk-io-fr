import axiosInstance from '../api/axios';
import { logError } from './errorUtils';

// Bulunamayan (404) görsel URL'lerini hatırla; aynı URL için tekrar tekrar
// (her sayfa geçişinde Sidebar yeniden mount oldukça) boşuna istek atmayalım.
const missingImageUrls = new Set();

/**
 * Bir görsel URL'i için "bulunamadı" işaretini kaldırır (başarılı yükleme/silme sonrası
 * çağrılır ki aynı URL yeniden denenebilsin).
 */
export function clearImageCache(relativeUrl) {
  if (relativeUrl) missingImageUrls.delete(relativeUrl);
}

/**
 * Auth'lu bir resim endpoint'ini (örn. "/users/5/avatar") blob olarak çeker ve
 * <img src> için kullanılabilir bir objectURL döndürür. Çağıran taraf, işi
 * bitince URL.revokeObjectURL ile serbest bırakmalıdır. Hata/404 durumunda null döner.
 */
export async function fetchAuthedImageObjectUrl(relativeUrl) {
  if (!relativeUrl) return null;
  if (missingImageUrls.has(relativeUrl)) return null; // bilinen 404 — ağ isteği atma
  try {
    const response = await axiosInstance.get(relativeUrl, {
      responseType: 'blob',
      silentOnError: true,
    });
    return URL.createObjectURL(response.data);
  } catch (error) {
    if (error?.response?.status === 404) {
      missingImageUrls.add(relativeUrl); // bir daha deneme
    } else {
      logError('imageUtils - fetchAuthedImageObjectUrl', error);
    }
    return null;
  }
}

/**
 * Seçilen resmi tarayıcıda işler: şeffaf alanları beyaza bastırır (şeffaf logolar
 * düzgün görünsün diye), en uzun kenarı `maxSize`'a küçültür ve WebP'e çevirir.
 * Sonuç olarak küçük bir `.webp` File döner. WebP desteklenmiyorsa orijinal dosyayı döndürür.
 *
 * @param {File} file
 * @param {{maxSize?: number, quality?: number, background?: string}} opts
 * @returns {Promise<File>}
 */
export function processImageToWebp(file, { maxSize = 512, quality = 0.82, background = '#ffffff' } = {}) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) {
      resolve(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let { width, height } = img;
        if (!width || !height) { resolve(file); return; }
        if (width > maxSize || height > maxSize) {
          const scale = Math.min(maxSize / width, maxSize / height);
          width = Math.max(1, Math.round(width * scale));
          height = Math.max(1, Math.round(height * scale));
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Şeffaf logoların düzgün görünmesi için beyaz arka plan bastır
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; } // tarayıcı webp üretemedi → orijinali kullan
            const base = (file.name || 'image').replace(/\.[^.]+$/, '');
            resolve(new File([blob], `${base}.webp`, { type: 'image/webp' }));
          },
          'image/webp',
          quality,
        );
      } catch {
        resolve(file);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/**
 * Blob'u base64 data URL'e çevirir.
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Auth'lu resim endpoint'ini çekip base64 data URL döndürür (login cache için).
 * Hata durumunda null döner.
 */
export async function fetchAuthedImageDataUrl(relativeUrl) {
  if (!relativeUrl) return null;
  if (missingImageUrls.has(relativeUrl)) return null;
  try {
    const response = await axiosInstance.get(relativeUrl, {
      responseType: 'blob',
      silentOnError: true,
    });
    return await blobToDataUrl(response.data);
  } catch (error) {
    if (error?.response?.status === 404) {
      missingImageUrls.add(relativeUrl);
    } else {
      logError('imageUtils - fetchAuthedImageDataUrl', error);
    }
    return null;
  }
}

// ====================================================================
// Login ön-doldurma cache'i (yalnızca localStorage — sunucuya sorulmaz)
// ====================================================================

const REMEMBERED_KEY = 'rememberedLoginProfiles';
const MAX_REMEMBERED = 5;

function readStore() {
  try {
    const raw = localStorage.getItem(REMEMBERED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Başarılı girişten sonra firma/profil görsellerini ve adlarını bu makinede saklar.
 * Böylece kullanıcı tekrar mail girdiğinde bilgiler lokal olarak doldurulabilir.
 */
export function saveLoginProfile({ email, username, companyName, avatarDataUrl, logoDataUrl }) {
  if (!email) return;
  try {
    const store = readStore();
    const key = email.trim().toLowerCase();
    store[key] = {
      username: username || null,
      companyName: companyName || null,
      avatarDataUrl: avatarDataUrl || null,
      logoDataUrl: logoDataUrl || null,
      ts: Date.now(),
    };

    // En fazla MAX_REMEMBERED profil tut (en eski olanları at)
    const entries = Object.entries(store).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));
    const trimmed = Object.fromEntries(entries.slice(0, MAX_REMEMBERED));
    localStorage.setItem(REMEMBERED_KEY, JSON.stringify(trimmed));
  } catch (error) {
    // localStorage dolu/erişilemez olabilir — sessizce geç
    logError('imageUtils - saveLoginProfile', error);
  }
}

/**
 * Verilen mail için bu makinede saklı profil bilgisini döndürür (yoksa null).
 */
export function getLoginProfile(email) {
  if (!email) return null;
  const store = readStore();
  return store[email.trim().toLowerCase()] || null;
}
