import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000'
  return {
    plugins: [react()],
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
