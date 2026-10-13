/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // SJEC institutional palette
        institute: {
          blue: '#0f3a68',
          accent: '#1565c0',
          light: '#1e88e5',
          gold: '#c59b27',
        },
        // Sky-blue background palette (the visual foundation)
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          150: '#d0eafe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Surface tokens — light and dark
        surface: {
          // Light mode
          bg: '#e8f4fd',           // Pale sky-blue page background
          card: '#EAF3FC',          // Reference pale blue card surface
          cardSolid: '#ffffff',     // Pure white cards
          cardAlt: '#ffffff',       // Alt cards
          border: '#d1e6f5',        // Soft pale blue-grey border
          text: '#24272D',          // Primary text
          textSecondary: '#687583', // Secondary text
          accent: '#397FC0',        // Accent blue

          // Dark mode equivalents — Solid Charcoal / Black
          darkBg: '#0A0A0A',        // Main page near-black
          darkCard: '#151515',      // Primary card charcoal
          darkCardAlt: '#1D1D1D',   // Secondary card
          darkBorder: '#303030',    // Dark border
          darkText: '#FFFFFF',      // Primary text
          darkTextSecondary: '#C4C4C4', // Secondary text
          darkMuted: '#A0A0A0',     // Muted text
          darkAccent: '#64B5F6',    // Accent blue

          // Compatibility mappings
          light: '#e8f4fd',
          dark: '#0A0A0A',
          cardLight: '#EAF3FC',
          cardDark: '#151515',
          borderLight: '#d1e6f5',
          borderDark: '#303030',
        },
        // AQI category colours — CPCB standard
        aqi: {
          good: '#22c55e',
          satisfactory: '#84cc16',
          moderate: '#f59e0b',
          poor: '#f97316',
          veryPoor: '#ef4444',
          severe: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'Courier New', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 4px 0 rgba(15, 58, 104, 0.07), 0 4px 16px 0 rgba(15, 58, 104, 0.05)',
        'card-hover': '0 4px 12px 0 rgba(15, 58, 104, 0.10), 0 8px 24px 0 rgba(15, 58, 104, 0.07)',
        'card-dark': '0 1px 4px 0 rgba(0, 0, 0, 0.3), 0 4px 16px 0 rgba(0, 0, 0, 0.2)',
        gauge: '0 2px 8px 0 rgba(14, 165, 233, 0.15)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  safelist: [
    'bg-white/90',
    'bg-white/95',
    'bg-sky-50/90',
    'border-blue-100/80',
    'border-sky-100/60',
  ],
  plugins: [],
}
