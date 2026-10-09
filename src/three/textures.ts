/**
 * 纹理加载与失败回退
 *
 * 正式纹理来自 Solar System Scope（CC BY 4.0）与 three.js 官方示例（MIT 仓库，
 * 底图源自 NASA 公开影像），详见 public/textures/CREDITS.md。
 *
 * 任何一个纹理加载失败（离线、被拦截、部署时漏传）都会自动改用程序化生成的
 * 替代纹理，保证页面不会白屏，同时在界面上给出「使用替代纹理」的提示。
 */

import * as THREE from 'three'
import type { MessageKey } from '@/i18n/messages'

export interface TextureBundle {
  earthDay: THREE.Texture
  earthNight: THREE.Texture
  earthClouds: THREE.Texture
  earthNormal: THREE.Texture | null
  earthSpecular: THREE.Texture | null
  sun: THREE.Texture
  stars: THREE.Texture | null
  /** 加载失败并已回退的项目（i18n 键，由界面翻译） */
  fallbacks: MessageKey[]
  /** 全部加载完毕（无论成功或回退） */
  ready: boolean
}

const BASE = (import.meta.env?.BASE_URL || './').replace(/\/?$/, '/')
const url = (name: string) => `${BASE}textures/${name}`

// ─────────────────────────── 程序化噪声 ───────────────────────────

/** 可平铺的整数哈希 → [0,1) */
function hash2(ix: number, iy: number, period: number, seed: number): number {
  const x = ((ix % period) + period) % period
  const n = Math.sin(x * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453123
  return n - Math.floor(n)
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** 可平铺的二维值噪声 */
function valueNoise(x: number, y: number, period: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smoothstep(x - x0)
  const fy = smoothstep(y - y0)
  const a = hash2(x0, y0, period, seed)
  const b = hash2(x0 + 1, y0, period, seed)
  const c = hash2(x0, y0 + 1, period, seed)
  const d = hash2(x0 + 1, y0 + 1, period, seed)
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
}

/** 分形叠加噪声，x 方向可平铺 */
function fbm(u: number, v: number, baseFreq: number, octaves: number, seed: number): number {
  let sum = 0
  let norm = 0
  let amp = 1
  let freq = baseFreq
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(u * freq, v * freq, freq, seed + o * 13)
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { canvas: c, ctx }
}

function toTexture(canvas: HTMLCanvasElement, srgb: boolean): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.anisotropy = 4
  return tex
}

/** 回退：程序化海陆纹理（不是真实地球，仅保证可读性） */
export function makeFallbackEarthDay(): THREE.Texture {
  const W = 1024
  const H = 512
  const { canvas, ctx } = makeCanvas(W, H)
  const img = ctx.createImageData(W, H)
  const d = img.data
  for (let y = 0; y < H; y++) {
    const v = y / H
    for (let x = 0; x < W; x++) {
      const u = x / W
      // 纬度越高越容易出现陆地，模拟大陆集中在北半球
      const lat = (0.5 - v) * 2
      const n = fbm(u, v, 6, 5, 3.1) * 0.75 + fbm(u, v, 14, 3, 9.7) * 0.25
      const land = n + lat * 0.06
      const i = (y * W + x) * 4
      const ice = Math.abs(lat) > 0.86 ? 1 : 0
      if (ice) {
        d[i] = 232
        d[i + 1] = 238
        d[i + 2] = 244
      } else if (land > 0.52) {
        const t = Math.min(1, (land - 0.52) / 0.28)
        d[i] = 78 + t * 92
        d[i + 1] = 104 + t * 62
        d[i + 2] = 56 + t * 40
      } else {
        const deep = Math.min(1, (0.52 - land) / 0.3)
        d[i] = 12 + (1 - deep) * 30
        d[i + 1] = 44 + (1 - deep) * 70
        d[i + 2] = 86 + (1 - deep) * 60
      }
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(canvas, true)
}

/** 回退：夜面灯光（稀疏暖色点） */
export function makeFallbackEarthNight(): THREE.Texture {
  const W = 1024
  const H = 512
  const { canvas, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 900; i++) {
    const u = Math.random()
    const v = 0.12 + Math.random() * 0.62
    const n = fbm(u, v, 6, 5, 3.1)
    if (n < 0.53) continue
    const x = u * W
    const y = v * H
    const r = 0.6 + Math.random() * 1.6
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3)
    g.addColorStop(0, 'rgba(255,220,150,0.95)')
    g.addColorStop(1, 'rgba(255,180,80,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  return toTexture(canvas, true)
}

/** 回退：云层（白噪声团块，黑底白云，可作为 alphaMap） */
export function makeFallbackClouds(): THREE.Texture {
  const W = 1024
  const H = 512
  const { canvas, ctx } = makeCanvas(W, H)
  const img = ctx.createImageData(W, H)
  const d = img.data
  for (let y = 0; y < H; y++) {
    const v = y / H
    for (let x = 0; x < W; x++) {
      const u = x / W
      const n = fbm(u * 1.0, v * 1.0, 8, 5, 21.3)
      const band = 0.5 + 0.35 * Math.cos((v - 0.5) * Math.PI * 3.2)
      let a = (n * band - 0.28) / 0.4
      a = Math.max(0, Math.min(1, a))
      const i = (y * W + x) * 4
      const c = 235 * a + 8
      d[i] = c
      d[i + 1] = c
      d[i + 2] = c
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(canvas, true)
}

/** 回退：太阳表面（湍流米粒组织） */
export function makeFallbackSun(): THREE.Texture {
  const W = 1024
  const H = 512
  const { canvas, ctx } = makeCanvas(W, H)
  const img = ctx.createImageData(W, H)
  const d = img.data
  for (let y = 0; y < H; y++) {
    const v = y / H
    for (let x = 0; x < W; x++) {
      const u = x / W
      const n = fbm(u, v, 18, 5, 5.5) * 0.6 + fbm(u, v, 44, 3, 17.2) * 0.4
      const t = Math.max(0, Math.min(1, n * 1.25))
      const i = (y * W + x) * 4
      d[i] = 210 + t * 45
      d[i + 1] = 120 + t * 120
      d[i + 2] = 30 + t * 90
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(canvas, true)
}

/** 程序化星空（备用天球纹理） */
export function makeFallbackStars(): THREE.Texture {
  const W = 1024
  const H = 512
  const { canvas, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#05070f'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * W
    const y = Math.random() * H
    const r = Math.random() * 1.1 + 0.2
    const a = Math.random() * 0.75 + 0.2
    ctx.fillStyle = `rgba(${210 + Math.random() * 45},${215 + Math.random() * 40},255,${a})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  return toTexture(canvas, true)
}

/** 程序化太阳光晕贴图（径向渐变，永远可用） */
export function makeGlowTexture(inner = 'rgba(255,226,160,0.95)', mid = 'rgba(255,170,70,0.35)'): THREE.Texture {
  const S = 512
  const { canvas, ctx } = makeCanvas(S, S)
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.18, mid)
  g.addColorStop(0.45, 'rgba(255,140,50,0.10)')
  g.addColorStop(1, 'rgba(255,120,40,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ─────────────────────────── 加载 ───────────────────────────

function loadTexture(
  loader: THREE.TextureLoader,
  name: string,
  srgb: boolean,
): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    loader.load(
      url(name),
      (tex) => {
        tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
        tex.wrapS = THREE.RepeatWrapping
        tex.anisotropy = 8
        resolve(tex)
      },
      undefined,
      () => resolve(null),
    )
  })
}

export interface LoadProgress {
  loaded: number
  total: number
  /** 正在加载的资源名（i18n 键，由界面翻译） */
  labelKey: MessageKey
}

/**
 * 加载全部纹理。任一失败即以程序化纹理替代，并在 fallbacks 中记录。
 * @param onProgress 进度回调，用于界面上的加载状态提示
 */
export async function loadTextures(onProgress?: (p: LoadProgress) => void): Promise<TextureBundle> {
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  const fallbacks: MessageKey[] = []

  const jobs: Array<{ key: keyof TextureBundle; file: string; srgb: boolean; labelKey: MessageKey }> = [
    { key: 'earthDay', file: 'earth_day.jpg', srgb: true, labelKey: 'tex.earthDay' },
    { key: 'earthNight', file: 'earth_night.jpg', srgb: true, labelKey: 'tex.earthNight' },
    { key: 'earthClouds', file: 'earth_clouds.jpg', srgb: true, labelKey: 'tex.clouds' },
    { key: 'earthNormal', file: 'earth_normal.jpg', srgb: false, labelKey: 'tex.normal' },
    { key: 'earthSpecular', file: 'earth_specular.jpg', srgb: false, labelKey: 'tex.specular' },
    { key: 'sun', file: 'sun.jpg', srgb: true, labelKey: 'tex.sun' },
    { key: 'stars', file: 'stars_milkyway.jpg', srgb: true, labelKey: 'tex.stars' },
  ]

  const result: Record<string, THREE.Texture | null> = {}
  let loaded = 0

  await Promise.all(
    jobs.map(async (job) => {
      const tex = await loadTexture(loader, job.file, job.srgb)
      result[job.key] = tex
      if (!tex) fallbacks.push(job.labelKey)
      loaded++
      onProgress?.({ loaded, total: jobs.length, labelKey: job.labelKey })
    }),
  )

  return {
    earthDay: result.earthDay ?? makeFallbackEarthDay(),
    earthNight: result.earthNight ?? makeFallbackEarthNight(),
    earthClouds: result.earthClouds ?? makeFallbackClouds(),
    earthNormal: result.earthNormal ?? null,
    earthSpecular: result.earthSpecular ?? null,
    sun: result.sun ?? makeFallbackSun(),
    stars: result.stars ?? makeFallbackStars(),
    fallbacks,
    ready: true,
  }
}

/** 释放纹理占用的显存 */
export function disposeTextures(t: TextureBundle | null) {
  if (!t) return
  for (const key of [
    'earthDay',
    'earthNight',
    'earthClouds',
    'earthNormal',
    'earthSpecular',
    'sun',
    'stars',
  ] as const) {
    const tex = t[key]
    if (tex) tex.dispose()
  }
}
