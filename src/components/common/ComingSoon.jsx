import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';

const ComingSoon = ({
  icon = "construction",
  title = "Yakında",
  description = "Bu sayfa şu anda geliştirme aşamasındadır.",
  featureName
}) => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-4 transition-colors duration-300">
        <div className="max-w-2xl w-full">
          {/* Main Card */}
          <div className="bg-white dark:bg-background-dark rounded-2xl shadow-xl p-8 md:p-12 text-center transition-colors duration-300">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full mb-6">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '60px' }}>
                {icon}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-text-main mb-4">
              {featureName || title}
            </h1>

            {/* Description */}
            <p className="text-lg text-text-secondary mb-8 leading-relaxed">
              {description}
            </p>

            {/* Features Preview */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors duration-300">
                <span className="material-symbols-outlined text-primary text-2xl mb-2 block">
                  check_circle
                </span>
                <p className="text-sm font-medium text-text-main">
                  Kullanıcı Dostu Arayüz
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors duration-300">
                <span className="material-symbols-outlined text-primary text-2xl mb-2 block">
                  speed
                </span>
                <p className="text-sm font-medium text-text-main">
                  Hızlı ve Güvenli
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors duration-300">
                <span className="material-symbols-outlined text-primary text-2xl mb-2 block">
                  phone_iphone
                </span>
                <p className="text-sm font-medium text-text-main">
                  Mobil Uyumlu
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span className="material-symbols-outlined">
                home
              </span>
              <span>Ana Sayfaya Dön</span>
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Sorularınız için iletişime geçebilirsiniz
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ComingSoon;
