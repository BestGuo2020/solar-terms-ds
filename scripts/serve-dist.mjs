#!/usr/bin/env node
/**
 * 本地预览 scripts/build-pages.mjs 产出的 dist/，行为尽量贴近 EdgeOne Pages 的静态托管：
 *   - 目录自动补 index.html
 *   - /deepseek-v4.1-flash-0910 这类不带结尾斜杠的目录地址也能正常打开
 *   - 找不到文件时返回 404
 *
 * 用法：node scripts/serve-dist.mjs      （PORT 环境变量可改端口，默认 4318）
 */

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const port = Number(process.env.PORT ?? 4318)

const MIME_TYPES = {
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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

if (!existsSync(rootDir)) {
  console.error('dist/ 不存在，先运行：node scripts/build-pages.mjs')
  process.exit(1)
}

function resolveTarget(pathname) {
  const decoded = decodeURIComponent(pathname.split('?')[0].split('#')[0])
  const absolute = path.resolve(rootDir, '.' + decoded)
  if (absolute !== rootDir && !absolute.startsWith(rootDir + path.sep)) return null

  const candidates = [absolute]
  if (decoded.endsWith('/')) candidates.push(path.join(absolute, 'index.html'))
  else candidates.push(absolute + '.html', path.join(absolute, 'index.html'))

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

const server = createServer((request, response) => {
  const filePath = resolveTarget(request.url ?? '/')

  if (!filePath) {
    response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    response.end(
      `<h1>404</h1><p>${request.url} 没有对应的文件。</p>` +
        '<p>可以访问：/ 、/deepseek-v4.1-flash-0910/ 、/deepseek-v4.1-flash-1017/</p>',
    )
    return
  }

  const type = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' })
  createReadStream(filePath).pipe(response)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`本地预览已启动：http://127.0.0.1:${port}`)
  console.log(`  根目录（新版首页） http://127.0.0.1:${port}/`)
  console.log(`  0910 版            http://127.0.0.1:${port}/deepseek-v4.1-flash-0910/`)
  console.log(`  1017 版            http://127.0.0.1:${port}/deepseek-v4.1-flash-1017/`)
})
