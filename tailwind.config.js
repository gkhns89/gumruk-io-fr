/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        slideUpBounce: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px) scale(0.95)',
          },
          '60%': {
            transform: 'translateY(-5px) scale(1.01)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-200% 0',
          },
          '100%': {
            backgroundPosition: '200% 0',
            opacity: '0',
          },
        },
        numberPulse: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.08)' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-up-bounce': 'slideUpBounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
        'shimmer': 'shimmer 1.5s ease-in-out forwards',
        'number-pulse': 'numberPulse 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
}
