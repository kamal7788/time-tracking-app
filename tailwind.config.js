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
          navy: '#323B4B',
          'navy-light': '#3D4759',
          gray: '#6D7D93',
          'gray-light': '#8A94A6',
          'gray-muted': '#B0B8C4',
          surface: '#F4F6F9',
          'surface-dark': '#E8ECF1',
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
        'xl': '14px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(5, 63, 181, 0.08), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px -4px rgba(5, 63, 181, 0.12), 0 2px 8px -2px rgba(0, 0, 0, 0.06)',
        'lifted': '0 8px 32px -8px rgba(5, 63, 181, 0.16), 0 4px 16px -4px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 24px -4px rgba(5, 63, 181, 0.2)',
        'sidebar': '4px 0 24px -4px rgba(50, 59, 75, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
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
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
