/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cockpit: {
          background: '#f4f7f2',
          foreground: '#0f1f1b',
          card: '#ffffff',
          primary: '#123f35',
          accent: '#d9962c',
          muted: '#e8eee7',
          subtle: '#61736a',
          border: '#d6e1d8',
          success: '#17803d',
          warning: '#b7791f',
          danger: '#b42318',
          locked: '#475569',
        },
      },
      boxShadow: {
        cockpit: '0 24px 60px rgba(26, 45, 36, 0.14)',
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
