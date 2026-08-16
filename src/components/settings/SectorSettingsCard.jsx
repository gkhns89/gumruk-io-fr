import React, { useCallback, useEffect, useState } from 'react';
import { sectorService } from '../../api/sectorService';
import { showSuccess, showError } from '../../utils/toastUtils';
import { confirmDialog } from '../../utils/confirmDialog';

const EMPTY_FORM = { name: '', displayOrder: '' };

/**
 * Sektör kataloğu yönetimi (SUPER_ADMIN).
 *
 * Katalog sistem geneli: buradan eklenen sektör bütün gümrük firmalarının
 * müşteri formunda çıkar. Silme yalnızca hiçbir firmaya atanmamış sektörler
 * için mümkün — atanmış olan pasife alınır, böylece mevcut atamalar korunur
 * ama yeni formlarda listelenmez.
 */
export default function SectorSettingsCard() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await sectorService.getAllSectors();
    if (result.success) {
      setSectors(result.data);
    } else {
      showError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (sector) => {
    setEditingId(sector.id);
    setForm({
      name: sector.name,
      displayOrder: sector.displayOrder ?? '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    if (name.length < 2) {
      showError('Sektör adı en az 2 karakter olmalıdır');
      return;
    }

    const displayOrder = form.displayOrder === '' ? undefined : Number(form.displayOrder);
    if (displayOrder !== undefined && !Number.isInteger(displayOrder)) {
      showError('Sıralama tam sayı olmalıdır');
      return;
    }

    setSaving(true);
    const result = editingId
      ? await sectorService.updateSector(editingId, { name, displayOrder })
      : await sectorService.createSector({ name, displayOrder });
    setSaving(false);

    if (result.success) {
      showSuccess(editingId ? 'Sektör güncellendi' : 'Sektör eklendi');
      closeForm();
      load();
    } else {
      showError(result.error);
    }
  };

  const handleToggleActive = async (sector) => {
    const result = await sectorService.updateSector(sector.id, {
      name: sector.name,
      isActive: !sector.isActive,
    });

    if (result.success) {
      showSuccess(sector.isActive ? 'Sektör pasife alındı' : 'Sektör aktifleştirildi');
      load();
    } else {
      showError(result.error);
    }
  };

  const handleDelete = async (sector) => {
    const ok = await confirmDialog({
      title: 'Sektörü sil',
      message: `"${sector.name}" kalıcı olarak silinecek.`,
      intent: 'danger',
      confirmText: 'Sil',
    });
    if (!ok) return;

    const result = await sectorService.deleteSector(sector.id);
    if (result.success) {
      showSuccess('Sektör silindi');
      load();
      return;
    }

    // Kullanımdaysa silmek yerine pasife almayı öner — atamalar kaybolmasın.
    if (result.inUse) {
      const deactivate = await confirmDialog({
        title: 'Sektör kullanımda',
        message: `${result.error}\n\nPasife alınsın mı? Mevcut atamalar korunur, yeni formlarda listelenmez.`,
        intent: 'warning',
        confirmText: 'Pasife al',
      });
      if (deactivate) handleToggleActive(sector);
      return;
    }

    showError(result.error);
  };

  return (
    <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[22px] text-primary">category</span>
          <div>
            <h2 className="font-semibold text-text-main">Sektörler</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Müşteri firmalarına atanan ve duyuru hedeflemesinde kullanılacak katalog
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold
                     hover:bg-primary/90 transition flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Ekle
        </button>
      </div>

      <div className="p-6">
        {formOpen && (
          <form onSubmit={handleSave} className="mb-5 p-4 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 space-y-3">
            <p className="text-sm font-semibold text-text-main">
              {editingId ? 'Sektörü Düzenle' : 'Yeni Sektör'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Sektör Adı</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Örn: Enerji ve Yenilenebilir Kaynaklar"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-800 text-text-main text-sm
                             placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Sıralama</label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm(prev => ({ ...prev, displayOrder: e.target.value }))}
                  placeholder="Boşsa sona"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-800 text-text-main text-sm
                             placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {editingId && (
              <p className="text-xs text-text-secondary">
                Sektörün sistem kodu ilk oluşturulduğunda sabitlenir; ad değişse de
                mevcut atamalar ve raporlar bozulmaz.
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold
                           hover:bg-primary/90 transition disabled:opacity-60"
              >
                {saving && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                           text-sm text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                İptal
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-primary text-[28px]">progress_activity</span>
          </div>
        ) : sectors.length === 0 ? (
          <div className="text-center py-8 text-text-secondary text-sm">
            Henüz sektör eklenmemiş
          </div>
        ) : (
          <div className="space-y-2">
            {sectors.map(sector => (
              <div
                key={sector.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition
                            ${sector.isActive
                              ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                              : 'border-dashed border-gray-200 dark:border-gray-700 opacity-50'}`}
              >
                <span className="material-symbols-outlined text-[18px] text-text-secondary flex-shrink-0">
                  label
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-main truncate">{sector.name}</p>
                  <span className="text-xs text-text-secondary font-mono">{sector.code}</span>
                </div>

                <span className="text-xs text-text-secondary flex-shrink-0 hidden sm:block">
                  {sector.companyCount > 0 ? `${sector.companyCount} firma` : 'kullanılmıyor'}
                </span>
                {!sector.isActive && (
                  <span className="text-[10px] text-gray-400 flex-shrink-0 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">
                    Pasif
                  </span>
                )}
                <span className="text-xs text-text-secondary flex-shrink-0 hidden sm:block">
                  #{sector.displayOrder ?? 0}
                </span>

                <button
                  onClick={() => handleToggleActive(sector)}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  title={sector.isActive ? 'Pasife al' : 'Aktifleştir'}
                >
                  <span className="material-symbols-outlined text-[16px] text-text-secondary">
                    {sector.isActive ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                <button
                  onClick={() => openEdit(sector)}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  title="Düzenle"
                >
                  <span className="material-symbols-outlined text-[16px] text-text-secondary">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(sector)}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                  title="Sil"
                >
                  <span className="material-symbols-outlined text-[16px] text-red-500">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
