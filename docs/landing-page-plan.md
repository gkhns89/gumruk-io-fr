# Landing Page — Plan ve Bağlam

> Bu dosya, landing page çalışmasının ayrı bir oturumda kaldığı yerden sürdürülebilmesi için
> hazırlandı. Son güncelleme: 12 Ağustos 2026.

## Amaç

Ana domain (`gumruk.io`) şu anda doğrudan login sayfasına düşüyor. Bunun yerine tek sayfalık
(one-page) bir tanıtım sayfası olacak:

- Sistemin ne yaptığını anlatan pazarlama içeriği
- Header'da **"Sisteme Giriş"** butonu → mevcut login sayfasına götürür
- Mevcut kullanıcılar sistemi bu sayfa üzerinden kullanmaya devam eder

## Mevcut routing durumu

`src/App.jsx` içinde:

| Satır | Şu an | Olacak |
|---|---|---|
| 348 | `<Route path="/" element={<Navigate to="/dashboard" replace />} />` | `<Route path="/" element={<LandingPage />} />` |
| 349 | `<Route path="*" element={<Navigate to="/login" replace />} />` | `*` → `/` (tanıtım sayfası) |

Şu anki akış: `/` → `/dashboard` → (ProtectedRoute, satır 44) → `/login`. İki sıçrama.

### Kritik incelik

Landing page **`PublicRoute` ile sarmalanmamalı.** `App.jsx:69` giriş yapmış kullanıcıyı
`/dashboard`'a yönlendiriyor; landing'i de sararsan giriş yapmış kullanıcı tanıtım sayfasını
hiç göremez.

Landing tamamen public kalır, header butonu `useAuth()` ile koşullanır:

- giriş yapılmamış → "Sisteme Giriş" → `/login`
- giriş yapılmış → "Panele Git" → `/dashboard`

## Marka varlıkları

Uygulamada kullanılanlar (git'te takipli):

```
src/assets/brand/emblem-light.png    Açık mod amblem (mavi)
src/assets/brand/emblem-dark.png     Koyu mod amblem (beyaz)
src/assets/brand/lockup-light.png    Açık mod yatay logo (h160)
src/assets/brand/lockup-dark.png     Koyu mod yatay logo (h160)
public/favicon-16|32|48.png, apple-touch-icon.png
```

Tam kit `src/assets/gumruk-io-sosyal-kit/` altında — **gitignore'lu**, sadece yerelde.
İhtiyaç olursa oradan alınıp `src/assets/brand/` içine kopyalanır. Kitin içinde ayrıca:

- `02-kapak/open-graph-1200x630.png` — OG görseli (domain canlı olunca kullanılacak)
- `05-lockup/` — koyu/açık/şeffaf zemin lockup varyantları
- `04-amblem/` — şeffaf zeminli amblem (beyaz / mavi / lacivert)

### Renk ve tipografi

| | |
|---|---|
| Lacivert | `#0A1F44` |
| Mavi | `#1E4FD8` |
| Sky | `#38BDF8` |
| Tipografi | Sora |

**Uyarı (kit README'sinden):** amblemdeki dönüş köşesindeki halka gerçek boşluktur — arkasındaki
zemin görünür. Amblemi kendi rengiyle aynı renkte bir zeminin üzerine koyma, halka kaybolur.
Bu yüzden Login/Header'daki eski renkli daireler kaldırıldı.

## Teknik kısıtlar

- **Tailwind v4** (`@tailwindcss/vite`), config `tailwind.config.js` içinde minimal
- **Dark mode sınıf tabanlı:** `src/index.css:3` → `@custom-variant dark (&:where(.dark, .dark *))`,
  `ThemeProvider` `documentElement`'e `.dark` ekliyor.
  → `prefers-color-scheme` **kullanma**; tema duyarlı görseller için `dark:hidden` /
  `hidden dark:block` ikilisi kullan (Header ve Login'de uygulanan yöntem bu).
- **Vercel SPA rewrite hazır:** `vercel.json` içinde `/(.*)` → `/index.html`. Yeni route için
  deploy tarafında değişiklik gerekmiyor.
- Mevcut bundle zaten büyük (~2.5 MB / 600 kB gzip). Landing page ana bundle'a eklenecekse
  `React.lazy` ile ayırmak mantıklı — tanıtım sayfası için uygulama kodunun tamamı inmemeli.

## Domain durumu

- Sistem şu anda `aacc.gokhan.codes`, API `api-aacc.gokhan.codes` üzerinden yürüyor
- `gumruk.io` **alındı ama henüz yayında değil**
- Kodda domaine bağlı 2 satır bilerek değiştirilmedi:
  - `src/api/axios.js:8` — API fallback adresi
  - `public/robots.txt:12` — sitemap satırı (yorum halinde)

### Geçiş sırası

**Web (Vercel):** her iki domain projeye eklenir, `gumruk.io` Primary yapılır,
`aacc.gokhan.codes` için "Redirect to gumruk.io" seçilir. 308 yönlendirme path'i korur —
`/dashboard` bookmark'ı olan kullanıcı `gumruk.io/dashboard`'a düşer.

**API (Railway) — yönlendirme yapma.** Redirect, CORS preflight ve `Authorization` header'larında
sorun çıkarır. Doğrusu: yeni API domainini aynı servise **ek domain** olarak tanımlamak, ikisini
bir süre birlikte yaşatmak.

Sıra: yeni API domaini → SSL doğrulama → CORS'a `https://gumruk.io` origin'i → Vercel'de
`VITE_API_BASE_URL` → **en son** `axios.js:8` ve `robots.txt`.

## Açık kararlar

Tasarıma başlamadan netleşmesi gerekenler:

- [ ] İçerik bölümleri (hero, özellikler, ekran görüntüleri, fiyatlandırma?, iletişim, SSS?)
- [ ] Fiyatlandırma sayfada gösterilecek mi — sözleşmeler firmaya özel, kamuya açık fiyat riskli olabilir
- [ ] Dil: sadece Türkçe mi, TR/EN mi? (Not: `index.html` `lang="tr"` + `translate="no"`,
      Chrome'un otomatik çevirisini kapatmak için bilerek eklenmiş — i18n açılırsa gözden geçirilmeli)
- [ ] Ekran görüntüleri gerçek sistemden mi, mockup mı? Gerçekse müşteri verisi maskelenmeli
- [ ] ShipsGo haritası pazarlamanın görsel parçası olarak konumlanıyor — landing'de öne çıkar mı?
- [ ] Demo talebi / iletişim formu olacak mı, olacaksa nereye düşecek?

## İlgili

- ShipsGo entegrasyonu tamamlandı (Haziran 2026, Faz 3–17b); harita MapLibre + MapTiler ile canlı
- GET-APP entegrasyonu henüz başlamadı
- ToS ve Gizlilik Politikası hazırlanmadı — landing page yayına çıkarsa bunlara link gerekecek
