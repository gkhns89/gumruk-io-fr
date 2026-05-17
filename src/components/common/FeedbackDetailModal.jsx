import React, { useState, useEffect, useRef, useCallback } from 'react';
import { feedbackService } from '../../api/feedbackService';
import { useAuth } from '../../hooks/useAuth';
import { showError } from '../../utils/toastUtils';

const PRIORITY_CONFIG = {
  urgent: { label: 'Acil',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',       icon: 'priority_high' },
  high:   { label: 'Yüksek', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: 'keyboard_double_arrow_up' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',   icon: 'remove' },
  low:    { label: 'Düşük',  color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',      icon: 'keyboard_double_arrow_down' },
};

const CATEGORY_CONFIG = {
  BUG:      { label: 'Hata',    icon: 'bug_report',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  FEATURE:  { label: 'Öneri',   icon: 'lightbulb',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  QUESTION: { label: 'Soru',    icon: 'help',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  OTHER:    { label: 'Diğer',   icon: 'more_horiz',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
};

const getClickUpStatusStyle = (status) => {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('complete') || s.includes('done') || s.includes('closed') || s.includes('tamamla'))
    return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'task_alt' };
  if (s.includes('progress') || s.includes('review') || s.includes('devam'))
    return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: 'autorenew' };
  return { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: 'pending' };
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  const utc = dateString.includes('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(utc));
};

const formatEpoch = (ms) => {
  if (!ms) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Number(ms)));
};

const openClickUpTask = (taskId) => {
  window.location.href = `clickup://t/${taskId}`;
  setTimeout(() => {
    if (!document.hidden) {
      window.open(`https://app.clickup.com/t/${taskId}`, '_blank', 'noopener,noreferrer');
    }
  }, 1500);
};

const FeedbackDetailModal = ({ feedback, readOnly = false, onClose }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  const canComment = !readOnly && !isSuperAdmin;

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    const result = await feedbackService.getComments(feedback.id);
    if (result.success) setComments(result.data || []);
    setLoadingComments(false);
  }, [feedback.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  useEffect(() => {
    if (!loadingComments) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, loadingComments]);

  const handleSend = async () => {
    const text = commentText.trim();
    if (!text) return;
    setSending(true);
    setError('');
    const result = await feedbackService.addComment(feedback.id, text);
    setSending(false);
    if (result.success) {
      setCommentText('');
      setComments(prev => [...prev, result.data]);
    } else {
      setError(result.error);
      showError('Yorum gönderilemedi');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
  };

  const catCfg = CATEGORY_CONFIG[feedback.category] || CATEGORY_CONFIG.OTHER;
  const priorityCfg = feedback.priority ? PRIORITY_CONFIG[feedback.priority.toLowerCase()] : null;
  const statusStyle = feedback.clickupStatus ? getClickUpStatusStyle(feedback.clickupStatus) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-zoom-in w-full max-w-2xl bg-white dark:bg-background-dark rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${catCfg.color}`}>
                <span className="material-symbols-outlined text-[12px]">{catCfg.icon}</span>
                {catCfg.label}
              </span>
              {priorityCfg && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${priorityCfg.color}`}>
                  <span className="material-symbols-outlined text-[12px]">{priorityCfg.icon}</span>
                  {priorityCfg.label}
                </span>
              )}
              {feedback.clickupDeleted ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 line-through">
                  <span className="material-symbols-outlined text-[12px]">link_off</span>
                  Silindi
                </span>
              ) : statusStyle && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${statusStyle.color}`}>
                  <span className="material-symbols-outlined text-[12px]">{statusStyle.icon}</span>
                  {feedback.clickupStatus}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-text-main leading-snug">{feedback.title}</h2>
            <p className="text-xs text-text-secondary mt-0.5">{formatDate(feedback.createdAt)}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isSuperAdmin && feedback.clickupTaskId && (
              <button
                onClick={() => openClickUpTask(feedback.clickupTaskId)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium
                           bg-primary/10 text-primary hover:bg-primary/20 transition"
                title="ClickUp uygulamasında aç (yoksa tarayıcıda açılır)"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                ClickUp'ta Aç
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span className="material-symbols-outlined text-text-secondary text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Date chips */}
        {(feedback.startDate || feedback.dueDate) && (
          <div className="flex items-center gap-3 px-5 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0 flex-wrap">
            {feedback.startDate && (
              <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                <span className="material-symbols-outlined text-[14px] text-primary">play_arrow</span>
                Başlangıç: <strong className="text-text-main ml-0.5">{formatEpoch(feedback.startDate)}</strong>
              </span>
            )}
            {feedback.dueDate && (
              <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                <span className="material-symbols-outlined text-[14px] text-orange-500">flag</span>
                Bitiş: <strong className="text-text-main ml-0.5">{formatEpoch(feedback.dueDate)}</strong>
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{feedback.description}</p>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[120px]">
          {loadingComments ? (
            <div className="flex items-center justify-center py-6">
              <span className="material-symbols-outlined animate-spin text-primary text-[28px]">progress_activity</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-text-secondary">
              <span className="material-symbols-outlined text-[36px]">chat_bubble_outline</span>
              <p className="text-sm">Henüz yorum yok</p>
            </div>
          ) : (
            comments.map(c => {
              const isAdmin = c.authorType === 'ADMIN';
              return (
                <div key={c.id} className={`flex gap-3 ${isAdmin ? '' : 'flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${isAdmin
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 dark:bg-gray-700 text-text-secondary'}`}>
                    <span className="material-symbols-outlined text-[16px]">
                      {isAdmin ? 'support_agent' : 'person'}
                    </span>
                  </div>
                  {/* Bubble */}
                  <div className={`flex flex-col max-w-[80%] ${isAdmin ? 'items-start' : 'items-end'}`}>
                    <span className="text-[11px] text-text-secondary mb-0.5">
                      {isAdmin ? c.authorName : 'Siz'} · {formatDate(c.createdAt)}
                    </span>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                      ${isAdmin
                        ? 'bg-primary/10 text-text-main rounded-tl-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-text-main rounded-tr-sm'}`}>
                      {c.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Comment input — only for users */}
        {canComment && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            {error && (
              <p className="text-red-500 text-xs mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>{error}
              </p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={commentText}
                onChange={e => { setCommentText(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="Yorum yazın... (Ctrl+Enter ile gönder)"
                rows={2}
                maxLength={2000}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                           bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100
                           placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              <button
                onClick={handleSend}
                disabled={!commentText.trim() || sending}
                className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center
                           hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending
                  ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  : <span className="material-symbols-outlined text-[18px]">send</span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackDetailModal;
