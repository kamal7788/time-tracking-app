// Professional Tailwind design system with brand colors and dark mode support.
export const designTokens = {
  colors: {
    // Brand colors
    brand: {
      blue: '#0ea5e9',      // Primary blue
      'blue-dark': '#0369a1', // Darker blue for hover/active
      navy: '#1e293b',       // Dark navy for text
      'navy-light': '#334155', // Lighter navy
      surface: '#f8fafc',    // Light surface background
      'surface-dark': '#f1f5f9', // Darker surface
      gray: '#64748b',       // Gray text
      'gray-light': '#94a3b8', // Lighter gray
      white: '#ffffff',
      black: '#000000',
    },
    // Status colors
    status: {
      draft: '#94a3b8',     // Gray for draft
      submitted: '#fbbf24', // Yellow/amber for submitted
      approved: '#10b981',  // Green for approved
      rejected: '#ef4444',  // Red for rejected
      cancelled: '#94a3b8', // Gray for cancelled
    },
    // Feedback colors
    feedback: {
      success: '#10b981',
      warning: '#fbbf24',
      error: '#ef4444',
      info: '#0ea5e9',
    },
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '2.5rem', // 40px
    '3xl': '3rem',  // 48px
  },
  borderRadius: {
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',      // 16px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },
  zIndex: {
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modal: '1040',
    popover: '1050',
    tooltip: '1060',
  },
}

export const tailwindConfig = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Custom brand colors
        brand: designTokens.colors.brand,
        status: designTokens.colors.status,
        feedback: designTokens.colors.feedback,
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          from: { transform: 'scale(1)', opacity: '1' },
          to: { transform: 'scale(0.95)', opacity: '0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down var(--duration) ease-out',
        'accordion-up': 'accordion-up var(--duration) ease-out',
        'fade-in': 'fade-in var(--duration) ease-out',
        'fade-out': 'fade-out var(--duration) ease-out',
        'slide-in': 'slide-in var(--duration) ease-out',
        'slide-out': 'slide-out var(--duration) ease-out',
        'scale-in': 'scale-in var(--duration) ease-out',
        'scale-out': 'scale-out var(--duration) ease-out',
        'pulse-soft': 'pulse-soft var(--duration) ease-in-out',
      },
      // Custom utility classes based on design tokens
      boxShadow: {
        xs: designTokens.shadows.sm,
        DEFAULT: designTokens.shadows.md,
        md: designTokens.shadows.md,
        lg: designTokens.shadows.lg,
        xl: designTokens.shadows.xl,
        '2xl': designTokens.shadows['2xl'],
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
        none: 'none',
      },
      transitionProperty: {
        DEFAULT: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
        fast: 'color, background-color, border-color, opacity, box-shadow, transform',
        slow: 'all',
      },
      transitionDuration: {
        DEFAULT: designTokens.transitions.normal,
        fast: designTokens.transitions.fast,
        slow: designTokens.transitions.slow,
      },
    },
  },
  plugins: [],
}

// CSS variables for dynamic theming
export const cssVariables = {
  '--background': designTokens.colors.brand.surface,
  '--foreground': designTokens.colors.brand.navy,
  '--card': designTokens.colors.brand.white,
  '--card-foreground': designTokens.colors.brand.navy,
  '--popover': designTokens.colors.brand.white,
  '--popover-foreground': designTokens.colors.brand.navy,
  '--primary': designTokens.colors.brand.blue,
  '--primary-foreground': designTokens.colors.brand.white,
  '--secondary': designTokens.colors.brand['surface-dark'],
  '--secondary-foreground': designTokens.colors.brand.navy,
  '--muted': designTokens.colors.brand['surface-dark'],
  '--muted-foreground': designTokens.colors.brand.gray,
  '--accent': designTokens.colors.brand['surface-dark'],
  '--accent-foreground': designTokens.colors.brand.navy,
  '--destructive': designTokens.colors.feedback.error,
  '--destructive-foreground': designTokens.colors.brand.white,
  '--border': designTokens.colors.brand['surface-dark'],
  '--input': designTokens.colors.brand['surface-dark'],
  '--ring': designTokens.colors.brand.blue,
  '--radius': '0.5rem',
}

export default tailwindConfig
