/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0B0D10',
          900: '#111417',
          800: '#171B20',
          700: '#20252B',
          600: '#2B3138',
          500: '#3B424B',
          400: '#5B646E',
          300: '#828C97',
          200: '#B4BCC4',
          100: '#DCE0E4',
          50: '#F4F5F6'
        },
        amber: {
          500: '#E8A33D',
          400: '#EDB35C',
          300: '#F2C783'
        },
        ok: '#5FB878',
        err: '#E5645A'
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
