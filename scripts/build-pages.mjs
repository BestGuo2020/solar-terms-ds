#!/usr/bin/env node
/**
 * 把两个互相独立的 Vite 子项目打成同一个静态站点目录，供 EdgeOne Pages 一次性发布：
 *
 *   dist/
 *   ├─ index.html                    根目录首页（复用新版 1017 的构建产物）
 *   ├─ deepseek-v4.1-flash-0910/     0910 版整站
 *   └─ deepseek-v4.1-flash-1017/     1017 版整站（新版）
 *
 * 每个子项目都以「站点目录名」作为 base 构建，因此部署后可用
 *   https://域名/deepseek-v4.1-flash-0910/
 *   https://域名/deepseek-v4.1-flash-1017/
 * 直接访问，根目录则是新版首页。
 *
 * 用法：
 *   node scripts/build-pages.mjs                              构建全部（EdgeOne Pages 用的就是这条）
 *   node scripts/build-pages.mjs deepseek-v4.1-flash-1017     只构建指定站点（构建产物不会互相覆盖）
 */

import { execSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(rootDir, 'dist')
// esbuild 会在系统临时目录里建/删中间文件。Windows 上偶尔会遇到
// 「remove … Access is denied」，把临时目录固定到仓库内更稳，也方便事后排查。
const tempDir = path.join(rootDir, '.tmp-build')

/** 发布站点的唯一清单：目录名即线上路径，primary 决定根目录首页用哪一版 */
const SITES = [
  { dir: 'deepseek-v4.1-flash-0910', label: '0910 版' },
  { dir: 'deepseek-v4.1-flash-1017', label: '1017 版（新版）', primary: true },
]

// 安装/构建统一走 npm：EdgeOne Pages 的构建环境一定带 npm，
// 不依赖 pnpm 的具体版本；本地用 pnpm 装过依赖也没关系，
// `npm run build` 只是执行 package.json 里的脚本，不关心依赖是谁装的。
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const isWindows = process.platform === 'win32'

function runNpm(args, cwd, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd,
      stdio: 'inherit',
      shell: isWindows,
      env: {
        ...process.env,
        TMP: tempDir,
        TEMP: tempDir,
        TMPDIR: tempDir,
        ...extraEnv,
      },
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`npm ${args.join(' ')} 执行失败（退出码 ${code}）`))
    })
  })
}

async function buildSite(site) {
  const siteDir = path.join(rootDir, site.dir)
  if (!existsSync(path.join(siteDir, 'package.json'))) {
    throw new Error(`找不到子项目：${site.dir}/package.json`)
  }

  if (!existsSync(path.join(siteDir, 'node_modules'))) {
    console.log(`\n[${site.dir}] 未安装依赖，先执行 npm install …`)
    await runNpm(['install', '--include=dev', '--no-audit', '--no-fund'], siteDir)
  }

  const outDirAbsolute = path.join(distDir, site.dir)
  // 传给 vite.config.ts：输出到仓库根目录的 dist/<站点目录>，base 用线上挂载路径
  const outDirRelative = path.relative(siteDir, outDirAbsolute).split(path.sep).join('/')

  console.log(`\n[${site.dir}] 构建 ${site.label} → dist/${site.dir}（base=/${site.dir}/）`)
  await runNpm(['run', 'build'], siteDir, {
    VITE_BASE: `/${site.dir}/`,
    VITE_OUT_DIR: outDirRelative,
  })

  const builtIndex = path.join(outDirAbsolute, 'index.html')
  if (!existsSync(builtIndex)) {
    throw new Error(`[${site.dir}] 构建结束，但 dist/${site.dir}/index.html 不存在`)
  }
}

async function writeRootHomepage(primary) {
  const source = path.join(distDir, primary.dir, 'index.html')
  const html = await readFile(source, 'utf8')
  // 标记注释放在 doctype 之后，避免影响文档的模式判定
  const banner = `<!-- 由 scripts/build-pages.mjs 生成：根目录首页复用 ${primary.dir} 的构建产物 -->\n`
  const doctype = /^<!doctype html>\s*\n/i
  const merged = doctype.test(html)
    ? html.replace(doctype, (match) => match + banner)
    : banner + html
  await writeFile(path.join(distDir, 'index.html'), merged, 'utf8')
  console.log(`\n根目录 dist/index.html ← ${primary.dir}/index.html`)
}

async function writeNotFoundPage() {
  const cards = SITES.map(
    (site) => `        <a class="card" href="/${site.dir}/">
          <span class="path">/${site.dir}/</span>
          <span class="desc">${site.label}</span>
        </a>`,
  ).join('\n')

  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>页面不存在 · 二十四节气</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: radial-gradient(circle at 30% 20%, #16233a, #050b12 60%);
        color: #e9dfc9; font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      }
      main { padding: 2rem; max-width: 34rem; }
      .code { margin: 0; font-size: 3rem; letter-spacing: .1em; color: #d8b271; font-weight: 600; }
      h1 { margin: .5rem 0 .25rem; font-size: 1.35rem; }
      p.en { margin: 0 0 1.75rem; color: #93a2b8; font-size: .95rem; }
      .cards { display: grid; gap: .6rem; }
      .card {
        display: flex; flex-direction: column; gap: .2rem; padding: .75rem .9rem;
        border: 1px solid #24344c; border-radius: .6rem; text-decoration: none;
        background: #0d1524cc; color: inherit;
      }
      .card:hover { border-color: #4a86b8; background: #12203a; }
      .path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9rem; color: #cfe0f3; }
      .desc { font-size: .8rem; color: #93a2b8; }
    </style>
  </head>
  <body>
    <main>
      <p class="code">404</p>
      <h1>这个页面不存在</h1>
      <p class="en">The page you are looking for does not exist.</p>
      <div class="cards">
        <a class="card" href="/">
          <span class="path">/</span>
          <span class="desc">新版首页 · 观象（1017）</span>
        </a>
${cards}
      </div>
    </main>
  </body>
</html>
`
  await writeFile(path.join(distDir, '404.html'), html, 'utf8')
  console.log('404 页面 dist/404.html 已生成')
}

async function writeBuildInfo() {
  let gitCommit = 'unknown'
  try {
    gitCommit = execSync('git rev-parse --short HEAD', { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    // 构建环境没有 git 也没关系，只是少了 commit 信息
  }

  const info = {
    builtAt: new Date().toISOString(),
    gitCommit,
    sites: SITES.map((site) => ({
      path: `/${site.dir}/`,
      label: site.label,
      primary: Boolean(site.primary),
    })),
  }
  await writeFile(path.join(distDir, '_build-info.json'), JSON.stringify(info, null, 2) + '\n', 'utf8')
  console.log(`构建信息 dist/_build-info.json：${gitCommit} @ ${info.builtAt}`)
}

async function main() {
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('-'))

  if (path.dirname(path.resolve(distDir)) !== path.resolve(rootDir)) {
    throw new Error(`拒绝清理意外的目录：${path.resolve(distDir)}`)
  }

  const sites = requested.length ? SITES.filter((site) => requested.includes(site.dir)) : SITES
  if (sites.length === 0) {
    throw new Error(`未知站点：${requested.join(', ')}\n可选项目：${SITES.map((s) => s.dir).join(', ')}`)
  }

  // 建/清构建用的临时目录（esbuild 中间文件）
  await rm(tempDir, { recursive: true, force: true })
  await mkdir(tempDir, { recursive: true })

  if (requested.length === 0) {
    // 全量构建：先整目录清空，避免上一版的残留文件被一起发布
    await rm(distDir, { recursive: true, force: true })
  } else {
    // 局部构建：只清掉被重建站点的目录，另一版保持原样
    for (const site of sites) {
      await rm(path.join(distDir, site.dir), { recursive: true, force: true })
    }
  }

  for (const site of sites) {
    await buildSite(site)
  }

  const primary = SITES.find((site) => site.primary)
  if (primary && sites.includes(primary)) {
    await writeRootHomepage(primary)
  }
  await writeNotFoundPage()
  await writeBuildInfo()

  console.log('\n发布目录 dist/ 已就绪：')
  console.log('  /                               → ' + primary.dir)
  for (const site of SITES) {
    console.log(`  /${site.dir}/ → ${site.label}`)
  }
}

main().catch((error) => {
  console.error(`\n构建失败：${error.message}`)
  process.exitCode = 1
})
