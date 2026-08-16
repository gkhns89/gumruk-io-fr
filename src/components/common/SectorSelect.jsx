import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sectorService } from '../../api/sectorService';

/**
 * Sektör çoklu seçimi — açılır liste içinde satır satır işaretleme.
 *
 * Kapalıyken yalnızca seçili sektörler rozet olarak duruyor; katalog büyüdükçe
 * form yüksekliği sabit kalsın diye tüm liste ekranda tutulmuyor. Liste 8'den
 * uzun olduğunda içinde arama kutusu çıkıyor.
 *
 * @param {number[]} props.value - Seçili sektör id'leri
 * @param {function} props.onChange - Yeni id dizisiyle çağrılır
 * @param {boolean} props.disabled - Form gönderilirken kilitlemek için
 */
export default function SectorSelect({ value = [], onChange, disabled = false }) {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    sectorService.getSectors()
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setSectors(result.data);
        } else {
          setError(result.error || 'Sektörler yüklenemedi');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Dışarı tıklama ve Esc ile kapat
  useEffect(() => {
    if (!open) return;

    const handlePointer = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selectedSectors = useMemo(
    () => sectors.filter((s) => value.includes(s.id)),
    [sectors, value]
  );

  const visibleSectors = useMemo(() => {
    if (!query.trim()) return sectors;
    const needle = query.trim().toLocaleLowerCase('tr');
    return sectors.filter((s) => s.name.toLocaleLowerCase('tr').includes(needle));
  }, [sectors, query]);

  const toggle = (sectorId) => {
    onChange(
      value.includes(sectorId)
        ? value.filter((id) => id !== sectorId)
        : [...value, sectorId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-secondary py-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm">Sektörler yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 py-2">
        <span className="material-symbols-outlined text-sm">error</span>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Kapalı hâl: seçili sektörler + aç/kapa */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between gap-2 px-4 py-2 min-h-[42px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-left focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selectedSectors.length > 0 ? (
          <span className="flex flex-wrap gap-1.5 min-w-0">
            {selectedSectors.map((sector) => (
              <span
                key={sector.id}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 text-xs font-medium rounded-full bg-primary/10 dark:bg-primary/20 text-primary"
              >
                {sector.name}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`${sector.name} seçimini kaldır`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) toggle(sector.id);
                  }}
                  className="flex items-center rounded-full hover:bg-primary/20 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px] leading-none">close</span>
                </span>
              </span>
            ))}
          </span>
        ) : (
          <span className="text-sm text-text-secondary">Sektör seçin</span>
        )}
        <span className="material-symbols-outlined text-text-secondary flex-shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Açılır liste */}
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {sectors.length > 8 && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sektör ara..."
                autoFocus
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-text-main focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
          )}

          <div className="max-h-56 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
            {visibleSectors.length === 0 ? (
              <p className="px-3 py-3 text-sm text-text-secondary text-center">
                Eşleşen sektör yok
              </p>
            ) : (
              visibleSectors.map((sector) => {
                const selected = value.includes(sector.id);
                return (
                  <label
                    key={sector.id}
                    role="option"
                    aria-selected={selected}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-main hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggle(sector.id)}
                      className="w-4 h-4 accent-primary rounded flex-shrink-0"
                    />
                    <span className="truncate">{sector.name}</span>
                  </label>
                );
              })
            )}
          </div>

          {selectedSectors.length > 0 && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-text-secondary">
                {selectedSectors.length} sektör seçili
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Temizle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
