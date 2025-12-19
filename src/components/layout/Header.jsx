import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import MobileMenu from "./MobileMenu";
import { transactionService } from "../../api/transactionService";
import TransactionDetailModal from "../common/TransactionDetailModal";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Arama state'leri
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ items: [], total: 0 });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const mobileToggleRef = useRef(null);

  // Arama fonksiyonu
  useEffect(() => {
    const searchTransactions = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults({ items: [], total: 0 });
        setShowSearchResults(false);
        return;
      }

      setSearchLoading(true);
      try {
        const result = await transactionService.getAllTransactions();

        if (result.success) {
          const query = searchQuery.toLowerCase().trim();
          const filtered = result.data.filter(transaction =>
            transaction.fileNo?.toLowerCase().includes(query) ||
            transaction.declarationNumber?.toLowerCase().includes(query)
          );

          // İlk 5 sonucu göster, toplam sonuç sayısını sakla
          setSearchResults({
            items: filtered.slice(0, 5),
            total: filtered.length
          });
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error("Arama hatası:", error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchTransactions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Arama dışına tıklandığında her şeyi sıfırla (modal açıkken çalışmasın)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Modal açıkken aramayı sıfırlama
      if (selectedTransaction) return;

      // Toggle butona tıklanmışsa işlem yapma (buton kendi işini yapacak)
      if (mobileToggleRef.current && mobileToggleRef.current.contains(event.target)) return;

      const isOutsideDesktop = searchRef.current && !searchRef.current.contains(event.target);
      const isOutsideMobile = mobileSearchRef.current && !mobileSearchRef.current.contains(event.target);

      if (isOutsideDesktop && isOutsideMobile) {
        // Arama durumunu tamamen sıfırla
        setSearchQuery("");
        setSearchResults({ items: [], total: 0 });
        setShowSearchResults(false);
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [selectedTransaction]);

  const handleTransactionClick = (e, transaction) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTransaction(transaction);
  };

  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(null);
    navigate(`/transactions?edit=${transaction.id}`);
  };

  return (
    <>
      <header className="flex items-center justify-between bg-white px-4 lg:px-6 py-3 border-b border-gray-200 shadow-sm gap-2 lg:gap-4 flex-shrink-0">
        {/* Left Section - Hamburger & Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu - Mobilde görünür */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex lg:hidden items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-text-main">menu</span>
          </button>

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 lg:gap-3">
            <svg
              className="text-primary flex-shrink-0"
              fill="currentColor"
              height="28"
              viewBox="0 0 48 48"
              width="28"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z"
                fill="currentColor"
              />
            </svg>
            <h2 className="text-text-main text-base lg:text-lg font-bold leading-tight tracking-[-0.015em] hidden sm:block truncate max-w-[150px] lg:max-w-none">
              {user?.company?.name || 'AACC Tracker'}
            </h2>
          </Link>
        </div>

        {/* Center - Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 justify-center px-4 lg:px-8 max-w-2xl" ref={searchRef}>
          <div className="w-full relative">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-10">
              <div className="text-text-secondary flex border border-gray-300 bg-white items-center justify-center pl-3 rounded-l-lg border-r-0">
                <span className="material-symbols-outlined text-xl">search</span>
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-white focus:border-primary h-full placeholder:text-text-secondary px-4 rounded-l-none border-l-0 pl-2 text-sm lg:text-base font-normal leading-normal"
                placeholder="Dosya No, Beyanname No Ara..."
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute z-40 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-text-secondary mt-2">Aranıyor...</p>
                  </div>
                ) : searchResults.items.length > 0 ? (
                  <>
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                      <p className="text-xs font-semibold text-text-secondary uppercase">
                        {searchResults.total > 5
                          ? `İlk 5 Sonuç (Toplam ${searchResults.total})`
                          : `${searchResults.total} Sonuç Bulundu`
                        }
                      </p>
                    </div>
                    {searchResults.items.map((transaction) => (
                      <button
                        key={transaction.id}
                        onClick={(e) => handleTransactionClick(e, transaction)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-text-main truncate">
                              Dosya No: {transaction.fileNo}
                            </p>
                            <p className="text-xs text-text-secondary truncate">
                              Beyanname: {transaction.declarationNumber || '-'}
                            </p>
                            <p className="text-xs text-text-secondary truncate">
                              Alıcı: {transaction.clientCompany?.name || transaction.recipientName || '-'}
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                            arrow_forward
                          </span>
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="p-6 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">
                      search_off
                    </span>
                    <p className="text-sm text-text-secondary">
                      "{searchQuery}" için sonuç bulunamadı
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Dosya No veya Beyanname No ile arayın
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Mobile Search Toggle */}
          <button
            ref={mobileToggleRef}
            onClick={(e) => {
              e.stopPropagation();
              setIsSearchOpen(!isSearchOpen);
            }}
            className="flex md:hidden items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-text-main">
              {isSearchOpen ? 'close' : 'search'}
            </span>
          </button>

          {/* Notifications */}
          <button className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100 transition-colors relative">
            <span className="material-symbols-outlined text-text-main">notifications</span>
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Logout Button - Desktop */}
          <button 
            onClick={logout}
            className="hidden lg:flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
          >
            <span className="truncate">Oturumu Kapat</span>
          </button>

          {/* User Avatar */}
          <Link 
            to="/profile"
            className="flex items-center justify-center h-10 w-10 bg-primary rounded-full text-white font-bold text-sm lg:text-lg flex-shrink-0 hover:ring-2 hover:ring-primary/50 transition-all"
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Link>
        </div>
      </header>

      {/* Mobile Search Bar - Expandable */}
      <div className={`md:hidden px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0 transition-all duration-200 ${isSearchOpen ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          <div className="relative" ref={mobileSearchRef}>
            <div className="flex w-full items-stretch rounded-lg h-10">
              <div className="text-text-secondary flex border border-gray-300 bg-gray-50 items-center justify-center pl-3 rounded-l-lg border-r-0">
                <span className="material-symbols-outlined text-xl">search</span>
              </div>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-gray-50 focus:border-primary focus:bg-white h-full placeholder:text-text-secondary px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
                placeholder="Dosya No, Beyanname No Ara..."
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            {/* Mobile Search Results */}
            {showSearchResults && (
              <div className="absolute z-40 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-text-secondary mt-2">Aranıyor...</p>
                  </div>
                ) : searchResults.items.length > 0 ? (
                  <>
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                      <p className="text-xs font-semibold text-text-secondary uppercase">
                        {searchResults.total > 5
                          ? `İlk 5 (Toplam ${searchResults.total})`
                          : `${searchResults.total} Sonuç`
                        }
                      </p>
                    </div>
                    {searchResults.items.map((transaction) => (
                      <button
                        key={transaction.id}
                        onClick={(e) => handleTransactionClick(e, transaction)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-text-main truncate">
                              {transaction.fileNo}
                            </p>
                            <p className="text-xs text-text-secondary truncate">
                              {transaction.declarationNumber || '-'}
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                            arrow_forward
                          </span>
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-text-secondary">Sonuç bulunamadı</p>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onEdit={handleEditTransaction}
        />
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}