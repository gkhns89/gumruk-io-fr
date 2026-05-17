import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { feedbackService } from '../../api/feedbackService';
import FeedbackDetailModal from '../../components/common/FeedbackDetailModal';

const CATEGORY_CONFIG = {
  BUG:      { label: 'Hata',    icon: 'bug_report',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  FEATURE:  { label: 'Öneri',   icon: 'lightbulb',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  QUESTION: { label: 'Soru',    icon: 'help',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  OTHER:    { label: 'Diğer',   icon: 'more_horiz',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
};

const SYNC_CONFIG = {
  PENDING: { label: 'Kuyruğa Alındı', icon: 'schedule',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  SYNCED:  { label: 'Aktarıldı',      icon: 'check_circle', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  FAILED:  { label: 'Aktarım Hatası', icon: 'error',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const CLICKUP_STATUS_MAP = {
  'to do':       { label: 'Yapılacak',  color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',        icon: 'radio_button_unchecked' },
  'todo':        { label: 'Yapılacak',  color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',        icon: 'radio_button_unchecked' },
  'open':        { label: 'Açık',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',        icon: 'radio_button_unchecked' },
  'in progress': { label: 'İşlemde',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',         icon: 'autorenew' },
  'in review':   { label: 'İncelemede', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', icon: 'manage_search' },
  'review':      { label: 'İncelemede', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', icon: 'manage_search' },
  'complete':    { label: 'Tamamlandı', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',     icon: 'task_alt' },
  'completed':   { label: 'Tamamlandı', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',     icon: 'task_alt' },
  'done':        { label: 'Tamamlandı', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',     icon: 'task_alt' },
  'closed':      { label: 'Kapatıldı',  color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',            icon: 'check_circle' },
  'on hold':     { label: 'Beklemede',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: 'pause_circle' },
  'cancelled':   { label: 'İptal',      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',             icon: 'cancel' },
  'canceled':    { label: 'İptal',      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',             icon: 'cancel' },
};

const getClickUpStatusConfig = (status) => {
  if (!status) return null;
  const key = status.toLowerCase().trim();
  if (CLICKUP_STATUS_MAP[key]) return CLICKUP_STATUS_MAP[key];
  if (key.includes('tamamla') || key.includes('complete') || key.includes('done') || key.includes('closed'))
    return { label: status, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'task_alt' };
  if (key.includes('progress') || key.includes('devam') || key.includes('işlem'))
    return { label: status, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: 'autorenew' };
  return { label: status, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: 'pending' };
};

const getStatusConfig = (task) => {
  if (task.clickupDeleted)
    return { label: 'Kaldırıldı',     color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',           icon: 'link_off' };
  if (task.clickupStatus)
    return getClickUpStatusConfig(task.clickupStatus);
  if (task.syncStatus === 'FAILED')
    return { label: 'Aktarım Hatası', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',            icon: 'error' };
  if (task.syncStatus === 'PENDING')
    return { label: 'Kuyruğa Alındı', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', icon: 'schedule' };
  return { label: 'Aktarıldı',        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',    icon: 'check_circle' };
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const utc = dateString.includes('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(utc));
};

const formatEpoch = (ms) => {
  if (!ms) return null;
  return new Intl.DateTimeFormat('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Number(ms)));
};

const openClickUpTask = (taskId) => {
  window.location.href = `clickup://t/${taskId}`;
  setTimeout(() => {
    if (!document.hidden) {
      window.open(`https://app.clickup.com/t/${taskId}`, '_blank', 'noopener,noreferrer');
    }
  }, 1500);
};

const VIEWED_KEY = 'feedback_viewed_map';

const loadViewedMap = () => {
  try { return JSON.parse(localStorage.getItem(VIEWED_KEY) || '{}'); }
  catch { return {}; }
};

const FeedbackTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [syncFilter, setSyncFilter] = useState('ALL');
  const [detailTask, setDetailTask] = useState(null);
  const [viewedAt, setViewedAt] = useState(loadViewedMap);

  const hasUnread = (task) => {
    if (!task.lastCommentAt) return false;
    const viewed = viewedAt[task.id];
    if (!viewed) return true;
    return new Date(task.lastCommentAt) > new Date(viewed);
  };

  const markViewed = (taskId) => {
    const updated = { ...viewedAt, [taskId]: new Date().toISOString() };
    setViewedAt(updated);
    localStorage.setItem(VIEWED_KEY, JSON.stringify(updated));
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await feedbackService.getFeedbackTasks();
    if (result.success) {
      setTasks(result.data || []);
    } else {
      setError(result.error || 'Tasklar yüklenemedi');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const filtered = tasks.filter(t => {
    const matchCat = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchSync = syncFilter === 'ALL' || t.syncStatus === syncFilter;
    const matchSearch = !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      t.userEmail?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSync && matchSearch;
  });

  const syncCounts = tasks.reduce((acc, t) => {
    acc[t.syncStatus] = (acc[t.syncStatus] || 0) + 1;
    return acc;
  }, {});

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0">

        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">task_alt</span>
                Feedback Taskları
              </h1>
              <p className="text-text-secondary mt-2">
                Kullanıcılardan gelen bildirimler ve ClickUp senkronizasyon durumu
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-text-secondary">
                  Toplam <span className="font-semibold text-text-main">{tasks.length}</span> bildirim
                </span>
                {Object.entries(syncCounts).map(([status, count]) => {
                  const cfg = SYNC_CONFIG[status];
                  return cfg ? (
                    <span key={status} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                      <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
                      {cfg.label}: {count}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            <button
              onClick={loadTasks}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                         text-sm text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Yenile
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 md:px-6 py-3 bg-white dark:bg-background-dark border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-3 flex-shrink-0">
          {/* Arama */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 h-9">
            <span className="material-symbols-outlined text-[18px] text-text-secondary">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Başlık, şirket, e-posta..."
              className="flex-1 bg-transparent text-sm text-text-main placeholder:text-text-secondary focus:outline-none"
            />
          </div>

          {/* Kategori filtre */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                       text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="ALL">Tüm Kategoriler</option>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Sync filtre */}
          <select
            value={syncFilter}
            onChange={e => setSyncFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                       text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="ALL">Tüm Durumlar</option>
            {Object.entries(SYNC_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-red-500">
              <span className="material-symbols-outlined text-[48px]">error</span>
              <p className="text-sm">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-text-secondary">
              <span className="material-symbols-outlined text-[56px]">inbox</span>
              <p className="text-sm">{tasks.length === 0 ? 'Henüz hiç feedback yok' : 'Filtreyle eşleşen sonuç bulunamadı'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(task => {
                const catCfg = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.OTHER;
                const statusCfg = getStatusConfig(task);
                const priority = task.priority?.toLowerCase();

                return (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all"
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      onClick={() => { setDetailTask(task); markViewed(task.id); }}
                    >
                      {/* Kategori ikon */}
                      <span className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${catCfg.color.split(' ').slice(0, 4).join(' ')}`}
                            title={catCfg.label}>
                        <span className="material-symbols-outlined text-[16px]">{catCfg.icon}</span>
                      </span>

                      {/* Başlık + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          {priority === 'urgent' && (
                            <span className="material-symbols-outlined text-[14px] text-red-500 flex-shrink-0" title="Acil">priority_high</span>
                          )}
                          {priority === 'high' && (
                            <span className="material-symbols-outlined text-[14px] text-orange-500 flex-shrink-0" title="Yüksek">keyboard_double_arrow_up</span>
                          )}
                          <p className="text-sm font-semibold text-text-main truncate">{task.title}</p>
                        </div>
                        <p className="text-xs text-text-secondary truncate">
                          {task.companyName} · {task.userEmail}
                          {task.dueDate && <span className="text-orange-500 ml-1">· Son: {formatEpoch(task.dueDate)}</span>}
                        </p>
                      </div>

                      {/* Durum badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${statusCfg.color}`}>
                        <span className="material-symbols-outlined text-[13px]">{statusCfg.icon}</span>
                        <span className="hidden sm:inline">{statusCfg.label}</span>
                      </span>

                      {/* Yorum sayısı / okunmamış */}
                      {task.commentCount > 0 && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0
                          ${hasUnread(task)
                            ? 'bg-primary/10 text-primary'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                          <span className="material-symbols-outlined text-[13px]">chat</span>
                          {task.commentCount}
                          {hasUnread(task) && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                        </span>
                      )}

                      {/* ClickUp linki */}
                      {task.clickupTaskId && (
                        <button
                          onClick={e => { e.stopPropagation(); openClickUpTask(task.clickupTaskId); }}
                          className="flex-shrink-0 p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                          title="ClickUp'ta aç"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </button>
                      )}

                      {/* Tarih */}
                      <span className="text-xs text-text-secondary flex-shrink-0 hidden md:block">
                        {formatDate(task.createdAt)}
                      </span>

                      <span className="material-symbols-outlined text-[18px] text-text-secondary flex-shrink-0">chevron_right</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {detailTask && (
        <FeedbackDetailModal
          feedback={detailTask}
          readOnly={true}
          onClose={() => setDetailTask(null)}
        />
      )}
    </MainLayout>
  );
};

export default FeedbackTasksPage;
