/**
 * Antrepo Kaynağı Yardımcıları
 * İşlem Takip kaydı Antrepo Takip'ten aktarılarak oluştuysa backend
 * warehouseDeclarationId / warehouseDeclarationNo / warehouseFileNo /
 * warehouseTransferType alanlarını doldurur. Elle açılan kayıtlarda hepsi boştur.
 */

import { t } from "../locales";

/** Kayıt bir antrepo aktarımından mı geldi? */
export const isFromWarehouse = (transaction) =>
  Boolean(transaction?.warehouseDeclarationId || transaction?.warehouseDeclarationNo);

/** FULL / PARTIAL kodunu ekranda okunur hâle getirir. */
export const transferTypeLabel = (type) => {
  if (type === "FULL") return t("warehouse.origin.fullTransfer");
  if (type === "PARTIAL") return t("warehouse.origin.partialTransfer");
  return null;
};

/**
 * Liste satırındaki antrepo rozetinin tooltip metni.
 * Tek satırda kaldığı için alanlar orta noktayla ayrılıyor.
 */
export const warehouseOriginLabel = (transaction) => {
  if (!isFromWarehouse(transaction)) return "";

  const parts = [t("warehouse.origin.transferred")];
  if (transaction.warehouseDeclarationNo) {
    parts.push(`${t("transactions.detail.warehouseDeclarationNo")}: ${transaction.warehouseDeclarationNo}`);
  }
  if (transaction.warehouseFileNo) {
    parts.push(`${t("transactions.detail.warehouseFileNo")}: ${transaction.warehouseFileNo}`);
  }

  const typeLabel = transferTypeLabel(transaction.warehouseTransferType);
  if (typeLabel) parts.push(typeLabel);

  return parts.join(" · ");
};
