import React, { useState, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../api/userService';
import { showSuccess, showError, showInfo } from '../utils/toastUtils';

const TABS = [
  { id: 'profile', label: 'Profil', icon: 'person' },
  { id: 'security', label: 'Güvenlik', icon: 'lock' },
  // Step 6'da BROKER_ADMIN için 'ShipsGo Kredim' tab'ı eklenecek
];

const ROLE_LABELS = {
  SUPER_ADMIN: 'Sistem Yöneticisi',
  BROKER_ADMIN: 'Gümrük Müşaviri Yöneticisi',
  BROKER_USER: 'Gümrük Müşaviri Çalışanı',
  CLIENT_USER: 'Müşteri Kullanıcısı',
};

function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: 'bg-gray-200' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü', 'Çok güçlü'];
  const colors = [
    'bg-red-500', 'bg-red-400', 'bg-yellow-500',
    'bg-yellow-400', 'bg-green-500', 'bg-green-600',
  ];
  return { score, label: labels[score], color: colors[score] };
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Profil tab state
  const [username, setUsername] = useState(user?.username || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Güvenlik tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      showError('Kullanıcı adı boş olamaz');
      return;
    }
    if (username.trim() === user?.username) {
      showInfo('Değişiklik yok');
      return;
    }
    setSavingProfile(true);
    const res = await userService.updateMyProfile({ username: username.trim() });
    setSavingProfile(false);
    if (res.success) {
      showSuccess('Profil güncellendi. Değişiklik için yeniden giriş yapmanız önerilir.');
    } else {
      showError(res.error);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Tüm alanları doldurun');
      return;
    }
    if (newPassword.length < 8) {
      showError('Yeni şifre en az 8 karakter olmalıdır');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Yeni şifre ile tekrarı eşleşmiyor');
      return;
    }
    if (currentPassword === newPassword) {
      showError('Yeni şifre eski şifreden farklı olmalıdır');
      return;
    }

    setChangingPassword(true);
    const res = await userService.changeMyPassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setChangingPassword(false);

    if (res.success) {
      showSuccess('Şifreniz değiştirildi. Yeniden giriş ekranına yönlendiriliyorsunuz...');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        logout?.();
        window.location.href = '/login';
      }, 1500);
    } else {
      showError(res.error);
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary">account_circle</span>
            Hesabım
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Profil bilgilerinizi ve güvenlik ayarlarınızı buradan yönetin.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            {/* Tab buttons */}
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === t.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-main'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Profile tab */}
            {activeTab === 'profile' && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                <h2 className="text-lg font-semibold text-text-main mb-4">Profil Bilgileri</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-secondary">E-posta</span>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-text-secondary px-3 py-2 text-sm cursor-not-allowed"
                    />
                    <span className="text-[11px] text-gray-400">E-posta değiştirmek için yöneticinizle iletişime geçin.</span>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-secondary">Rol</span>
                    <input
                      type="text"
                      value={ROLE_LABELS[user?.globalRole] || user?.globalRole || ''}
                      disabled
                      className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-text-secondary px-3 py-2 text-sm cursor-not-allowed"
                    />
                  </label>

                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs font-medium text-text-secondary">Kullanıcı Adı</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="örn. Gökhan Şişman"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    />
                  </label>

                  {user?.companyDetails?.name && (
                    <label className="flex flex-col gap-1 sm:col-span-2">
                      <span className="text-xs font-medium text-text-secondary">Firma</span>
                      <input
                        type="text"
                        value={user.companyDetails.name}
                        disabled
                        className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-text-secondary px-3 py-2 text-sm cursor-not-allowed"
                      />
                    </label>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    {savingProfile ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </div>
            )}

            {/* Security tab */}
            {activeTab === 'security' && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                <h2 className="text-lg font-semibold text-text-main mb-4">Şifre Değiştir</h2>
                <p className="text-xs text-text-secondary mb-4">
                  Şifrenizi değiştirdikten sonra tüm aktif oturumlarınız sonlandırılır
                  ve yeniden giriş yapmanız istenir.
                </p>

                <div className="grid grid-cols-1 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-secondary">Mevcut Şifre</span>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-secondary">Yeni Şifre</span>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    />
                    {newPassword && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${strength.color} transition-all`}
                            style={{ width: `${(strength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-text-secondary w-20 text-right">
                          {strength.label}
                        </span>
                      </div>
                    )}
                    <span className="text-[11px] text-gray-400">
                      En az 8 karakter. Büyük/küçük harf, rakam ve sembol kullanın.
                    </span>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-secondary">Yeni Şifre (Tekrar)</span>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <span className="text-[11px] text-red-500">Şifreler eşleşmiyor</span>
                    )}
                  </label>

                  <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPasswords}
                      onChange={(e) => setShowPasswords(e.target.checked)}
                      className="rounded"
                    />
                    Şifreleri göster
                  </label>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">lock_reset</span>
                    {changingPassword ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
