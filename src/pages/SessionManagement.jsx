import React, { useState, useEffect, useCallback } from 'react';
import { sessionService } from '../api/sessionService';
import MainLayout from '../components/layout/MainLayout';
import { showSuccess, showError, showWarning } from '../utils/toastUtils';
import { t, getCurrentLocale } from '../locales';

const SessionManagement = () => {
  // Core data
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [ipFilter, setIpFilter] = useState('');

  // Bulk selection
  const [selectedSessions, setSelectedSessions] = useState(new Set());

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Load sessions
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await sessionService.getAllActiveSessions();

      if (result.success) {
        setSessions(result.data || []);
        setError('');
      } else {
        setError(result.error || t('api.session.listError'));
        setSessions([]);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(t('sessions.loadErrorUnexpected'));
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadSessions();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadSessions();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [loadSessions, autoRefresh]);

  // Handle single session invalidate
  const handleInvalidateSession = async (sessionId) => {
    const result = await sessionService.invalidateSession(sessionId);

    if (result.success) {
      showSuccess(t('sessions.invalidated'));
      loadSessions();
      setSelectedSessions(new Set());
    } else {
      showError(result.error || t('api.session.invalidateError'));
    }
  };

  // Handle bulk invalidate
  const handleBulkInvalidate = async () => {
    if (selectedSessions.size === 0) {
      showWarning(t('sessions.selectAtLeastOne'));
      return;
    }

    const sessionIds = Array.from(selectedSessions);
    const result = await sessionService.bulkInvalidateSessions(sessionIds);

    if (result.success) {
      showSuccess(t('sessions.bulkInvalidated', { count: selectedSessions.size }));
      loadSessions();
      setSelectedSessions(new Set());
    } else {
      showError(result.error || t('sessions.bulkInvalidateError'));
    }
  };

  // Handle invalidate all user sessions
  const handleInvalidateAllUserSessions = async (userId, username) => {
    const result = await sessionService.invalidateAllUserSessions(userId);

    if (result.success) {
      showSuccess(t('sessions.userInvalidated', { name: username }));
      loadSessions();
      setSelectedSessions(new Set());
    } else {
      showError(result.error || t('api.session.invalidateAllError'));
    }
  };

  // Confirmation modal handler
  const showConfirmation = (action) => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction.execute();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  // Get role badge styling
  const getRoleBadge = (role) => {
    const badges = {
      SUPER_ADMIN: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        border: 'border-red-300 dark:border-red-700',
        label: t('roles.superAdmin')
      },
      BROKER_ADMIN: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-800 dark:text-purple-300',
        border: 'border-purple-300 dark:border-purple-700',
        label: t('roles.brokerAdmin')
      },
      BROKER_USER: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-700',
        label: t('roles.brokerUser')
      },
      CLIENT_USER: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-300 dark:border-green-700',
        label: t('roles.clientUser')
      }
    };
    return badges[role] || {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-800 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
      label: role
    };
  };

  // Format date/time
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(getCurrentLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Calculate time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return '-';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('sessions.justNow');
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return t('notifications.daysAgo', { count: diffDays });
  };

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    const matchesRole = roleFilter === 'ALL' || session.globalRole === roleFilter;
    const matchesSearch = !searchTerm ||
      session.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIp = !ipFilter ||
      session.ipAddress?.includes(ipFilter);

    return matchesRole && matchesSearch && matchesIp;
  });

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSessions(new Set(filteredSessions.map(s => s.sessionId)));
    } else {
      setSelectedSessions(new Set());
    }
  };

  // Handle single select
  const handleSelectSession = (sessionId) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const allSelected = filteredSessions.length > 0 &&
    filteredSessions.every(s => selectedSessions.has(s.sessionId));

  // Sayı kalın yazılır; metin yer tutucunun iki yanından bölünür
  const [activeCountBefore, activeCountAfter] = t('sessions.activeCount').split('{{count}}');

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">
                  manage_accounts
                </span>
                {t('nav.sessions')}
              </h1>
              <p className="text-text-secondary mt-2">
                {t('sessions.subtitle')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {activeCountBefore}<span className="font-semibold">{sessions.length}</span>{activeCountAfter}
                {selectedSessions.size > 0 && (
                  <span className="ml-2 text-primary font-semibold">
                    • {t('sessions.selectedCount', { count: selectedSessions.size })}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  autoRefresh
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
                title={autoRefresh ? t('sessions.autoRefreshOnHint') : t('sessions.autoRefreshOffHint')}
              >
                <span className="material-symbols-outlined">
                  {autoRefresh ? 'sync' : 'sync_disabled'}
                </span>
                <span className="text-sm font-medium">
                  {autoRefresh ? t('sessions.autoRefreshOn') : t('sessions.autoRefreshOff')}
                </span>
              </button>

              {/* Manual refresh */}
              <button
                onClick={loadSessions}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                title={t('sessions.refreshNow')}
              >
                <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
              </button>

              {/* Bulk invalidate */}
              {selectedSessions.size > 0 && (
                <button
                  onClick={() => showConfirmation({
                    title: t('sessions.bulkTitle'),
                    message: t('sessions.bulkMessage', { count: selectedSessions.size }),
                    execute: handleBulkInvalidate
                  })}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md"
                >
                  <span className="material-symbols-outlined">block</span>
                  {t('sessions.bulkButton', { count: selectedSessions.size })}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    {t('sessions.searchUser')}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t('sessions.searchPlaceholder')}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors"
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    {t('sessions.roleFilter')}
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors"
                  >
                    <option value="ALL">{t('management.all')}</option>
                    <option value="SUPER_ADMIN">{t('roles.superAdmin')}</option>
                    <option value="BROKER_ADMIN">{t('roles.brokerAdmin')}</option>
                    <option value="BROKER_USER">{t('roles.brokerUser')}</option>
                    <option value="CLIENT_USER">{t('roles.clientUser')}</option>
                  </select>
                </div>

                {/* IP Filter */}
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    {t('sessions.ipFilter')}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                      lan
                    </span>
                    <input
                      type="text"
                      value={ipFilter}
                      onChange={(e) => setIpFilter(e.target.value)}
                      placeholder={t('sessions.ipPlaceholder')}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && sessions.length === 0 && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-text-secondary">{t('common.loading')}</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-600">error</span>
                  <p className="text-red-800 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredSessions.length === 0 && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors">
                <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4 block">
                  {sessions.length === 0 ? 'lock_clock' : 'filter_alt_off'}
                </span>
                <h3 className="text-xl font-semibold text-text-main mb-2">
                  {sessions.length === 0
                    ? t('sessions.empty')
                    : t('sessions.emptyFiltered')}
                </h3>
                <p className="text-text-secondary">
                  {sessions.length === 0
                    ? t('sessions.emptyHint')
                    : t('management.filterEmptyHint')}
                </p>
              </div>
            )}

            {/* Sessions Table */}
            {!loading && !error && filteredSessions.length > 0 && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('sessions.columns.user')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('user.role')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('user.company')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('sessions.columns.device')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('sessions.columns.ipAddress')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('sessions.columns.loginAt')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('sessions.columns.lastActivity')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('management.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-background-dark divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredSessions.map((session) => {
                        const roleBadge = getRoleBadge(session.globalRole);
                        const isSelected = selectedSessions.has(session.sessionId);

                        return (
                          <tr
                            key={session.sessionId}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectSession(session.sessionId)}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-text-main">
                                  {session.username}
                                </div>
                                <div className="text-sm text-text-secondary">
                                  {session.userEmail}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                                {roleBadge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-text-main">
                                {session.companyName || t('sessions.notAvailable')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-text-secondary">
                                {session.deviceInfo || t('sessions.unknownDevice')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-text-secondary font-mono">
                                {session.ipAddress || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-text-secondary">
                                {formatDateTime(session.loginAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-text-secondary">
                                {getTimeAgo(session.lastActivityAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                {/* Kick all user sessions */}
                                <button
                                  onClick={() => showConfirmation({
                                    title: t('sessions.endAllTitle'),
                                    message: t('sessions.endAllMessage', { name: session.username }),
                                    execute: () => handleInvalidateAllUserSessions(session.userId, session.username)
                                  })}
                                  className="text-orange-600 hover:text-orange-800 transition-colors"
                                  title={t('sessions.endAllHint')}
                                >
                                  <span className="material-symbols-outlined">person_off</span>
                                </button>

                                {/* Kick single session */}
                                <button
                                  onClick={() => showConfirmation({
                                    title: t('sessions.endOneTitle'),
                                    message: t('sessions.endOneMessage', { name: session.username }),
                                    execute: () => handleInvalidateSession(session.sessionId)
                                  })}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                  title={t('sessions.endOneHint')}
                                >
                                  <span className="material-symbols-outlined">block</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && confirmAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-red-600 text-3xl">
                  warning
                </span>
                <h3 className="text-xl font-bold text-text-main">
                  {confirmAction.title}
                </h3>
              </div>
              <p className="text-text-secondary mb-6">
                {confirmAction.message}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmAction(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-text-main"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SessionManagement;
