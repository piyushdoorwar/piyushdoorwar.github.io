import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// User site served at the root of piyushdoorwar.github.io -> no base path needed.
// (Dev port is pinned via the `dev` npm script: `vite --port 5199 --strictPort`.)
export default defineConfig({
    base: '/',
    plugins: [react()],
});
