import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 站点在域名下的挂载路径。默认挂在站点根目录；合并发布时由根目录构建脚本注入，
// 例如挂到 https://域名/deepseek-v4.1-flash-1017/ 时传入 '/deepseek-v4.1-flash-1017/'。
// 用绝对路径而非 './' 的原因：页面在 /deepseek-v4.1-flash-1017（不带结尾斜杠）时，
// 相对路径会解析到上一级目录而 404。
const base = process.env.VITE_BASE ?? '/'
// 构建输出目录。默认 dist；合并发布时由根目录构建脚本注入 ../dist/<站点目录>。
const outDir = process.env.VITE_OUT_DIR ?? 'dist'

export default defineConfig({
  base,
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
    outDir,
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
})
