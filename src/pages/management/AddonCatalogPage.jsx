import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { addonService } from '../../api/addonService';
import { showSuccess, showError } from '../../utils/toastUtils';

const TYPE_CFG = {
  ONE_TIME:  { label: 'Tek Seferlik', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  RECURRING: { label: 'Dönemsel',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

const EMPTY_FORM = { name: '', description: '', addonType: 'ONE_TIME', defaultAmount: '' };

export default function AddonCatalogPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await addonService.getAllTemplates();
      setTemplates(list);
    } catch {
      showError('Şablonlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (t) => {
    setForm({ name: t.name, description: t.description, addonType: t.addonType, defaultAmount: String(t.defaultAmount) });
    setEditId(t.id);
    setShowForm(true);
  };

  const handleNew = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  };

  const handleCancel = () => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.name || !form.addonType || !form.defaultAmount) {
      showError('Ad, tür ve varsayılan tutar zorunludur');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, defaultAmount: parseFloat(form.defaultAmount) };
      if (editId) {
        await addonService.updateTemplate(editId, payload);
        showSuccess('Şablon güncellendi');
      } else {
        await addonService.createTemplate(payload);
        showSuccess('Şablon oluşturuldu');
      }
      handleCancel();
      load();
    } catch {
      showError('İşlem başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t) => {
    try {
      await addonService.updateTemplate(t.id, { isActive: !t.isActive });
      showSuccess(t.isActive ? 'Şablon pasife alındı' : 'Şablon aktif edildi');
      load();
    } catch {
      showError('İşlem başarısız');
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 flex items-center justify-between transition-colors">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-primary">library_add</span>
              Hizmet Kataloğu
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Ek hizmet şablonları — broker aboneliklerine atanabilecek standart ücret listesi
            </p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Yeni Şablon
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Form */}
          {showForm && (
            <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-primary/30 p-5 transition-colors">
              <h2 className="text-sm font-semibold text-text-main mb-4">{editId ? 'Şablonu Düzenle' : 'Yeni Şablon'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-medium text-text-secondary">Ad *</span>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="örn. Danışmanlık Hizmeti"
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors" />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-medium text-text-secondary">Açıklama</span>
                  <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="isteğe bağlı"
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-secondary">Tür *</span>
                  <select value={form.addonType} onChange={e => setForm(p => ({ ...p, addonType: e.target.value }))}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors">
                    <option value="ONE_TIME">Tek Seferlik</option>
                    <option value="RECURRING">Dönemsel</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-secondary">Varsayılan Tutar (₺) *</span>
                  <input type="number" min="1" step="0.01" value={form.defaultAmount}
                    onChange={e => setForm(p => ({ ...p, defaultAmount: e.target.value }))}
                    placeholder="0.00"
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors" />
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  İptal
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  <span className="material-symbols-outlined text-base">save</span>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          )}

          {/* Liste */}
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-gray-500 dark:text-gray-400">Yükleniyor...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center transition-colors">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">library_add</span>
              <p className="text-gray-500 dark:text-gray-400">Henüz şablon yok. Yeni Şablon butonundan ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">Ad</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">Tür</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">Varsayılan Tutar</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">Durum</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {templates.map(t => (
                    <tr key={t.id} className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 ${!t.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-main">{t.name}</p>
                        {t.description && <p className="text-xs text-text-secondary mt-0.5">{t.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${TYPE_CFG[t.addonType]?.cls}`}>
                          {TYPE_CFG[t.addonType]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-text-main">
                        ₺{Number(t.defaultAmount).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${t.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                          {t.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(t)} className="text-primary hover:opacity-70 transition-opacity" title="Düzenle">
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button onClick={() => handleToggle(t)} className="text-text-secondary hover:text-text-main transition-colors" title={t.isActive ? 'Pasife Al' : 'Aktif Et'}>
                            <span className="material-symbols-outlined text-base">{t.isActive ? 'visibility_off' : 'visibility'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
