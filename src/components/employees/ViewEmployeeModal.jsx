import React from 'react';

export default function ViewEmployeeModal({ onClose, employee, onEdit }) {

  // Get role display text
  const getRoleText = (role) => {
    const roles = {
      BROKER_ADMIN: 'Broker Yöneticisi',
      BROKER_USER: 'Broker Kullanıcısı'
    };
    return roles[role] || role;
  };

  // Get status display text
  const getStatusText = (isActive) => {
    return isActive ? 'Aktif' : 'Beklemede';
  };

  // Get status badge styling
  const getStatusBadge = (isActive) => {
    return isActive ? {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
      label: 'Aktif'
    } : {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
      label: 'Beklemede'
    };
  };

  // Get role badge styling
  const getRoleBadge = (role) => {
    const badges = {
      BROKER_ADMIN: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-800 dark:text-purple-300',
        border: 'border-purple-300 dark:border-purple-700'
      },
      BROKER_USER: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-700'
      }
    };
    return badges[role] || {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-800 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600'
    };
  };

  const statusBadge = getStatusBadge(employee.isActive);
  const roleBadge = getRoleBadge(employee.globalRole);

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 transition-colors duration-300">
          <div>
            <h2 className="text-2xl font-bold text-text-main">
              Çalışan Detayları
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Çalışan bilgilerini görüntüleyin
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Employee Icon and Name */}
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex-shrink-0 h-16 w-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-primary text-3xl">
                person
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-text-main">{employee.username}</h3>
              <p className="text-text-secondary">{employee.email}</p>
            </div>
            <div className="flex flex-col gap-2">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                {getRoleText(employee.globalRole)}
              </span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                {statusBadge.label}
              </span>
            </div>
          </div>

          {/* Employee Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Kullanıcı Adı
              </label>
              <p className="text-text-main font-medium">{employee.username}</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Email
              </label>
              <p className="text-text-main font-medium">{employee.email}</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Rol
              </label>
              <p className="text-text-main font-medium">{getRoleText(employee.globalRole)}</p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Durum
              </label>
              <p className="text-text-main font-medium">{getStatusText(employee.isActive)}</p>
            </div>

            {/* Created Date */}
            {employee.createdAt && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Kayıt Tarihi
                </label>
                <p className="text-text-main font-medium">
                  {new Date(employee.createdAt).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}

            {/* Email Verified */}
            {employee.emailVerified !== undefined && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Email Doğrulama
                </label>
                <p className="text-text-main font-medium">
                  {employee.emailVerified ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Doğrulandı
                    </span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">pending</span>
                      Beklemede
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Company Information */}
          {employee.company && (
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <h4 className="text-sm font-semibold text-text-main mb-3">Firma Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Firma Adı
                  </label>
                  <p className="text-text-main font-medium">{employee.company.name}</p>
                </div>
                {employee.company.shortName && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Kısa Ad
                    </label>
                    <p className="text-text-main font-medium">{employee.company.shortName}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            Kapat
          </button>
          <button
            onClick={() => {
              onEdit(employee);
              onClose();
            }}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">edit</span>
            Düzenle
          </button>
        </div>
      </div>
    </div>
  );
}
