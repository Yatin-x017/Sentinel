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
})
