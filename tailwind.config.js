/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // DockIt design system — SKILL.md compliant
        // Warm neutral base, one sharp accent, status tones
        base: '#F5F2EB',
        'base-dark': '#EDE9E0',
        ink: '#1C1917',
        'ink-muted': '#57534E',
        'ink-faint': '#A8A29E',
        accent: '#D97706',
        'accent-dark': '#B45309',
        'accent-light': '#FEF3C7',
        caution: '#CA8A04',
        settled: '#6B8F71',
        'settled-light': '#E8F0EA',
        surface: '#FEFDFB',
        rule: '#E7E0D5',
        'rule-dark': '#D6CFC4',

        // Keep old tokens as aliases so other pages don't break
        primary: { DEFAULT: '#D97706', dark: '#B45309', light: '#FEF3C7' },
        navy: { DEFAULT: '#1C1917', 800: '#292524', 700: '#44403C' },
        success: '#6B8F71',
        warning: '#CA8A04',
        danger: '#C2410C',
        neutral: '#78716C',
        bg: '#F5F2EB',
        card: '#FEFDFB',
        border: '#E7E0D5',

        // shadcn semantic color tokens (mapped to DockIt palette)
        background: '#F5F2EB',
        foreground: '#1C1917',
        popover: { DEFAULT: '#FEFDFB', foreground: '#1C1917' },
        muted: { DEFAULT: '#EDE9E0', foreground: '#57534E' },
        'accent-shadcn': { DEFAULT: '#FEF3C7', foreground: '#B45309' },
        destructive: { DEFAULT: '#C2410C', foreground: '#FFFFFF' },
        input: '#E7E0D5',
        ring: '#D97706',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(28,25,23,0.05), 0 1px 2px rgba(28,25,23,0.03)',
        'card-hover': '0 8px 24px rgba(28,25,23,0.08)',
        glow: '0 0 20px rgba(217,119,6,0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scan-laser': 'scanLaser 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scanLaser: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
      },
    },
  },
  plugins: [animate],
}
