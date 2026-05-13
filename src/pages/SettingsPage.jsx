import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { feedbackService } from '../api/feedbackService';
import { contactService } from '../api/contactService';
import { showSuccess, showError } from '../utils/toastUtils';

const TYPE_OPTIONS = [
  { value: 'PHONE',    label: 'Telefon',    icon: 'phone' },
  { value: 'EMAIL',    label: 'E-posta',    icon: 'email' },
  { value: 'WHATSAPP', label: 'WhatsApp',   icon: 'chat' },
  { value: 'ADDRESS',  label: 'Adres',      icon: 'location_on' },
  { value: 'WEBSITE',  label: 'Web Sitesi', icon: 'language' },
  { value: 'OTHER',    label: 'Diğer',      icon: 'info' },
];

const EMPTY_CONTACT_FORM = { label: '', value: '', type: 'PHONE', isActive: true, sortOrder: 0 };

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

  useEffect(() => {
    if (!isSuperAdmin) { setLoadingData(false); return; }
    loadData();
  }, [isSuperAdmin]);

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
    if (!form.folderId.trim()) { showError('Folder ID boş olamaz'); return; }
    if (!hasExistingToken && !form.apiToken.trim()) { showError('API Token boş olamaz'); return; }

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
      showSuccess('ClickUp ayarları kaydedildi');
      setForm(prev => ({ ...prev, apiToken: '' }));
      setHasExistingToken(true);
      loadData();
    } else {
      showError(result.error || 'Kayıt başarısız');
    }
  };

  const handleRegisterWebhook = async () => {
    setRegisteringWebhook(true);
    const result = await feedbackService.registerWebhook();
    setRegisteringWebhook(false);
    if (result.success) {
      showSuccess('Webhook başarıyla kaydedildi');
      loadData();
    } else {
      showError(result.error || 'Webhook kaydı başarısız');
    }
  };

  const handleDeleteWebhook = async () => {
    if (!window.confirm('Webhook kaydını silmek istediğinizden emin misiniz?')) return;
    const result = await feedbackService.deleteWebhook();
    if (result.success) {
      showSuccess('Webhook silindi');
      loadData();
    } else {
      showError(result.error || 'Webhook silinemedi');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await feedbackService.testClickUpConnection();
    setTesting(false);
    if (result.success && result.data?.success) {
      showSuccess(result.data.message || 'Bağlantı başarılı');
    } else {
      showError(result.data?.message || 'Bağlantı başarısız');
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
    if (!contactForm.label.trim()) { showError('Başlık boş olamaz'); return; }
    if (!contactForm.value.trim()) { showError('Değer boş olamaz'); return; }
    setSavingContact(true);
    const payload = { ...contactForm, sortOrder: Number(contactForm.sortOrder) || 0 };
    const result = editingContactId
      ? await contactService.updateContactInfo(editingContactId, payload)
      : await contactService.createContactInfo(payload);
    setSavingContact(false);
    if (result.success) {
      showSuccess(editingContactId ? 'İletişim bilgisi güncellendi' : 'İletişim bilgisi eklendi');
      setContactFormOpen(false);
      loadContacts();
    } else {
      showError(result.error || 'İşlem başarısız');
    }
  };

  const handleContactDelete = async (id) => {
    if (!window.confirm('Bu iletişim bilgisini silmek istediğinizden emin misiniz?')) return;
    const result = await contactService.deleteContactInfo(id);
    if (result.success) {
      showSuccess('İletişim bilgisi silindi');
      loadContacts();
    } else {
      showError(result.error || 'Silme başarısız');
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
                Ayarlar
              </h1>
              <p className="text-text-secondary mt-2">
                Uygulama entegrasyonlarını ve tercihlerini yönetin
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!isSuperAdmin ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400 dark:text-gray-500 gap-3">
              <span className="material-symbols-outlined text-[56px]">lock</span>
              <p className="text-base">Bu sayfaya erişim yetkiniz yok.</p>
            </div>
          ) : loadingData ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">

              {/* ClickUp Entegrasyonu Kartı */}
              <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

                {/* Kart Başlık */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-primary">integration_instructions</span>
                  <div>
                    <h2 className="font-semibold text-text-main">ClickUp Entegrasyonu</h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Kullanıcı feedback bildirimlerini ClickUp'a otomatik aktar
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
                      {configured ? 'Yapılandırıldı' : 'Yapılandırılmadı'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
                      ${enabled
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                        : 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {enabled ? 'toggle_on' : 'toggle_off'}
                      </span>
                      {enabled ? 'Aktif' : 'Pasif'}
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
                            Token kayıtlı
                          </div>
                          <button
                            type="button"
                            onClick={() => setHasExistingToken(false)}
                            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                                       text-sm text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                          >
                            Değiştir
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
                        placeholder="Örn: 12345678"
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
                        <span className="ml-1.5 text-xs font-normal text-text-secondary">(opsiyonel)</span>
                      </label>
                      <input
                        type="url"
                        name="webhookBaseUrl"
                        value={form.webhookBaseUrl}
                        onChange={handleChange}
                        placeholder="https://api.siteniz.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600
                                   bg-white dark:bg-gray-800 text-text-main
                                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50
                                   focus:border-primary text-sm transition-colors"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        Girilirse kayıt sırasında webhook otomatik kaydedilir →{' '}
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
                        Feedback butonunu kullanıcılara göster
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
                        title={!configured ? 'Önce ayarları kaydedin' : ''}
                      >
                        {testing
                          ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          : <span className="material-symbols-outlined text-[16px]">wifi_tethering</span>
                        }
                        {testing ? 'Test ediliyor...' : 'Bağlantıyı Test Et'}
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold
                                   hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
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
                            Webhook: {settings?.webhookRegistered ? 'Aktif' : 'Kayıtlı değil'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!settings?.webhookRegistered ? (
                            <button
                              type="button"
                              onClick={handleRegisterWebhook}
                              disabled={registeringWebhook || !form.webhookBaseUrl.trim()}
                              title={!form.webhookBaseUrl.trim() ? 'Önce Webhook Base URL girin ve kaydedin' : ''}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary text-primary text-xs font-medium
                                         hover:bg-primary/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {registeringWebhook
                                ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                : <span className="material-symbols-outlined text-[14px]">add_link</span>}
                              {registeringWebhook ? 'Kaydediliyor...' : 'Webhook Kaydet'}
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
                              Webhook Kaldır
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {settings?.updatedAt && (
                    <p className="text-xs text-text-secondary pt-1">
                      Son güncelleme: {new Date(settings.updatedAt).toLocaleString('tr-TR')}
                    </p>
                  )}
                </div>
              </div>

              {/* İletişim Bilgileri Yönetim Kartı */}
              <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[22px] text-primary">contacts</span>
                    <div>
                      <h2 className="font-semibold text-text-main">İletişim Bilgileri</h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        İletişim sayfasında kullanıcılara gösterilecek bilgiler
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={openNewContact}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold
                               hover:bg-primary/90 transition flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Ekle
                  </button>
                </div>

                <div className="p-6">
                  {/* Form */}
                  {contactFormOpen && (
                    <form onSubmit={handleContactSave} className="mb-5 p-4 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 space-y-3">
                      <p className="text-sm font-semibold text-text-main">
                        {editingContactId ? 'İletişim Bilgisini Düzenle' : 'Yeni İletişim Bilgisi'}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">Tür</label>
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
                          <label className="block text-xs font-medium text-text-secondary mb-1">Başlık</label>
                          <input
                            type="text"
                            name="label"
                            value={contactForm.label}
                            onChange={handleContactFormChange}
                            placeholder="Müşteri Hizmetleri"
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                                       bg-white dark:bg-gray-800 text-text-main text-sm
                                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-text-secondary mb-1">Değer</label>
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
                          <label className="block text-xs font-medium text-text-secondary mb-1">Sıralama</label>
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
                            <span className="text-sm text-text-main">Aktif (kullanıcılara göster)</span>
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
                          {savingContact ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setContactFormOpen(false)}
                          className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                                     text-sm text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          İptal
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
                      Henüz iletişim bilgisi eklenmemiş
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map(c => {
                        const typeCfg = TYPE_OPTIONS.find(t => t.value === c.type) || TYPE_OPTIONS[5];
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
                              <span className="text-[10px] text-gray-400 flex-shrink-0 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">Pasif</span>
                            )}
                            <span className="text-xs text-text-secondary flex-shrink-0 hidden sm:block">
                              #{c.sortOrder}
                            </span>
                            <button
                              onClick={() => openEditContact(c)}
                              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                              title="Düzenle"
                            >
                              <span className="material-symbols-outlined text-[16px] text-text-secondary">edit</span>
                            </button>
                            <button
                              onClick={() => handleContactDelete(c.id)}
                              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                              title="Sil"
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
