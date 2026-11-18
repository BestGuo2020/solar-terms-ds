/**
 * 极简静态服务器：用于本地预览 `dist/` 构建产物
 *
 * 与 `vite preview` 等价，但完全不依赖 esbuild / vite 配置，
 * 因此在受限环境（无法启动子进程）里也能跑起来。
 *
 *   node scripts/preview-dist.mjs [端口]
 *   默认 http://127.0.0.1:4180
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', 'dist')
const PORT = Number(process.argv[2] || 4180)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    let rel = normalize(urlPath).replace(/^([/\\])+/, '')
    if (rel === '' || rel.endsWith(sep)) rel = join(rel, 'index.html')
    const full = join(ROOT, rel)

    // 防目录穿越
    if (!full.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden')
      return
    }

    let target = full
    try {
      const s = await stat(target)
      if (s.isDirectory()) target = join(target, 'index.html')
    } catch {
      target = join(ROOT, 'index.html') // SPA 回退
    }

    const body = await readFile(target)
    res.writeHead(200, {
      'content-type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    })
    res.end(body)
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 Not Found')
    void e
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`dist 已就绪： http://127.0.0.1:${PORT}/`)
})
