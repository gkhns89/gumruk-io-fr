import React from 'react';

/**
 * Basit, tema-uyumlu client-side pagination bileşeni.
 *
 * @param {number} currentPage - Aktif sayfa (1 tabanlı)
 * @param {number} pageSize - Sayfa başına kayıt
 * @param {number} totalItems - Toplam kayıt sayısı
 * @param {function} onPageChange - Yeni sayfa numarası ile çağrılır
 */
const Pagination = ({ currentPage, pageSize, totalItems, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems === 0 || totalPages === 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Aktif sayfa etrafında ±1, baş ve son sayfa; aradaki boşluklar "…" ile
  const nums = new Set([1, totalPages, currentPage]);
  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i >= 1 && i <= totalPages) nums.add(i);
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const items = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) items.push({ ellipsis: true, key: `e-${p}` });
    items.push({ page: p, key: `p-${p}` });
    prev = p;
  }

  const btnBase =
    'inline-flex items-center justify-center h-9 min-w-9 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm text-text-secondary">
        <span className="font-semibold text-text-main">{start}-{end}</span> / {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${btnBase} text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700`}
          aria-label="Önceki sayfa"
        >
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>

        {items.map((it) =>
          it.ellipsis ? (
            <span key={it.key} className="px-2 text-text-secondary select-none">…</span>
          ) : (
            <button
              key={it.key}
              type="button"
              onClick={() => onPageChange(it.page)}
              className={`${btnBase} ${
                it.page === currentPage
                  ? 'bg-primary text-white'
                  : 'text-text-main hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {it.page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${btnBase} text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700`}
          aria-label="Sonraki sayfa"
        >
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
