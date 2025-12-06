import React, { useState, useEffect } from "react";
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

  // ✅ YENİ: Gönderici listesi state'leri
  const [availableSenders, setAvailableSenders] = useState([]);
  const [filteredSenders, setFilteredSenders] = useState([]);
  const [senderSearchTerm, setSenderSearchTerm] = useState(transaction.senderName || "");
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);
  const [loadingSenders, setLoadingSenders] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ YENİ: Gönderici listesini yükle
  useEffect(() => {
    if (!isReadOnly) {
      loadSenders();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ YENİ: Gönderici arama filtresi
  useEffect(() => {
    if (senderSearchTerm.trim() === "") {
      setFilteredSenders(availableSenders.slice(0, 50));
    } else {
      const searchLower = senderSearchTerm.toLowerCase();
      const filtered = availableSenders.filter((sender) =>
        sender.toLowerCase().includes(searchLower)
      );
      setFilteredSenders(filtered.slice(0, 50));
    }
  }, [senderSearchTerm, availableSenders]);

  // ✅ YENİ: Gönderici dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("edit-sender-dropdown-container");
      if (dropdown && !dropdown.contains(event.target)) {
        setShowSenderDropdown(false);
      }
    };

    if (showSenderDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSenderDropdown]);

  // ✅ YENİ: Mevcut işlemlerden unique gönderici isimlerini yükle
  const loadSenders = async () => {
    try {
      setLoadingSenders(true);
      console.log("📡 Gönderici listesi yükleniyor...");

      const result = await transactionService.getAllTransactions();

      if (result.success) {
        const uniqueSenders = [...new Set(
          result.data
            .map((t) => t.senderName)
            .filter((name) => name && name.trim() !== "")
        )].sort((a, b) => a.localeCompare(b, 'tr'));

        setAvailableSenders(uniqueSenders);
        setFilteredSenders(uniqueSenders.slice(0, 50));
        console.log(`✅ ${uniqueSenders.length} unique gönderici yüklendi`);
      } else {
        console.error("❌ Gönderici yükleme hatası:", result.error);
        setAvailableSenders([]);
        setFilteredSenders([]);
      }
    } catch (err) {
      console.error("💥 Gönderici listesi yükleme hatası:", err);
      setAvailableSenders([]);
      setFilteredSenders([]);
    } finally {
      setLoadingSenders(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ✅ YENİ: Gönderici seçildiğinde
  const handleSenderSelect = (senderName) => {
    setFormData((prev) => ({
      ...prev,
      senderName: senderName,
    }));
    setSenderSearchTerm(senderName);
    setShowSenderDropdown(false);
  };

  // ✅ YENİ: Yeni gönderici ekle
  const handleAddNewSender = () => {
    if (senderSearchTerm.trim()) {
      setFormData((prev) => ({
        ...prev,
        senderName: senderSearchTerm.trim(),
      }));
      setShowSenderDropdown(false);
    }
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

              {/* ✅ GÜNCELLENDİ: Gönderici - Aranabilir Dropdown */}
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    Gönderici
                    {!isReadOnly && loadingSenders && (
                      <span className="text-xs text-blue-600 ml-2 animate-pulse">
                        Yükleniyor...
                      </span>
                    )}
                    {!isReadOnly && !loadingSenders && availableSenders.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({availableSenders.length} kayıtlı)
                      </span>
                    )}
                  </p>
                </div>

                {isReadOnly ? (
                  <input
                    type="text"
                    value={formData.senderName}
                    disabled
                    className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-gray-100 h-12 placeholder:text-neutral p-3 text-base font-normal"
                    placeholder="Gönderici adı"
                  />
                ) : (
                  <div className="relative" id="edit-sender-dropdown-container">
                    <div className="relative">
                      <input
                        type="text"
                        value={senderSearchTerm}
                        onChange={(e) => {
                          setSenderSearchTerm(e.target.value);
                          setFormData((prev) => ({
                            ...prev,
                            senderName: e.target.value,
                          }));
                          setShowSenderDropdown(true);
                        }}
                        onFocus={() => setShowSenderDropdown(true)}
                        placeholder="Gönderici adı yazın veya seçin..."
                        className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal"
                      />

                      {/* Clear Button */}
                      {senderSearchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setSenderSearchTerm("");
                            setFormData((prev) => ({
                              ...prev,
                              senderName: "",
                            }));
                            setShowSenderDropdown(true);
                          }}
                          className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">
                            close
                          </span>
                        </button>
                      )}

                      {/* Dropdown Icon */}
                      <button
                        type="button"
                        onClick={() => setShowSenderDropdown(!showSenderDropdown)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showSenderDropdown ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                    </div>

                    {/* Sender Dropdown List */}
                    {showSenderDropdown && !loadingSenders && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {/* Yeni gönderici ekleme seçeneği */}
                        {senderSearchTerm.trim() && !availableSenders.includes(senderSearchTerm.trim()) && (
                          <button
                            type="button"
                            onClick={handleAddNewSender}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-gray-200 bg-green-50/50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-green-600 text-lg">
                                add_circle
                              </span>
                              <div>
                                <p className="font-medium text-sm text-green-700">
                                  "{senderSearchTerm.trim()}" olarak ekle
                                </p>
                                <p className="text-xs text-green-600">
                                  Yeni gönderici olarak kullan
                                </p>
                              </div>
                            </div>
                          </button>
                        )}

                        {filteredSenders.length === 0 && !senderSearchTerm.trim() ? (
                          <div className="p-4 text-center text-gray-500">
                            <span className="material-symbols-outlined text-4xl mb-2">
                              local_shipping
                            </span>
                            <p className="text-sm">
                              Henüz kayıtlı gönderici yok.
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Yeni gönderici adı yazarak ekleyebilirsiniz.
                            </p>
                          </div>
                        ) : filteredSenders.length === 0 && senderSearchTerm.trim() ? (
                          <div className="p-4 text-center text-gray-500">
                            <span className="material-symbols-outlined text-4xl mb-2">
                              search_off
                            </span>
                            <p className="text-sm">
                              "{senderSearchTerm}" ile eşleşen gönderici bulunamadı.
                            </p>
                          </div>
                        ) : (
                          <>
                            {filteredSenders.map((sender, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleSenderSelect(sender)}
                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                  formData.senderName === sender
                                    ? "bg-blue-50 text-primary font-medium"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-400 text-lg">
                                      local_shipping
                                    </span>
                                    <p className="font-medium text-sm truncate">
                                      {sender}
                                    </p>
                                  </div>
                                  {formData.senderName === sender && (
                                    <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                      check_circle
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}

                            {filteredSenders.length === 50 &&
                              availableSenders.length > 50 && (
                                <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-center">
                                  <p className="text-xs text-yellow-800">
                                    İlk 50 sonuç gösteriliyor. Daha spesifik arama yapın.
                                  </p>
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

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