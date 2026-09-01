/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        // FasilLink Primary Colors
        primary: {
          50: '#f3e8ff',
          100: '#e9d5ff',
          200: '#d8b4fe',
          300: '#c084fc',
          400: '#a855f7',
          500: '#9333ea',
          600: '#7e22ce',
          700: '#6C3BFF', // FasilLink Purple
          800: '#5a2d82',
          900: '#3f1d56',
        },
        // Neutral Colors
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          150: '#f0f1f3',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        // Semantic Colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      backgroundColor: {
        page: '#f8f9fc',
        card: '#ffffff',
        dark: '#0b1220',
      },
      borderColor: {
        light: '#e5e7eb',
      },
      boxShadow: {
        'soft': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'hover': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        'navbar': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      spacing: {
        'section': '80px',
        'nav': '80px',
        'hero': '520px',
      },
      animation: {
        'hover-lift': 'hover-lift 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in': 'slide-in 0.5s ease-out',
      },
      keyframes: {
        'hover-lift': {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(-6px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      maxWidth: {
        'container': '1440px',
        'content': '1280px',
      },
    },
  },
  plugins: [],
}