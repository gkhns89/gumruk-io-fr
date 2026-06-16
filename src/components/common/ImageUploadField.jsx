import React, { useRef, useState } from 'react';
import AuthedImage from './AuthedImage';
import { showSuccess, showError } from '../../utils/toastUtils';
import { processImageToWebp } from '../../utils/imageUtils';

// Seçilebilir dosya üst sınırı. Görsel yüklemeden önce tarayıcıda WebP'e küçültülür,
// dolayısıyla sunucuya giden dosya çok daha küçüktür (genelde < 100 KB).
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB (işlenmeden önceki ham dosya)

/**
 * Avatar/logo yükleme alanı. Mevcut görseli gösterir (yoksa fallback), dosya seçtirir,
 * boyut/tip kontrolü yapar, verilen uploadFn'i çağırır ve başarıda onUploaded ile yeniler.
 *
 * Props:
 *  - currentUrl: mevcut görselin relative API yolu (AuthedImage ile gösterilir)
 *  - bustKey: currentUrl değişmese de yeniden yüklemeyi tetiklemek için (örn. son yükleme zamanı)
 *  - uploadFn: async (file) => { success, error }
 *  - deleteFn: async () => { success, error }  (opsiyonel; yoksa kaldır butonu görünmez)
 *  - onUploaded: () => void  (başarılı yükleme/kaldırma sonrası — listeyi/profili yenile)
 *  - shape: 'circle' | 'square'  (varsayılan 'circle')
 *  - size: px (varsayılan 96)
 *  - fallback: görsel yokken gösterilecek node (örn. baş harf)
 *  - canEdit: düzenleme yetkisi (varsayılan true)
 *  - compact: yalnızca tıklanabilir görseli gösterir (yan butonlar/açıklama gizli) — liste/kart içinde kullanışlı
 */
export default function ImageUploadField({
  currentUrl,
  bustKey,
  uploadFn,
  deleteFn,
  onUploaded,
  shape = 'circle',
  size = 96,
  fallback = null,
  canEdit = true,
  compact = false,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const boxStyle = { width: size, height: size };

  const handlePick = () => {
    if (!busy && canEdit) inputRef.current?.click();
  };

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // aynı dosya tekrar seçilebilsin
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Sadece resim dosyaları yüklenebilir');
      return;
    }
    if (file.size > MAX_SIZE) {
      showError('Resim boyutu 5 MB’ı aşamaz');
      return;
    }

    setBusy(true);
    // Tarayıcıda beyaz arka plan + küçültme + WebP'e çevirip öyle yükle
    const optimized = await processImageToWebp(file, { maxSize: shape === 'circle' ? 320 : 512 });
    const res = await uploadFn(optimized);
    setBusy(false);
    if (res?.success) {
      showSuccess('Görsel güncellendi');
      onUploaded?.();
    } else {
      showError(res?.error || 'Görsel yüklenemedi');
    }
  };

  const handleDelete = async () => {
    if (!deleteFn || busy) return;
    setBusy(true);
    const res = await deleteFn();
    setBusy(false);
    if (res?.success) {
      showSuccess('Görsel kaldırıldı');
      onUploaded?.();
    } else {
      showError(res?.error || 'Görsel kaldırılamadı');
    }
  };

  // Kompakt mod: yalnızca tıklanabilir görsel kutusu (gizli file input ile)
  if (compact) {
    return (
      <div
        className={`relative ${radiusClass} overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 ${canEdit ? 'cursor-pointer group' : ''}`}
        style={boxStyle}
        onClick={handlePick}
        title={canEdit ? 'Logoyu değiştir' : ''}
      >
        <AuthedImage
          key={bustKey}
          url={currentUrl}
          alt=""
          imgClassName="w-full h-full object-cover"
          fallback={fallback}
        />
        {canEdit && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg">photo_camera</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          </div>
        )}
        {canEdit && (
          <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={`relative ${radiusClass} overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 ${canEdit ? 'cursor-pointer group' : ''}`}
        style={boxStyle}
        onClick={handlePick}
        title={canEdit ? 'Görseli değiştir' : ''}
      >
        <AuthedImage
          key={bustKey}
          url={currentUrl}
          alt=""
          imgClassName="w-full h-full object-cover"
          fallback={fallback}
        />
        {canEdit && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handlePick}
            disabled={busy}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">upload</span>
            Yükle / Değiştir
          </button>
          {deleteFn && currentUrl && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Kaldır
            </button>
          )}
          <p className="text-[11px] text-text-secondary">PNG/JPG/WebP, en fazla 5 MB. Otomatik olarak WebP'e küçültülür; şeffaf logolar beyaz zemine alınır.</p>
        </div>
      )}
    </div>
  );
}
