import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// User site served at the root of piyushdoorwar.github.io -> no base path needed.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: true,
  },
})
