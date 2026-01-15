import { useState, useEffect, useRef } from 'react';

export default function AutoRefreshControl({ onRefresh, loading, isModalOpen, isFilterOpen, onOpen }) {
  // ===== STATE MANAGEMENT =====
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Settings State (localStorage initialization)
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem('transactionsAutoRefresh_enabled') === 'true';
  });

  const [refreshInterval, setRefreshInterval] = useState(() => {
    const stored = localStorage.getItem('transactionsAutoRefresh_interval');
    const parsed = stored ? parseInt(stored, 10) : null;

    // Validate: must be a valid number and at least 60000 (1 minute)
    if (parsed && !isNaN(parsed) && parsed >= 60000) {
      console.log('Loaded interval from localStorage:', parsed);
      return parsed;
    }

    console.log('Using default interval: 300000 (5 minutes)');
    return 300000; // Default: 5 minutes
  });

  // Timestamp State
  const [lastRefreshTime, setLastRefreshTime] = useState(() => {
    return parseInt(localStorage.getItem('transactionsAutoRefresh_lastTime')) || Date.now();
  });

  // Refs
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const intervalIdRef = useRef(null);
  const onRefreshRef = useRef(onRefresh);
  const loadingRef = useRef(loading);
  const previousLoadingRef = useRef(loading);

  // Keep refs updated
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    previousLoadingRef.current = loadingRef.current;
    loadingRef.current = loading;
  }, [loading]);

  // ===== EFFECTS =====
  // Effect 1: Update last refresh time when loading completes
  useEffect(() => {
    // When loading changes from true to false, data has been refreshed
    if (!loading && previousLoadingRef.current) {
      const now = Date.now();
      setLastRefreshTime(now);
      localStorage.setItem('transactionsAutoRefresh_lastTime', now.toString());
      console.log('Data refreshed, updating last refresh time');
    }
  }, [loading]);

  // Effect 2: Auto-refresh interval management
  useEffect(() => {
    // Validate interval value
    if (!refreshInterval || refreshInterval < 60000) {
      console.warn('Invalid interval value:', refreshInterval);
      return;
    }

    // Clear any existing interval
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Only set interval if enabled AND no modal is open
    if (isEnabled && !isModalOpen) {
      console.log('Starting auto-refresh with interval:', refreshInterval);
      intervalIdRef.current = setInterval(() => {
        // Only refresh if not currently loading
        if (!loadingRef.current) {
          console.log('Auto-refresh triggered');
          try {
            onRefreshRef.current();
          } catch (error) {
            console.error('Auto-refresh error:', error);
          }
        } else {
          console.log('Skipping refresh - loading in progress');
        }
      }, refreshInterval);
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalIdRef.current) {
        console.log('Clearing auto-refresh interval');
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [isEnabled, refreshInterval, isModalOpen]);

  // Effect 3: Click outside detection
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsidePanel = panelRef.current?.contains(event.target);
      const isClickOnButton = buttonRef.current?.contains(event.target);

      if (!isClickInsidePanel && !isClickOnButton) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Effect 4: Persist enabled state
  useEffect(() => {
    localStorage.setItem('transactionsAutoRefresh_enabled', isEnabled.toString());
  }, [isEnabled]);

  // Effect 5: Persist interval
  useEffect(() => {
    localStorage.setItem('transactionsAutoRefresh_interval', refreshInterval.toString());
  }, [refreshInterval]);

  // Effect 6: Close panel when filter opens (mutual exclusivity)
  useEffect(() => {
    if (isFilterOpen && isOpen) {
      setIsOpen(false);
    }
  }, [isFilterOpen, isOpen]);

  // ===== HELPER FUNCTIONS =====
  const formatLastRefresh = (timestamp) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Az önce';
    if (diffMins === 1) return '1 dakika önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours === 1) return '1 saat önce';
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return '1 gün önce';
    return `${diffDays} gün önce`;
  };

  // ===== EVENT HANDLERS =====
  const handleManualRefresh = async () => {
    if (loadingRef.current) {
      console.log('Manual refresh skipped - already loading');
      return;
    }

    setIsRefreshing(true);
    console.log('Manual refresh started');

    try {
      await onRefreshRef.current();
      console.log('Manual refresh completed');
      // Note: lastRefreshTime is automatically updated by Effect 1 when loading completes
    } catch (error) {
      console.error('Manual refresh error:', error);
    } finally {
      // Reset refreshing state after a short delay to show animation
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  const handleToggleEnabled = () => {
    setIsEnabled(!isEnabled);
  };

  const handleIntervalChange = (newInterval) => {
    setRefreshInterval(newInterval);
  };

  // ===== RENDER =====
  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          const newIsOpen = !isOpen;
          setIsOpen(newIsOpen);
          if (newIsOpen && onOpen) {
            onOpen();
          }
        }}
        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-background-dark border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold relative"
        title="Otomatik Yenileme"
      >
        {/* Refresh Icon with Spinning Animation */}
        <span
          className={`material-symbols-outlined text-primary transition-transform ${(loading || isRefreshing) ? 'animate-spin' : ''
            }`}
        >
          refresh
        </span>

        <span className="whitespace-nowrap text-text-main hidden md:inline">Oto-Yenileme</span>

        {/* Active Badge */}
        {isEnabled && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div ref={panelRef}>
          {/* Mobile: Centered on viewport */}
          <div
            className="sm:hidden fixed left-1/2 -translate-x-1/2 top-[120px] bg-white dark:bg-background-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-slide-in-top w-[min(320px,calc(100vw-1rem))] z-50 transition-colors"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                  <h3 className="text-sm font-semibold text-text-main">Otomatik Yenileme</h3>
                  {isEnabled && (
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">
                      Aktif
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Kapat"
                >
                  <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">
                    {isEnabled ? 'toggle_on' : 'toggle_off'}
                  </span>
                  <span className="text-sm font-medium text-text-main">
                    Otomatik yenileme
                  </span>
                </div>
                <button
                  onClick={handleToggleEnabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-primary' : 'bg-gray-300'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

              {/* Interval Selection */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">
                  Yenileme Aralığı
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 60000, label: '1 dakika' },
                    { value: 300000, label: '5 dakika' },
                    { value: 900000, label: '15 dakika' },
                    { value: 1800000, label: '30 dakika' },
                    { value: 3600000, label: '1 saat' },
                    { value: 7200000, label: '2 saat' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleIntervalChange(option.value)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-colors ${refreshInterval === option.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-gray-800 text-text-main border-gray-200 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-gray-700"></div>

              {/* Last Refresh Info */}
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="material-symbols-outlined text-base">history</span>
                <span>Son yenileme: {formatLastRefresh(lastRefreshTime)}</span>
              </div>

              {/* Manual Refresh Button */}
              <button
                onClick={handleManualRefresh}
                disabled={loading || isRefreshing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  className={`material-symbols-outlined text-base ${(loading || isRefreshing) ? 'animate-spin' : ''
                    }`}
                >
                  refresh
                </span>
                <span>Şimdi Yenile</span>
              </button>

              {/* Smart Pause Indicator */}
              {isEnabled && isModalOpen && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">pause_circle</span>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Modal açıkken otomatik yenileme duraklatıldı
                  </span>
                </div>
              )}

              {/* Close Button - Mobile Only */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-semibold"
              >
                <span className="material-symbols-outlined text-base">close</span>
                <span>Kapat</span>
              </button>
            </div>
          </div>

          {/* Desktop: Below button, aligned right */}
          <div
            className="hidden sm:block absolute mt-2 right-0 bg-white dark:bg-background-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-slide-in-top w-80 z-50 transition-colors"
          >
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <h3 className="text-sm font-semibold text-text-main">Otomatik Yenileme</h3>
                {isEnabled && (
                  <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">
                    Aktif
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Kapat"
              >
                <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-xl">close</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">
                  {isEnabled ? 'toggle_on' : 'toggle_off'}
                </span>
                <span className="text-sm font-medium text-text-main">
                  Otomatik yenileme
                </span>
              </div>
              <button
                onClick={handleToggleEnabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-primary' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            {/* Interval Selection */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Yenileme Aralığı
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 60000, label: '1 dakika' },
                  { value: 300000, label: '5 dakika' },
                  { value: 900000, label: '15 dakika' },
                  { value: 1800000, label: '30 dakika' },
                  { value: 3600000, label: '1 saat' },
                  { value: 7200000, label: '2 saat' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleIntervalChange(option.value)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-colors ${refreshInterval === option.value
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-gray-800 text-text-main border-gray-200 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-gray-700"></div>

            {/* Last Refresh Info */}
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="material-symbols-outlined text-base">history</span>
              <span>Son yenileme: {formatLastRefresh(lastRefreshTime)}</span>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className={`material-symbols-outlined text-base ${(loading || isRefreshing) ? 'animate-spin' : ''
                  }`}
              >
                refresh
              </span>
              <span>Şimdi Yenile</span>
            </button>

            {/* Smart Pause Indicator */}
            {isEnabled && isModalOpen && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">pause_circle</span>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Modal açıkken otomatik yenileme duraklatıldı
                </span>
              </div>
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
