// 下载 3D 场景所需的行星纹理（构建期一次性脚本，不属于运行时依赖）
// 数据源与授权见 public/textures/CREDITS.md
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'textures')

const SSS = 'https://www.solarsystemscope.com/textures/download/'
const JSD = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/'

const FILES = [
  // Solar System Scope —— CC BY 4.0
  { url: SSS + '2k_earth_daymap.jpg', out: 'earth_day.jpg' },
  { url: SSS + '2k_earth_nightmap.jpg', out: 'earth_night.jpg' },
  { url: SSS + '2k_earth_clouds.jpg', out: 'earth_clouds.jpg' },
  { url: SSS + '2k_sun.jpg', out: 'sun.jpg' },
  { url: SSS + '2k_stars_milky_way.jpg', out: 'stars_milkyway.jpg' },
  // three.js 官方仓库示例纹理（MIT 仓库 / 底图源自 NASA）
  { url: JSD + 'earth_normal_2048.jpg', out: 'earth_normal.jpg' },
  { url: JSD + 'earth_specular_2048.jpg', out: 'earth_specular.jpg' },
]

const FORCE = process.argv.includes('--force')

async function exists(p) {
  try {
    const s = await stat(p)
    return s.size > 1024
  } catch {
    return false
  }
}

await mkdir(OUT, { recursive: true })

const results = []
for (const f of FILES) {
  const target = join(OUT, f.out)
  if (!FORCE && (await exists(target))) {
    results.push(`SKIP  ${f.out} (已存在)`)
    continue
  }
  try {
    const res = await fetch(f.url, { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1024) throw new Error(`响应过小 ${buf.length}B`)
    await writeFile(target, buf)
    results.push(`OK    ${f.out}  ${(buf.length / 1024).toFixed(0)} KB`)
  } catch (e) {
    results.push(`FAIL  ${f.out}  ${e.message}  <- ${f.url}`)
  }
}

console.log(results.join('\n'))
const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n完成：成功 ${results.length - failed} / ${results.length}，失败 ${failed}`)
if (failed) {
  console.log('提示：缺失的纹理在运行时会自动回退为程序化生成的替代纹理，页面不会白屏。')
}
