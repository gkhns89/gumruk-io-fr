import { t } from '../../locales';

// PILOT durumundaki bir özelliğin yanında gösterilen küçük "Yeni" etiketi.
export default function NewFeatureBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ${className}`}
    >
      {t('featureFlags.newBadge')}
    </span>
  );
}
