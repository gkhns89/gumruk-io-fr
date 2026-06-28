# İkonları Çeviriye Karşı Tamamen Bağışık Yapma Planı (Katman 2)

> Durum: **Planlandı / ileride yapılacak**
> Bağlam: Bu uygulama, kullanıcı tarayıcısında Google Translate / DeepL gibi araçlarla
> Türkçeye veya başka bir dile çevrildiğinde ikonların bozulması sorununu yaşıyordu.

## Sorun

Material Symbols ikonları **ligature** (font birleştirme) ile çalışır. Kodda ikon aslında
düz bir metindir:

```jsx
<span className="material-symbols-outlined">home</span>
```

Buradaki `home` gerçek bir metin düğümüdür; tarayıcı onu font sayesinde 🏠 ikonuna çevirir.
Bir çevirmen (Google Translate, DeepL, vb.) bu metni gördüğünde `home → ev` yapar →
ligature bozulur → ikon yerine düz yazı ("ev") görünür. Proje genelinde **~840 kullanım /
72 dosya** olduğu için, çeviri açıldığında neredeyse tüm arayüz ikonları bozulur.

## Şu ana kadar yapılan (Katman 1 — TAMAMLANDI)

`index.html` içinde tarayıcı/eklenti çevirisi standart sinyallerle kapatıldı:

```html
<html lang="tr" translate="no">
  <head>
    <meta charset="UTF-8" />
    <meta name="google" content="notranslate" />
```

- `lang="tr"` → tarayıcı otomatik "çevir" teklifini hiç sunmaz.
- `translate="no"` (W3C/WHATWG standardı) + `<meta name="google" content="notranslate">`
  → standartlara uyan tüm çevirmenleri kapsar (Google/Chrome/Edge/Firefox yerleşik çeviri,
  DeepL eklentisi, standartlara uyan diğer eklentiler).

### Katman 1'in sınırı

Bir tarayıcı eklentisi kullanıcının makinesinde çalışır ve DOM üzerinde tam yetkilidir;
gönderilen sinyalleri **yok sayabilir**. `translate="no"`'a uymayan "kuralsız" bir eklenti
ligature metnini yine çevirebilir. Markup ile bu engellenemez.

## Katman 2 — Kurşun geçirmez çözüm (bu planın konusu)

Mantık basit: **çevrilecek metin yoksa, hiçbir çevirmen çeviremez.** Ligature kelimesi
(`home`) yerine ikonun **unicode codepoint**'i (private-use alanı, ör. ``) kullanılır.
Çevirmenler unicode PUA karakterlerini kelime olarak görmez ve dokunmaz. Bu, sinyalleri
yok sayan eklentilere karşı bile ikonları %100 bağışık yapar.

### Adımlar

1. **Ortak `<Icon>` bileşeni oluştur**
   `src/components/common/Icon.jsx` — tüm ikon kullanımının tek geçeceği nokta.

   ```jsx
   // İsimden codepoint'e eşleme (yalnızca kullanılan ikonlar)
   import { ICON_CODEPOINTS } from "./iconCodepoints";

   export default function Icon({ name, className = "", ...props }) {
     return (
       <span
         className={`material-symbols-outlined ${className}`}
         translate="no"
         aria-hidden="true"
         {...props}
       >
         {ICON_CODEPOINTS[name] /* unicode char, ör. "" */}
       </span>
     );
   }
   ```

2. **Codepoint eşleme tablosunu üret**
   - `src/components/common/iconCodepoints.js` — `{ home: "", settings: "", ... }`.
   - Material Symbols codepoint listesi font ile birlikte gelir
     (`MaterialSymbolsOutlined[...].codepoints`) veya Google Fonts deposundan alınabilir.
   - Yalnızca projede gerçekten kullanılan ikon adlarını dahil et (bundle küçük kalsın).

3. **Mevcut kullanımları toplu dönüştür**
   - Projede geçen tüm benzersiz ikon adlarını çıkar:
     `<span className="material-symbols-outlined ...">ADI</span>` kalıbını tara.
   - Bir codemod/script ile bu span'leri `<Icon name="ADI" className="..." />` haline getir.
   - ~840 kullanım / 72 dosya — elle değil, script ile yapılmalı.

4. **Doğrula**
   - Görsel kontrol: rastgele birkaç sayfada ikonlar doğru görünüyor mu.
   - Çeviri testi: Google Translate / DeepL ile sayfayı çevirip ikonların bozulmadığını gör.
   - `aria-hidden` / erişilebilirlik gözden geçirmesi (dekoratif ikonlar gizli kalsın,
     anlamlı ikonlara `aria-label` eklensin).

### Etkilenen dosyalar (taranacak — 72 dosya)

`material-symbols-outlined` geçen tüm bileşenler. Tam liste için:

```bash
grep -rl "material-symbols-outlined" src/
```

## Kendi i18n çalışmasıyla ilişkisi

Bu refactor, geliştirilmekte olan **uygulama içi dil değiştirici** ile birlikte ele alınmalı:
tarayıcı çevirisi tamamen kapalı kaldığından, dil seçimi tümüyle uygulamanın kendi i18n
katmanından gelecek. Codepoint'e geçiş, dil ne olursa olsun ikonların sabit kalmasını
garantiler.

## Karar / öncelik

- Katman 1 pratikte sorunu büyük ölçüde çözdüğü için bu refactor **acil değil**.
- i18n altyapısı kurulurken veya ortak bir tasarım-sistemi bileşen seti oluşturulurken
  birlikte yapılması en verimlisi.
