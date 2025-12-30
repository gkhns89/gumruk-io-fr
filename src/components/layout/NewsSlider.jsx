import React, { useState, useEffect, useRef } from 'react';
import { customsNewsService } from '../../api/customsNewsService';

export default function NewsSlider() {
  const [news, setNews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [slideDirection, setSlideDirection] = useState('next'); // 'next' veya 'prev'
  const [showButtons, setShowButtons] = useState(false); // Modal navigation butonları görünürlüğü

  const intervalRef = useRef(null);
  const hideButtonsTimerRef = useRef(null);

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
      setSlideDirection('next');
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
    setSlideDirection('next');
    setCurrentIndex((prev) => (prev + 1) % news.length);
  };

  // Manuel geri buton
  const handlePrevious = () => {
    setSlideDirection('prev');
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
    setShowButtons(false);
    // Timer'ı temizle
    if (hideButtonsTimerRef.current) {
      clearTimeout(hideButtonsTimerRef.current);
    }
  };

  // Component unmount olunca timer'ı temizle
  useEffect(() => {
    return () => {
      if (hideButtonsTimerRef.current) {
        clearTimeout(hideButtonsTimerRef.current);
      }
    };
  }, []);

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
      <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0 max-w-5xl mx-auto">
        {/* Haber İkonu + Etiket */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200">
            <span className="material-symbols-outlined text-lg text-primary">newspaper</span>
            <span className="text-xs font-semibold text-gray-700 hidden lg:inline">Güncel</span>
          </div>
          <span className="material-symbols-outlined text-xl text-primary sm:hidden">newspaper</span>
        </div>

        {/* Haber İçeriği - Tıklanabilir */}
        <div
          className="flex-1 min-w-0 cursor-pointer group overflow-hidden"
          onClick={handleNewsClick}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            key={currentIndex}
            className={`news-content news-slide-${slideDirection} bg-white/50 backdrop-blur-sm rounded-lg px-3 py-2 lg:px-4 lg:py-2.5 hover:bg-white/80 hover:shadow-sm border border-white/50 hover:border-gray-200 transition-[background-color,box-shadow,border-color] duration-300`}
          >
            <h3 className="text-xs lg:text-sm font-bold text-gray-800 truncate leading-tight group-hover:text-primary transition-colors">
              {currentNews.title}
            </h3>
            {currentNews.summary && (
              <p className="text-xs text-gray-600 truncate hidden md:block leading-tight mt-1">
                {currentNews.summary}
              </p>
            )}
          </div>
        </div>

        {/* Navigasyon Butonları */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Önceki buton */}
          <button
            onClick={handlePrevious}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="h-8 w-8 lg:h-9 lg:w-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm border border-gray-200 hover:border-primary/50 hover:shadow-md transition-all group"
            aria-label="Önceki Haber"
            title="Önceki Haber"
          >
            <span className="material-symbols-outlined text-lg text-gray-700 group-hover:text-primary transition-colors">
              chevron_left
            </span>
          </button>

          {/* Sayfa göstergesi - Desktop */}
          <div className="hidden sm:flex items-center px-2.5 py-1 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200">
            <span className="text-xs text-gray-700 font-semibold min-w-[40px] text-center">
              {currentIndex + 1}/{news.length}
            </span>
          </div>

          {/* Sonraki buton */}
          <button
            onClick={handleNext}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="h-8 w-8 lg:h-9 lg:w-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm border border-gray-200 hover:border-primary/50 hover:shadow-md transition-all group"
            aria-label="Sonraki Haber"
            title="Sonraki Haber"
          >
            <span className="material-symbols-outlined text-lg text-gray-700 group-hover:text-primary transition-colors">
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
          <div className="relative flex items-center gap-4 max-w-full">
            {/* Modal Content */}
            <div
              className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-slide-up"
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => {
                setShowButtons(true);
                setIsPaused(true);
                // Timer varsa iptal et
                if (hideButtonsTimerRef.current) {
                  clearTimeout(hideButtonsTimerRef.current);
                }
              }}
              onMouseLeave={() => {
                // 2 saniye sonra butonları gizle ve slider'ı devam ettir
                hideButtonsTimerRef.current = setTimeout(() => {
                  setShowButtons(false);
                  setIsPaused(false);
                }, 2000);
              }}
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

              {/* Modal Body */}
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

            {/* Floating Navigation Buttons - Modal Sağında */}
            {news.length > 1 && (
              <div
                className={`flex flex-col items-center gap-3 transition-opacity duration-300 ${showButtons ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={(e) => e.stopPropagation()} // Backdrop click'ini engelle
                onMouseEnter={() => {
                  setShowButtons(true);
                  setIsPaused(true);
                  // Timer varsa iptal et
                  if (hideButtonsTimerRef.current) {
                    clearTimeout(hideButtonsTimerRef.current);
                  }
                }}
                onMouseLeave={() => {
                  // 2 saniye sonra butonları gizle ve slider'ı devam ettir
                  hideButtonsTimerRef.current = setTimeout(() => {
                    setShowButtons(false);
                    setIsPaused(false);
                  }, 2000);
                }}
              >
                {/* Yukarı (Önceki) Buton */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                  }}
                  className="h-12 w-12 lg:h-14 lg:w-14 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md hover:bg-white shadow-lg hover:shadow-xl border border-gray-200 hover:border-primary/50 transition-all group/btn"
                  aria-label="Önceki Haber"
                  title="Önceki Haber"
                >
                  <span className="material-symbols-outlined text-2xl text-gray-700 group-hover/btn:text-primary transition-colors">
                    keyboard_arrow_up
                  </span>
                </button>

                {/* Sayfa Göstergesi */}
                <div className="flex items-center justify-center px-3 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200">
                  <span className="text-xs lg:text-sm text-gray-700 font-bold min-w-[45px] text-center">
                    {currentIndex + 1}/{news.length}
                  </span>
                </div>

                {/* Aşağı (Sonraki) Buton */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="h-12 w-12 lg:h-14 lg:w-14 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md hover:bg-white shadow-lg hover:shadow-xl border border-gray-200 hover:border-primary/50 transition-all group/btn"
                  aria-label="Sonraki Haber"
                  title="Sonraki Haber"
                >
                  <span className="material-symbols-outlined text-2xl text-gray-700 group-hover/btn:text-primary transition-colors">
                    keyboard_arrow_down
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
