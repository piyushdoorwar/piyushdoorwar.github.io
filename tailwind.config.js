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
        // Solid surfaces and hairlines for the console-style chrome (see `:root` in index.css).
        surface: {
          DEFAULT: '#0e1116',
          2: '#0a0d11',
          3: '#141922',
        },
        line: {
          DEFAULT: 'rgba(61, 220, 132, 0.12)',
          strong: 'rgba(61, 220, 132, 0.32)',
          soft: 'rgba(255, 255, 255, 0.06)',
        },
        heading: '#f3f6f4',
        body: '#cfd6de',
        muted: '#9aa5b3',
        // De-emphasised hint text that still clears WCAG AA (4.8:1 on ink-950).
        hint: '#6e7d91',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        13: ['13px', '18px'],
      },
      letterSpacing: {
        // Tracking is size-specific: large type reads too loose at 0, small mono too tight.
        display: '-0.03em',
        heading: '-0.02em',
        title: '-0.01em',
        label: '0.02em',
      },
      borderRadius: {
        DEFAULT: '6px',
        card: '8px',
        panel: '12px',
      },
      boxShadow: {
        // Neutral elevation carries structure; `glow` is reserved for the terminal.
        e1: '0 1px 2px rgba(0,0,0,0.35)',
        e2: '0 1px 2px rgba(0,0,0,0.35), 0 10px 28px -14px rgba(0,0,0,0.7)',
        e3: '0 2px 4px rgba(0,0,0,0.35), 0 28px 56px -24px rgba(0,0,0,0.85)',
        glow: '0 0 0 1px rgba(61,220,132,0.15), 0 0 24px -6px rgba(61,220,132,0.25)',
        btn: '0 1px 2px rgba(61,220,132,0.3), 0 8px 24px -12px rgba(61,220,132,0.55)',
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
