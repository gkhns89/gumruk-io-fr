import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../api/notificationService';
import { handleError } from '../../utils/errorUtils';
import { showSuccess } from '../../utils/toastUtils';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const [hasNewNotif, setHasNewNotif] = useState(false);
  const dropdownRef = useRef(null);

  // Bubble tracking refs
  const prevUnreadRef = useRef(null);
  const isInitializedRef = useRef(false);
  const lastDropdownOpenRef = useRef(Date.now());
  const lastReminderRef = useRef(0);
  const bubbleTimersRef = useRef({});

  // ── Bubble helpers ──────────────────────────────────────────

  const showBubble = (type, title, message, duration = 5000) => {
    const id = Date.now() + Math.random();
    setBubbles(prev => [...prev.slice(-2), { id, type, title, message }]);
    const tid = setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== id));
      delete bubbleTimersRef.current[id];
    }, duration);
    bubbleTimersRef.current[id] = tid;
  };

  const dismissBubble = (id) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    if (bubbleTimersRef.current[id]) {
      clearTimeout(bubbleTimersRef.current[id]);
      delete bubbleTimersRef.current[id];
    }
  };

  const clearAllBubbles = () => {
    Object.values(bubbleTimersRef.current).forEach(clearTimeout);
    bubbleTimersRef.current = {};
    setBubbles([]);
  };

  // ── Data loaders ────────────────────────────────────────────

  const loadNotifications = async () => {
    try {
      const result = await notificationService.getAll();
      if (result.success) {
        setNotifications(result.data);
        setUnreadCount(result.data.filter(n => !n.isRead).length);
      }
    } catch (error) {
      handleError(error, null, 'Bildirim yükleme', 'Bildirimler yüklenemedi');
    }
  };

  const loadUnreadCount = async () => {
    try {
      const result = await notificationService.getUnreadCount();
      if (result.success) {
        const newCount = result.data;

        if (!isInitializedRef.current) {
          isInitializedRef.current = true;
          if (newCount > 0 && sessionStorage.getItem('justLoggedIn') === '1') {
            showBubble(
              'INFO',
              `${newCount} Okunmamış Bildiriminiz Var`,
              'Bildirimleri görüntülemek için zile tıklayın',
              8000
            );
          }
          sessionStorage.removeItem('justLoggedIn');
        } else {
          const prev = prevUnreadRef.current ?? 0;

          // Yeni bildirim(ler) geldi
          if (newCount > prev && !isOpen) {
            setHasNewNotif(true);
            try {
              const notifResult = await notificationService.getAll();
              if (notifResult.success) {
                const unread = notifResult.data.filter(n => !n.isRead);
                const diff = newCount - prev;
                unread.slice(0, Math.min(diff, 3)).forEach(n => {
                  showBubble(n.type, n.title || 'Yeni Bildirim', n.message);
                });
              }
            } catch (_) {}
          }

          // Uzun süredir okunmamış bildirim hatırlatması — her 5 dakikada tekrarlar
          if (newCount > 0 && !isOpen) {
            const elapsedSinceOpen = Date.now() - lastDropdownOpenRef.current;
            const elapsedSinceReminder = Date.now() - lastReminderRef.current;
            if (elapsedSinceOpen > 120000 && elapsedSinceReminder > 300000) {
              showBubble(
                'WARNING',
                'Okunmamış Bildirimler',
                `${newCount} okunmamış bildiriminiz var`,
                7000
              );
              lastReminderRef.current = Date.now();
            }
          }
        }

        setUnreadCount(newCount);
        prevUnreadRef.current = newCount;
      }
    } catch (_) {}
  };

  // ── Bell click ──────────────────────────────────────────────

  const handleBellClick = () => {
    if (!isOpen) {
      lastDropdownOpenRef.current = Date.now();
      lastReminderRef.current = 0;
      setHasNewNotif(false);
      clearAllBubbles();
    }
    setIsOpen(prev => !prev);
  };

  // ── Effects ─────────────────────────────────────────────────

  useEffect(() => {
    loadUnreadCount();
  }, []);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadUnreadCount();
      if (isOpen) loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => Object.values(bubbleTimersRef.current).forEach(clearTimeout);
  }, []);

  // ── Notification action handlers ────────────────────────────

  const handleMarkAsRead = async (notificationId) => {
    try {
      const wasUnread = notifications.find(n => n.id === notificationId)?.isRead === false;
      const result = await notificationService.markAsRead(notificationId);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
        );
        if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
      }
    } catch (error) {
      handleError(error, null, 'Bildirim işaretleme', 'Bildirim işaretlenemedi');
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      const result = await notificationService.markAllAsRead();
      if (result.success) {
        showSuccess('Tüm bildirimler okundu işaretlendi');
        setNotifications(notifications.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
        setUnreadCount(0);
      }
    } catch (error) {
      handleError(error, null, 'Tümünü işaretleme', 'Bildirimler işaretlenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Tüm bildirimler silinecek. Emin misiniz?')) return;
    setLoading(true);
    try {
      const result = await notificationService.deleteAll();
      if (result.success) {
        showSuccess('Tüm bildirimler temizlendi');
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      handleError(error, null, 'Tümünü temizleme', 'Bildirimler temizlenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const wasUnread = notifications.find(n => n.id === notificationId)?.isRead === false;
      const result = await notificationService.delete(notificationId);
      if (result.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
      }
    } catch (error) {
      handleError(error, null, 'Bildirim silme', 'Bildirim silinemedi');
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification.entityType === 'ADDON') {
      navigate('/payment/submit', { state: { scrollTo: 'addons' } });
    } else if (notification.entityType === 'SUBSCRIPTION') {
      navigate('/payment/submit');
    } else if (notification.entityType === 'TRANSACTION') {
      navigate('/transactions');
    } else if (notification.entityType === 'AGREEMENT') {
      navigate('/management/agreements');
    } else if (notification.entityType === 'CARGO') {
      navigate('/cargo');
    } else if (notification.entityType === 'WAREHOUSE') {
      navigate('/warehouse');
    }

    if (!notification.isRead) await handleMarkAsRead(notification.id);
    setIsOpen(false);
  };

  // ── Display helpers ─────────────────────────────────────────

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'SUCCESS': return { icon: 'check_circle', color: 'text-green-500' };
      case 'ERROR':   return { icon: 'error',        color: 'text-red-500' };
      case 'WARNING': return { icon: 'warning',      color: 'text-orange-500' };
      default:        return { icon: 'info',         color: 'text-blue-500' };
    }
  };

  const getBubbleStyle = (type) => {
    switch (type) {
      case 'SUCCESS': return { icon: 'check_circle', color: 'text-green-500',  bar: 'bg-green-500'  };
      case 'ERROR':   return { icon: 'error',        color: 'text-red-500',    bar: 'bg-red-500'    };
      case 'WARNING': return { icon: 'warning',      color: 'text-amber-500',  bar: 'bg-amber-500'  };
      default:        return { icon: 'info',         color: 'text-blue-500',   bar: 'bg-blue-500'   };
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const diffMins  = Math.floor((Date.now() - date) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays  = Math.floor(diffHours / 24);
    if (diffMins < 1)   return 'Şimdi';
    if (diffMins < 60)  return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7)   return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── Zil Butonu ── */}
      <button
        onClick={handleBellClick}
        className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
      >
        <span className={`material-symbols-outlined text-text-main${hasNewNotif ? ' bell-shake' : ''}`}>
          notifications
        </span>

        {/* Ping halkası — yeni bildirim geldiğinde */}
        {hasNewNotif && unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-5 w-5 bg-red-400 rounded-full animate-ping opacity-75 pointer-events-none" />
        )}

        {/* Okunmamış sayı badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Bildirim Baloncukları ── */}
      {!isOpen && bubbles.length > 0 && (
        <div className="absolute right-0 top-12 flex flex-col gap-2 z-[60]">
          {bubbles.map((bubble) => {
            const { icon, color, bar } = getBubbleStyle(bubble.type);
            return (
              <div
                key={bubble.id}
                className="w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 overflow-hidden animate-slide-in-top cursor-pointer"
                onClick={() => {
                  dismissBubble(bubble.id);
                  lastDropdownOpenRef.current = Date.now();
                  reminderShownRef.current = false;
                  setHasNewNotif(false);
                  clearAllBubbles();
                  setIsOpen(true);
                }}
              >
                <div className="p-3 flex items-start gap-2">
                  <span className={`material-symbols-outlined ${color} text-lg flex-shrink-0 mt-0.5`}>
                    {icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    {bubble.title && (
                      <p className="text-xs font-semibold text-text-main truncate">{bubble.title}</p>
                    )}
                    <p className="text-xs text-text-secondary leading-snug line-clamp-2">{bubble.message}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismissBubble(bubble.id); }}
                    className="flex-shrink-0 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-400 text-base">close</span>
                  </button>
                </div>
                {/* 5 saniyelik sayaç çubuğu */}
                <div className={`h-0.5 notif-countdown-bar ${bar}`} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bildirim Dropdown'u ── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 z-50 animate-slide-in-top transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl transition-colors">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">notifications_active</span>
              <h3 className="text-base font-bold text-text-main">Bildirimler</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined text-text-secondary text-lg">close</span>
            </button>
          </div>

          {/* Aksiyon butonları */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 p-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading || unreadCount === 0}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-primary hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">done_all</span>
                Tümünü Okundu İşaretle
              </button>
              <button
                onClick={handleClearAll}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                Tümünü Temizle
              </button>
            </div>
          )}

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                <p className="text-sm text-text-secondary">Bildirimler yükleniyor...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 transition-colors">
                  <span className="material-symbols-outlined text-gray-400 text-3xl">notifications_off</span>
                </div>
                <p className="text-sm font-semibold text-text-main mb-1">Bildirim Yok</p>
                <p className="text-xs text-text-secondary text-center">Henüz hiç bildiriminiz bulunmuyor</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => {
                  const { icon, color } = getNotificationIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group ${
                        !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <span className={`material-symbols-outlined ${color} text-xl`}>{icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {notification.title && (
                            <p className="text-sm font-semibold text-text-main mb-1">{notification.title}</p>
                          )}
                          <p className="text-sm text-text-secondary leading-relaxed">{notification.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">{formatTime(notification.createdAt)}</span>
                            {!notification.isRead && (
                              <span className="h-1.5 w-1.5 bg-primary rounded-full" />
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notification.id); }}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        >
                          <span className="material-symbols-outlined text-gray-500 text-lg">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl transition-colors">
              <p className="text-xs text-center text-gray-500">
                Bildirimler 30 gün sonra otomatik olarak silinir
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
