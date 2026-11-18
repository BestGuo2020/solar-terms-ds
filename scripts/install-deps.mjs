#!/usr/bin/env node
/**
 * 给两个子项目安装依赖。EdgeOne Pages 的 installCommand 跑的就是这一条。
 *
 * 用 `npm ci` + 仓库里提交的 package-lock.json：部署装到的版本和本地验证过的版本一致，
 * 不会因为 npm 解析到新发布的依赖而让构建突然失败（例如 vue-tsc 新版报类型错）。
 *
 * 某个子项目没有 lockfile（或 lockfile 与 package.json 不同步）时回退到 `npm install`。
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tempDir = path.join(rootDir, '.tmp-build')
const SITES = ['deepseek-v4.1-flash-0910', 'deepseek-v4.1-flash-1017']

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const isWindows = process.platform === 'win32'

function runNpm(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd,
      stdio: 'inherit',
      shell: isWindows,
      env: { ...process.env, TMP: tempDir, TEMP: tempDir, TMPDIR: tempDir },
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`npm ${args.join(' ')} 失败（退出码 ${code}）`))
    })
  })
}

async function main() {
  await mkdir(tempDir, { recursive: true })

  for (const dir of SITES) {
    const siteDir = path.join(rootDir, dir)
    if (!existsSync(path.join(siteDir, 'package.json'))) {
      throw new Error(`找不到子项目：${dir}/package.json`)
    }

    const hasLock = existsSync(path.join(siteDir, 'package-lock.json'))
    console.log(`\n[${dir}] ${hasLock ? 'npm ci（按 package-lock.json 安装）' : 'npm install'}`)

    try {
      await runNpm(hasLock ? ['ci', '--include=dev'] : ['install', '--include=dev', '--no-audit', '--no-fund'], siteDir)
    } catch (error) {
      if (!hasLock) throw error
      console.warn(`[${dir}] npm ci 失败，回退到 npm install：${error.message}`)
      await runNpm(['install', '--include=dev', '--no-audit', '--no-fund'], siteDir)
    }
  }

  console.log('\n两个子项目的依赖已就绪')
}

main().catch((error) => {
  console.error(`\n依赖安装失败：${error.message}`)
  process.exitCode = 1
})
