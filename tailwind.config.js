/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#053FB5',
          'blue-light': '#3B6FD9',
          'blue-dark': '#042E87',
          navy: '#0F172A',
          'navy-light': '#1E293B',
          gray: '#475569',
          'gray-light': '#64748B',
          'gray-muted': '#94A3B8',
          surface: '#F8FAFC',
          'surface-dark': '#F1F5F9',
          border: '#E2E8F0',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3B6FD9',
          600: '#053FB5',
          700: '#042E87',
          800: '#031F5C',
          900: '#021540',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '10px',
        '2xl': '14px',
        '3xl': '18px',
      },
      boxShadow: {
        'soft': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'medium': '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
        'lifted': '0 12px 32px -8px rgba(15, 23, 42, 0.14), 0 4px 8px -2px rgba(15, 23, 42, 0.06)',
        'glow': '0 0 0 4px rgba(5, 63, 181, 0.12)',
        'sidebar': '2px 0 16px -4px rgba(15, 23, 42, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
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
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
