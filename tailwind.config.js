/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      textColor: {
        slate: {
          50: 'rgb(from var(--color-text-heading) r g b / <alpha-value>)',
          100: 'rgb(from var(--color-text-heading) r g b / <alpha-value>)',
          200: 'rgb(from var(--color-text-strong) r g b / <alpha-value>)',
          300: 'rgb(from var(--color-text-body) r g b / <alpha-value>)',
          400: 'rgb(from var(--color-text-body) r g b / <alpha-value>)',
          500: 'rgb(from var(--color-text-muted) r g b / <alpha-value>)',
          600: 'rgb(from var(--color-text-faint) r g b / <alpha-value>)',
          700: 'rgb(from var(--color-text-muted) r g b / <alpha-value>)',
          800: 'rgb(from var(--color-text-strong) r g b / <alpha-value>)',
          900: 'rgb(from var(--color-text-heading) r g b / <alpha-value>)'
        }
      },
      colors: {
        slate: {
          50: 'rgb(from var(--color-text-heading) r g b / <alpha-value>)',
          100: 'rgb(from var(--color-text-heading) r g b / <alpha-value>)',
          200: 'rgb(from var(--color-text-strong) r g b / <alpha-value>)',
          300: 'rgb(from var(--color-text-body) r g b / <alpha-value>)',
          400: 'rgb(from var(--color-text-body) r g b / <alpha-value>)',
          500: 'rgb(from var(--color-text-muted) r g b / <alpha-value>)',
          600: 'rgb(from var(--color-text-faint) r g b / <alpha-value>)',
          700: 'rgb(from var(--color-text-muted) r g b / <alpha-value>)',
          800: 'rgb(from var(--color-text-strong) r g b / <alpha-value>)',
          900: 'rgb(from var(--color-text-heading) r g b / <alpha-value>)'
        },
        base: {
          950: 'rgb(from var(--color-bg) r g b / <alpha-value>)',
          900: 'rgb(from var(--color-surface) r g b / <alpha-value>)',
          850: '#e8efea',
          800: 'rgb(from var(--color-surface-alt) r g b / <alpha-value>)',
          700: 'rgb(from var(--color-border) r g b / <alpha-value>)',
          600: '#c1cec4'
        },
        ember: {
          500: 'rgb(from var(--color-accent) r g b / <alpha-value>)',
          600: 'rgb(from var(--color-accent-dark) r g b / <alpha-value>)',
          400: 'rgb(from var(--color-accent-light) r g b / <alpha-value>)'
        },
        moss: {
          400: 'rgb(from var(--color-success-light) r g b / <alpha-value>)',
          500: 'rgb(from var(--color-success) r g b / <alpha-value>)'
        }
      },
      boxShadow: {
        glow: '0 6px 16px -6px rgba(47, 163, 107, 0.35)',
        card: '0 8px 28px rgba(31, 54, 42, 0.07), 0 2px 8px rgba(31, 54, 42, 0.04)'
      }
    }
  },
  plugins: []
}
