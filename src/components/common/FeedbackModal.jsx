import React, { useState, useRef } from 'react';
import { feedbackService } from '../../api/feedbackService';
import { showSuccess, showError } from '../../utils/toastUtils';
import { useAuth } from '../../hooks/useAuth';

const CATEGORIES = [
  { value: 'BUG', label: 'Hata / Bug', icon: 'bug_report' },
  { value: 'FEATURE', label: 'Öneri / Özellik', icon: 'lightbulb' },
  { value: 'QUESTION', label: 'Soru', icon: 'help' },
  { value: 'OTHER', label: 'Diğer', icon: 'more_horiz' },
];

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5 MB

const FeedbackModal = ({ onClose }) => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    category: 'BUG',
    title: '',
    description: '',
  });
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Sadece resim dosyaları yüklenebilir');
      return;
    }
    if (file.size > MAX_SCREENSHOT_SIZE) {
      setError('Screenshot boyutu 5 MB\'ı aşamaz');
      return;
    }

    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setError('');
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { setError('Başlık zorunludur'); return; }
    if (!formData.description.trim()) { setError('Açıklama zorunludur'); return; }

    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    };

    const result = await feedbackService.submitFeedback(payload, screenshot);
    setLoading(false);

    if (result.success) {
      showSuccess('Geri bildiriminiz alındı, teşekkürler!');
      onClose();
    } else {
      setError(result.error || 'Gönderim sırasında bir hata oluştu');
      showError('Geri bildirim gönderilemedi');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-zoom-in w-full max-w-lg bg-white dark:bg-background-dark rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-primary text-white">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px]">feedback</span>
            <h2 className="font-semibold text-base">Sorun Bildir / Öneri</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-white/20 transition"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Kategori */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-medium transition
                  ${formData.category === cat.value
                    ? 'border-primary bg-primary/10 text-primary dark:text-primary'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary/50'
                  }`}
              >
                <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Başlık */}
          <div>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Kısa başlık..."
              maxLength={255}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
                         placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          {/* Açıklama */}
          <div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Sorunu veya önerinizi detaylı açıklayın..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
                         placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50
                         text-sm resize-none"
            />
          </div>

          {/* Screenshot */}
          <div>
            {screenshotPreview ? (
              <div className="relative inline-block">
                <img
                  src={screenshotPreview}
                  alt="Screenshot önizleme"
                  className="h-20 rounded-lg border border-gray-200 dark:border-gray-700 object-cover"
                />
                <button
                  type="button"
                  onClick={removeScreenshot}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5
                             flex items-center justify-center text-xs hover:bg-red-600 transition"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed
                           border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400
                           hover:border-primary hover:text-primary transition text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                Screenshot ekle (opsiyonel, maks 5 MB)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotChange}
              className="hidden"
            />
          </div>

          {/* Hata mesajı */}
          {error && (
            <p className="text-red-500 text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </p>
          )}

          {/* Gönder */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {user?.email}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium
                           hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center gap-2"
              >
                {loading && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                )}
                {loading ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
