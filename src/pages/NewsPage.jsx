import React, { useState, useEffect } from 'react';
import { customsNewsService } from '../api/customsNewsService';
import MainLayout from '../components/layout/MainLayout';

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNews, setSelectedNews] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await customsNewsService.getRecentNews();

      if (result.success) {
        setNews(result.data);
      } else {
        setError(result.error || 'Haberler yüklenirken bir hata oluştu');
      }
    } catch {
      setError('Haberler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = news.filter(item =>
    !searchTerm ||
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Haberleri tarihe göre grupla
  const groupNewsByDate = (newsList) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const todayNews = [];
    const yesterdayNews = [];
    const thisWeekNews = [];
    const olderNews = [];

    newsList.forEach(item => {
      if (!item.publishedDate) {
        todayNews.push(item);
        return;
      }

      const itemDate = new Date(item.publishedDate);
      itemDate.setHours(0, 0, 0, 0);

      if (itemDate.getTime() === today.getTime()) {
        todayNews.push(item);
      } else if (itemDate.getTime() === yesterday.getTime()) {
        yesterdayNews.push(item);
      } else if (itemDate >= lastWeek) {
        thisWeekNews.push(item);
      } else {
        olderNews.push(item);
      }
    });

    return { todayNews, yesterdayNews, thisWeekNews, olderNews };
  };

  const { todayNews, yesterdayNews, thisWeekNews, olderNews } = groupNewsByDate(filteredNews);

  const handleNewsClick = (newsItem) => {
    setSelectedNews(newsItem);
    setShowModal(true);
  };

  // Normal haber kartı render fonksiyonu
  const renderNewsCard = (item, index) => (
    <div
      key={item.id || index}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200 flex flex-col cursor-pointer"
      onClick={() => handleNewsClick(item)}
    >
      {/* Card Header */}
      <div className="p-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="material-symbols-outlined text-base">
            newspaper
          </span>
          <span className="text-xs font-medium">
            Gümrük Haberi
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-semibold text-gray-800 mb-2 line-clamp-2 leading-tight">
          {item.title}
        </h3>

        {item.summary && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-3 leading-relaxed flex-1">
            {item.summary}
          </p>
        )}

        {item.publishedDate && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-auto">
            <span className="material-symbols-outlined text-base">
              schedule
            </span>
            <time dateTime={item.publishedDate}>
              {formatDate(item.publishedDate)}
            </time>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="p-4 pt-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNewsClick(item);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <span>Detayları Gör</span>
          <span className="material-symbols-outlined text-base">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedNews(null);
  };

  const handleGoToLink = () => {
    if (selectedNews?.link) {
      window.open(selectedNews.link, '_blank', 'noopener,noreferrer');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">
                  feed
                </span>
                Gümrük Haberleri
              </h1>
              <p className="text-gray-600 mt-2">
                T.C. Ticaret Bakanlığı gümrük haberlerini buradan takip edebilirsiniz
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Haberlerde ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <button
              onClick={loadNews}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Yenile"
            >
              <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span className="hidden sm:inline">Yenile</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-primary animate-spin">
                  refresh
                </span>
                <p className="mt-4 text-gray-600">Haberler yükleniyor...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 text-xl">
                error
              </span>
              <div>
                <p className="text-red-800 font-medium">Hata</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && filteredNews.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-300">
                feed
              </span>
              <p className="mt-4 text-gray-600">
                {searchTerm ? 'Arama kriterlerine uygun haber bulunamadı' : 'Henüz haber bulunmuyor'}
              </p>
            </div>
          )}

          {!loading && !error && filteredNews.length > 0 && (
            <div className="space-y-8">
              {/* Bugünün Haberleri - Öne Çıkarılmış */}
              {todayNews.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-blue-600 text-white rounded-full shadow-md">
                      <span className="material-symbols-outlined text-xl">
                        today
                      </span>
                      <h2 className="text-base font-bold">Bugünün Haberleri</h2>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent"></div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {todayNews.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="bg-gradient-to-br from-white to-blue-50/50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-primary/20 hover:border-primary/50 flex flex-col cursor-pointer transform hover:-translate-y-1"
                        onClick={() => handleNewsClick(item)}
                      >
                        {/* Featured Badge */}
                        <div className="bg-gradient-to-r from-primary to-blue-600 px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-white">
                            <span className="material-symbols-outlined text-lg animate-pulse">
                              new_releases
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider">
                              Yeni Haber
                            </span>
                          </div>
                          {item.publishedDate && (
                            <span className="text-xs text-white/90 font-medium">
                              {new Date(item.publishedDate).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-5 md:p-6 flex-1 flex flex-col">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">
                            {item.title}
                          </h3>

                          {item.summary && (
                            <p className="text-sm md:text-base text-gray-700 mb-4 line-clamp-3 leading-relaxed flex-1">
                              {item.summary}
                            </p>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNewsClick(item);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-bold shadow-sm hover:shadow-md"
                          >
                            <span>Haberi Oku</span>
                            <span className="material-symbols-outlined text-lg">
                              arrow_forward
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dünkü Haberler */}
              {yesterdayNews.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg">
                      <span className="material-symbols-outlined text-lg">
                        schedule
                      </span>
                      <h2 className="text-sm font-semibold">Dün</h2>
                    </div>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {yesterdayNews.map((item, index) => renderNewsCard(item, index))}
                  </div>
                </div>
              )}

              {/* Bu Haftanın Haberleri */}
              {thisWeekNews.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg">
                      <span className="material-symbols-outlined text-lg">
                        calendar_month
                      </span>
                      <h2 className="text-sm font-semibold">Bu Hafta</h2>
                    </div>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {thisWeekNews.map((item, index) => renderNewsCard(item, index))}
                  </div>
                </div>
              )}

              {/* Eski Haberler */}
              {olderNews.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg">
                      <span className="material-symbols-outlined text-lg">
                        history
                      </span>
                      <h2 className="text-sm font-semibold">Önceki Haberler</h2>
                    </div>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {olderNews.map((item, index) => renderNewsCard(item, index))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedNews && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-lg">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="material-symbols-outlined text-primary text-2xl">newspaper</span>
                <h2 className="text-lg font-bold text-text-main truncate">Gümrük Haberi</h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
                aria-label="Kapat"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <h3 className="text-xl lg:text-2xl font-bold text-text-main mb-3 leading-tight">
                {selectedNews.title}
              </h3>

              {selectedNews.publishedDate && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  <time dateTime={selectedNews.publishedDate}>
                    {formatDate(selectedNews.publishedDate)}
                  </time>
                </div>
              )}

              <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed space-y-3">
                {selectedNews.description || selectedNews.summary || 'Haber detayı mevcut değil.'}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 pt-4 border-t border-gray-200">
                {selectedNews.link && (
                  <button
                    onClick={handleGoToLink}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    <span>Detaylı Oku</span>
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                  </button>
                )}

                <button
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </MainLayout>
  );
};

export default NewsPage;
