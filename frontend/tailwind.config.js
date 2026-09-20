/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#04060B',
          900: '#080B12',
          850: '#0C1019',
          800: '#111622',
          700: '#1A2132',
          600: '#252E45',
          500: '#36405C',
          400: '#57627F',
          300: '#7F8AA6',
          200: '#B4BDD2',
          100: '#DDE2EE',
          50: '#F4F6FB'
        },
        brand: {
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5'
        },
        violet: {
          400: '#A78BFA',
          500: '#8B5CF6'
        },
        cyan: {
          400: '#22D3EE'
        },
        ok: '#3ECF8E',
        err: '#F27066'
      },
      boxShadow: {
        glow: '0 0 24px rgba(99, 102, 241, 0.35)',
        'glow-lg': '0 0 48px rgba(99, 102, 241, 0.25)',
        card: '0 8px 40px rgba(0, 0, 0, 0.45)'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px'
      }
    }
  },
  plugins: []
};
