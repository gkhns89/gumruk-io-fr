import React, { useState, useEffect, useCallback } from 'react';
import { courierService } from '../../api/courierService';
import { customsService } from '../../api/customsService';
import { toUpperCase, COURIER_UPPERCASE_FIELDS } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { confirmDialog } from '../../utils/confirmDialog';
import { DAY_OPTIONS, getCourierType, isInHouseCourier } from '../../utils/constants';
import { FEATURE_FLAGS } from '../../utils/featureFlags';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useLinkedClients } from '../../hooks/useLinkedClients';
import { t, getCurrentLocale } from '../../locales';
import NewFeatureBadge from '../common/NewFeatureBadge';
import BatchAddScheduleModal from './BatchAddScheduleModal';
import InHouseDispatchFields from './InHouseDispatchFields';
import CourierVehiclesTab from './CourierVehiclesTab';

// Durak adı: yeni kayıtlar stopName taşır; eski yanıtlarda yalnızca customs vardır.
const stopNameOf = (schedule) => schedule.stopName || schedule.customs?.customsShortName || '';

export default function EditCourierModal({ onClose, courier, onSuccess, brokerCompanyId }) {
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'schedules' | 'vehicles'
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Müşteri firması durağı — FEATURE_FLAGS.COURIER_CLIENT_STOPS (backend de ayrıca kontrol ediyor)
  const { hasFeature, isPilotFeature } = useFeatureFlags();
  const clientStopsEnabled = hasFeature(FEATURE_FLAGS.COURIER_CLIENT_STOPS);
  const clientStopsPilot = isPilotFeature(FEATURE_FLAGS.COURIER_CLIENT_STOPS);
  const [stopType, setStopType] = useState('CUSTOMS'); // 'CUSTOMS' | 'CLIENT'
  const isClientStop = clientStopsEnabled && stopType === 'CLIENT';
  const { clients: clientList, loading: loadingClients } = useLinkedClients(brokerCompanyId, clientStopsEnabled);

  // Kayıt tipi değişmez: firma içi sevkiyatta araç alanları, kurye firmasında kısa ad/email düzenlenir.
  // Rozet, bayrak kapalıyken yalnızca zaten firma içi olan kayıtta görünür.
  const isInHouse = isInHouseCourier(courier);
  const courierTypeOption = getCourierType(isInHouse ? 'IN_HOUSE' : 'EXTERNAL');
  const showTypeBadge = isInHouse || clientStopsEnabled;

  // Araçlar sekmesi yalnızca firma içi kayıtta ve canlı takip bayrağı açıkken (backend de kontrol ediyor)
  const liveTrackingEnabled = hasFeature(FEATURE_FLAGS.COURIER_LIVE_TRACKING);
  const showVehiclesTab = isInHouse && liveTrackingEnabled;
  const liveTrackingPilot = isPilotFeature(FEATURE_FLAGS.COURIER_LIVE_TRACKING);

  // Courier Info Form
  const [formData, setFormData] = useState({
    name: courier.name || '',
    shortName: courier.shortName || '',
    active: courier.active !== undefined ? courier.active : true,
    contactPhone: courier.contactPhone || '',
    contactEmail: courier.contactEmail || '',
    notes: courier.notes || '',
    vehicleType: courier.vehicleType || '',
    vehiclePlate: courier.vehiclePlate || '',
    driverName: courier.driverName || ''
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
    clientCompanyId: '',
    departureTime: '09:00',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [schedulesModified, setSchedulesModified] = useState(false); // Track schedule changes

  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const result = await courierService.getSchedules(courier.id);
      if (result.success) {
        setSchedules(result.data || []);
      } else {
        showError(t('couriers.schedules.loadError'));
      }
    } catch {
      showError(t('couriers.schedules.loadErrorUnexpected'));
    } finally {
      setLoadingSchedules(false);
    }
  }, [courier.id]);

  // Load schedules and customs on mount (and if the edited courier changes)
  useEffect(() => {
    loadSchedules();
    loadCustoms();
  }, [loadSchedules]);

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
        showError(t('couriers.schedules.customsLoadError'));
      }
    } catch {
      showError(t('couriers.schedules.customsLoadErrorUnexpected'));
    } finally {
      setLoadingCustoms(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // UPPERCASE conversion for specific fields; plaka veridir, dilden bağımsız Türkçe kuralla
    let newValue = value;
    if (type === 'checkbox') newValue = checked;
    else if (COURIER_UPPERCASE_FIELDS.includes(name)) newValue = toUpperCase(value);
    else if (name === 'vehiclePlate') newValue = value.toLocaleUpperCase('tr-TR');

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
      showError(isInHouse ? t('couriers.inHouse.nameRequired') : t('couriers.form.nameRequired'));
      return;
    }

    // Validate email format if provided (firma içi kayıtta email alanı gösterilmez)
    if (!isInHouse && formData.contactEmail && formData.contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail)) {
        setEmailError(t('management.invalidEmail'));
        return;
      }
    }

    setLoading(true);

    try {
      const result = await courierService.updateCourierCompany(courier.id, {
        // Tip değiştirilemez: yalnızca kaydın kendi tipi geri gönderilir (eski yanıtta alan yoksa hiç gönderilmez)
        ...(courier.courierType ? { courierType: courier.courierType } : {}),
        name: formData.name.trim(),
        shortName: formData.shortName.trim() || null,
        active: formData.active,
        contactPhone: formData.contactPhone.trim() || null,
        contactEmail: formData.contactEmail.trim() || null,
        notes: formData.notes.trim() || null,
        ...(isInHouse && {
          vehicleType: formData.vehicleType || null,
          vehiclePlate: formData.vehiclePlate.trim() || null,
          driverName: formData.driverName.trim() || null,
        }),
      });

      if (result.success) {
        showSuccess(t('management.updatedSuccess', { name: formData.name }));
        onSuccess(result.data);
        onClose();
      } else {
        showError(result.error || t('couriers.edit.updateError'));
      }
    } catch (err) {
      showError(getApiErrorMessage(err, t('management.unexpectedError')));
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    const stopId = isClientStop ? newSchedule.clientCompanyId : newSchedule.customsId;
    if (!stopId) {
      showError(isClientStop ? t('courierStops.selectClient') : t('couriers.schedules.selectCustoms'));
      return;
    }

    if (!newSchedule.departureTime) {
      showError(t('couriers.schedules.enterTime'));
      return;
    }

    try {
      const result = await courierService.addSchedule(courier.id, {
        dayOfWeek: parseInt(newSchedule.dayOfWeek),
        ...(isClientStop
          ? { clientCompanyId: parseInt(stopId) }
          : { customsId: parseInt(stopId) }),
        departureTime: newSchedule.departureTime,
        active: true,
        notes: newSchedule.notes.trim() || null
      });

      if (result.success) {
        showSuccess(t('couriers.schedules.added'));
        setSchedulesModified(true); // Mark as modified
        loadSchedules(); // Reload schedules
        // Reset form (durak tipi korunur)
        setNewSchedule({
          dayOfWeek: 1,
          customsId: customsList.length > 0 ? customsList[0].id : '',
          clientCompanyId: '',
          departureTime: '09:00',
          notes: ''
        });
      } else {
        showError(result.error || t('couriers.schedules.addError'));
      }
    } catch (err) {
      showError(getApiErrorMessage(err, t('management.unexpectedError')));
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    const ok = await confirmDialog({
      title: t('common.delete'),
      message: t('couriers.schedules.deleteConfirm'),
      intent: 'danger',
      confirmText: t('common.delete'),
    });
    if (!ok) return;

    try {
      const result = await courierService.deleteSchedule(scheduleId);

      if (result.success) {
        showSuccess(t('couriers.schedules.deleted'));
        setSchedulesModified(true); // Mark as modified
        loadSchedules(); // Reload schedules
      } else {
        showError(result.error || t('couriers.schedules.deleteError'));
      }
    } catch (err) {
      showError(getApiErrorMessage(err, t('management.unexpectedError')));
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

  // Group schedules by day and sort (time first, then stop name)
  const schedulesByDay = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.dayOfWeek]) {
      acc[schedule.dayOfWeek] = [];
    }
    acc[schedule.dayOfWeek].push(schedule);
    return acc;
  }, {});

  // Sort schedules within each day: time first, then stop name alphabetically
  Object.keys(schedulesByDay).forEach(day => {
    schedulesByDay[day].sort((a, b) => {
      // Primary sort: departure time
      const timeCompare = a.departureTime.localeCompare(b.departureTime);
      if (timeCompare !== 0) return timeCompare;

      // Secondary sort: stop name (alphabetically)
      return stopNameOf(a).localeCompare(stopNameOf(b), getCurrentLocale());
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
              {isInHouse ? t('couriers.inHouse.editTitle') : t('couriers.edit.title')}
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
            {isInHouse ? t('couriers.inHouse.infoTab') : t('management.companyInfo')}
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
            {t('couriers.edit.schedulesTab', { count: schedules.length })}
            {activeTab === 'schedules' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          {showVehiclesTab && (
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex items-center gap-1.5 px-4 py-3 font-medium text-sm transition-colors relative ${
                activeTab === 'vehicles'
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text-main'
              }`}
            >
              {t('couriers.vehicles.tab')}
              {liveTrackingPilot && <NewFeatureBadge />}
              {activeTab === 'vehicles' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Record type (read-only) */}
              {showTypeBadge && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-main">{t('couriers.types.label')}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${courierTypeOption.badgeClass}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{courierTypeOption.icon}</span>
                    {courierTypeOption.label}
                  </span>
                </div>
              )}

              {/* Company Name / Dispatch Name */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  {isInHouse ? t('couriers.inHouse.name') : t('couriers.form.name')} <span className="text-red-500">*</span>
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
              {!isInHouse && (
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    {t('company.shortName')}
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
              )}

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
                  <span className="text-sm font-medium text-text-main">{t('transactions.common.active')}</span>
                </label>
                <p className="text-xs text-text-secondary mt-1">
                  {isInHouse ? t('couriers.inHouse.inactiveHint') : t('couriers.edit.inactiveHint')}
                </p>
              </div>

              {isInHouse ? (
                <InHouseDispatchFields
                  formData={formData}
                  onChange={handleChange}
                  vehiclesManagedElsewhere={showVehiclesTab}
                />
              ) : (
                <>
                  {/* Contact Phone */}
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      {t('couriers.form.phone')}
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
                      {t('couriers.form.email')}
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
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  {t('management.notes')}
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
          ) : activeTab === 'vehicles' ? (
            <CourierVehiclesTab courierId={courier.id} brokerCompanyId={brokerCompanyId} />
          ) : (
            <div className="space-y-6">
              {/* Add New Schedule Form */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-main">{t('couriers.schedules.addTitle')}</h3>
                  <button
                    onClick={() => setShowBatchModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">playlist_add</span>
                    {t('couriers.schedules.batchAdd')}
                  </button>
                </div>

                {/* Durak tipi: Gümrük / Müşteri Firması (bayrak açıksa) */}
                {clientStopsEnabled && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-text-main">{t('courierStops.stopType')}</span>
                    <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                      {[
                        ['CUSTOMS', t('courierStops.customs')],
                        ['CLIENT', t('courierStops.client')],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={stopType === value}
                          onClick={() => setStopType(value)}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                            stopType === value
                              ? 'bg-primary text-white'
                              : 'bg-white dark:bg-gray-700 text-text-main hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {clientStopsPilot && <NewFeatureBadge />}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Day of Week */}
                  <div>
                    <label className="block text-xs font-medium text-text-main mb-1">{t('couriers.schedules.day')}</label>
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

                  {/* Stop: Customs or Client */}
                  <div>
                    {isClientStop ? (
                      <>
                        <label className="block text-xs font-medium text-text-main mb-1">{t('courierStops.client')}</label>
                        <select
                          value={newSchedule.clientCompanyId}
                          onChange={(e) => setNewSchedule(prev => ({ ...prev, clientCompanyId: e.target.value }))}
                          disabled={loadingClients || clientList.length === 0}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-main focus:ring-2 focus:ring-primary"
                        >
                          <option value="">
                            {loadingClients
                              ? t('courierStops.clientsLoading')
                              : clientList.length === 0 ? t('courierStops.noClients') : t('courierStops.selectClient')}
                          </option>
                          {clientList.map(client => (
                            <option key={client.id} value={client.id}>
                              {client.label}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="block text-xs font-medium text-text-main mb-1">{t('courierStops.customs')}</label>
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
                      </>
                    )}
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-xs font-medium text-text-main mb-1">{t('couriers.schedules.time')}</label>
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
                      {t('common.add')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Schedules List */}
              {loadingSchedules ? (
                <div className="text-center py-8 text-text-secondary">{t('common.loading')}</div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-2">schedule</span>
                  <p className="text-sm">{t('couriers.schedules.empty')}</p>
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
                                <span className="material-symbols-outlined text-primary text-sm">
                                  {schedule.stopType === 'CLIENT' ? 'corporate_fare' : 'schedule'}
                                </span>
                                <div>
                                  <p className="text-sm font-medium text-text-main">
                                    {formatTime(schedule.departureTime)} - {stopNameOf(schedule) || 'N/A'}
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
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('management.updating') : t('common.update')}
            </button>
          </div>
        )}
      </div>

      {/* Batch Add Schedule Modal */}
      {showBatchModal && (
        <BatchAddScheduleModal
          courier={courier}
          brokerCompanyId={brokerCompanyId}
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
