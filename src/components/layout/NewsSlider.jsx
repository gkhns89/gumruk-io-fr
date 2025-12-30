import React, { useState, useEffect, useRef } from 'react';
import { customsNewsService } from '../../api/customsNewsService';

export default function NewsSlider() {
  const [news, setNews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const intervalRef = useRef(null);

  // Haberleri API'den çek
  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      const result = await customsNewsService.getRecentNews();

      if (result.success && result.data.length > 0) {
        setNews(result.data);
        setError(null);
      } else {
        setError(result.error || 'Haber bulunamadı');
      }

      setIsLoading(false);
    };

    fetchNews();
  }, []);

  // 10 saniyede bir otomatik slider
  useEffect(() => {
    if (news.length === 0 || isPaused) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % news.length);
    }, 10000); // 10 saniye

    // Cleanup: Component unmount olunca interval'i temizle
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [news.length, isPaused]);

  // Manuel ileri buton
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % news.length);
  };

  // Manuel geri buton
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + news.length) % news.length);
  };

  // Habere tıklandığında modal aç ve slider'ı duraklat
  const handleNewsClick = () => {
    setShowModal(true);
    setIsPaused(true);
  };

  // Modal'ı kapat ve slider'ı devam ettir
  const handleCloseModal = () => {
    setShowModal(false);
    setIsPaused(false);
  };

  // Harici linke git
  const handleGoToLink = () => {
    if (news[currentIndex]?.link) {
      window.open(news[currentIndex].link, '_blank', 'noopener,noreferrer');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
        <span className="hidden md:inline">Haberler yükleniyor...</span>
      </div>
    );
  }

  // Error veya boş state - sessizce gizle (header'ı bölmemek için)
  if (error || news.length === 0) {
    return null;
  }

  const currentNews = news[currentIndex];

  return (
    <>
      <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0 max-w-4xl mx-auto">
        {/* Haber İkonu */}
        <div className="flex-shrink-0 text-primary">
          <span className="material-symbols-outlined text-xl lg:text-2xl">newspaper</span>
        </div>

        {/* Haber İçeriği - Tıklanabilir */}
        <div
          className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity duration-200"
          onClick={handleNewsClick}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="transition-all duration-500 ease-in-out news-content">
            <h3 className="text-xs lg:text-sm font-semibold text-text-main truncate leading-tight">
              {currentNews.title}
            </h3>
            {currentNews.summary && (
              <p className="text-xs text-text-secondary truncate hidden md:block leading-tight mt-0.5">
                {currentNews.summary}
              </p>
            )}
          </div>
        </div>

        {/* Navigasyon Butonları - Desktop */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handlePrevious}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/60 transition-colors"
            aria-label="Önceki Haber"
            title="Önceki Haber"
          >
            <span className="material-symbols-outlined text-base text-gray-600">
              chevron_left
            </span>
          </button>

          {/* Sayfa göstergesi */}
          <span className="text-xs text-gray-600 px-1.5 font-medium min-w-[45px] text-center">
            {currentIndex + 1}/{news.length}
          </span>

          <button
            onClick={handleNext}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/60 transition-colors"
            aria-label="Sonraki Haber"
            title="Sonraki Haber"
          >
            <span className="material-symbols-outlined text-base text-gray-600">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* Detay Modal */}
      {showModal && (
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
                <h2 className="text-lg font-bold text-text-main truncate">Gümrük Haberleri</h2>
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
                {currentNews.title}
              </h3>

              {currentNews.publishedDate && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  <time dateTime={currentNews.publishedDate}>
                    {new Date(currentNews.publishedDate).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </time>
                </div>
              )}

              <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed space-y-3">
                {currentNews.description || currentNews.summary || 'Haber detayı mevcut değil.'}
              </div>

              {/* Navigation in Modal - Mobil için */}
              {news.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevious();
                    }}
                    className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Önceki Haber"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>

                  <span className="text-sm text-gray-600 px-3 font-medium">
                    {currentIndex + 1} / {news.length}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Sonraki Haber"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 pt-4 border-t border-gray-200">
                {currentNews.link && (
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
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

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

        .news-content {
          animation: fadeInSlide 0.5s ease-in-out;
        }

        /* Smooth scrollbar for modal */
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
    </>
  );
}
