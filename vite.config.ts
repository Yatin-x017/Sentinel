import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // three.js is large and only the spider needs it; keep it out of the main bundle.
        manualChunks: (id) => (id.includes("node_modules/three") ? "three" : undefined),
      },
    },
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // Match your Express PORT
        changeOrigin: true,
        secure: false
      }
    }
  }
})
