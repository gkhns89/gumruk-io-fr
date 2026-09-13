import { t, getCurrentLanguage, getSupportedLanguages, setLanguage } from '../../locales';

// Arayüz dili seçimi — tüm kullanıcılar (13.09.2026'da SUPER_ADMIN kısıtı kaldırıldı).
// Sunucudan gelen hata ve bildirim metinleri şimdilik Türkçe kalır; kartın alt notu bunu söyler.
export default function LanguageSelectCard() {
  const current = getCurrentLanguage();

  return (
    <div className="mt-6 bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
      <h2 className="text-lg font-semibold text-text-main mb-1 flex items-center gap-2">
        <span className="material-symbols-outlined text-xl text-primary">translate</span>
        {t('language.title')}
      </h2>
      <p className="text-xs text-text-secondary mb-4">{t('language.description')}</p>

      <div className="flex flex-wrap gap-2">
        {getSupportedLanguages().map((lang) => {
          const selected = lang.code === current;
          return (
            <button
              key={lang.code}
              type="button"
              aria-pressed={selected}
              onClick={() => { if (!selected) setLanguage(lang.code); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                selected
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 dark:border-gray-600 text-text-main hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {lang.name}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-text-secondary mt-4">{t('language.inProgress')}</p>
    </div>
  );
}
