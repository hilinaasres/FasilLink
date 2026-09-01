export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#020817',
          900: '#0b1220',
          800: '#111827',
          700: '#1f2937',
          500: '#3b82f6',
        },
        surface: '#111827',
        panel: '#0f172a',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
};
