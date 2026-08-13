/**
 * Tanıtım sayfasındaki iletişim bilgileri.
 *
 * Sistemdeki iletişim bilgileri (`/api/contact`) kimlik doğrulaması ister, bu yüzden public
 * sayfada kullanılamıyor — buradaki değerler elle tutuluyor.
 *
 * TODO: Aşağıdaki değerler yer tutucudur, yayına çıkmadan önce gerçek bilgilerle değiştirilmeli.
 * E-posta adresi gumruk.io alan adı canlıya alındıktan sonra kesinleşecek.
 */
export const CONTACT = {
  email: "iletisim@gumruk.io",
  phone: "+90 541 935 55 89",
  phoneHref: "tel:+905419355589",
};

export const DEMO_MAILTO = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
  "Gümrük.io demo talebi"
)}&body=${encodeURIComponent(
  "Merhaba,\n\nGümrük.io'yu firmamız için değerlendirmek istiyoruz.\n\nFirma adı:\nYetkili:\nTelefon:\nKullanıcı sayısı:\nMüşteri firma sayısı:\n\nUygun bir zamanda demo planlayabilir miyiz?"
)}`;
