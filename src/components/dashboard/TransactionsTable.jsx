import React from "react";

export default function TransactionsTable() {
  const transactions = [
    {
      date: "03.05.2024",
      declarationNo: "24TR12345678",
      status: "Tamamlandı",
      statusColor: "green",
      type: "İthalat",
    },
    {
      date: "02.05.2024",
      declarationNo: "24TR98765432",
      status: "İşlemde",
      statusColor: "yellow",
      type: "İhracat",
    },
    {
      date: "01.05.2024",
      declarationNo: "24TR55554444",
      status: "Onay Bekliyor",
      statusColor: "blue",
      type: "Transit",
    },
    {
      date: "29.04.2024",
      declarationNo: "24TR11223344",
      status: "İptal Edildi",
      statusColor: "red",
      type: "İthalat",
    },
  ];

  const getStatusBadgeClass = (color) => {
    const colors = {
      green: "bg-green-100 text-green-800",
      yellow: "bg-yellow-100 text-yellow-800",
      blue: "bg-blue-100 text-blue-800",
      red: "bg-red-100 text-red-800",
    };
    return colors[color] || "";
  };

  return (
    <>
      <h2 className="text-text-main text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-2">
        Son İşlemler
      </h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Beyanname No
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  İşlem Tipi
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Detaylar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {transaction.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main font-medium">
                    {transaction.declarationNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                        transaction.statusColor
                      )}`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {transaction.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a className="text-primary hover:underline" href="#">
                      Görüntüle
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}