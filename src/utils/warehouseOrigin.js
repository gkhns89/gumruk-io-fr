/**
 * Antrepo Kaynağı Yardımcıları
 * İşlem Takip kaydı Antrepo Takip'ten aktarılarak oluştuysa backend
 * warehouseDeclarationId / warehouseDeclarationNo / warehouseFileNo /
 * warehouseTransferType alanlarını doldurur. Elle açılan kayıtlarda hepsi boştur.
 */

/** Kayıt bir antrepo aktarımından mı geldi? */
export const isFromWarehouse = (transaction) =>
  Boolean(transaction?.warehouseDeclarationId || transaction?.warehouseDeclarationNo);

/** FULL / PARTIAL kodunu ekranda okunur hâle getirir. */
export const transferTypeLabel = (type) => {
  if (type === "FULL") return "Tam aktarım";
  if (type === "PARTIAL") return "Düşümlü aktarım";
  return null;
};

/**
 * Liste satırındaki antrepo rozetinin tooltip metni.
 * Tek satırda kaldığı için alanlar orta noktayla ayrılıyor.
 */
export const warehouseOriginLabel = (transaction) => {
  if (!isFromWarehouse(transaction)) return "";

  const parts = ["Antrepodan aktarıldı"];
  if (transaction.warehouseDeclarationNo) {
    parts.push(`Ant. Beyanname No: ${transaction.warehouseDeclarationNo}`);
  }
  if (transaction.warehouseFileNo) {
    parts.push(`Antrepo Dosya No: ${transaction.warehouseFileNo}`);
  }

  const typeLabel = transferTypeLabel(transaction.warehouseTransferType);
  if (typeLabel) parts.push(typeLabel);

  return parts.join(" · ");
};
