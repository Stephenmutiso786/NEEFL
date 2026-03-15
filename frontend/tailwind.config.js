/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#f2f5ff',
          700: '#c7d2f0',
          500: '#8b93b2'
        },
        sand: {
          50: '#05070f',
          100: '#0b0f1d',
          200: '#141b31'
        },
        sun: {
          500: '#f5c400',
          600: '#f06a4f'
        },
        mint: {
          500: '#12f7d2',
          700: '#0fb8a1'
        },
        sky: {
          500: '#4bc6ff'
        }
      }
    },
  },
  plugins: [],
}
