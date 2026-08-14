import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// User site served at the root of piyushdoorwar.github.io -> no base path needed.
// (Dev port is pinned via the `dev` npm script: `vite --port 5199 --strictPort`.)
export default defineConfig(({ mode }) => ({
  base: '/',
  // The React plugin exists for Fast Refresh, which is a dev-server concern. Vitest
  // runs on its own newer Vite, where this plugin's esbuild options are deprecated;
  // JSX in tests is transformed from the `jsx` setting in tsconfig instead.
  plugins: mode === 'test' ? [] : [react()],
  test: {
    // Every module under test touches a browser API somewhere (localStorage,
    // navigator, DOM geometry), so the whole suite runs in jsdom.
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Data-fetch scripts keep their own `node --test` suite under scripts/.
    restoreMocks: true,
    unstubGlobals: true,
  },
}))
