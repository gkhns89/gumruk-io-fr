import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { unsavedChangesDialog, isStackedDialogOpen } from '../utils/unsavedChangesDialog';

// Kullanıcının formla etkileşime geçtiğini gösteren olaylar. Programatik odak (açılıştaki otomatik odak) sayılmaz.
const INTERACTION_EVENTS = ['keydown', 'mousedown', 'pointerdown', 'touchstart', 'click', 'input', 'change', 'paste', 'drop'];

/**
 * Form modallarının kapatma koruması. Form değiştiyse arka plan tıklaması, çarpı, Vazgeç ve ESC modalı kapatmaz;
 * "Kaydedilmemiş değişiklikler" diyaloğunu açar. Değişiklik yoksa `onClose` hemen çağrılır.
 *
 * Değişiklik tespiti: `values`, kullanıcının değiştirebildiği değerlerin anlık görüntüsüdür (modal `useMemo` ile
 * üretir). Kullanıcı modalla ilk kez etkileşene kadar temel görüntü `values`'u izler; böylece açılıştaki async
 * yüklemelerin doldurduğu alanlar "değişti" sayılmaz. İlk tuş/tıklamadan sonra temel sabitlenir ve karşılaştırma
 * JSON görüntüsüyle yapılır.
 *
 * Başarılı kayıt `onSuccess` ile modalı kapattırır, bu hook'tan geçmez. Kayıt ya da Ctrl+S kapatma değildir.
 *
 * @param {object}   options
 * @param {object}   options.values        Kullanıcının düzenleyebildiği değerler (liste seçenekleri, yükleme bayrakları hariç).
 * @param {Function} options.onClose       Gerçekten kapatan fonksiyon.
 * @param {boolean}  [options.enabled=true] Salt okunur görünümlerde false: koruma ve `beforeunload` devre dışı.
 * @param {Function} [options.onSaveDraft] Verilirse diyalog "Taslak olarak kaydet" seçeneğini gösterir. `false`
 *   dönerse modal açık kalır.
 * @returns {{ requestClose: Function, isDirty: boolean }}
 */
export function useUnsavedChangesGuard({ values, onClose, enabled = true, onSaveDraft }) {
  const serialized = useMemo(() => JSON.stringify(values ?? null), [values]);

  const baselineRef = useRef(serialized);
  const currentRef = useRef(serialized);
  const touchedRef = useRef(false);
  const promptOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onSaveDraftRef = useRef(onSaveDraft);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
    onSaveDraftRef.current = onSaveDraft;
  });

  useEffect(() => {
    currentRef.current = serialized;
    if (!touchedRef.current) baselineRef.current = serialized;
    setIsDirty(enabled && serialized !== baselineRef.current);
  }, [serialized, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const markTouched = () => { touchedRef.current = true; };
    INTERACTION_EVENTS.forEach((type) => document.addEventListener(type, markTouched, true));
    return () => INTERACTION_EVENTS.forEach((type) => document.removeEventListener(type, markTouched, true));
  }, [enabled]);

  // Sayfa yenilenirken ya da sekme kapanırken tarayıcının standart uyarısı. Kapanış ve unmount'ta kaldırılır.
  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const requestClose = useCallback(async () => {
    // Üstte açık bir diyalog varsa ESC onundur; aynı tuş alttaki modalı da kapatmasın.
    if (promptOpenRef.current || isStackedDialogOpen()) return;

    if (!enabled || currentRef.current === baselineRef.current) {
      onCloseRef.current?.();
      return;
    }

    promptOpenRef.current = true;
    try {
      const choice = await unsavedChangesDialog({ allowDraft: typeof onSaveDraftRef.current === 'function' });
      if (choice === 'discard') {
        onCloseRef.current?.();
      } else if (choice === 'draft') {
        const saved = await onSaveDraftRef.current?.();
        if (saved !== false) onCloseRef.current?.();
      }
    } finally {
      promptOpenRef.current = false;
    }
  }, [enabled]);

  return { requestClose, isDirty };
}
