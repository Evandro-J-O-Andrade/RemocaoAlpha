import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// @ts-ignore __dirname is available in vitest config context
const __dirname = process.cwd()

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/lib': resolve(__dirname, 'src/lib'),
      '@/modules': resolve(__dirname, 'src/modules'),
      '@/shared': resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/modules/remocao/tests/setup.ts'],
    include: ['src/modules/remocao/tests/**/*.test.{ts,tsx}'],
  },
})
