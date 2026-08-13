import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "react-toastify";

// Hat badge renkleri
const getGateBadge = (gate) => {
  const badgeStyles = {
    'SARI': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700',
    'KIRMIZI': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700',
  };

  return badgeStyles[gate] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
};

export default function TransactionDetailModal({ transaction, onClose, onEdit }) {
  const contentRef = useRef(null);
  const [copying, setCopying] = useState(false);

  if (!transaction) return null;

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} kopyalandı`, {
        position: 'bottom-center',
        autoClose: 2000,
        hideProgressBar: true,
        icon: '📋',
      });
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const statusDateMap = {
    PENDING:     { label: 'Antrepo Varış Tarihi', value: formatDate(transaction.warehouseArrivalDate) },
    REGISTERED:  { label: 'Tescil Tarihi',        value: formatDate(transaction.registrationDate) },
    INSPECTION:  { label: 'Tescil Tarihi',        value: formatDate(transaction.registrationDate) },
    CP_COMPLETED:{ label: 'Hat Kapanma Tarihi',   value: formatDate(transaction.lineClosureDate) },
    WITHDRAWN:   { label: 'Çekilme Tarihi',       value: formatDate(transaction.withdrawalDate) },
  };
  const statusDate = statusDateMap[transaction.status] ?? { label: 'Tarih', value: '-' };

  // Parse delay reasons from JSON
  const delayReasons = (() => {
    try {
      return transaction.userDelayNote ? JSON.parse(transaction.userDelayNote) : {};
    } catch {
      return {};
    }
  })();

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'PENDING': { color: 'pending', label: 'BEKLİYOR' },
      'REGISTERED': { color: 'registered', label: 'TESCİL EDİLDİ' },
      'INSPECTION': { color: 'inspection', label: 'MUAYENEDE' },
      'CP_COMPLETED': { color: 'completed', label: 'TAMAMLANDI' },
      'WITHDRAWN': { color: 'withdrawn', label: 'ÇEKİLDİ' },
      'CANCELLED': { color: 'cancelled', label: 'İPTAL' },
    };

    const statusInfo = statusMap[status] || { color: 'default', label: status };

    const colors = {
      pending: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700",
      registered: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
      inspection: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700",
      completed: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700",
      withdrawn: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700",
      cancelled: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700",
      default: "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600",
    };

    return {
      className: colors[statusInfo.color],
      label: statusInfo.label,
    };
  };

  const handleCopySnapshot = async () => {
    if (!contentRef.current || copying) return;
    setCopying(true);

    try {
      const el = contentRef.current;
      const computedBg = window.getComputedStyle(el).backgroundColor;
      // Eğer transparent / rgba(0,0,0,0) gelirse fallback kullan
      const isTransparent = !computedBg || computedBg === 'rgba(0, 0, 0, 0)' || computedBg === 'transparent';
      const bgColor = isTransparent ? '#ffffff' : computedBg;

      const dataUrl = await toPng(el, {
        backgroundColor: bgColor,
        pixelRatio: 3,
        cacheBust: true,
        style: {
          overflow: 'visible',
        },
      });

      // Clipboard API desteği kontrolü
      const canUseClipboard =
        navigator.clipboard &&
        typeof ClipboardItem !== 'undefined' &&
        typeof navigator.clipboard.write === 'function';

      if (canUseClipboard) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        toast.success('İşlem detayları panoya kaydedildi!', {
          position: 'bottom-center',
          autoClose: 3000,
          hideProgressBar: false,
          icon: '📋',
        });
      } else {
        // Mobil / desteklemeyen tarayıcılar: PNG olarak indir
        const link = document.createElement('a');
        link.download = `islem-${transaction.fileNo || 'detay'}.png`;
        link.href = dataUrl;
        link.click();
        toast.success('Görsel indirildi — e-postanıza ek olarak ekleyebilirsiniz.', {
          position: 'bottom-center',
          autoClose: 4000,
          hideProgressBar: false,
          icon: '📥',
        });
      }
    } catch (err) {
      console.error('[Snapshot] Hata:', err);
      toast.error('Görsel oluşturulamadı, lütfen tekrar deneyin.', {
        position: 'bottom-center',
        autoClose: 3000,
      });
    } finally {
      setCopying(false);
    }
  };

  const statusInfo = getStatusBadgeClass(transaction.status);
  const gateBadgeClass = getGateBadge(transaction.gate);

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 transition-colors duration-300">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 bg-primary rounded-full text-white">
                <span className="material-symbols-outlined text-xl">description</span>
              </div>
              <h2 className="text-text-main text-lg font-bold">İşlem Detayları</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopySnapshot}
                disabled={copying}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="İşlem detaylarını görüntü olarak kopyala"
              >
                {copying ? (
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-lg">screenshot</span>
                )}
                <span className="hidden sm:inline">
                  {copying ? 'Kopyalanıyor...' : 'Kopyala'}
                </span>
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-text-secondary">close</span>
              </button>
            </div>
          </div>

          {/* Body - bu alan ekran görüntüsüne dahil edilir */}
          <div ref={contentRef} className="overflow-y-auto max-h-[calc(90vh-160px)] bg-white dark:bg-background-dark">

            {/* Özet Alan */}
            {/* Özet Alan */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              {/* Dosya No satırı */}
              <div className="flex items-center justify-between px-6 py-3 bg-primary/5 dark:bg-primary/10 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => copyToClipboard(transaction.fileNo, 'Dosya No')}
                  className="flex items-center gap-2 group"
                  title="Kopyala"
                >
                  <span className="material-symbols-outlined text-primary text-base">tag</span>
                  <span className="text-xs text-text-secondary">Dosya No</span>
                  <span className="text-sm font-bold text-text-main">{transaction.fileNo}</span>
                  <span className="material-symbols-outlined text-xs text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">content_copy</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-0.5 text-xs font-semibold rounded-full ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                  {transaction.gate && (
                    <span className={`px-3 py-0.5 text-xs font-semibold rounded-full ${gateBadgeClass}`}>
                      {transaction.gate}
                    </span>
                  )}
                </div>
              </div>
              {/* Key info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800/40">
                <div className="px-6 py-3">
                  <p className="text-xs text-text-secondary mb-0.5">Alıcı Firma</p>
                  <p className="text-sm font-semibold text-text-main truncate">
                    {transaction.clientCompany?.name || transaction.recipientName || '-'}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(transaction.declarationNumber, 'Beyanname No')}
                  className="px-6 py-3 text-left group w-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  title="Kopyala"
                >
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-text-secondary mb-0.5">Beyanname No</p>
                    <span className="material-symbols-outlined text-xs text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">content_copy</span>
                  </div>
                  <p className="text-sm font-semibold text-text-main">
                    {transaction.declarationNumber || '-'}
                  </p>
                </button>
                <div className="px-6 py-3">
                  <p className="text-xs text-text-secondary mb-0.5">{statusDate.label}</p>
                  <p className="text-sm font-semibold text-text-main">{statusDate.value}</p>
                </div>
              </div>
            </div>

            <div className="p-6">

            {/* Info Grid — 7 kart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Gönderici Firma</p>
                <p className="text-text-main font-semibold">
                  {transaction.senderName || '-'}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Gümrük</p>
                <p className="text-text-main font-semibold">
                  {transaction.customs?.customsName || '-'}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Gümrük Antrepo</p>
                <p className="text-text-main font-semibold">
                  {transaction.customsWarehouse || '-'}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Vergi Tutarı</p>
                <p className="text-text-main font-semibold">
                  {transaction.tax ? `${Number(transaction.tax).toLocaleString('tr-TR')} ₺` : '-'}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Teminat Tutarı</p>
                <p className="text-text-main font-semibold">
                  {transaction.guaranteeAmount ? `${Number(transaction.guaranteeAmount).toLocaleString('tr-TR')} ₺` : '-'}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Kap</p>
                <p className="text-text-main font-semibold">
                  {transaction.containerAmount || '-'}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Ağırlık</p>
                <p className="text-text-main font-semibold">
                  {transaction.weight ? `${transaction.weight.toLocaleString('tr-TR')} kg` : '-'}
                </p>
              </div>

              {transaction.description && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 col-span-full transition-colors">
                  <p className="text-text-secondary text-sm mb-1">Açıklama</p>
                  <p className="text-text-main">
                    {transaction.description}
                  </p>
                </div>
              )}
            </div>

            {/* Gecikme Nedenleri */}
            {((delayReasons.arrivalToRegistration?.length > 0) || (delayReasons.registrationToClosure?.length > 0) || (delayReasons.closureToWithdrawal?.length > 0)) && (
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Gecikme Nedenleri</h3>

                {(delayReasons.arrivalToRegistration?.length > 0) && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-yellow-600">warning</span>
                      <p className="text-sm font-bold text-gray-800">
                        Antrepo Varış → Tescil Gecikme Nedeni
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {delayReasons.arrivalToRegistration}
                    </p>
                  </div>
                )}

                {(delayReasons.registrationToClosure?.length > 0) && (
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-orange-600">warning</span>
                      <p className="text-sm font-bold text-gray-800">
                        Tescil → Kapanma Gecikme Nedeni
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {delayReasons.registrationToClosure}
                    </p>
                  </div>
                )}

                {(delayReasons.closureToWithdrawal?.length > 0) && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-red-600">warning</span>
                      <p className="text-sm font-bold text-gray-800">
                        Kapanma → Çekilme Gecikme Nedeni
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {delayReasons.closureToWithdrawal}
                    </p>
                  </div>
                )}
              </div>
            )}
            </div>{/* /p-6 */}
          </div>{/* /contentRef */}

          {/* Footer */}
          <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
            <button
              onClick={onClose}
              className="w-full md:w-auto px-6 py-2 text-text-secondary hover:text-text-main font-medium transition-colors"
            >
              Kapat
            </button>
            <button
              onClick={() => onEdit && onEdit(transaction)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
              İşlemi Düzenle
            </button>
          </div>
        </div>
    </div>
  );
}
