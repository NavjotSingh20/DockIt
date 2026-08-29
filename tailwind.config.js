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
        // DockIt design system — Dark & Light adaptive tokens via CSS variables
        base: 'rgb(var(--color-base) / <alpha-value>)',
        'base-dark': 'rgb(var(--color-base-dark) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--color-ink-muted) / <alpha-value>)',
        'ink-faint': 'rgb(var(--color-ink-faint) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-dark': 'rgb(var(--color-accent-dark) / <alpha-value>)',
        'accent-light': 'rgb(var(--color-accent-light) / <alpha-value>)',
        caution: 'rgb(var(--color-caution) / <alpha-value>)',
        settled: 'rgb(var(--color-settled) / <alpha-value>)',
        'settled-light': 'rgb(var(--color-settled-light) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        rule: 'rgb(var(--color-rule) / <alpha-value>)',
        'rule-dark': 'rgb(var(--color-rule-dark) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        'danger-light': 'rgb(var(--color-danger-light) / <alpha-value>)',

        // Legacy / alias tokens
        primary: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          dark: 'rgb(var(--color-accent-dark) / <alpha-value>)',
          light: 'rgb(var(--color-accent-light) / <alpha-value>)',
        },
        navy: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          800: 'rgb(var(--color-surface) / <alpha-value>)',
          700: 'rgb(var(--color-rule-dark) / <alpha-value>)',
        },
        success: 'rgb(var(--color-settled) / <alpha-value>)',
        warning: 'rgb(var(--color-caution) / <alpha-value>)',
        neutral: 'rgb(var(--color-ink-muted) / <alpha-value>)',
        bg: 'rgb(var(--color-base) / <alpha-value>)',
        card: 'rgb(var(--color-surface) / <alpha-value>)',
        border: 'rgb(var(--color-rule) / <alpha-value>)',

        // shadcn semantic color tokens
        background: 'rgb(var(--color-base) / <alpha-value>)',
        foreground: 'rgb(var(--color-ink) / <alpha-value>)',
        popover: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          foreground: 'rgb(var(--color-ink) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--color-base-dark) / <alpha-value>)',
          foreground: 'rgb(var(--color-ink-muted) / <alpha-value>)',
        },
        'accent-shadcn': {
          DEFAULT: 'rgb(var(--color-accent-light) / <alpha-value>)',
          foreground: 'rgb(var(--color-accent-dark) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
          foreground: '#FFFFFF',
        },
        input: 'rgb(var(--color-rule) / <alpha-value>)',
        ring: 'rgb(var(--color-accent) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(28,25,23,0.06), 0 1px 2px rgba(28,25,23,0.04)',
        'card-hover': '0 4px 12px rgba(28,25,23,0.08)',
        subtle: '0 1px 2px rgba(28,25,23,0.05)',
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
