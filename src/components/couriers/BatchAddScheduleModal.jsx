import React, { useState, useEffect } from 'react';
import { courierService } from '../../api/courierService';
import { customsService } from '../../api/customsService';
import { showSuccess, showError } from '../../utils/toastUtils';
import { DAY_OPTIONS } from '../../utils/constants';
import { FEATURE_FLAGS } from '../../utils/featureFlags';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useLinkedClients } from '../../hooks/useLinkedClients';
import { t } from '../../locales';
import NewFeatureBadge from '../common/NewFeatureBadge';

/**
 * Toplu Schedule Ekleme Modal
 * Birden fazla gün + durak (gümrük ya da müşteri firması) kombinasyonu için tek seferde schedule ekleme
 */
export default function BatchAddScheduleModal({ courier, brokerCompanyId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [customsList, setCustomsList] = useState([]);
  const [loadingCustoms, setLoadingCustoms] = useState(true);

  // Müşteri firması durağı — FEATURE_FLAGS.COURIER_CLIENT_STOPS
  const { hasFeature, isPilotFeature } = useFeatureFlags();
  const clientStopsEnabled = hasFeature(FEATURE_FLAGS.COURIER_CLIENT_STOPS);
  const clientStopsPilot = isPilotFeature(FEATURE_FLAGS.COURIER_CLIENT_STOPS);
  const [stopType, setStopType] = useState('CUSTOMS'); // 'CUSTOMS' | 'CLIENT'
  const isClientStop = clientStopsEnabled && stopType === 'CLIENT';
  const { clients: clientList, loading: loadingClients } = useLinkedClients(brokerCompanyId, clientStopsEnabled);

  // Form state
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedCustoms, setSelectedCustoms] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);

  // Hazır saat şablonları (15 dakikalık aralıklarla)
  const timeTemplates = [
    '07:00', '07:15', '07:30', '07:45',
    '08:00', '08:15', '08:30', '08:45',
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00', '19:15', '19:30', '19:45',
    '20:00'
  ];

  // Load active customs
  useEffect(() => {
    loadCustoms();
  }, []);

  const loadCustoms = async () => {
    setLoadingCustoms(true);
    try {
      const result = await customsService.getActiveCustoms();
      if (result.success) {
        setCustomsList(result.data || []);
      } else {
        showError(result.error || t('couriers.schedules.customsLoadError'));
      }
    } catch (err) {
      console.error('Error loading customs:', err);
      showError(t('couriers.schedules.customsLoadErrorUnexpected'));
    } finally {
      setLoadingCustoms(false);
    }
  };

  // Toggle day selection
  const toggleDay = (dayValue) => {
    setSelectedDays(prev =>
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  // Toggle customs selection
  const toggleCustoms = (customsId) => {
    setSelectedCustoms(prev =>
      prev.includes(customsId)
        ? prev.filter(c => c !== customsId)
        : [...prev, customsId]
    );
  };

  // Toggle client selection
  const toggleClient = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(c => c !== clientId)
        : [...prev, clientId]
    );
  };

  // Toggle time selection
  const toggleTime = (time) => {
    setSelectedTimes(prev =>
      prev.includes(time)
        ? prev.filter(selected => selected !== time)
        : [...prev, time]
    );
  };

  // Select all weekdays (Mon-Fri)
  const selectWeekdays = () => {
    setSelectedDays([1, 2, 3, 4, 5]);
  };

  // Select all days
  const selectAllDays = () => {
    setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
  };

  // Clear all selections
  const clearDays = () => {
    setSelectedDays([]);
  };

  // Select all stops of the active type
  const selectAllStops = () => {
    if (isClientStop) {
      setSelectedClients(clientList.map(c => c.id));
    } else {
      setSelectedCustoms(customsList.map(c => c.id));
    }
  };

  // Clear stop selection of the active type
  const clearStops = () => {
    if (isClientStop) {
      setSelectedClients([]);
    } else {
      setSelectedCustoms([]);
    }
  };

  // Select all times
  const selectAllTimes = () => {
    setSelectedTimes([...timeTemplates]);
  };

  // Select morning times (07:00-12:00)
  const selectMorningTimes = () => {
    setSelectedTimes(timeTemplates.filter(time => {
      const hour = parseInt(time.split(':')[0]);
      return hour >= 7 && hour < 12;
    }));
  };

  // Select afternoon times (12:00-18:00)
  const selectAfternoonTimes = () => {
    setSelectedTimes(timeTemplates.filter(time => {
      const hour = parseInt(time.split(':')[0]);
      return hour >= 12 && hour < 18;
    }));
  };

  // Clear times selection
  const clearTimes = () => {
    setSelectedTimes([]);
  };

  const selectedStops = isClientStop ? selectedClients : selectedCustoms;

  // Validate and submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (selectedDays.length === 0) {
      showError(t('couriers.batch.selectDay'));
      return;
    }

    if (selectedStops.length === 0) {
      showError(isClientStop ? t('courierStops.selectAtLeastOneClient') : t('couriers.batch.selectCustoms'));
      return;
    }

    if (selectedTimes.length === 0) {
      showError(t('couriers.batch.selectTime'));
      return;
    }

    setLoading(true);

    try {
      // Create all combinations
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const dayOfWeek of selectedDays) {
        for (const stopId of selectedStops) {
          for (const departureTime of selectedTimes) {
            try {
              const result = await courierService.addSchedule(courier.id, {
                ...(isClientStop ? { clientCompanyId: stopId } : { customsId: stopId }),
                dayOfWeek,
                departureTime,
                active: true,
              });

              if (result.success) {
                successCount++;
              } else {
                failCount++;
                errors.push(result.error);
              }
            } catch (err) {
              failCount++;
              errors.push(t('couriers.batch.unexpectedError', { message: err.message }));
            }
          }
        }
      }

      // Show results
      if (successCount > 0) {
        showSuccess(t('couriers.batch.success', { count: successCount }));
        onSuccess();
      }

      if (failCount > 0) {
        showError(t('couriers.batch.partialFailure', { count: failCount, error: errors[0] || '' }));
      }

      // Close modal if at least some succeeded
      if (successCount > 0) {
        onClose();
      }
    } catch (err) {
      console.error('Batch add error:', err);
      showError(t('couriers.batch.error'));
    } finally {
      setLoading(false);
    }
  };

  const totalSchedules = selectedDays.length * selectedStops.length * selectedTimes.length;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('couriers.batch.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {courier.shortName || courier.name} - {t('couriers.batch.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Days Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('couriers.batch.selectDays')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectWeekdays}
                  className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                >
                  {t('couriers.batch.weekdays')}
                </button>
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                >
                  {t('management.all')}
                </button>
                <button
                  type="button"
                  onClick={clearDays}
                  className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  {t('common.clear')}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAY_OPTIONS.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    selectedDays.includes(day.value)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="text-xs font-medium">{day.shortLabel}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{day.label}</div>
                </button>
              ))}
            </div>
            {selectedDays.length > 0 && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {t('couriers.batch.daysSelected', { count: selectedDays.length })}
              </p>
            )}
          </div>

          {/* Stops Selection */}
          <div className="mb-6">
            {clientStopsEnabled && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('courierStops.stopType')}</span>
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
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {clientStopsPilot && <NewFeatureBadge />}
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {isClientStop ? t('courierStops.clientStops') : t('couriers.batch.customsOffices')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllStops}
                  className="text-xs px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-900/50"
                >
                  {t('common.selectAll')}
                </button>
                <button
                  type="button"
                  onClick={clearStops}
                  className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  {t('common.clear')}
                </button>
              </div>
            </div>

            {isClientStop ? (
              loadingClients ? (
                <div className="text-center py-4 text-gray-500">{t('courierStops.clientsLoading')}</div>
              ) : clientList.length === 0 ? (
                <div className="text-center py-4 text-gray-500">{t('courierStops.noClients')}</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {clientList.map(client => (
                      <label
                        key={client.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                          selectedClients.includes(client.id)
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => toggleClient(client.id)}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {client.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {selectedClients.length > 0 && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {t('courierStops.selectedClients', { count: selectedClients.length })}
                    </p>
                  )}
                </>
              )
            ) : loadingCustoms ? (
              <div className="text-center py-4 text-gray-500">{t('couriers.batch.customsLoading')}</div>
            ) : customsList.length === 0 ? (
              <div className="text-center py-4 text-red-600">{t('couriers.batch.noCustoms')}</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {customsList.map(customs => (
                    <label
                      key={customs.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                        selectedCustoms.includes(customs.id)
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCustoms.includes(customs.id)}
                        onChange={() => toggleCustoms(customs.id)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {customs.customsShortName}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedCustoms.length > 0 && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {t('couriers.batch.customsSelected', { count: selectedCustoms.length })}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Time Templates Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('couriers.batch.times')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectMorningTimes}
                  className="text-xs px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50"
                >
                  {t('couriers.batch.morning')}
                </button>
                <button
                  type="button"
                  onClick={selectAfternoonTimes}
                  className="text-xs px-2 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-100 dark:hover:bg-orange-900/50"
                >
                  {t('couriers.batch.afternoon')}
                </button>
                <button
                  type="button"
                  onClick={selectAllTimes}
                  className="text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50"
                >
                  {t('management.all')}
                </button>
                <button
                  type="button"
                  onClick={clearTimes}
                  className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  {t('common.clear')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {timeTemplates.map(time => (
                <button
                  key={time}
                  type="button"
                  onClick={() => toggleTime(time)}
                  className={`px-2 py-2 text-xs font-medium rounded transition-all ${
                    selectedTimes.includes(time)
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>

            {selectedTimes.length > 0 && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {t('couriers.batch.timesSelected', { count: selectedTimes.length })}
              </p>
            )}
          </div>

          {/* Summary */}
          {totalSchedules > 0 && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                  info
                </span>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                  {t('couriers.batch.summary')}
                </p>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-bold">{t('couriers.batch.summaryCount', { count: totalSchedules })}</span> {t('couriers.batch.summaryWillAdd')}
                <br />
                {isClientStop
                  ? `(${t('courierStops.summaryClients', { days: selectedDays.length, stops: selectedClients.length, times: selectedTimes.length })})`
                  : `(${t('couriers.batch.summaryCustoms', { days: selectedDays.length, stops: selectedCustoms.length, times: selectedTimes.length })})`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              disabled={loading || totalSchedules === 0}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  {t('management.adding')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">add_circle</span>
                  {t('couriers.batch.addAll', { count: totalSchedules })}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
