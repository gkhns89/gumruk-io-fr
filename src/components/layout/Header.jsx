import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import MobileMenu from "./MobileMenu";

export default function Header() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
        <div className="hidden md:flex flex-1 justify-center px-4 lg:px-8 max-w-2xl">
          <label className="w-full">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-10">
              <div className="text-text-secondary flex border border-gray-300 bg-white items-center justify-center pl-3 rounded-l-lg border-r-0">
                <span className="material-symbols-outlined text-xl">search</span>
              </div>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-white focus:border-primary h-full placeholder:text-text-secondary px-4 rounded-l-none border-l-0 pl-2 text-sm lg:text-base font-normal leading-normal"
                placeholder="İşlem Numarası, Beyanname No Ara..."
              />
            </div>
          </label>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
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
      {isSearchOpen && (
        <div className="md:hidden px-4 py-3 bg-white border-b border-gray-200 animate-fade-in flex-shrink-0">
          <div className="flex w-full items-stretch rounded-lg h-10">
            <div className="text-text-secondary flex border border-gray-300 bg-gray-50 items-center justify-center pl-3 rounded-l-lg border-r-0">
              <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input
              autoFocus
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-gray-50 focus:border-primary focus:bg-white h-full placeholder:text-text-secondary px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
              placeholder="Ara..."
            />
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

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