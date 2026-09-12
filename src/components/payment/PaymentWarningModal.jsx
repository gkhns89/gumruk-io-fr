import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/authContext';
import { useContext } from 'react';
// Giriş paketinde (App.jsx statik import eder): sözlükleri tanıtım sayfasına taşımamak için runtime köprüsü
import { t } from '../../locales/runtime';

// Başlık ve metin `paymentWarning.<seviye>` altında
const LEVEL_CONFIG = {
  WARNING: {
    icon: 'warning',
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
  },
  WRITE_BLOCKED: {
    icon: 'block',
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100',
  },
  FULL_READONLY: {
    icon: 'lock',
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
  },
};

export default function PaymentWarningModal({ level, daysOverdue, onClose }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const levelKey = LEVEL_CONFIG[level] ? level : 'WARNING';
  const config = LEVEL_CONFIG[levelKey];

  const canPay = user?.isPaymentResponsible || user?.globalRole === 'BROKER_ADMIN';

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-md w-full animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <div className={`flex items-center justify-center h-12 w-12 ${config.iconBg} rounded-full`}>
            <span className={`material-symbols-outlined ${config.iconColor} text-2xl`}>{config.icon}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-main">{t(`paymentWarning.${levelKey}.title`)}</h2>
            <p className="text-text-secondary text-sm mt-1">{t('paymentWarning.daysOverdue', { days: daysOverdue })}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-text-secondary text-sm">{t(`paymentWarning.${levelKey}.message`, { days: daysOverdue })}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-text-secondary hover:text-text-main font-medium transition-colors"
          >
            {t('common.close')}
          </button>
          {canPay && (
            <button
              onClick={() => { onClose(); navigate('/payment/submit'); }}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-colors font-semibold"
            >
              <span className="material-symbols-outlined">account_balance</span>
              {t('payment.title')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
