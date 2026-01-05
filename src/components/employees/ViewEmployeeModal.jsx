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
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      label: 'Aktif'
    } : {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
      label: 'Beklemede'
    };
  };

  // Get role badge styling
  const getRoleBadge = (role) => {
    const badges = {
      BROKER_ADMIN: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-300'
      },
      BROKER_USER: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300'
      }
    };
    return badges[role] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-300'
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
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Çalışan Detayları
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Çalışan bilgilerini görüntüleyin
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Employee Icon and Name */}
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
            <div className="flex-shrink-0 h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">
                person
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800">{employee.username}</h3>
              <p className="text-gray-600">{employee.email}</p>
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
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Kullanıcı Adı
              </label>
              <p className="text-gray-900 font-medium">{employee.username}</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Email
              </label>
              <p className="text-gray-900 font-medium">{employee.email}</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Rol
              </label>
              <p className="text-gray-900 font-medium">{getRoleText(employee.globalRole)}</p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Durum
              </label>
              <p className="text-gray-900 font-medium">{getStatusText(employee.isActive)}</p>
            </div>

            {/* Created Date */}
            {employee.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Kayıt Tarihi
                </label>
                <p className="text-gray-900 font-medium">
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
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Email Doğrulama
                </label>
                <p className="text-gray-900 font-medium">
                  {employee.emailVerified ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Doğrulandı
                    </span>
                  ) : (
                    <span className="text-yellow-600 flex items-center gap-1">
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
            <div className="pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Firma Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Firma Adı
                  </label>
                  <p className="text-gray-900 font-medium">{employee.company.name}</p>
                </div>
                {employee.company.shortName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Kısa Ad
                    </label>
                    <p className="text-gray-900 font-medium">{employee.company.shortName}</p>
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
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
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
