import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../api/userService';
import { shipsGoCreditService } from '../api/shipsGoCreditService';
import { showSuccess, showError, showInfo } from '../utils/toastUtils';

const LOT_SOURCE_LABEL = {
  PURCHASE_BALANCE: 'Bakiyeden satın alma',
  PURCHASE_TRANSFER: 'Havale (onaylı)',
  ADMIN_GRANT: 'Yönetici tanımı',
};

const ROLE_LABELS = {
  SUPER_ADMIN: 'Sistem Yöneticisi',
  BROKER_ADMIN: 'Gümrük Müşaviri Yöneticisi',
  BROKER_USER: 'Gümrük Müşaviri Çalışanı',
  CLIENT_USER: 'Müşteri Kullanıcısı',
};

/**
 * Cryptographically secure random password.
 * 16 chars, guaranteed to include uppercase, lowercase, digit and symbol.
 * Compatible with Chrome's password manager when surfaced inside a form
 * carrying autocomplete="new-password" on the input.
 */
function generateSecurePassword(length = 16) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // O excluded for clarity
  const lower = 'abcdefghijkmnpqrstuvwxyz';   // l, o excluded
  const digit = '23456789';                    // 0, 1 excluded
  const symbol = '!@#$%^&*-_=+';
  const all = upper + lower + digit + symbol;

  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);

  // Guarantee one char from each class up front
  const chars = [
    upper[buf[0] % upper.length],
    lower[buf[1] % lower.length],
    digit[buf[2] % digit.length],
    symbol[buf[3] % symbol.length],
  ];
  for (let i = 4; i < length; i++) {
    chars.push(all[buf[i] % all.length]);
  }

  // Fisher–Yates shuffle so the guaranteed positions are not always 0–3
  const shuffleBuf = new Uint32Array(length);
  crypto.getRandomValues(shuffleBuf);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBuf[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

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
  const navigate = useNavigate();

  const isBrokerAdmin = user?.globalRole === 'BROKER_ADMIN';
  const tabs = useMemo(() => {
    const t = [
      { id: 'profile', label: 'Profil', icon: 'person' },
      { id: 'security', label: 'Güvenlik', icon: 'lock' },
    ];
    if (isBrokerAdmin) {
      t.push({ id: 'shipsgo', label: 'ShipsGo Kredim', icon: 'travel_explore' });
    }
    return t;
  }, [isBrokerAdmin]);

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

  // ShipsGo Kredim state
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!isBrokerAdmin) return;
    setWalletLoading(true);
    const res = await shipsGoCreditService.getMyWallet();
    setWalletLoading(false);
    if (res.success) {
      setWallet(res.data);
    }
  }, [isBrokerAdmin]);

  useEffect(() => {
    if (activeTab === 'shipsgo') loadWallet();
  }, [activeTab, loadWallet]);

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
              {tabs.map((t) => (
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
              <form
                className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors"
                onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}
                autoComplete="on"
                name="change-password-form"
              >
                {/*
                  Hidden username field anchors Chrome / 1Password / Bitwarden
                  autofill to *this* form. Without it the browser scans the
                  whole page for a matching field and ends up dumping the
                  user's email into the header search input.
                */}
                <input
                  type="text"
                  name="username"
                  value={user?.email || ''}
                  autoComplete="username"
                  readOnly
                  hidden
                  tabIndex={-1}
                  aria-hidden="true"
                />

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
                      name="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-secondary">Yeni Şifre</span>
                      <button
                        type="button"
                        onClick={() => {
                          const pwd = generateSecurePassword(16);
                          setNewPassword(pwd);
                          setConfirmPassword(pwd);
                          setShowPasswords(true);
                          showSuccess('Güvenli şifre üretildi. Lütfen güvenli bir yere kaydedin.');
                        }}
                        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:opacity-80 transition-opacity"
                        title="16 karakterli, büyük/küçük harf, rakam ve sembol içeren güvenli şifre üretir"
                      >
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        Güvenli Şifre Üret
                      </button>
                    </div>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      name="new-password"
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
                      name="confirm-password"
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
                    type="submit"
                    disabled={changingPassword}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">lock_reset</span>
                    {changingPassword ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                  </button>
                </div>
              </form>
            )}

            {/* ShipsGo Kredim tab — BROKER_ADMIN only */}
            {activeTab === 'shipsgo' && isBrokerAdmin && (
              <ShipsGoWalletTab
                wallet={wallet}
                loading={walletLoading}
                onRefresh={loadWallet}
                onPurchase={() => navigate('/payment/submit?tab=shipsgo')}
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

/**
 * "Hesabım > ShipsGo Kredim" tab body.
 * Surfaces current credits, lifetime stats and the FIFO-ordered active lots
 * so the user can see which credits will expire first. Older lots are
 * highlighted as their lifetime gets thinner.
 */
function ShipsGoWalletTab({ wallet, loading, onRefresh, onPurchase }) {
  const stats = wallet || {};
  const lots = stats.activeLots || [];
  // Backend may omit the flag for back-compat — treat undefined as enabled so
  // we don't accidentally show the empty state for older payloads. Only an
  // explicit false locks the broker out.
  const optedOut = stats.shipsgoEnabled === false;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-main">ShipsGo Kredisi</h2>
            <p className="text-xs text-text-secondary mt-1">
              Kredileriniz yüklendikleri tarihten itibaren 1 yıl geçerlidir
              ve en eski (yakında dolacak) lot önce harcanır.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-text-main hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Yenile
            </button>
            {!optedOut && (
              <button
                onClick={onPurchase}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                Kredi Satın Al
              </button>
            )}
          </div>
        </div>

        {optedOut && (
          <div className="mt-4 rounded-xl border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">info</span>
              ShipsGo entegrasyonu hesabınıza tanımlanmamış
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              Yöneticinizle iletişime geçerek bu firmaya ShipsGo entegrasyonunu
              tanımlatabilirsiniz. Tanımlanırsa mevcut bakiyeniz kullanılabilir
              olur.
            </p>
          </div>
        )}

        {loading && !wallet ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <StatCard label="Mevcut Bakiye" value={stats.currentCredits ?? 0} highlight />
              <StatCard label="Toplam Alınan" value={stats.lifetimePurchased ?? 0} />
              <StatCard label="Kullanılan" value={stats.lifetimeConsumed ?? 0} />
              <StatCard label="Süresi Dolan" value={stats.lifetimeExpired ?? 0} muted />
            </div>
          </>
        )}
      </div>

      {/* Active lots */}
      <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-main">Aktif Kredi Lotları</h3>
          <span className="text-xs text-text-secondary">
            En yakın süresi dolacak olan en üstte (FIFO)
          </span>
        </div>

        {lots.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-2 block">
              inventory_2
            </span>
            <p className="text-text-secondary text-sm">Henüz kredi lotunuz yok.</p>
            <button
              onClick={onPurchase}
              className="mt-3 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
            >
              İlk paketinizi satın alın →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-text-secondary">
                  <th className="text-left px-3 py-2">Yükleme</th>
                  <th className="text-left px-3 py-2">Kaynak</th>
                  <th className="text-right px-3 py-2">Yüklenen</th>
                  <th className="text-right px-3 py-2">Kalan</th>
                  <th className="text-left px-3 py-2">Son Kullanma</th>
                  <th className="text-right px-3 py-2">Kalan Gün</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {lots.map((lot) => {
                  const days = lot.daysUntilExpiry ?? 0;
                  let rowCls = '';
                  if (days <= 7) rowCls = 'bg-red-50 dark:bg-red-900/10';
                  else if (days <= 30) rowCls = 'bg-yellow-50 dark:bg-yellow-900/10';
                  return (
                    <tr key={lot.id} className={rowCls}>
                      <td className="px-3 py-2 text-text-main">
                        {new Date(lot.grantedAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-3 py-2 text-text-secondary text-xs">
                        {LOT_SOURCE_LABEL[lot.source] || lot.source}
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary">
                        {lot.creditsInitial}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-text-main">
                        {lot.creditsRemaining}
                      </td>
                      <td className="px-3 py-2 text-text-main">
                        {new Date(lot.expiresAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${
                        days <= 7 ? 'text-red-600 dark:text-red-400'
                          : days <= 30 ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-text-main'
                      }`}>
                        {days} gün
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight, muted }) {
  return (
    <div className={`rounded-lg p-4 ${
      highlight
        ? 'bg-primary/10 border border-primary/30'
        : muted
          ? 'bg-gray-50 dark:bg-gray-800/40'
          : 'bg-gray-50 dark:bg-gray-800/40'
    }`}>
      <div className="text-xs text-text-secondary">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${
        highlight ? 'text-primary' : muted ? 'text-text-secondary' : 'text-text-main'
      }`}>
        {value}
      </div>
    </div>
  );
}
