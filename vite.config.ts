import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5183,
  },
  preview: {
    host: '127.0.0.1',
    port: 4180,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
})
