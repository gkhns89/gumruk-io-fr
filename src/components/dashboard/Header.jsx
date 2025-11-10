import React from "react";

export default function Header() {
  return (
    <header className="flex items-center justify-between whitespace-nowrap bg-white px-6 py-3 border-b border-gray-200 shadow-sm">
      {/* Logo and Title */}
      <div className="flex items-center gap-4 text-text-main">
        <svg
          className="text-primary"
          fill="currentColor"
          height="32"
          viewBox="0 0 48 48"
          width="32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z"
            fill="currentColor"
          ></path>
        </svg>
        <h2 className="text-text-main text-lg font-bold leading-tight tracking-[-0.015em]">
          Gümrük Şirketi
        </h2>
      </div>

      {/* Search Bar */}
      <div className="flex flex-1 justify-center px-8">
        <label className="w-full max-w-lg">
          <div className="flex w-full flex-1 items-stretch rounded-lg h-10">
            <div className="text-text-secondary flex border border-gray-300 bg-white items-center justify-center pl-3 rounded-l-lg border-r-0">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-white focus:border-primary h-full placeholder:text-text-secondary px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
              placeholder="İşlem Numarası, Beyanname No Ara..."
            />
          </div>
        </label>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
          <span className="truncate">Oturumu Kapat</span>
        </button>
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA8agWxzSChR2G71_Ol--hzfCs4FkHCVjb9LcYdUTdP4SukillHE38TAKm73pFtF6sW_G8OiFNM6K4hNGEqi0YK_EWMk4xOHkbxjpKyV3RyUc5TwUhtST0s3VReE9YF0DQ3SOMZAEvKy6tQOcqnX2L1Unl2bi0m4XZkmMpU1CMNM0h3joPXUhr4ExomSAbbzplI1OLpNIFXxorNTVhNXVHosD0OkDbSGZ3OFCAcMUWcEYMNZ-rUVxBmvJQTT94mWHJYhB7wrUnAr3E")',
          }}
        ></div>
      </div>
    </header>
  );
}