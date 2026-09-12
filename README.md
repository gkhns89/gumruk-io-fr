# Gümrük.io — Frontend

Gümrük müşavirlikleri için takip paneli ve tanıtım sitesi. Beyanname takibi, antrepo,
kurye evrak seferleri, G-Radar canlı konteyner/konşimento takibi, vekaletler, abonelik ve
raporlama bu arayüzden yönetilir.

Bu repo **yalnızca React SPA'yı** içerir. API ayrı bir repoda: `gumruk-io-back`
(Spring Boot). Buradaki her özellik o API'ye yapılan bir HTTP çağrısıdır.

| Ortam | Arayüz | API |
| --- | --- | --- |
| Canlı | <https://gumruk.io> | <https://api.gumruk.io> |
| Staging | <https://staging.gumruk.io> (Vercel Authentication arkasında) | <https://api-staging.gumruk.io> |

Bu dosya projeyi **ayağa kaldırmayı** anlatır. Kod üzerinde çalışırken uyulacak mimari
kurallar ve bilinen tuzaklar için [`CLAUDE.md`](CLAUDE.md)'ye bakın.

## Gereksinimler

- **Node.js 24** — sürüm [`.nvmrc`](.nvmrc)'de tutuluyor (ekipte 24.9.0 kullanılıyor).
  Vite 7 en az Node 20.19 veya 22.12 istiyor; daha eskisiyle `npm run dev` açılmaz.
- npm (`package-lock.json` ile birlikte gelir).
- Yerelde çalışan bir backend: `gumruk-io-back`, `local` profiliyle `http://localhost:8080`.
  Kurulumu o reponun README'sinde.

## Kurulum ve çalıştırma

```bash
nvm use          # .nvmrc'deki Node sürümüne geç
npm install
npm run dev      # http://localhost:5173
```

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Vite geliştirme sunucusu. `--host` ile `0.0.0.0`'a bağlanır; aynı ağdaki başka bir cihazdan `http://<bilgisayarın-ip>:5173` ile açılabilir. |
| `npm run build` | Üretim build'i `dist/` klasörüne. `console.log` / `info` / `debug` çağrıları bu adımda koddan silinir. |
| `npm run preview` | `dist/`'i yerelde sunar — build'i yayına çıkmadan denemek için. |
| `npm run lint` | ESLint. Hatasız ve uyarısız geçmesi bekleniyor. |

Projede test çatısı yok; değişiklikler uygulamayı çalıştırarak doğrulanıyor.

### Yerelde giriş

Backend `local` profili boş bir veritabanında örnek broker/müşteri firmalarını ve
kullanıcılarını kendisi oluşturur; hesap listesi backend açılırken loglara yazılır.
Süper admin hesabı backend'in `APP_EMAIL` / `APP_PASSWORD` değişkenlerinden gelir.

## Backend'e bağlanma

Geliştirmede API adresi `.env`'den **okunmaz**; sayfayı hangi adresle açtığınıza göre
[`src/api/axios.js`](src/api/axios.js) belirler:

| Sayfayı açtığınız adres | Kullanılan API |
| --- | --- |
| `localhost` veya `127.0.0.1` | `http://localhost:8080/api` |
| Başka bir host (ör. LAN IP'si) | `http://<o-host>:9090/api` |

İkinci satır, uygulamayı başka bir cihazdan test ederken işe yarar: o cihazdan backend'e
`9090` portu üzerinden erişilebilmelidir (ör. modemde bu porta yönlendirme). "Neden 9090'a
gidiyor?" sorusunun cevabı budur.

Üretim build'inde (Vercel) adres `VITE_API_BASE_URL`'den gelir.

## Ortam değişkenleri

[`.env.example`](.env.example)'ı `.env` olarak kopyalayın. Hepsi `VITE_` ile başlar ve build
sırasında koda gömülür: değiştirince dev sunucusunu yeniden başlatın, Vercel'de yeniden
deploy edin. **Hiçbiri zorunlu değil** — boş bir `.env` ile yerelde her şey çalışır.

| Değişken | Açıklama |
| --- | --- |
| `VITE_API_BASE_URL` | Yalnızca üretim build'inde kullanılır. Vercel'de Production → `api.gumruk.io`, Preview → `api-staging.gumruk.io`. Tanımsız kalırsa build yalnızca `gumruk.io` / `www.gumruk.io` üzerinde canlı API'ye, başka her adreste staging API'ye bağlanır. |
| `VITE_MAPTILER_API_KEY` | G-Radar haritası için MapTiler anahtarı. Boşsa ücretsiz OpenFreeMap haritası kullanılır. |
| `VITE_GA_MEASUREMENT_ID` | GA4 ölçüm kimliği. **Yalnızca Vercel Production'da** tanımlı; yerelde ve staging'de boş kalmalı ki ölçüm kirlenmesin. Yalnızca tanıtım ve yasal sayfalarda, çerez onayı verildikten sonra yüklenir. |

## Yayın (Vercel)

Deploy otomatiktir, ayrı bir adım yoktur:

- **`staging`** dalına push → Preview build, `staging.gumruk.io`
- **`main`** dalına push → canlı, `gumruk.io`

İş akışı `feature/*` → `staging` → `main`. Backend aynı akışı `staging` → `master` ile
izler; API sözleşmesini değiştiren işler iki repoda birlikte ilerler.

[`vercel.json`](vercel.json): SPA yönlendirmesi (her yol → `index.html`), `/assets/*` için
kalıcı önbellek başlığı ve staging adresinde `X-Robots-Tag: noindex`.

## Klasör haritası

```text
src/
├── api/          alan başına bir *Service.js; hepsi axios.js üzerinden, hata fırlatmaz
├── components/   paylaşılan (common/, layout/) ve alana özel bileşenler
├── pages/        sayfalar — landing/ tanıtım sitesi, legal/ yasal metinler,
│                 management/ yönetim ekranları, payment/ ödeme
├── context/      oturum, tema ve ödeme kısıtı sağlayıcıları
├── hooks/        paylaşılan hook'lar
├── utils/        sabitler (constants.js), hata ve bildirim yardımcıları, token yönetimi
├── locales/      tr / en sözlükleri
├── assets/brand/ uygulamanın kullandığı marka görselleri
├── App.jsx       rota tanımları (hepsi lazy-load)
├── main.jsx      provider zinciri
└── index.css     Tailwind v4 tema değişkenleri
```

## Marka varlıkları

Kaynak marka kiti `src/assets/gumruk-io-sosyal-kit/` klasöründe durur ve **repoya girmez**
(`.gitignore`). Uygulamanın gerçekten kullandığı görseller `src/assets/brand/` altına
kopyalanır ve takip edilir. Yeni bir klonda kit klasörünün olmaması normaldir; yeni bir
görsel gerektiğinde kitten `brand/`'e kopyalayın.

## Dil

Arayüz metinleri ve kod yorumları Türkçe, commit mesajları İngilizce ve emir kipinde
("Move the G-Radar column next to the consignment number").
