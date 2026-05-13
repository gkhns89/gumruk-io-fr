import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { feedbackService } from '../../api/feedbackService';

const CATEGORY_CONFIG = {
  BUG:      { label: 'Hata',    icon: 'bug_report',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  FEATURE:  { label: 'Öneri',   icon: 'lightbulb',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  QUESTION: { label: 'Soru',    icon: 'help',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  OTHER:    { label: 'Diğer',   icon: 'more_horiz',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
};

const SYNC_CONFIG = {
  PENDING: { label: 'Bekliyor', icon: 'schedule',       color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  SYNCED:  { label: 'Senkronize', icon: 'check_circle', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  FAILED:  { label: 'Hata',    icon: 'error',            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateString));
};

const FeedbackTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [syncFilter, setSyncFilter] = useState('ALL');
  const [expanded, setExpanded] = useState(null);

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
                const syncCfg = SYNC_CONFIG[task.syncStatus] || SYNC_CONFIG.PENDING;
                const isExpanded = expanded === task.id;

                return (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all"
                  >
                    {/* Task satır */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      onClick={() => setExpanded(isExpanded ? null : task.id)}
                    >
                      {/* Kategori badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border flex-shrink-0 ${catCfg.color}`}>
                        <span className="material-symbols-outlined text-[13px]">{catCfg.icon}</span>
                        {catCfg.label}
                      </span>

                      {/* Başlık + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-main truncate">{task.title}</p>
                        <p className="text-xs text-text-secondary truncate">
                          {task.companyName} · {task.userEmail}
                        </p>
                      </div>

                      {/* Sync durumu */}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${syncCfg.color}`}>
                        <span className="material-symbols-outlined text-[13px]">{syncCfg.icon}</span>
                        {syncCfg.label}
                      </span>

                      {/* ClickUp task durumu */}
                      {task.clickupDeleted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0
                                         bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          <span className="material-symbols-outlined text-[13px]">link_off</span>
                          CU Silindi
                        </span>
                      ) : task.clickupStatus ? (
                        (() => {
                          const s = task.clickupStatus.toLowerCase();
                          const color = s.includes('complete') || s.includes('done') || s.includes('closed')
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : s.includes('progress') || s.includes('review')
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${color}`}>
                              <span className="material-symbols-outlined text-[13px]">adjust</span>
                              {task.clickupStatus}
                            </span>
                          );
                        })()
                      ) : null}

                      {/* ClickUp linki */}
                      {task.clickupTaskUrl && (
                        <a
                          href={task.clickupTaskUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg
                                     bg-primary/10 text-primary hover:bg-primary/20 transition text-xs font-medium"
                          title="ClickUp'ta Aç"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          ClickUp
                        </a>
                      )}

                      {/* Tarih */}
                      <span className="text-xs text-text-secondary flex-shrink-0 hidden md:block">
                        {formatDate(task.createdAt)}
                      </span>

                      {/* Genişlet oku */}
                      <span className={`material-symbols-outlined text-[18px] text-text-secondary flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>

                    {/* Açıklama */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-sm text-text-secondary mt-3 whitespace-pre-wrap leading-relaxed">
                          {task.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-3">
                          {formatDate(task.createdAt)}
                          {task.clickupTaskId && (
                            <span className="ml-3">Task ID: <span className="font-mono">{task.clickupTaskId}</span></span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default FeedbackTasksPage;
