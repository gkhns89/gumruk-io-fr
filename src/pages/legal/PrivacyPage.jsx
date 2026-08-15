import React from "react";
import LegalLayout, { Section, List, DefList } from "./LegalLayout";
import { LEGAL } from "./legalInfo";

/**
 * Gizlilik Politikası ve KVKK Aydınlatma Metni.
 *
 * TASLAKTIR — yayına çıkmadan önce hukukçu incelemesinden geçmeli ve `legalInfo.js`
 * içindeki yer tutucular doldurulmalı.
 *
 * Veri kategorileri ve alıcı grupları koddan çıkarıldı (localStorage anahtarları,
 * oturum kayıtları, dış servis çağrıları). Yeni bir üçüncü taraf servis eklenirse
 * 6. bölüm güncellenmeli.
 */
export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Gizlilik Politikası ve Aydınlatma Metni"
      path="/gizlilik"
      description="Gümrük.io'da işlenen kişisel veriler, işleme amaçları, aktarım, çerez kullanımı ve KVKK kapsamındaki haklarınız."
      intro={`Bu metin, ${LEGAL.brand} kullanılırken işlenen kişisel verilere ilişkin olarak 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında hazırlanmıştır.`}
    >
      <Section no={1} title="Veri sorumlusu">
        <p>
          Veri sorumlusu, <strong className="text-text-main">{LEGAL.legalName}</strong>
          {LEGAL.isCompany ? "'dir." : ` (${LEGAL.title}) adlı gerçek kişidir.`}
        </p>
        <List
          items={[
            `Adres: ${LEGAL.address}`,
            ...(LEGAL.isCompany
              ? [
                  `Vergi dairesi / numarası: ${LEGAL.taxOffice} — ${LEGAL.taxNumber}`,
                  `MERSİS: ${LEGAL.mersis}`,
                ]
              : []),
            `E-posta: ${LEGAL.email}`,
            `Telefon: ${LEGAL.phone}`,
          ]}
        />
        <p>
          Sistemi kullanan gümrük müşavirliği firması, kendi müşterilerine ve çalışanlarına
          ait verileri sisteme girdiği ölçüde o veriler bakımından kendisi veri sorumlusudur;{" "}
          {LEGAL.operator} bu verileri yalnızca hizmeti sunmak amacıyla, veri işleyen sıfatıyla
          işler.
        </p>
      </Section>

      <Section no={2} title="İşlenen kişisel veriler">
        <DefList
          rows={[
            { term: "Kimlik", desc: "Ad, soyad, çalışılan firma ve sistemdeki rol bilgisi." },
            { term: "İletişim", desc: "E-posta adresi, telefon numarası." },
            {
              term: "İşlem güvenliği",
              desc: "Şifrenin geri döndürülemez özeti, giriş kayıtları, oturum bilgileri, IP adresi, tarayıcı ve cihaz bilgisi.",
            },
            {
              term: "Müşteri işlem",
              desc: "Sisteme girilen gümrük dosyaları, antrepo ve kurye kayıtları, bu kayıtlara bağlı iletişim ve firma bilgileri.",
            },
            {
              term: "Finans",
              desc: "Abonelik planı, ödeme durumu, cari hesap ve bakiye hareketleri.",
            },
          ]}
        />
      </Section>

      <Section no={3} title="İşleme amaçları">
        <List
          items={[
            "Hizmetin sunulması, kullanıcı hesaplarının oluşturulması ve yetkilendirilmesi.",
            "Gümrük operasyonlarının kayıt altına alınması ve takibi.",
            "Bilgi güvenliğinin sağlanması, yetkisiz erişimin tespiti ve oturum yönetimi.",
            "Abonelik ve tahsilat süreçlerinin yürütülmesi.",
            "Destek taleplerinin karşılanması ve sistemle ilgili bildirimlerin iletilmesi.",
            "Hukuki yükümlülüklerin yerine getirilmesi ve olası uyuşmazlıklarda delil sağlanması.",
          ]}
        />
      </Section>

      <Section no={4} title="Hukuki sebepler">
        <p>Kişisel veriler KVKK m.5 kapsamında şu hukuki sebeplere dayanılarak işlenir:</p>
        <List
          items={[
            "Sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (m.5/2-c) — hesap açılması, hizmetin sunulması, tahsilat.",
            "Veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (m.5/2-ç) — vergi ve saklama yükümlülükleri.",
            "Bir hakkın tesisi, kullanılması veya korunması (m.5/2-e) — uyuşmazlık hâlinde delil.",
            "Meşru menfaat (m.5/2-f) — bilgi güvenliği, kötüye kullanımın önlenmesi, hizmet kalitesinin izlenmesi.",
          ]}
        />
      </Section>

      <Section no={5} title="Toplama yöntemi">
        <p>
          Veriler; sisteme giriş yapılması, formların doldurulması, hesap tanımlanması ve
          sistemin kullanımı sırasında otomatik yollarla elektronik ortamda toplanır. Tanıtım
          sayfasındaki iletişim bağlantıları üzerinden gönderdiğiniz e-postalar da bu kapsamdadır.
        </p>
      </Section>

      <Section no={6} title="Aktarım ve hizmet sağlayıcılar">
        <p>
          Kişisel veriler pazarlama amacıyla üçüncü kişilere satılmaz veya devredilmez. Hizmetin
          teknik olarak sunulabilmesi için aşağıdaki sağlayıcılardan yararlanılır:
        </p>
        <DefList
          rows={[
            {
              term: "Sunucu ve barındırma",
              desc: "Uygulama ve veritabanı, yurt dışında yerleşik bulut altyapı sağlayıcılarında barındırılır.",
            },
            {
              term: "Konteyner takip servisi",
              desc: "Yük takibi için yurt dışında yerleşik bir takip servisinden yararlanılır. Bu servise yalnızca konteyner ve sefer numarası gibi taşımaya ilişkin bilgiler iletilir; kişisel veri aktarılmaz.",
            },
            {
              term: "Harita servisi",
              desc: "Konumun harita üzerinde gösterilmesi için harita döşemesi sağlayan servis kullanılır; tarayıcınızın IP adresi bu servise ulaşır.",
            },
            {
              term: "Yazı tipi servisi",
              desc: "Arayüz yazı tipleri Google Fonts üzerinden yüklenir; tarayıcınızın IP adresi bu servise ulaşır.",
            },
            {
              term: "Görev yönetimi",
              desc: "Sistem üzerinden ilettiğiniz geri bildirim ve destek talepleri, takip edilebilmesi için bir görev yönetimi aracına aktarılır.",
            },
            {
              term: "Ölçümleme (yalnızca tanıtım sayfası)",
              desc: "Onay vermeniz hâlinde, tanıtım sayfasındaki ziyaret istatistikleri Google Analytics'e iletilir. Giriş yapılan sistemde bu araç kullanılmaz. Ayrıntı için 7. bölüm.",
            },
          ]}
        />
        <p>
          Yurt dışına aktarım, KVKK m.9 kapsamında ve yalnızca hizmetin sunulması için gerekli
          olan ölçüde yapılır. Ayrıca yasal olarak yetkili kamu kurum ve kuruluşlarına, talep
          edilmesi hâlinde mevzuatın öngördüğü çerçevede aktarım yapılabilir.
        </p>
      </Section>

      <Section no={7} title="Çerezler, ölçümleme ve tarayıcı depolaması">
        <p>
          Ölçümleme bakımından tanıtım sayfası ile giriş yapılan sistem{" "}
          <strong className="text-text-main">birbirinden tamamen ayrıdır</strong>:
        </p>
        <DefList
          rows={[
            {
              term: "Tanıtım sayfası",
              desc: "Ziyaretçi sayısını ve hangi bölümlerin ilgi gördüğünü ölçmek için Google Analytics kullanılabilir. Bu ölçüm isteğe bağlıdır: sayfayı ilk açtığınızda çıkan bantta onay vermediğiniz sürece ölçüm aracı tarayıcınıza hiç yüklenmez, Google'a hiçbir istek gönderilmez. Reddettiğinizde sayfa aynı şekilde çalışır.",
            },
            {
              term: "Giriş yapılan sistem",
              desc: "Panelde ve tüm uygulama sayfalarında analitik, reklam veya izleme aracı KULLANILMAZ. Kullanıcıların sistem içindeki davranışları ölçümlenmez; bu sayfalarda üçüncü taraf bir ölçüm scripti yüklenmez.",
            },
          ]}
        />
        <p>
          Onay verdiğiniz takdirde ölçüm, IP adresi kısaltılarak ve Google'ın reklam
          kişiselleştirme sinyalleri kapalı olarak yapılandırılır; veriler reklam hedeflemesi
          için kullanılmaz. Tercihinizi tarayıcı verilerini temizleyerek geri alabilirsiniz.
        </p>
        <p>Bunların dışında tarayıcınızda yalnızca hizmetin çalışması için gereken bilgiler saklanır:</p>
        <DefList
          rows={[
            { term: "Oturum bilgisi", desc: "Giriş yaptığınızda oturumun sürdürülmesi için." },
            {
              term: "Kullanıcı tercihleri",
              desc: "Tema (açık/koyu), dil, menü görünümü ve otomatik yenileme gibi arayüz tercihleri.",
            },
            {
              term: "Bilgilendirme durumu",
              desc: "Tarayıcı uyumluluk uyarısını ve çerez tercihinizi kapattığınızın hatırlanması.",
            },
          ]}
        />
        <p>
          Bu kayıtları tarayıcı ayarlarınızdan silebilirsiniz; silinmesi hâlinde oturumunuz
          sonlanır ve tercihleriniz varsayılana döner.
        </p>
      </Section>

      <Section no={8} title="Saklama süresi">
        <p>
          Kişisel veriler, işleme amacının gerektirdiği süre boyunca ve ilgili mevzuatta
          öngörülen zamanaşımı ve saklama süreleri sona erene kadar saklanır. Sürenin dolması
          hâlinde veriler silinir, yok edilir veya anonim hâle getirilir. Abonelik sona
          erdiğinde Abone'ye ait operasyonel kayıtlar, dışa aktarım talebi için makul bir süre
          korunur.
        </p>
      </Section>

      <Section no={9} title="Veri güvenliği">
        <List
          items={[
            "Şifreler geri döndürülemez biçimde özetlenerek saklanır; düz metin olarak tutulmaz.",
            "Sisteme erişim rol bazlı yetkilendirmeyle sınırlandırılır.",
            "Açık oturumlar kayıt altına alınır; şüpheli bir durumda sistem yöneticisi tarafından uzaktan sonlandırılabilir.",
            "Veri aktarımı şifreli bağlantı (HTTPS) üzerinden yapılır.",
          ]}
        />
      </Section>

      <Section no={10} title="İlgili kişinin hakları">
        <p>KVKK m.11 uyarınca şu haklara sahipsiniz:</p>
        <List
          ordered
          items={[
            "Kişisel verinizin işlenip işlenmediğini öğrenme ve işlenmişse buna ilişkin bilgi talep etme.",
            "İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme.",
            "Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme.",
            "Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme.",
            "Kanundaki şartlar çerçevesinde silinmesini veya yok edilmesini isteme.",
            "Düzeltme, silme ve yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.",
            "Münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonuç doğmasına itiraz etme.",
            "Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.",
          ]}
        />
      </Section>

      <Section no={11} title="Başvuru">
        <p>
          Haklarınıza ilişkin taleplerinizi{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-medium text-brand-blue hover:underline dark:text-brand-sky"
          >
            {LEGAL.email}
          </a>{" "}
          adresine veya {LEGAL.address} adresine yazılı olarak iletebilirsiniz. Başvurular,
          Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ uyarınca en geç otuz (30)
          gün içinde sonuçlandırılır. Başvurunuzda kimliğinizi tevsik edici bilgilerin ve
          talebinizin açıkça yer alması gerekir.
        </p>
      </Section>

      <Section no={12} title="Değişiklikler">
        <p>
          Bu metin, mevzuattaki veya hizmetteki değişikliklere göre güncellenebilir. Güncel
          sürüm her zaman bu sayfada yayımlanır; esaslı değişiklikler ayrıca duyurulur.
        </p>
      </Section>
    </LegalLayout>
  );
}
