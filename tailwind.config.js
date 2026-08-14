/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Terminal / dark-developer palette
        ink: {
          950: '#050608',
          900: '#0a0c10',
          800: '#0f1218',
          700: '#161a22',
          600: '#1e2430',
        },
        accent: {
          DEFAULT: '#3ddc84', // neon terminal green
          soft: '#5cf0a0',
          dim: '#1f7a4d',
        },
        cyanx: '#22d3ee',
        // De-emphasised hint text that still clears WCAG AA (4.8:1 on ink-950).
        hint: '#6e7d91',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        // Tracking is size-specific: large type reads too loose at 0, small mono too tight.
        display: '-0.022em',
        heading: '-0.014em',
        title: '-0.008em',
        label: '0.02em',
      },
      boxShadow: {
        // Neutral elevation carries structure; `glow` is reserved for the terminal.
        e1: '0 1px 2px -1px rgba(0,0,0,0.6), 0 4px 12px -6px rgba(0,0,0,0.7)',
        e2: '0 2px 6px -2px rgba(0,0,0,0.65), 0 14px 32px -10px rgba(0,0,0,0.8)',
        e3: '0 4px 10px -3px rgba(0,0,0,0.7), 0 28px 56px -14px rgba(0,0,0,0.85)',
        glow: '0 0 0 1px rgba(61,220,132,0.15), 0 0 24px -6px rgba(61,220,132,0.25)',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
}
