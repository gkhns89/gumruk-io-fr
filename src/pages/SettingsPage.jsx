import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import SectorSettingsCard from '../components/settings/SectorSettingsCard';
import CustomsListSettingsCard from '../components/settings/CustomsListSettingsCard';
import { useAuth } from '../hooks/useAuth';
import { feedbackService } from '../api/feedbackService';
import { contactService } from '../api/contactService';
import { gRadarService } from '../api/gRadarService';
import { sessionService } from '../api/sessionService';
import { showSuccess, showError } from '../utils/toastUtils';
import { confirmDialog } from '../utils/confirmDialog';
import { t, getCurrentLocale } from '../locales';

// Etiket getter: çeviri sabit tanımlanırken değil, okunduğunda alınır
const contactType = (value, icon) => ({
  value,
  get label() { return t(`settingsPage.contacts.types.${value}`); },
  icon,
});

const TYPE_OPTIONS = [
  contactType('PHONE',    'phone'),
  contactType('EMAIL',    'email'),
  contactType('WHATSAPP', 'chat'),
  contactType('ADDRESS',  'location_on'),
  contactType('WEBSITE',  'language'),
  contactType('OTHER',    'info'),
];

const EMPTY_CONTACT_FORM = { label: '', value: '', type: 'PHONE', isActive: true, sortOrder: 0 };

/** Milisaniyeyi okunabilir süreye çevirir: 21600000 -> "6 saat" */
const formatDuration = (ms) => {
  if (!ms || ms < 0) return '-';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(t('settingsPage.duration.days', { count: days }));
  if (hours) parts.push(t('settingsPage.duration.hours', { count: hours }));
  if (minutes) parts.push(t('settingsPage.duration.minutes', { count: minutes }));
  return parts.length ? parts.join(' ') : `${ms} ms`;
};

const SettingsPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';

  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ apiToken: '', folderId: '', isEnabled: true, webhookBaseUrl: '' });
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);

  // G-Radar Master Config state
  const [gRadarConfig, setGRadarConfig] = useState(null);
  const [gRadarForm, setGRadarForm] = useState({
    apiToken: '', webhookSecret: '', webhookUrl: '', active: false, reservedCredits: 10,
  });
  const [gRadarSaving, setGRadarSaving] = useState(false);
  const [gRadarTesting, setGRadarTesting] = useState(false);
  const [gRadarRefreshing, setGRadarRefreshing] = useState(false);
  const [gRadarRefreshIdentifier, setGRadarRefreshIdentifier] = useState('');
  const [gRadarRefreshType, setGRadarRefreshType] = useState('AUTO');

  // Oturum politikası (salt okunur — backend ortam değişkenlerinden gelir)
  const [sessionPolicy, setSessionPolicy] = useState(null);

  useEffect(() => {
    if (!isSuperAdmin) { setLoadingData(false); return; }
    loadData();
    loadGRadarConfig();
    loadSessionPolicy();
  }, [isSuperAdmin]);

  const loadSessionPolicy = async () => {
    const res = await sessionService.getSessionPolicy();
    if (res.success) setSessionPolicy(res.data);
  };

  const loadGRadarConfig = async () => {
    const res = await gRadarService.getMasterConfig();
    if (res.success) {
      setGRadarConfig(res.data);
      setGRadarForm({
        apiToken: '', webhookSecret: '',
        webhookUrl: res.data?.webhookUrl || '',
        active: !!res.data?.active,
        reservedCredits: res.data?.reservedCredits ?? 10,
      });
    }
  };

  const handleSaveGRadarConfig = async () => {
    const reservedNum = Number(gRadarForm.reservedCredits);
    if (!Number.isInteger(reservedNum) || reservedNum < 0) {
      showError(t('gRadarAdmin.master.reservedCreditsInvalid'));
      return;
    }
    setGRadarSaving(true);
    const payload = {
      webhookUrl: gRadarForm.webhookUrl,
      active: gRadarForm.active,
      reservedCredits: reservedNum,
    };
    if (gRadarForm.apiToken.trim()) payload.apiToken = gRadarForm.apiToken.trim();
    if (gRadarForm.webhookSecret.trim()) payload.webhookSecret = gRadarForm.webhookSecret.trim();

    const res = await gRadarService.updateMasterConfig(payload);
    setGRadarSaving(false);
    if (res.success) {
      showSuccess(res.data?.message || t('gRadarAdmin.master.configUpdated'));
      setGRadarForm(prev => ({ ...prev, apiToken: '', webhookSecret: '' }));
      loadGRadarConfig();
    } else {
      showError(res.error);
    }
  };

  const handleRefreshGRadarBalance = async () => {
    setGRadarRefreshing(true);
    const identifier = gRadarRefreshIdentifier.trim();
    // If admin typed something, send it + the explicit type (or let backend
    // auto-detect when type=AUTO). Empty input falls back to auto-pick from
    // existing cargo.
    const res = await gRadarService.refreshMasterBalance(
      identifier ? { identifier, type: gRadarRefreshType === 'AUTO' ? null : gRadarRefreshType } : {}
    );
    setGRadarRefreshing(false);
    if (!res.success) {
      showError(res.error);
      return;
    }
    showSuccess(res.data?.message || t('gRadarAdmin.master.balanceRefreshed'));
    setGRadarRefreshIdentifier('');
    loadGRadarConfig();
  };

  const handleTestGRadarConnection = async () => {
    setGRadarTesting(true);
    const res = await gRadarService.testMasterConnection();
    setGRadarTesting(false);
    if (!res.success) {
      showError(res.error);
      return;
    }
    if (res.data?.success) {
      showSuccess(res.data.message || t('gRadarAdmin.master.connectionSuccess'));
      // The probe reads the remaining-credits header off the response; if
      // G-Radar sent it we just learned the real master pool size. Refresh
      // the master config card so the cached number reflects upstream
      // immediately instead of waiting for the next page reload.
      if (res.data.masterCreditsRemaining != null) {
        loadGRadarConfig();
      }
    } else {
      showError(res.data?.message || t('gRadarAdmin.master.connectionFailed'));
    }
  };

  const loadData = async () => {
    setLoadingData(true);
    const [statusRes, settingsRes] = await Promise.all([
      feedbackService.getClickUpStatus(),
      feedbackService.getClickUpSettings(),
    ]);
    if (statusRes.success) setStatus(statusRes.data);
    if (settingsRes.success && settingsRes.data) {
      setSettings(settingsRes.data);
      setForm(prev => ({
        ...prev,
        folderId: settingsRes.data.folderId || '',
        isEnabled: settingsRes.data.isEnabled ?? true,
        webhookBaseUrl: settingsRes.data.webhookBaseUrl || '',
      }));
      setHasExistingToken(true);
    }
    setLoadingData(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.folderId.trim()) { showError(t('settingsPage.clickUp.folderIdRequired')); return; }
    if (!hasExistingToken && !form.apiToken.trim()) { showError(t('settingsPage.clickUp.apiTokenRequired')); return; }

    setLoading(true);
    const payload = {
      folderId: form.folderId,
      isEnabled: form.isEnabled,
      webhookBaseUrl: form.webhookBaseUrl.trim() || undefined,
      ...(form.apiToken.trim() ? { apiToken: form.apiToken } : {}),
    };
    const result = await feedbackService.saveClickUpSettings(payload);
    setLoading(false);

    if (result.success) {
      showSuccess(t('settingsPage.clickUp.saved'));
      setForm(prev => ({ ...prev, apiToken: '' }));
      setHasExistingToken(true);
      loadData();
    } else {
      showError(result.error || t('settingsPage.clickUp.saveError'));
    }
  };

  const handleRegisterWebhook = async () => {
    setRegisteringWebhook(true);
    const result = await feedbackService.registerWebhook();
    setRegisteringWebhook(false);
    if (result.success) {
      showSuccess(t('settingsPage.clickUp.webhookRegistered'));
      loadData();
    } else {
      showError(result.error || t('api.feedback.webhookRegisterError'));
    }
  };

  const handleDeleteWebhook = async () => {
    const ok = await confirmDialog({
      title: t('settingsPage.clickUp.deleteWebhookTitle'),
      message: t('settingsPage.clickUp.deleteWebhookMessage'),
      intent: 'danger',
      confirmText: t('common.delete'),
    });
    if (!ok) return;
    const result = await feedbackService.deleteWebhook();
    if (result.success) {
      showSuccess(t('settingsPage.clickUp.webhookDeleted'));
      loadData();
    } else {
      showError(result.error || t('api.feedback.webhookDeleteError'));
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await feedbackService.testClickUpConnection();
    setTesting(false);
    if (result.success && result.data?.success) {
      showSuccess(result.data.message || t('settingsPage.clickUp.connectionSuccess'));
    } else {
      showError(result.data?.message || t('settingsPage.clickUp.connectionFailed'));
    }
  };

  // --- Contact Info state ---
  const [contacts, setContacts] = useState([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT_FORM);
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  const loadContacts = useCallback(async () => {
    setContactLoading(true);
    const result = await contactService.getAllContactInfo();
    if (result.success) setContacts(result.data || []);
    setContactLoading(false);
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadContacts();
  }, [isSuperAdmin, loadContacts]);

  const openNewContact = () => {
    setContactForm(EMPTY_CONTACT_FORM);
    setEditingContactId(null);
    setContactFormOpen(true);
  };

  const openEditContact = (c) => {
    setContactForm({ label: c.label, value: c.value, type: c.type, isActive: c.isActive, sortOrder: c.sortOrder });
    setEditingContactId(c.id);
    setContactFormOpen(true);
  };

  const handleContactFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setContactForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleContactSave = async (e) => {
    e.preventDefault();
    if (!contactForm.label.trim()) { showError(t('settingsPage.contacts.labelRequired')); return; }
    if (!contactForm.value.trim()) { showError(t('settingsPage.contacts.valueRequired')); return; }
    setSavingContact(true);
    const payload = { ...contactForm, sortOrder: Number(contactForm.sortOrder) || 0 };
    const result = editingContactId
      ? await contactService.updateContactInfo(editingContactId, payload)
      : await contactService.createContactInfo(payload);
    setSavingContact(false);
    if (result.success) {
      showSuccess(editingContactId ? t('settingsPage.contacts.updated') : t('settingsPage.contacts.added'));
      setContactFormOpen(false);
      loadContacts();
    } else {
      showError(result.error || t('adminCommon.actionFailed'));
    }
  };

  const handleContactDelete = async (id) => {
    const ok = await confirmDialog({
      title: t('settingsPage.contacts.deleteTitle'),
      message: t('settingsPage.contacts.deleteMessage'),
      intent: 'danger',
      confirmText: t('common.delete'),
    });
    if (!ok) return;
    const result = await contactService.deleteContactInfo(id);
    if (result.success) {
      showSuccess(t('settingsPage.contacts.deleted'));
      loadContacts();
    } else {
      showError(result.error || t('settingsPage.contacts.deleteError'));
    }
  };

  const configured = status?.configured ?? false;
  const enabled = status?.enabled ?? false;

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0">

        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">settings</span>
                {t('nav.settings')}
              </h1>
              <p className="text-text-secondary mt-2">
                {t('settingsPage.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!isSuperAdmin ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400 dark:text-gray-500 gap-3">
              <span className="material-symbols-outlined text-[56px]">lock</span>
              <p className="text-base">{t('management.noAccess')}</p>
            </div>
          ) : loadingData ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[1800px] columns-1 lg:columns-2 2xl:columns-3 gap-6">

              {/* Oturum Politikası Kartı — salt okunur */}
              <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 break-inside-avoid">

                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-primary">schedule</span>
                  <div className="flex-1">
                    <h2 className="font-semibold text-text-main">{t('settingsPage.sessionPolicy.title')}</h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {t('settingsPage.sessionPolicy.subtitle')}
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-text-secondary flex-shrink-0">
                    {t('settingsPage.sessionPolicy.readOnly')}
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  {!sessionPolicy ? (
                    <p className="text-sm text-text-secondary">{t('settingsPage.sessionPolicy.loadError')}</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <p className="text-xs text-text-secondary">{t('settingsPage.sessionPolicy.normalLogin')}</p>
                          <p className="text-xl font-bold text-text-main mt-1">
                            {formatDuration(sessionPolicy.tokenExpirationMs)}
                          </p>
                          <p className="text-[11px] text-text-secondary mt-1">
                            {t('settingsPage.sessionPolicy.normalLoginHint')}
                          </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <p className="text-xs text-text-secondary">{t('settingsPage.sessionPolicy.rememberMeLogin')}</p>
                          <p className="text-xl font-bold text-text-main mt-1">
                            {formatDuration(sessionPolicy.rememberMeExpirationMs)}
                          </p>
                          <p className="text-[11px] text-text-secondary mt-1">
                            {t('settingsPage.sessionPolicy.rememberMeLoginHint')}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[18px] text-text-secondary mt-0.5">devices</span>
                          <div className="text-sm text-text-main">
                            <span className="font-medium">{t('settingsPage.sessionPolicy.singleSession')}</span>{' '}
                            {(sessionPolicy.singleSessionRoles || []).join(', ') || '-'}
                            <p className="text-xs text-text-secondary mt-0.5">
                              {t('settingsPage.sessionPolicy.singleSessionHint')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[18px] text-text-secondary mt-0.5">group</span>
                          <div className="text-sm text-text-main">
                            <span className="font-medium">{t('settingsPage.sessionPolicy.multiSession')}</span>{' '}
                            {(sessionPolicy.multiSessionRoles || []).join(', ') || '-'}
                            <p className="text-xs text-text-secondary mt-0.5">
                              {t('settingsPage.sessionPolicy.multiSessionHint')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-xs text-text-secondary">
                        <span className="material-symbols-outlined text-[16px] flex-shrink-0">info</span>
                        <p>
                          {t('settingsPage.sessionPolicy.sourceNote', {
                            source: sessionPolicy.source || t('settingsPage.sessionPolicy.defaultSource'),
                          })}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ClickUp Entegrasyonu Kartı */}
              <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 break-inside-avoid">

                {/* Kart Başlık */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-primary">integration_instructions</span>
                  <div>
                    <h2 className="font-semibold text-text-main">{t('settingsPage.clickUp.title')}</h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {t('settingsPage.clickUp.subtitle')}
                    </p>
                  </div>
                </div>

                <div className="p-6 space-y-5">

                  {/* Durum badges */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
                      ${configured
                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                        : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {configured ? 'check_circle' : 'cancel'}
                      </span>
                      {configured ? t('settingsPage.clickUp.configured') : t('settingsPage.clickUp.notConfigured')}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
                      ${enabled
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                        : 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {enabled ? 'toggle_on' : 'toggle_off'}
                      </span>
                      {enabled ? t('adminCommon.active') : t('management.inactive')}
                    </span>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSave} className="space-y-4">

                    {/* API Token */}
                    <div>
                      <label className="block text-sm font-medium text-text-main mb-1.5">
                        API Token
                      </label>
                      {hasExistingToken ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-200 dark:border-green-800
                                          bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            {t('settingsPage.clickUp.tokenSaved')}
                          </div>
                          <button
                            type="button"
                            onClick={() => setHasExistingToken(false)}
                            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                                       text-sm text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                          >
                            {t('settingsPage.clickUp.change')}
                          </button>
                        </div>
                      ) : (
                        <input
                          type="password"
                          name="apiToken"
                          value={form.apiToken}
                          onChange={handleChange}
                          placeholder="pk_XXXXXXXXXXXXXXX"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600
                                     bg-white dark:bg-gray-800 text-text-main
                                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50
                                     focus:border-primary text-sm transition-colors"
                        />
                      )}
                    </div>

                    {/* Folder ID */}
                    <div>
                      <label className="block text-sm font-medium text-text-main mb-1.5">
                        Folder ID
                      </label>
                      <input
                        type="text"
                        name="folderId"
                        value={form.folderId}
                        onChange={handleChange}
                        placeholder={t('settingsPage.clickUp.folderIdPlaceholder')}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600
                                   bg-white dark:bg-gray-800 text-text-main
                                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50
                                   focus:border-primary text-sm transition-colors"
                      />
                    </div>

                    {/* Webhook Base URL */}
                    <div>
                      <label className="block text-sm font-medium text-text-main mb-1.5">
                        Webhook Base URL
                        <span className="ml-1.5 text-xs font-normal text-text-secondary">{t('settingsPage.clickUp.optional')}</span>
                      </label>
                      <input
                        type="url"
                        name="webhookBaseUrl"
                        value={form.webhookBaseUrl}
                        onChange={handleChange}
                        placeholder={t('settingsPage.clickUp.webhookBaseUrlPlaceholder')}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600
                                   bg-white dark:bg-gray-800 text-text-main
                                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50
                                   focus:border-primary text-sm transition-colors"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        {t('settingsPage.clickUp.webhookBaseUrlHint')}{' '}
                        <span className="font-mono">{form.webhookBaseUrl || 'https://...'}/api/webhooks/clickup</span>
                      </p>
                    </div>

                    {/* Aktif toggle */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isEnabled"
                        name="isEnabled"
                        checked={form.isEnabled}
                        onChange={handleChange}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                      <label htmlFor="isEnabled" className="text-sm text-text-main cursor-pointer select-none">
                        {t('settingsPage.clickUp.showFeedbackButton')}
                      </label>
                    </div>

                    {/* Butonlar */}
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={handleTest}
                        disabled={testing || !configured}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                                   text-sm text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800
                                   transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!configured ? t('settingsPage.clickUp.saveSettingsFirst') : ''}
                      >
                        {testing
                          ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          : <span className="material-symbols-outlined text-[16px]">wifi_tethering</span>
                        }
                        {testing ? t('adminCommon.testing') : t('adminCommon.testConnection')}
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold
                                   hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                        {loading ? t('management.saving') : t('common.save')}
                      </button>
                    </div>
                  </form>

                  {/* Webhook Durumu */}
                  {configured && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                            ${settings?.webhookRegistered
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                              : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {settings?.webhookRegistered ? 'webhook' : 'webhook'}
                            </span>
                            {t('settingsPage.clickUp.webhookStatus', {
                              status: settings?.webhookRegistered
                                ? t('adminCommon.active')
                                : t('settingsPage.clickUp.webhookNotRegistered'),
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!settings?.webhookRegistered ? (
                            <button
                              type="button"
                              onClick={handleRegisterWebhook}
                              disabled={registeringWebhook || !form.webhookBaseUrl.trim()}
                              title={!form.webhookBaseUrl.trim() ? t('settingsPage.clickUp.enterWebhookUrlFirst') : ''}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary text-primary text-xs font-medium
                                         hover:bg-primary/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {registeringWebhook
                                ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                : <span className="material-symbols-outlined text-[14px]">add_link</span>}
                              {registeringWebhook ? t('management.saving') : t('settingsPage.clickUp.registerWebhook')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleDeleteWebhook}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-700
                                         text-red-600 dark:text-red-400 text-xs font-medium
                                         hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            >
                              <span className="material-symbols-outlined text-[14px]">link_off</span>
                              {t('settingsPage.clickUp.removeWebhook')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {settings?.updatedAt && (
                    <p className="text-xs text-text-secondary pt-1">
                      {t('adminCommon.lastUpdated', { date: new Date(settings.updatedAt).toLocaleString(getCurrentLocale()) })}
                    </p>
                  )}
                </div>
              </div>

              {/* G-Radar Master Konfigürasyon */}
              <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 break-inside-avoid">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-primary">travel_explore</span>
                  <div className="flex-1">
                    <h2 className="font-semibold text-text-main">{t('gRadarAdmin.master.title')}</h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {t('gRadarAdmin.master.subtitle')}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    gRadarConfig?.active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {gRadarConfig?.active ? t('adminCommon.active') : t('management.inactive')}
                  </span>
                </div>
                <div className="p-6 space-y-5">
                  {/* Master Havuz Bakiyesi */}
                  <div className="rounded-xl p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-text-main flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-purple-600 dark:text-purple-400">savings</span>
                          {t('gRadarAdmin.master.poolBalance')}
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {t('gRadarAdmin.master.poolBalanceHint')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${
                          (gRadarConfig?.lastKnownMasterCredits ?? 0) < 50
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-purple-700 dark:text-purple-300'
                        }`}>
                          {t('gRadarAdmin.credits', { count: gRadarConfig?.lastKnownMasterCredits ?? '—' })}
                        </div>
                        {gRadarConfig?.lastCreditCheckAt && (
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            {t('adminCommon.lastUpdated', { date: new Date(gRadarConfig.lastCreditCheckAt).toLocaleString(getCurrentLocale()) })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Outstanding allocations + refresh affordance */}
                    <div className="mt-3 pt-3 border-t border-purple-200/60 dark:border-purple-800/60 space-y-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-xs text-text-secondary">
                          {t('gRadarAdmin.master.assignedTotal')}
                          <strong className="text-text-main ml-1">
                            {t('gRadarAdmin.credits', { count: gRadarConfig?.totalAssignedCredits ?? 0 })}
                          </strong>
                          {(gRadarConfig?.walletsWithCreditsCount ?? 0) > 0 && (
                            <span className="ml-1 opacity-70">
                              {t('gRadarAdmin.master.companyCount', { count: gRadarConfig.walletsWithCreditsCount })}
                            </span>
                          )}
                          {gRadarConfig?.lastKnownMasterCredits != null && (
                            <span className="block mt-0.5 opacity-80">
                              {t('gRadarAdmin.master.available')} <strong>
                                {Math.max(0, (gRadarConfig.lastKnownMasterCredits ?? 0) - (gRadarConfig.totalAssignedCredits ?? 0) - (gRadarConfig.reservedCredits ?? 0))}
                              </strong> {t('gRadarAdmin.creditsUnit')}
                              <span className="opacity-60"> {t('gRadarAdmin.master.availableFormula')}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Manual identifier override — user can paste any AWB/B/L/
                          container that G-Radar already knows about (e.g. an old
                          dashboard query) to force a fresh balance read without
                          relying on auto-pick. */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={gRadarRefreshIdentifier}
                          onChange={(e) => setGRadarRefreshIdentifier(e.target.value)}
                          placeholder={t('gRadarAdmin.master.identifierPlaceholder')}
                          className="flex-1 min-w-[200px] rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800 text-text-main px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <select
                          value={gRadarRefreshType}
                          onChange={(e) => setGRadarRefreshType(e.target.value)}
                          disabled={!gRadarRefreshIdentifier.trim()}
                          title={!gRadarRefreshIdentifier.trim() ? t('gRadarAdmin.master.enterIdentifierFirst') : t('gRadarAdmin.master.identifierTypeHint')}
                          className="rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800 text-text-main px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                          {['AUTO', 'AWB', 'BL', 'CONTAINER'].map((type) => (
                            <option key={type} value={type}>{t(`gRadarAdmin.master.identifierTypes.${type}`)}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleRefreshGRadarBalance}
                          disabled={gRadarRefreshing || !gRadarConfig?.apiTokenConfigured}
                          title={
                            !gRadarConfig?.apiTokenConfigured
                              ? t('gRadarAdmin.master.saveTokenFirst')
                              : gRadarRefreshIdentifier.trim()
                                ? t('gRadarAdmin.master.refreshWithIdentifierHint')
                                : t('gRadarAdmin.master.refreshAutoHint')
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-40"
                        >
                          <span className={`material-symbols-outlined text-sm ${gRadarRefreshing ? 'animate-spin' : ''}`}>
                            {gRadarRefreshing ? 'refresh' : 'sync'}
                          </span>
                          {gRadarRefreshing ? t('adminCommon.refreshing') : t('gRadarAdmin.master.refreshBalance')}
                        </button>
                      </div>
                    </div>

                    {(gRadarConfig?.lastKnownMasterCredits ?? 0) < 50 && gRadarConfig?.lastKnownMasterCredits != null && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">warning</span>
                        {t('gRadarAdmin.master.lowCredits')}
                      </p>
                    )}
                  </div>

                  {/* API Token */}
                  <label className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-secondary">API Token</span>
                      {gRadarConfig?.apiTokenConfigured && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          {t('gRadarAdmin.saved')}
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={gRadarForm.apiToken}
                      onChange={(e) => setGRadarForm(prev => ({ ...prev, apiToken: e.target.value }))}
                      placeholder={gRadarConfig?.apiTokenConfigured ? t('gRadarAdmin.master.tokenPlaceholderSaved') : 'G-Radar API token'}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-[11px] text-text-secondary">{t('gRadarAdmin.master.tokenHint')}</span>
                  </label>

                  {/* Webhook URL */}
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-secondary">Webhook URL</span>
                    <input
                      type="text"
                      value={gRadarForm.webhookUrl}
                      onChange={(e) => setGRadarForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
                      placeholder="https://backend.example.com/api/webhooks/g-radar"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-[11px] text-text-secondary">
                      {t('gRadarAdmin.master.webhookUrlHint')}
                    </span>
                  </label>

                  {/* Webhook Secret */}
                  <label className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-secondary">Webhook Secret (HMAC-SHA256)</span>
                      {gRadarConfig?.webhookSecretConfigured && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          {t('gRadarAdmin.saved')}
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={gRadarForm.webhookSecret}
                      onChange={(e) => setGRadarForm(prev => ({ ...prev, webhookSecret: e.target.value }))}
                      placeholder={gRadarConfig?.webhookSecretConfigured ? t('gRadarAdmin.master.secretPlaceholderSaved') : 'Webhook HMAC secret'}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-[11px] text-text-secondary">{t('gRadarAdmin.master.secretHint')}</span>
                  </label>

                  {/* Active toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gRadarForm.active}
                      onChange={(e) => setGRadarForm(prev => ({ ...prev, active: e.target.checked }))}
                      className="rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-text-main">{t('gRadarAdmin.master.activate')}</span>
                      <p className="text-xs text-text-secondary">{t('gRadarAdmin.master.activateHint')}</p>
                    </div>
                  </label>

                  {/* Reserved credits — master pool safety threshold */}
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-secondary">{t('gRadarAdmin.master.reservedCredits')}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={gRadarForm.reservedCredits}
                        onChange={(e) => setGRadarForm(prev => ({ ...prev, reservedCredits: e.target.value }))}
                        className="w-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-xs text-text-secondary">{t('gRadarAdmin.creditsUnit')}</span>
                    </div>
                    <span className="text-[11px] text-text-secondary">
                      {t('gRadarAdmin.master.reservedCreditsHint')}
                    </span>
                  </label>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    {gRadarConfig?.updatedAt && (
                      <p className="text-xs text-text-secondary">
                        {t('adminCommon.lastUpdated', { date: new Date(gRadarConfig.updatedAt).toLocaleString(getCurrentLocale()) })}
                        {gRadarConfig.updatedByEmail && ` — ${gRadarConfig.updatedByEmail}`}
                      </p>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={handleTestGRadarConnection}
                        disabled={gRadarTesting || !gRadarConfig?.apiTokenConfigured}
                        title={
                          !gRadarConfig?.apiTokenConfigured
                            ? t('gRadarAdmin.master.saveTokenFirst')
                            : t('gRadarAdmin.master.testConnectionHint')
                        }
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main rounded-lg text-sm font-medium hover:bg-primary/10 hover:border-primary/40 hover:text-primary dark:hover:bg-primary/20 dark:hover:border-primary/60 dark:hover:text-primary transition-colors disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:text-text-main disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600"
                      >
                        <span className={`material-symbols-outlined text-base ${gRadarTesting ? 'animate-spin' : ''}`}>
                          {gRadarTesting ? 'refresh' : 'cable'}
                        </span>
                        {gRadarTesting ? t('adminCommon.testing') : t('adminCommon.testConnection')}
                      </button>
                      <button
                        onClick={handleSaveGRadarConfig}
                        disabled={gRadarSaving}
                        className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-base">save</span>
                        {gRadarSaving ? t('management.saving') : t('common.save')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gümrük İdareleri Listesi — kaynaktan önizle, doğrula, uygula */}
              <div className="mb-6 break-inside-avoid">
                <CustomsListSettingsCard />
              </div>

              {/* Sektör Kataloğu Yönetim Kartı */}
              <div className="mb-6 break-inside-avoid">
                <SectorSettingsCard />
              </div>

              {/* İletişim Bilgileri Yönetim Kartı */}
              <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 break-inside-avoid">

                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[22px] text-primary">contacts</span>
                    <div>
                      <h2 className="font-semibold text-text-main">{t('contact.infoTitle')}</h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {t('settingsPage.contacts.subtitle')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={openNewContact}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold
                               hover:bg-primary/90 transition flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    {t('common.add')}
                  </button>
                </div>

                <div className="p-6">
                  {/* Form */}
                  {contactFormOpen && (
                    <form onSubmit={handleContactSave} className="mb-5 p-4 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 space-y-3">
                      <p className="text-sm font-semibold text-text-main">
                        {editingContactId ? t('settingsPage.contacts.editTitle') : t('settingsPage.contacts.newTitle')}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">{t('settingsPage.contacts.type')}</label>
                          <select
                            name="type"
                            value={contactForm.type}
                            onChange={handleContactFormChange}
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                                       bg-white dark:bg-gray-800 text-text-main text-sm
                                       focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            {TYPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">{t('settingsPage.contacts.label')}</label>
                          <input
                            type="text"
                            name="label"
                            value={contactForm.label}
                            onChange={handleContactFormChange}
                            placeholder={t('settingsPage.contacts.labelPlaceholder')}
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                                       bg-white dark:bg-gray-800 text-text-main text-sm
                                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-text-secondary mb-1">{t('settingsPage.contacts.value')}</label>
                          <input
                            type="text"
                            name="value"
                            value={contactForm.value}
                            onChange={handleContactFormChange}
                            placeholder="+90 555 123 4567"
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                                       bg-white dark:bg-gray-800 text-text-main text-sm
                                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">{t('sectors.settings.order')}</label>
                          <input
                            type="number"
                            name="sortOrder"
                            value={contactForm.sortOrder}
                            onChange={handleContactFormChange}
                            min="0"
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                                       bg-white dark:bg-gray-800 text-text-main text-sm
                                       focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              name="isActive"
                              checked={contactForm.isActive}
                              onChange={handleContactFormChange}
                              className="w-4 h-4 accent-primary rounded"
                            />
                            <span className="text-sm text-text-main">{t('settingsPage.contacts.activeHint')}</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={savingContact}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold
                                     hover:bg-primary/90 transition disabled:opacity-60"
                        >
                          {savingContact && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
                          {savingContact ? t('management.saving') : t('common.save')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setContactFormOpen(false)}
                          className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                                     text-sm text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Liste */}
                  {contactLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="material-symbols-outlined animate-spin text-primary text-[28px]">progress_activity</span>
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary text-sm">
                      {t('contact.empty')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map(c => {
                        const typeCfg = TYPE_OPTIONS.find(opt => opt.value === c.type) || TYPE_OPTIONS[5];
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition
                                        ${c.isActive
                                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                                          : 'border-dashed border-gray-200 dark:border-gray-700 opacity-50'}`}
                          >
                            <span className="material-symbols-outlined text-[18px] text-text-secondary flex-shrink-0">
                              {typeCfg.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-text-secondary">{c.label}</span>
                              <p className="text-sm font-medium text-text-main truncate">{c.value}</p>
                            </div>
                            {!c.isActive && (
                              <span className="text-[10px] text-gray-400 flex-shrink-0 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">{t('management.inactive')}</span>
                            )}
                            <span className="text-xs text-text-secondary flex-shrink-0 hidden sm:block">
                              #{c.sortOrder}
                            </span>
                            <button
                              onClick={() => openEditContact(c)}
                              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                              title={t('common.edit')}
                            >
                              <span className="material-symbols-outlined text-[16px] text-text-secondary">edit</span>
                            </button>
                            <button
                              onClick={() => handleContactDelete(c.id)}
                              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                              title={t('common.delete')}
                            >
                              <span className="material-symbols-outlined text-[16px] text-red-500">delete</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
