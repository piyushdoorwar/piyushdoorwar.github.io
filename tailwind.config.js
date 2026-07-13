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
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
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
