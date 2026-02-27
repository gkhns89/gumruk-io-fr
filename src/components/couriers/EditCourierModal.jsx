import React, { useState, useEffect } from 'react';
import { courierService } from '../../api/courierService';
import { customsService } from '../../api/customsService';
import { toUpperCase, COURIER_UPPERCASE_FIELDS } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { DAY_OPTIONS, getDayName } from '../../utils/constants';
import BatchAddScheduleModal from './BatchAddScheduleModal';

export default function EditCourierModal({ onClose, courier, onSuccess }) {
  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'schedules'
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Courier Info Form
  const [formData, setFormData] = useState({
    name: courier.name || '',
    shortName: courier.shortName || '',
    active: courier.active !== undefined ? courier.active : true,
    contactPhone: courier.contactPhone || '',
    contactEmail: courier.contactEmail || '',
    notes: courier.notes || ''
  });

  // Schedule Management
  const [schedules, setSchedules] = useState([]);
  const [customsList, setCustomsList] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingCustoms, setLoadingCustoms] = useState(true);

  // New Schedule Form
  const [newSchedule, setNewSchedule] = useState({
    dayOfWeek: 1,
    customsId: '',
    departureTime: '09:00',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [schedulesModified, setSchedulesModified] = useState(false); // Track schedule changes

  // Load schedules and customs on mount
  useEffect(() => {
    loadSchedules();
    loadCustoms();
  }, []);

  const loadSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const result = await courierService.getSchedules(courier.id);
      if (result.success) {
        setSchedules(result.data || []);
      } else {
        showError('Kalkış saatleri yüklenemedi');
      }
    } catch (err) {
      showError('Kalkış saatleri yüklenirken hata oluştu');
    } finally {
      setLoadingSchedules(false);
    }
  };

  const loadCustoms = async () => {
    setLoadingCustoms(true);
    try {
      const result = await customsService.getActiveCustoms();
      if (result.success) {
        setCustomsList(result.data || []);
        // Set first customs as default if available
        if (result.data && result.data.length > 0) {
          setNewSchedule(prev => ({ ...prev, customsId: result.data[0].id }));
        }
      } else {
        showError('Gümrük listesi yüklenemedi');
      }
    } catch (err) {
      showError('Gümrük listesi yüklenirken hata oluştu');
    } finally {
      setLoadingCustoms(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // UPPERCASE conversion for specific fields
    const newValue = type === 'checkbox'
      ? checked
      : (COURIER_UPPERCASE_FIELDS.includes(name) ? toUpperCase(value) : value);

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear email error when typing
    if (name === 'contactEmail') {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setEmailError('');

    // Validate required fields
    if (!formData.name.trim()) {
      showError('Kurye firması adı zorunludur');
      return;
    }

    // Validate email format if provided
    if (formData.contactEmail && formData.contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail)) {
        setEmailError('Geçerli bir email adresi giriniz');
        return;
      }
    }

    setLoading(true);

    try {
      const result = await courierService.updateCourierCompany(courier.id, {
        name: formData.name.trim(),
        shortName: formData.shortName.trim() || null,
        active: formData.active,
        contactPhone: formData.contactPhone.trim() || null,
        contactEmail: formData.contactEmail.trim() || null,
        notes: formData.notes.trim() || null
      });

      if (result.success) {
        showSuccess(`${formData.name} başarıyla güncellendi!`);
        onSuccess(result.data);
        onClose();
      } else {
        showError(result.error || 'Kurye firması güncellenemedi');
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.customsId) {
      showError('Lütfen gümrük müdürlüğü seçin');
      return;
    }

    if (!newSchedule.departureTime) {
      showError('Lütfen kalkış saati girin');
      return;
    }

    try {
      const result = await courierService.addSchedule(courier.id, {
        dayOfWeek: parseInt(newSchedule.dayOfWeek),
        customsId: parseInt(newSchedule.customsId),
        departureTime: newSchedule.departureTime,
        active: true,
        notes: newSchedule.notes.trim() || null
      });

      if (result.success) {
        showSuccess('Kalkış saati eklendi');
        setSchedulesModified(true); // Mark as modified
        loadSchedules(); // Reload schedules
        // Reset form
        setNewSchedule({
          dayOfWeek: 1,
          customsId: customsList.length > 0 ? customsList[0].id : '',
          departureTime: '09:00',
          notes: ''
        });
      } else {
        showError(result.error || 'Kalkış saati eklenemedi');
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Bu kalkış saatini silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const result = await courierService.deleteSchedule(scheduleId);

      if (result.success) {
        showSuccess('Kalkış saati silindi');
        setSchedulesModified(true); // Mark as modified
        loadSchedules(); // Reload schedules
      } else {
        showError(result.error || 'Kalkış saati silinemedi');
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu');
    }
  };

  const handleClose = () => {
    // If schedules were modified, trigger parent refresh
    if (schedulesModified) {
      onSuccess(courier); // Trigger parent to reload courier list
    } else {
      onClose();
    }
  };

  // Format time to HH:mm (remove seconds)
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:mm:ss -> HH:mm
  };

  // Group schedules by day and sort (time first, then customs name)
  const schedulesByDay = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.dayOfWeek]) {
      acc[schedule.dayOfWeek] = [];
    }
    acc[schedule.dayOfWeek].push(schedule);
    return acc;
  }, {});

  // Sort schedules within each day: time first, then customs name alphabetically
  Object.keys(schedulesByDay).forEach(day => {
    schedulesByDay[day].sort((a, b) => {
      // Primary sort: departure time
      const timeCompare = a.departureTime.localeCompare(b.departureTime);
      if (timeCompare !== 0) return timeCompare;

      // Secondary sort: customs name (alphabetically)
      return a.customs.customsShortName.localeCompare(b.customs.customsShortName, 'tr');
    });
  });

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 transition-colors duration-300">
          <div>
            <h2 className="text-2xl font-bold text-text-main">
              Kurye Firmasını Düzenle
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {courier.shortName || courier.name}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'info'
                ? 'text-primary'
                : 'text-text-secondary hover:text-text-main'
            }`}
          >
            Firma Bilgileri
            {activeTab === 'info' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'schedules'
                ? 'text-primary'
                : 'text-text-secondary hover:text-text-main'
            }`}
          >
            Kalkış Saatleri ({schedules.length})
            {activeTab === 'schedules' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Kurye Firması Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                />
              </div>

              {/* Short Name */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Kısa Ad
                </label>
                <input
                  type="text"
                  name="shortName"
                  value={formData.shortName}
                  onChange={handleChange}
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-text-main">Aktif</span>
                </label>
                <p className="text-xs text-text-secondary mt-1">
                  Pasif kurye firmaları dashboard'da gösterilmez
                </p>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  İletişim Telefonu
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  İletişim Email
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  maxLength={255}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-800 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                    emailError
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {emailError && (
                  <p className="text-xs text-red-500 mt-1">{emailError}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Notlar
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
                />
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Add New Schedule Form */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-main">Yeni Kalkış Saati Ekle</h3>
                  <button
                    onClick={() => setShowBatchModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">playlist_add</span>
                    Toplu Ekle
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Day of Week */}
                  <div>
                    <label className="block text-xs font-medium text-text-main mb-1">Gün</label>
                    <select
                      value={newSchedule.dayOfWeek}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-main focus:ring-2 focus:ring-primary"
                    >
                      {DAY_OPTIONS.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Customs */}
                  <div>
                    <label className="block text-xs font-medium text-text-main mb-1">Gümrük</label>
                    <select
                      value={newSchedule.customsId}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, customsId: e.target.value }))}
                      disabled={loadingCustoms}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-main focus:ring-2 focus:ring-primary"
                    >
                      {customsList.map(customs => (
                        <option key={customs.id} value={customs.id}>
                          {customs.customsShortName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-xs font-medium text-text-main mb-1">Saat</label>
                    <input
                      type="time"
                      value={newSchedule.departureTime}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, departureTime: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-main focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="flex items-end">
                    <button
                      onClick={handleAddSchedule}
                      className="w-full px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Ekle
                    </button>
                  </div>
                </div>
              </div>

              {/* Schedules List */}
              {loadingSchedules ? (
                <div className="text-center py-8 text-text-secondary">Yükleniyor...</div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-2">schedule</span>
                  <p className="text-sm">Henüz kalkış saati eklenmemiş</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {DAY_OPTIONS.map(day => {
                    const daySchedules = schedulesByDay[day.value] || [];
                    if (daySchedules.length === 0) return null;

                    return (
                      <div key={day.value} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-text-main mb-3">{day.label}</h4>
                        <div className="space-y-2">
                          {daySchedules.map(schedule => (
                            <div
                              key={schedule.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                                <div>
                                  <p className="text-sm font-medium text-text-main">
                                    {formatTime(schedule.departureTime)} - {schedule.customs?.customsShortName || 'N/A'}
                                  </p>
                                  {schedule.notes && (
                                    <p className="text-xs text-text-secondary">{schedule.notes}</p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === 'info' && (
          <div className="flex gap-3 p-6 pt-0 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClose}
              type="button"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Güncelleniyor...' : 'Güncelle'}
            </button>
          </div>
        )}
      </div>

      {/* Batch Add Schedule Modal */}
      {showBatchModal && (
        <BatchAddScheduleModal
          courier={courier}
          onClose={() => setShowBatchModal(false)}
          onSuccess={() => {
            loadSchedules(); // Refresh schedules list
            setSchedulesModified(true); // Mark as modified
          }}
        />
      )}
    </div>
  );
}
