import React, { useState } from 'react';
import { employeeService } from '../../api/employeeService';
import { showSuccess, showError } from '../../utils/toastUtils';

export default function DeleteEmployeeModal({ onClose, employee, currentUser, onSuccess }) {
  const [loading, setLoading] = useState(false);

  // Check if deleting self
  const isDeletingSelf = currentUser?.id === employee.id;

  // Get role display text
  const getRoleText = (role) => {
    const roles = {
      BROKER_ADMIN: 'Broker Yöneticisi',
      BROKER_USER: 'Broker Kullanıcısı'
    };
    return roles[role] || role;
  };

  const handleDelete = async () => {
    if (isDeletingSelf) {
      showError('Kendi hesabınızı silemezsiniz');
      return;
    }

    setLoading(true);

    try {
      const result = await employeeService.deleteEmployee(employee.id);

      if (result.success) {
        showSuccess(`${employee.username} başarıyla silindi!`);
        onSuccess();
        onClose();
      } else {
        // API error - show as toast
        showError(result.error || 'Çalışan silinemedi');
      }
    } catch (err) {
      // Network/unexpected error - show as toast
      showError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100/50">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 text-2xl">warning</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Çalışanı Sil
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Bu işlem geri alınamaz
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Self-delete warning */}
          {isDeletingSelf ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-600">block</span>
                <div>
                  <p className="text-amber-900 font-semibold">Kendi Hesabınızı Silemezsiniz</p>
                  <p className="text-amber-800 text-sm mt-1">
                    Hesabınızı silmek için bir yöneticiye başvurun.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Employee info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">
                      person
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{employee.username}</p>
                    <p className="text-xs text-gray-600">{employee.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Rol</p>
                    <p className="text-gray-800 font-medium">{getRoleText(employee.globalRole)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Durum</p>
                    <p className="text-gray-800 font-medium">
                      {employee.isActive ? 'Aktif' : 'Beklemede'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                  <span className="font-semibold">{employee.username}</span> adlı çalışanı silmek üzeresiniz.
                  Bu çalışanın hesabı devre dışı bırakılacaktır.
                </p>
              </div>

              {/* Info about soft delete */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">info</span>
                  <p className="text-blue-800 text-xs">
                    Bu işlem çalışanı sistemden tamamen kaldırmaz, hesabı devre dışı bırakır.
                    Gerekirse daha sonra yeniden aktif hale getirilebilir.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || isDeletingSelf}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Siliniyor...' : 'Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}
