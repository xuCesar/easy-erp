/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shamrock: {
          50: '#edfcf6',
          100: '#d4f7e7',
          200: '#aceed4',
          300: '#77debc',
          400: '#39c69c',
          500: '#1cad87',
          600: '#0f8c6e',
          700: '#0c705a',
          800: '#0c5949',
          900: '#0b493d',
          950: '#052923',
        },
        cockpit: {
          background: '#edfcf6',
          foreground: '#052923',
          card: '#ffffff',
          primary: '#0c5949',
          accent: '#39c69c',
          muted: '#d4f7e7',
          subtle: '#0c705a',
          border: '#aceed4',
          success: '#0f8c6e',
          warning: '#b7791f',
          danger: '#b42318',
          locked: '#0b493d',
        },
      },
      boxShadow: {
        cockpit: '0 24px 60px rgba(5, 41, 35, 0.14)',
      },
      borderRadius: {
        cockpit: '32px',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
};
