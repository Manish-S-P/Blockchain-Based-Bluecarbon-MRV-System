/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        carbon: {
          50:  '#eefbf4',
          100: '#d6f5e3',
          200: '#b0eacc',
          300: '#7cdaae',
          400: '#46c48c',
          500: '#24a972',
          600: '#17895b',
          700: '#146d4b',
          800: '#13573d',
          900: '#114834',
          950: '#08281d',
        },
        ocean: {
          50:  '#f0faff',
          100: '#e0f4fe',
          200: '#bae8fd',
          300: '#7dd6fc',
          400: '#38c0f8',
          500: '#0ea7e9',
          600: '#0286c7',
          700: '#036ba1',
          800: '#075a85',
          900: '#0c4b6e',
          950: '#082f49',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float 8s ease-in-out 1s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-up-delay': 'fade-up 0.6s ease-out 0.15s forwards',
        'fade-up-delay-2': 'fade-up 0.6s ease-out 0.3s forwards',
        'slide-in-right': 'slide-in-right 0.4s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(52, 211, 153, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(52, 211, 153, 0.6)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
