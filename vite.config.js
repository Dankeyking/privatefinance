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
    // Die App holt ihre Daten über /api; ohne Weiterleitung bleibt der
    // Dev-Server bei „Lade Daten …" stehen, weil der Aufruf ins Leere geht.
    // Ziel ist der eigene Server (npm start) auf 8080.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
}))
