import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // 用相对路径，便于把 dist 放到任意子目录或直接用 file:// 之外的静态服务器打开
  base: './',
  resolve: {
    alias: {
      // 以 / 开头的别名由 Vite 解析为「项目根目录下的 src」，
      // 这样无需引入 Node 类型（node:url / node:path）即可配置路径别名。
      '@': '/src',
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5183,
    open: false,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
})
