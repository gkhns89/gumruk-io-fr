import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../../api/notificationService';
import { handleError } from '../../utils/errorUtils';
import { showSuccess } from '../../utils/toastUtils';

/**
 * Windows tarzı kalıcı bildirim merkezi
 * Header'daki zil simgesi ile kullanılır
 *
 * Özellikler:
 * - Okunmamış bildirim badge'i
 * - Dropdown bildirim listesi (max 10, scroll)
 * - "Tümünü okundu işaretle" butonu
 * - "Tümünü temizle" butonu
 * - Click outside to close
 * - Bildirime tıklayınca okundu işaretle
 * - Real-time güncelleme (her 30 saniye)
 */
export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Bildirimleri yükle
  const loadNotifications = async () => {
    try {
      const result = await notificationService.getAll();
      if (result.success) {
        setNotifications(result.data);
      }
    } catch (error) {
      handleError(error, null, 'Bildirim yükleme', 'Bildirimler yüklenemedi');
    }
  };

  // Okunmamış sayısını yükle
  const loadUnreadCount = async () => {
    try {
      const result = await notificationService.getUnreadCount();
      if (result.success) {
        setUnreadCount(result.data);
      }
    } catch (error) {
      // Silent fail - badge için kritik değil
      console.log('Okunmamış sayı alınamadı:', error);
    }
  };

  // İlk yükleme
  useEffect(() => {
    loadUnreadCount();
  }, []);

  // Dropdown açıldığında bildirimleri yükle
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Real-time güncelleme (her 30 saniye)
  useEffect(() => {
    const interval = setInterval(() => {
      loadUnreadCount();
      if (isOpen) {
        loadNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Dışarı tıklandığında kapat
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

  // Bildirimi okundu işaretle
  const handleMarkAsRead = async (notificationId) => {
    try {
      const result = await notificationService.markAsRead(notificationId);
      if (result.success) {
        // Listeyi güncelle
        setNotifications(notifications.map(n =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        ));
        // Badge'i güncelle
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      handleError(error, null, 'Bildirim işaretleme', 'Bildirim işaretlenemedi');
    }
  };

  // Tümünü okundu işaretle
  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      const result = await notificationService.markAllAsRead();
      if (result.success) {
        showSuccess('Tüm bildirimler okundu işaretlendi');
        // Listeyi güncelle
        setNotifications(notifications.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
        // Badge'i sıfırla
        setUnreadCount(0);
      }
    } catch (error) {
      handleError(error, null, 'Tümünü işaretleme', 'Bildirimler işaretlenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Tümünü temizle
  const handleClearAll = async () => {
    if (!window.confirm('Tüm bildirimler silinecek. Emin misiniz?')) {
      return;
    }

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

  // Bildirimi sil
  const handleDeleteNotification = async (notificationId) => {
    try {
      const result = await notificationService.delete(notificationId);
      if (result.success) {
        // Listeyi güncelle
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(notifications.filter(n => n.id !== notificationId));

        // Okunmamışsa badge'i güncelle
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      handleError(error, null, 'Bildirim silme', 'Bildirim silinemedi');
    }
  };

  // Bildirim tipine göre icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'SUCCESS':
        return { icon: 'check_circle', color: 'text-green-500' };
      case 'ERROR':
        return { icon: 'error', color: 'text-red-500' };
      case 'WARNING':
        return { icon: 'warning', color: 'text-orange-500' };
      case 'INFO':
      default:
        return { icon: 'info', color: 'text-blue-500' };
    }
  };

  // Zaman formatı
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;

    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Zil Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100 transition-colors relative"
      >
        <span className="material-symbols-outlined text-text-main">notifications</span>

        {/* Badge - Okunmamış sayı */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-slide-in-top">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">notifications_active</span>
              <h3 className="text-base font-bold text-text-main">Bildirimler</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span className="material-symbols-outlined text-text-secondary text-lg">close</span>
            </button>
          </div>

          {/* Action Buttons */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-white">
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading || unreadCount === 0}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-primary hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">done_all</span>
                Tümünü Okundu İşaretle
              </button>
              <button
                onClick={handleClearAll}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                Tümünü Temizle
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                <p className="text-sm text-text-secondary">Bildirimler yükleniyor...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-gray-400 text-3xl">
                    notifications_off
                  </span>
                </div>
                <p className="text-sm font-semibold text-text-main mb-1">Bildirim Yok</p>
                <p className="text-xs text-text-secondary text-center">
                  Henüz hiç bildiriminiz bulunmuyor
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => {
                  const { icon, color } = getNotificationIcon(notification.type);

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group ${
                        !notification.isRead ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 mt-0.5`}>
                          <span className={`material-symbols-outlined ${color} text-xl`}>
                            {icon}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {notification.title && (
                            <p className="text-sm font-semibold text-text-main mb-1">
                              {notification.title}
                            </p>
                          )}
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.createdAt)}
                            </span>
                            {!notification.isRead && (
                              <span className="h-1.5 w-1.5 bg-primary rounded-full"></span>
                            )}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-200 transition-all"
                        >
                          <span className="material-symbols-outlined text-gray-500 text-lg">
                            close
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer - Bilgi */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
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
