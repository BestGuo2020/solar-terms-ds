import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 站点在域名下的挂载路径。本地默认用相对路径，便于把 dist 放到任意子目录
// （或用 file:// 之外的静态服务器直接打开）；合并发布时由根目录构建脚本注入
// '/deepseek-v4.1-flash-0910/'，这样 /deepseek-v4.1-flash-0910 这种不带结尾斜杠的
// 地址也不会把纹理请求解析到上一级目录。
const base = process.env.VITE_BASE ?? './'
// 构建输出目录。默认 dist；合并发布时由根目录构建脚本注入 ../dist/<站点目录>。
const outDir = process.env.VITE_OUT_DIR ?? 'dist'

export default defineConfig({
  plugins: [vue()],
  base,
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
    outDir,
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
