import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000'
  return {
    plugins: [react()],
    // Staff sockets authenticate using JWTs, so they can reach the backend
    // directly. Avoid an extra dev proxy hop and its noisy reset/EPIPE logs
    // when tabs close, hot-reload, or the backend restarts.
    define: {
      'import.meta.env.VITE_DEV_REALTIME_URL': JSON.stringify(apiUrl),
    },
    server: {
      // Listen on all interfaces so subdomains (e.g., apollo.localhost) work in dev
      host: true,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: false  // Preserve Host header so backend resolves subdomain correctly
        }
      }
    }
  }
})
