/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0e1a',
          secondary: '#0d1117',
          surface: '#161b2c',
          elevated: '#1e2433',
        },
        accent: {
          cyan: '#00d4ff',
          blue: '#4f7cff',
          purple: '#a855f7',
          green: '#10b981',
          red: '#ef4444',
          yellow: '#f59e0b',
        },
        border: {
          DEFAULT: 'rgba(99, 120, 200, 0.12)',
          hover: 'rgba(99, 120, 200, 0.3)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient': 'radial-gradient(ellipse at 60% 0%, rgba(0,212,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(168,85,247,0.1) 0%, transparent 60%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 30px rgba(0, 212, 255, 0.2)',
        'glow-blue': '0 0 30px rgba(79, 124, 255, 0.2)',
        'glow-purple': '0 0 30px rgba(168, 85, 247, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        xs: '4px',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'shimmer': 'shimmer 1.5s infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
