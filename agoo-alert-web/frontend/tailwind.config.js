/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vert forêt — inspiration drapeau togolais (vert)
        primary: {
          50:  '#f0fdf6',
          100: '#dcfce9',
          200: '#b8f5d2',
          300: '#7ae7ae',
          400: '#34c97c',
          500: '#1aac60',
          600: '#0f924d',
          700: '#0d7a42',
          800: '#0f6137',
          900: '#0d4f2d',
          950: '#062d19',
        },
        // Or chaud — inspiration jaune togolais
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Rouge Togo — utilisé avec parcimonie (badges danger)
        togo: {
          red:    '#D21034',
          green:  '#006A4E',
          yellow: '#FFCD00',
        },
        // Fonds chauds crème
        warm: {
          50:  '#fffbf0',
          100: '#fef6e4',
          200: '#fdebc8',
          300: '#fbdba3',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'togo-stripe': 'linear-gradient(90deg, #006A4E 33.3%, #FFCD00 33.3% 66.6%, #D21034 66.6%)',
      },
    },
  },
  plugins: [],
};
