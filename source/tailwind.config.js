/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './*.{html,ts,tsx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050505',
          panel: '#0a0a0a',
          cyan: '#00f3ff',
          pink: '#ff00ff',
          purple: '#bc13fe',
          yellow: '#fcee0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 5px #00f3ff, 0 0 20px rgba(0, 243, 255, 0.5)',
        'neon-pink': '0 0 5px #ff00ff, 0 0 20px rgba(255, 0, 255, 0.5)',
      },
    },
  },
  plugins: [],
};
