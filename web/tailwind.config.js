/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d8eaff',
          200: '#b5d6ff',
          300: '#85b9ff',
          400: '#5294ff',
          500: '#2f72ff',
          600: '#1856ed',
          700: '#1444c0',
          800: '#163d96',
          900: '#172e6f',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.05)',
      },
    },
  },
  plugins: [],
};
