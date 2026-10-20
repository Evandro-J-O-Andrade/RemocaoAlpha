import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/lib': resolve(__dirname, 'src/lib'),
      '@/modules': resolve(__dirname, 'src/modules'),
      '@/shared': resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 3000,
  },
})
