import React from "react";
import LegalLayout, { Section, List, DefList } from "./LegalLayout";
import { LEGAL } from "./legalInfo";

/**
 * Kullanım Koşulları.
 *
 * TASLAKTIR — yayına çıkmadan önce hukukçu incelemesinden geçmeli ve `legalInfo.js`
 * içindeki yer tutucular doldurulmalı.
 *
 * Ödeme kısıtlama eşikleri uydurma değil, sistemdeki gerçek davranıştan alındı:
 * aacc-tracker `BrokerSubscription.getRestrictionLevel()`. Kod değişirse burası da
 * güncellenmeli — aksi halde sözleşme metni sistemle çelişir.
 */
export default function TermsPage() {
  return (
    <LegalLayout
      title="Kullanım Koşulları"
      intro={`Bu koşullar, ${LEGAL.operator} tarafından işletilen ${LEGAL.brand} gümrük takip sisteminin kullanımına ilişkin tarafların hak ve yükümlülüklerini düzenler. Sisteme kullanıcı hesabıyla giriş yapmanız, bu koşulları kabul ettiğiniz anlamına gelir.`}
    >
      <Section no={1} title="Taraflar">
        <p>
          İşbu koşullar bir tarafta{" "}
          <strong className="text-text-main">{LEGAL.legalName}</strong> ({LEGAL.address},{" "}
          {LEGAL.taxOffice} — {LEGAL.taxNumber}, MERSİS: {LEGAL.mersis}) ile diğer tarafta
          hizmetten yararlanan gümrük müşavirliği firması ("Abone") ve Abone adına sisteme
          erişim yetkisi verilen kişiler ("Kullanıcı") arasında geçerlidir.
        </p>
      </Section>

      <Section no={2} title="Hizmetin konusu">
        <p>
          {LEGAL.brand}, gümrük müşavirliklerinin operasyonlarını tek bir arayüzden takip
          etmesini sağlayan, internet tarayıcısı üzerinden çalışan bir yazılım hizmetidir
          (SaaS). Hizmet kapsamında sunulan başlıca modüller:
        </p>
        <List
          items={[
            "İthalat ve ihracat işlem takibi",
            "Antrepo giriş ve çıkış takibi",
            "Konteyner ve yük takibi",
            "Kurye ve evrak teslim takibi",
            "Vekalet ve müşteri firma yönetimi",
            "Raporlama, cari hesap ve bakiye takibi",
          ]}
        />
        <p>
          Hizmet, bir gümrük müşavirliği faaliyeti değildir. Sistem yalnızca Abone'nin kendi
          operasyonunu kayıt altına almasına ve izlemesine aracılık eder; gümrük mevzuatına
          uygunluk, beyanname doğruluğu ve resmi bildirimlere ilişkin sorumluluk tümüyle
          Abone'ye aittir.
        </p>
      </Section>

      <Section no={3} title="Hesap ve kullanıcı sorumluluğu">
        <List
          items={[
            "Kullanıcı hesapları Abone'nin talebi doğrultusunda tanımlanır. Her kullanıcı yalnızca kendisine tanımlanan hesabı kullanır; hesap paylaşımı yasaktır.",
            "Şifrelerin gizliliği Kullanıcı'nın sorumluluğundadır. Yetkisiz erişim şüphesi doğduğunda derhal bildirilmelidir.",
            "Abone, kendi kullanıcılarının sistem üzerindeki işlemlerinden sorumludur.",
            "Sisteme girilen verilerin doğruluğu, güncelliği ve hukuka uygunluğu Abone'ye aittir.",
          ]}
        />
        <p>
          Açık oturumlar Hesabım bölümünden görüntülenebilir ve gerektiğinde uzaktan
          sonlandırılabilir.
        </p>
      </Section>

      <Section no={4} title="Abonelik, ücretlendirme ve ödeme">
        <List
          items={[
            "Hizmet, seçilen plana göre aylık veya yıllık abonelik karşılığında sunulur. Plan; kullanıcı sayısı ve müşteri firma sayısı limitleriyle belirlenir.",
            "Tanıtım sayfasında yayımlanan fiyatlara KDV dahil değildir. Yıllık ödemede fiyat, abonelik dönemi boyunca sabit kalır.",
            "Aboneliğin üst pakete yükseltilmesi dönem içinde talep edilebilir. Kurumsal kapsamdaki talepler ayrıca sözleşmeye bağlanır.",
            "Abone ile ayrıca imzalanmış bir hizmet sözleşmesi bulunması hâlinde, çelişki durumunda o sözleşme hükümleri önce gelir.",
          ]}
        />
      </Section>

      <Section no={5} title="Ödeme gecikmesi ve erişim kısıtlaması">
        <p>
          Ödemenin gecikmesi hâlinde erişim tek seferde kapatılmaz; gecikme süresine göre
          kademeli olarak kısıtlanır. Kademeler abonelik dönemine göre değişir:
        </p>
        <DefList
          rows={[
            {
              term: "Uyarı",
              desc: "Aylık abonelikte 1–6 gün, yıllık abonelikte 1–29 gün gecikme. Sistem tam olarak kullanılmaya devam eder, yalnızca uyarı gösterilir.",
            },
            {
              term: "Yazma kısıtlı",
              desc: "Aylık abonelikte 7–14 gün, yıllık abonelikte 30–59 gün gecikme. Mevcut kayıtlar görüntülenebilir, yeni kayıt oluşturulamaz ve mevcut kayıtlar değiştirilemez.",
            },
            {
              term: "Tam salt okunur",
              desc: "Aylık abonelikte 15 gün, yıllık abonelikte 60 gün ve üzeri gecikme. Sistem yalnızca okunabilir. Girişe engel konmaz; verilere erişim kesilmez.",
            },
          ]}
        />
        <p>
          Ödeme tamamlandığında kısıtlama kaldırılır. Hiçbir kademede Abone'nin verilerine
          erişimi tamamen engellenmez.
        </p>
      </Section>

      <Section no={6} title="Kullanım kısıtları">
        <p>Kullanıcı, hizmeti kullanırken aşağıdakileri yapmamayı kabul eder:</p>
        <List
          items={[
            "Sistemi tersine mühendisliğe tabi tutmak, kaynak koduna erişmeye çalışmak veya kopyalamak.",
            "Otomatik araçlarla sistemi aşırı yüklemek, servis dışı bırakmaya yönelik girişimde bulunmak.",
            "Yetkisi olmayan verilere erişmeye çalışmak veya güvenlik önlemlerini aşmak.",
            "Sistemi hukuka aykırı bir amaçla ya da üçüncü kişilerin haklarını ihlal edecek şekilde kullanmak.",
            "Hizmeti, yazılı izin olmaksızın üçüncü kişilere yeniden satmak veya devretmek.",
          ]}
        />
      </Section>

      <Section no={7} title="Fikri mülkiyet">
        <p>
          Yazılımın kaynak kodu, arayüz tasarımı, marka ve logo dahil tüm fikri mülkiyet
          hakları {LEGAL.operator}'a aittir. Abonelik, yalnızca abonelik süresi boyunca
          hizmeti kullanma hakkı verir; yazılım üzerinde mülkiyet hakkı doğurmaz.
        </p>
        <p>
          <strong className="text-text-main">Abone'nin sisteme girdiği veriler Abone'ye aittir.</strong>{" "}
          {LEGAL.operator} bu verileri yalnızca hizmeti sunmak amacıyla işler; abonelik sona
          erdiğinde makul bir süre içinde dışa aktarım talebini karşılar.
        </p>
      </Section>

      <Section no={8} title="Hizmet sürekliliği ve bakım">
        <p>
          Hizmetin kesintisiz sunulması esastır; ancak planlı bakım, altyapı sağlayıcılarından
          kaynaklanan arızalar veya mücbir sebep hâllerinde kesinti yaşanabilir. Planlı bakımlar
          mümkün olduğunca mesai saatleri dışında yapılır ve önceden duyurulur.
        </p>
        <p>
          Konteyner ve yük takibi, dış bir servis sağlayıcısının verdiği bilgilere dayanır.
          Bu bilgilerin güncelliği ve doğruluğu ilgili sağlayıcıya bağlıdır;{" "}
          {LEGAL.operator} bu verilerin kesinliğini taahhüt etmez.
        </p>
      </Section>

      <Section no={9} title="Sorumluluğun sınırlandırılması">
        <p>
          {LEGAL.operator}, hizmetin kullanımından doğan dolaylı zararlardan, kâr kaybından ve
          veri kaybından; kendi ağır kusuru bulunmadıkça sorumlu tutulamaz. Her hâlükârda
          toplam sorumluluk, zararın doğduğu tarihten önceki on iki (12) ay içinde Abone
          tarafından ödenen abonelik bedeli toplamını aşamaz.
        </p>
        <p>
          Bu sınırlama, kasıt ve ağır ihmal hâlleri ile tüketici mevzuatından doğan emredici
          hükümler bakımından uygulanmaz.
        </p>
      </Section>

      <Section no={10} title="Süre ve fesih">
        <List
          items={[
            "Abonelik, seçilen dönem boyunca geçerlidir. Taraflarca ayrıca kararlaştırılmadıkça kendiliğinden yenilenmez.",
            "Abone, dönem sonunda yenilememe yönündeki iradesini yazılı olarak bildirebilir.",
            "Kullanım kısıtlarına ağır aykırılık hâlinde hizmet, bildirim yapılarak askıya alınabilir veya sonlandırılabilir.",
            "Fesih hâlinde Abone, verilerinin dışa aktarımını makul bir süre içinde talep edebilir.",
          ]}
        />
      </Section>

      <Section no={11} title="Değişiklikler">
        <p>
          Bu koşullar zaman içinde güncellenebilir. Esaslı değişiklikler, yürürlüğe girmeden
          önce sistem içi duyuru veya e-posta ile bildirilir. Güncel metin her zaman bu
          sayfada yayımlanır.
        </p>
      </Section>

      <Section no={12} title="Uygulanacak hukuk ve yetkili mahkeme">
        <p>
          İşbu koşullara Türkiye Cumhuriyeti hukuku uygulanır. Uyuşmazlıkların çözümünde{" "}
          {LEGAL.jurisdiction} yetkilidir.
        </p>
      </Section>

      <Section no={13} title="İletişim">
        <p>
          Sorularınız için:{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-medium text-brand-blue hover:underline dark:text-brand-sky"
          >
            {LEGAL.email}
          </a>{" "}
          · {LEGAL.phone}
        </p>
      </Section>
    </LegalLayout>
  );
}
