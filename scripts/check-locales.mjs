/* global process */
// tr ve en sözlüklerinin aynı anahtarları taşıdığını ve boş değer olmadığını denetler.
// Arayüze yeni metin eklerken iki sözlüğe birden yazılmadıysa burada yakalanır.
// Kullanım: npm run i18n:check
import { tr } from '../src/locales/tr.js';
import { en } from '../src/locales/en.js';

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]]);

const dictionaries = { tr: new Map(flatten(tr)), en: new Map(flatten(en)) };
const problems = [];

for (const [lang, dict] of Object.entries(dictionaries)) {
  for (const [otherLang, other] of Object.entries(dictionaries)) {
    if (otherLang === lang) continue;
    for (const key of other.keys()) {
      if (!dict.has(key)) problems.push(`${lang}: eksik anahtar "${key}" (${otherLang} sözlüğünde var)`);
    }
  }
  for (const [key, value] of dict) {
    if (typeof value !== 'string' || value.trim() === '') {
      problems.push(`${lang}: boş ya da metin olmayan değer "${key}"`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} sorun bulundu.`);
  process.exit(1);
}

console.log(`tr ve en uyumlu: ${dictionaries.tr.size} anahtar.`);
