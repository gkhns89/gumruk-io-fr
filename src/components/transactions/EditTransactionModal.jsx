import React, { useState } from "react";
import { transactionService } from "../../api/transactionService";

// Hat renk seçenekleri
const GATE_OPTIONS = [
  { value: "Sarı", label: "🟡 Sarı Hat", color: "yellow" },
  { value: "Kırmızı", label: "🔴 Kırmızı Hat", color: "red" },
  { value: "Yeşil", label: "🟢 Yeşil Hat", color: "green" },
  { value: "Mavi", label: "🔵 Mavi Hat", color: "blue" },
];

export default function EditTransactionModal({ transaction, onClose, onSuccess, isReadOnly }) {
  const [formData, setFormData] = useState({
    fileNo: transaction.fileNo || "",
    recipientName: transaction.recipientName || "",
    customsWarehouse: transaction.customsWarehouse || "",
    gate: transaction.gate || "",
    weight: transaction.weight || "",
    tax: transaction.tax || "",
    senderName: transaction.senderName || "",
    warehouseArrivalDate: transaction.warehouseArrivalDate || "",
    registrationDate: transaction.registrationDate || "",
    declarationNumber: transaction.declarationNumber || "",
    lineClosureDate: transaction.lineClosureDate || "",
    importProcessingTime: transaction.importProcessingTime || "",
    withdrawalDate: transaction.withdrawalDate || "",
    description: transaction.description || "",
    delayReason: transaction.delayReason || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    setLoading(true);
    setError("");

    try {
      // Boş değerleri temizle
      const cleanedData = Object.fromEntries(
        Object.entries(formData).filter(([, v]) => v !== "")
      );

      // Sayısal değerleri dönüştür
      if (cleanedData.weight) {
        cleanedData.weight = parseFloat(cleanedData.weight);
      }
      if (cleanedData.tax) {
        cleanedData.tax = parseFloat(cleanedData.tax);
      }
      if (cleanedData.importProcessingTime) {
        cleanedData.importProcessingTime = parseInt(cleanedData.importProcessingTime);
      }

      const result = await transactionService.updateTransaction(transaction.id, cleanedData);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("İşlem güncelleme hatası:", err);
      setError("İşlem güncellenirken beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5">
            <div>
              <h2 className="text-2xl font-bold text-text-main">
                {isReadOnly ? 'İşlem Detayları' : 'İşlem Düzenle'}
              </h2>
              <p className="text-text-secondary text-sm mt-1">
                Dosya No: {transaction.fileNo}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-text-secondary">close</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Firma Bilgileri - Read Only */}
              <div className="flex flex-col w-full bg-gray-50 p-4 rounded-lg">
                <p className="text-text-secondary text-sm font-medium pb-2">Broker Firması</p>
                <p className="text-text-main font-semibold">
                  {transaction.brokerCompany?.name || '-'}
                </p>
              </div>

              <div className="flex flex-col w-full bg-gray-50 p-4 rounded-lg">
                <p className="text-text-secondary text-sm font-medium pb-2">Müşteri Firması</p>
                <p className="text-text-main font-semibold">
                  {transaction.clientCompany?.name || '-'}
                </p>
              </div>

              {/* Dosya No */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Dosya No *</p>
                <input
                  type="text"
                  name="fileNo"
                  value={formData.fileNo}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100"
                  placeholder="Dosya No girin"
                />
              </label>

              {/* Alıcı */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Alıcı</p>
                <input
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100"
                  placeholder="Alıcı adını girin"
                />
              </label>

              {/* Gümrük */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Gümrük</p>
                <input
                  type="text"
                  name="customsWarehouse"
                  value={formData.customsWarehouse}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100"
                  placeholder="Gümrük seçin"
                />
              </label>

              {/* Hat - Combobox */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Hat</p>
                <select
                  name="gate"
                  value={formData.gate}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 p-3 text-base font-normal disabled:bg-gray-100"
                >
                  <option value="">Hat Seçin</option>
                  {GATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Kilo */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Kilo (Kg)</p>
                <input
                  type="number"
                  step="0.01"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100"
                  placeholder="Kilo girin"
                />
              </label>

              {/* Vergi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Vergi (TL)</p>
                <input
                  type="number"
                  step="0.01"
                  name="tax"
                  value={formData.tax}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100"
                  placeholder="Vergi tutarını girin"
                />
              </label>

              {/* Gönderici */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Gönderici</p>
                <input
                  type="text"
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100"
                  placeholder="Gönderici adını girin"
                />
              </label>

              {/* Antrepo Varış Tarihi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Antrepo Varış Tarihi</p>
                <input
                  type="date"
                  name="warehouseArrivalDate"
                  value={formData.warehouseArrivalDate}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 p-3 text-base font-normal disabled:bg-gray-100"
                />
              </label>

              {/* Tescil Tarihi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Tescil Tarihi</p>
                <input
                  type="date"
                  name="registrationDate"
                  value={formData.registrationDate}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 p-3 text-base font-normal disabled:bg-gray-100"
                />
              </label>

              {/* Beyanname No */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Beyanname No</p>
                <input
                  type="text"
                  name="declarationNumber"
                  value={formData.declarationNumber}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100"
                  placeholder="Beyanname No girin"
                />
              </label>

              {/* Kapanma Tarihi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Kapanma Tarihi</p>
                <input
                  type="date"
                  name="lineClosureDate"
                  value={formData.lineClosureDate}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 p-3 text-base font-normal disabled:bg-gray-100"
                />
              </label>

              {/* İthalat İşlem Süresi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">İthalat İşlem Süresi (Gün)</p>
                <input
                  type="number"
                  name="importProcessingTime"
                  value={formData.importProcessingTime}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100"
                  placeholder="Süre (gün)"
                />
              </label>

              {/* Çekilme Tarihi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Çekilme Tarihi</p>
                <input
                  type="date"
                  name="withdrawalDate"
                  value={formData.withdrawalDate}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 p-3 text-base font-normal disabled:bg-gray-100"
                />
              </label>

              {/* Açıklama */}
              <label className="flex flex-col w-full md:col-span-2 lg:col-span-3">
                <p className="text-text-main text-sm font-medium pb-2">Açıklama</p>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  rows="3"
                  className="form-textarea w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100"
                  placeholder="Ek açıklamalarınızı buraya yazın..."
                />
              </label>

              {/* Gecikme Nedeni */}
              <label className="flex flex-col w-full md:col-span-2 lg:col-span-3">
                <p className="text-text-main text-sm font-medium pb-2">Gecikme Nedeni</p>
                <textarea
                  name="delayReason"
                  value={formData.delayReason}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  rows="3"
                  className="form-textarea w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100"
                  placeholder="Olası gecikme nedenlerini belirtin..."
                />
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-text-secondary hover:text-text-main font-medium transition-colors"
            >
              {isReadOnly ? 'Kapat' : 'İptal'}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">save</span>
                {loading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}