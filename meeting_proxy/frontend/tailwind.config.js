/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  // We control dark/light via a CSS class on <html>, not Tailwind's darkMode
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#ff6b35',
          dark:    '#e85520',
          50:  'rgba(255,107,53,0.05)',
          100: 'rgba(255,107,53,0.1)',
          200: 'rgba(255,107,53,0.2)',
          300: 'rgba(255,107,53,0.3)',
          500: '#ff6b35',
          600: '#e85520',
          700: '#c44010',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
