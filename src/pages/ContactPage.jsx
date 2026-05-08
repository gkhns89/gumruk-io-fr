import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { contactService } from '../api/contactService';
import { feedbackService } from '../api/feedbackService';
import { useAuth } from '../hooks/useAuth';

const TYPE_CONFIG = {
  PHONE:    { icon: 'phone',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',   label: 'Telefon' },
  EMAIL:    { icon: 'email',       color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'E-posta' },
  WHATSAPP: { icon: 'chat',        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  label: 'WhatsApp' },
  ADDRESS:  { icon: 'location_on', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Adres' },
  WEBSITE:  { icon: 'language',    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',    label: 'Web Sitesi' },
  OTHER:    { icon: 'info',        color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',       label: 'Diğer' },
};

const CATEGORY_CONFIG = {
  BUG:      { label: 'Hata',    icon: 'bug_report',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  FEATURE:  { label: 'Öneri',   icon: 'lightbulb',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  QUESTION: { label: 'Soru',    icon: 'help',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  OTHER:    { label: 'Diğer',   icon: 'more_horiz',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
};

const SYNC_CONFIG = {
  PENDING: { label: 'İşleniyor', icon: 'schedule',       color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  SYNCED:  { label: 'İletildi',  icon: 'check_circle',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  FAILED:  { label: 'Hata',      icon: 'error',          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateString));
};

const getContactHref = (type, value) => {
  switch (type) {
    case 'PHONE':    return `tel:${value.replace(/\s/g, '')}`;
    case 'EMAIL':    return `mailto:${value}`;
    case 'WHATSAPP': return `https://wa.me/${value.replace(/[^0-9]/g, '')}`;
    case 'WEBSITE':  return value.startsWith('http') ? value : `https://${value}`;
    default:         return null;
  }
};

const ContactPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';

  const [contacts, setContacts] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState(null);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    const result = await contactService.getContactInfo();
    if (result.success) setContacts(result.data || []);
    setLoadingContacts(false);
  }, []);

  const loadFeedbacks = useCallback(async () => {
    if (isSuperAdmin) { setLoadingFeedbacks(false); return; }
    setLoadingFeedbacks(true);
    const result = await feedbackService.getMyFeedback();
    if (result.success) setFeedbacks(result.data || []);
    setLoadingFeedbacks(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    loadContacts();
    loadFeedbacks();
  }, [loadContacts, loadFeedbacks]);

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0">

        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary">headset_mic</span>
            İletişim
          </h1>
          <p className="text-text-secondary mt-2">
            Destek ekibimizle iletişime geçin
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">

          {/* İletişim Bilgileri */}
          <section>
            <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">contacts</span>
              İletişim Bilgileri
            </h2>

            {loadingContacts ? (
              <div className="flex items-center justify-center min-h-[120px]">
                <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[120px] gap-2 text-text-secondary bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <span className="material-symbols-outlined text-[40px]">contact_support</span>
                <p className="text-sm">Henüz iletişim bilgisi eklenmemiş</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {contacts.map(contact => {
                  const cfg = TYPE_CONFIG[contact.type] || TYPE_CONFIG.OTHER;
                  const href = getContactHref(contact.type, contact.value);
                  const Wrapper = href ? 'a' : 'div';
                  const wrapperProps = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {};

                  return (
                    <Wrapper
                      key={contact.id}
                      {...wrapperProps}
                      className={`flex items-start gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700
                                  bg-white dark:bg-background-dark transition-all
                                  ${href ? 'hover:border-primary/50 hover:shadow-sm cursor-pointer group' : ''}`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.color}`}>
                        <span className="material-symbols-outlined text-[20px]">{cfg.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-secondary mb-0.5">{contact.label}</p>
                        <p className={`text-sm font-semibold text-text-main break-all leading-snug
                                       ${href ? 'group-hover:text-primary transition-colors' : ''}`}>
                          {contact.value}
                        </p>
                      </div>
                      {href && (
                        <span className="material-symbols-outlined text-[16px] text-text-secondary flex-shrink-0 mt-1
                                         group-hover:text-primary transition-colors">
                          open_in_new
                        </span>
                      )}
                    </Wrapper>
                  );
                })}
              </div>
            )}
          </section>

          {/* Bildirimi Geçmişim — SUPER_ADMIN görmez */}
          {!isSuperAdmin && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">feedback</span>
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
                        className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                      >
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                          onClick={() => setExpandedFeedback(isExpanded ? null : fb.id)}
                        >
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border flex-shrink-0 ${catCfg.color}`}>
                            <span className="material-symbols-outlined text-[13px]">{catCfg.icon}</span>
                            {catCfg.label}
                          </span>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-main truncate">{fb.title}</p>
                          </div>

                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${syncCfg.color}`}>
                            <span className="material-symbols-outlined text-[13px]">{syncCfg.icon}</span>
                            {syncCfg.label}
                          </span>

                          <span className="text-xs text-text-secondary flex-shrink-0 hidden sm:block">
                            {formatDate(fb.createdAt)}
                          </span>

                          <span className={`material-symbols-outlined text-[18px] text-text-secondary flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <p className="text-sm text-text-secondary mt-3 whitespace-pre-wrap leading-relaxed">
                              {fb.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-3">
                              {formatDate(fb.createdAt)}
                              {fb.clickupTaskId && (
                                <span className="ml-3 font-mono">Task: {fb.clickupTaskId}</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default ContactPage;
