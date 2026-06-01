import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// base: beim Production-Build auf den Repo-Namen setzen, damit GitHub Pages
// (https://<user>.github.io/privatefinance/) die Assets korrekt lädt.
// Im Dev-Server (npm run dev) bleibt es '/'.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/privatefinance/' : '/',
  server: {
    port: 5173,
    open: true,
  },
}))
