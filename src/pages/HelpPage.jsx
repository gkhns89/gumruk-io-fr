import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { feedbackService } from '../api/feedbackService';
import { useAuth } from '../hooks/useAuth';
import { showSuccess, showError } from '../utils/toastUtils';
import FeedbackDetailModal from '../components/common/FeedbackDetailModal';

const CATEGORIES = [
  { value: 'BUG',      label: 'Hata / Bug',        icon: 'bug_report' },
  { value: 'FEATURE',  label: 'Öneri / Özellik',   icon: 'lightbulb'  },
  { value: 'QUESTION', label: 'Soru',               icon: 'help'       },
  { value: 'OTHER',    label: 'Diğer',              icon: 'more_horiz' },
];

const CATEGORY_CONFIG = {
  BUG:      { label: 'Hata',    icon: 'bug_report',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  FEATURE:  { label: 'Öneri',   icon: 'lightbulb',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  QUESTION: { label: 'Soru',    icon: 'help',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  OTHER:    { label: 'Diğer',   icon: 'more_horiz',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
};

const SYNC_CONFIG = {
  PENDING: { label: 'İşleniyor', icon: 'schedule',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  SYNCED:  { label: 'İletildi',  icon: 'check_circle', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  FAILED:  { label: 'Hata',      icon: 'error',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const getClickUpStatusStyle = (status) => {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('complete') || s.includes('done') || s.includes('closed') || s.includes('tamamla'))
    return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'task_alt' };
  if (s.includes('progress') || s.includes('review') || s.includes('devam'))
    return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: 'autorenew' };
  return { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: 'pending' };
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const utc = dateString.includes('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(utc));
};

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;

const INITIAL_FORM = { category: 'BUG', title: '', description: '' };

const VIEWED_KEY = 'feedback_viewed_map';
const loadViewedMap = () => {
  try { return JSON.parse(localStorage.getItem(VIEWED_KEY) || '{}'); }
  catch { return {}; }
};

const HelpPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  const location = useLocation();
  const highlightedId = location.state?.feedbackId ?? null;
  const highlightRef = useRef(null);
  const fileInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  // History state
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState(highlightedId);
  const [detailFeedback, setDetailFeedback] = useState(null);

  // Okunmamış takibi
  const [viewedAt, setViewedAt] = useState(loadViewedMap);

  const hasUnread = (fb) => {
    if (!fb.lastCommentAt) return false;
    const viewed = viewedAt[fb.id];
    if (!viewed) return true;
    return new Date(fb.lastCommentAt) > new Date(viewed);
  };

  const markViewed = (feedbackId) => {
    const updated = { ...viewedAt, [feedbackId]: new Date().toISOString() };
    setViewedAt(updated);
    localStorage.setItem(VIEWED_KEY, JSON.stringify(updated));
  };

  const loadFeedbacks = useCallback(async () => {
    if (isSuperAdmin) { setLoadingFeedbacks(false); return; }
    setLoadingFeedbacks(true);
    const result = await feedbackService.getMyFeedback();
    if (result.success) setFeedbacks(result.data || []);
    setLoadingFeedbacks(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  useEffect(() => {
    if (highlightedId && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightedId, feedbacks]);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFormError('Sadece resim dosyaları yüklenebilir'); return; }
    if (file.size > MAX_SCREENSHOT_SIZE) { setFormError("Screenshot boyutu 5 MB'ı aşamaz"); return; }
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setFormError('');
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { setFormError('Başlık zorunludur'); return; }
    if (!formData.description.trim()) { setFormError('Açıklama zorunludur'); return; }

    setFormLoading(true);
    setFormError('');

    const payload = {
      ...formData,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    };

    const result = await feedbackService.submitFeedback(payload, screenshot);
    setFormLoading(false);

    if (result.success) {
      showSuccess('Geri bildiriminiz alındı, teşekkürler!');
      setFormData(INITIAL_FORM);
      setScreenshot(null);
      setScreenshotPreview(null);
      setFormSubmitted(true);
      loadFeedbacks();
    } else {
      setFormError(result.error || 'Gönderim sırasında bir hata oluştu');
      showError('Geri bildirim gönderilemedi');
    }
  };

  if (isSuperAdmin) {
    return (
      <MainLayout>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
            <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-primary">help_center</span>
              Yardım
            </h1>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-text-secondary">
              <span className="material-symbols-outlined text-[48px] block mb-3">admin_panel_settings</span>
              <p className="text-sm">Bu sayfa yönetici kullanıcılar için geçerli değildir.</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0">

        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary">help_center</span>
            Yardım
          </h1>
          <p className="text-text-secondary mt-2">
            Sorun bildirin, öneri gönderin veya geçmiş taleplerinizi takip edin
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">

          {/* Sorun / Öneri Gönder */}
          <section>
            <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">feedback</span>
              Sorun Bildir / Öneri Gönder
            </h2>

            <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

              {formSubmitted ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-6">
                  <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[28px]">check_circle</span>
                  </div>
                  <p className="text-base font-semibold text-text-main">Geri bildiriminiz alındı!</p>
                  <p className="text-sm text-text-secondary">Talebiniz incelemeye alındı. Durumunu aşağıdan takip edebilirsiniz.</p>
                  <button
                    onClick={() => setFormSubmitted(false)}
                    className="mt-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition"
                  >
                    Yeni Bildirim Gönder
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-5 space-y-4">

                  {/* Kategori */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-xs font-medium transition
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

                  {/* Açıklama */}
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
                                     flex items-center justify-center hover:bg-red-600 transition"
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

                  {formError && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      {formError}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{user?.email}</span>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium
                                 hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed
                                 flex items-center gap-2"
                    >
                      {formLoading && (
                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      )}
                      {formLoading ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                  </div>

                </form>
              )}
            </div>
          </section>

          {/* Bildirim Geçmişim */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">history</span>
                Bildirim Geçmişim
              </h2>
              <button
                onClick={loadFeedbacks}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700
                           text-xs text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                Yenile
              </button>
            </div>

            {loadingFeedbacks ? (
              <div className="flex items-center justify-center min-h-[100px]">
                <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[120px] gap-2 text-text-secondary bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <span className="material-symbols-outlined text-[40px]">inbox</span>
                <p className="text-sm">Henüz bildirim göndermediniz</p>
              </div>
            ) : (
              <div className="space-y-2">
                {feedbacks.map(fb => {
                  const catCfg = CATEGORY_CONFIG[fb.category] || CATEGORY_CONFIG.OTHER;
                  const syncCfg = SYNC_CONFIG[fb.syncStatus] || SYNC_CONFIG.PENDING;
                  const isExpanded = expandedFeedback === fb.id;

                  return (
                    <div
                      key={fb.id}
                      ref={fb.id === highlightedId ? highlightRef : null}
                      className={`rounded-2xl border overflow-hidden transition-all
                        ${fb.id === highlightedId
                          ? 'border-primary ring-2 ring-primary/30 bg-white dark:bg-background-dark'
                          : 'bg-white dark:bg-background-dark border-gray-200 dark:border-gray-700'}`}
                    >
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        onClick={() => { setDetailFeedback(fb); markViewed(fb.id); }}
                      >
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border flex-shrink-0 ${catCfg.color}`}>
                          <span className="material-symbols-outlined text-[13px]">{catCfg.icon}</span>
                          {catCfg.label}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-main truncate">{fb.title}</p>
                        </div>

                        {fb.clickupDeleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0
                                           bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 line-through">
                            <span className="material-symbols-outlined text-[13px]">link_off</span>
                            Silindi
                          </span>
                        ) : fb.clickupStatus ? (
                          (() => {
                            const st = getClickUpStatusStyle(fb.clickupStatus);
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${st.color}`}>
                                <span className="material-symbols-outlined text-[13px]">{st.icon}</span>
                                {fb.clickupStatus}
                              </span>
                            );
                          })()
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${syncCfg.color}`}>
                            <span className="material-symbols-outlined text-[13px]">{syncCfg.icon}</span>
                            {syncCfg.label}
                          </span>
                        )}

                        {/* Yorum sayısı / okunmamış */}
                        {fb.commentCount > 0 && (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0
                            ${hasUnread(fb)
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                            <span className="material-symbols-outlined text-[13px]">chat</span>
                            {fb.commentCount}
                            {hasUnread(fb) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                          </span>
                        )}

                        <span className="text-xs text-text-secondary flex-shrink-0 hidden sm:block">
                          {formatDate(fb.createdAt)}
                        </span>

                        <span className="material-symbols-outlined text-[18px] text-text-secondary flex-shrink-0">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>

      {detailFeedback && (
        <FeedbackDetailModal
          feedback={detailFeedback}
          readOnly={false}
          onClose={() => setDetailFeedback(null)}
        />
      )}
    </MainLayout>
  );
};

export default HelpPage;
