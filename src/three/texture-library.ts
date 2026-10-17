import * as THREE from 'three'

export type TextureKey =
  | 'earthDay'
  | 'earthNight'
  | 'earthClouds'
  | 'earthNormal'
  | 'earthSpecular'
  | 'sun'
  | 'stars'

export interface TextureProgress {
  loaded: number
  total: number
  failures: string[]
}

interface TextureSpec {
  key: TextureKey
  file: string
  label: string
  srgb: boolean
  repeat: boolean
}

const SPECS: readonly TextureSpec[] = [
  { key: 'earthDay', file: 'earth_day.jpg', label: '地球昼面', srgb: true, repeat: true },
  { key: 'earthNight', file: 'earth_night.jpg', label: '地球夜面', srgb: true, repeat: true },
  { key: 'earthClouds', file: 'earth_clouds.jpg', label: '云层', srgb: true, repeat: true },
  { key: 'earthNormal', file: 'earth_normal.jpg', label: '地形法线', srgb: false, repeat: true },
  { key: 'earthSpecular', file: 'earth_specular.jpg', label: '海陆高光', srgb: false, repeat: true },
  { key: 'sun', file: 'sun.jpg', label: '太阳表面', srgb: true, repeat: true },
  { key: 'stars', file: 'stars_milkyway.jpg', label: '银河星图', srgb: true, repeat: false },
]

function canvas(width: number, height: number): HTMLCanvasElement {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return element
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

type LandBlob = readonly [x: number, y: number, rx: number, ry: number, rotation: number]

/** 仅用于纹理加载失败时的粗略陆地示意，不宣称地理精度。 */
const LAND_BLOBS: readonly LandBlob[] = [
  [0.19, 0.28, 0.09, 0.1, -0.2],
  [0.24, 0.38, 0.07, 0.12, 0.3],
  [0.17, 0.5, 0.04, 0.12, 0.2],
  [0.3, 0.62, 0.055, 0.14, -0.3],
  [0.45, 0.3, 0.06, 0.075, 0.2],
  [0.49, 0.45, 0.08, 0.16, 0.1],
  [0.6, 0.28, 0.17, 0.12, 0.1],
  [0.7, 0.42, 0.08, 0.08, -0.2],
  [0.79, 0.68, 0.07, 0.05, 0.2],
  [0.9, 0.67, 0.025, 0.04, -0.2],
]

function drawLand(ctx: CanvasRenderingContext2D, width: number, height: number, fill: string | CanvasGradient): void {
  ctx.fillStyle = fill
  for (const [x, y, rx, ry, rotation] of LAND_BLOBS) {
    ctx.beginPath()
    ctx.ellipse(x * width, y * height, rx * width, ry * height, rotation, 0, Math.PI * 2)
    ctx.fill()
    // 让陆地边缘不那么规则。
    ctx.beginPath()
    ctx.ellipse((x + rx * 0.45) * width, (y + ry * 0.25) * height, rx * width * 0.45, ry * height * 0.5, rotation, 0, Math.PI * 2)
    ctx.fill()
  }
  // 南极冰盖
  const ice = ctx.createLinearGradient(0, height * 0.88, 0, height)
  ice.addColorStop(0, 'rgba(235,242,244,0)')
  ice.addColorStop(1, 'rgba(235,242,244,0.95)')
  ctx.fillStyle = ice
  ctx.fillRect(0, height * 0.86, width, height * 0.14)
  // 北极冰盖
  const arctic = ctx.createLinearGradient(0, 0, 0, height * 0.12)
  arctic.addColorStop(0, 'rgba(235,242,244,0.95)')
  arctic.addColorStop(1, 'rgba(235,242,244,0)')
  ctx.fillStyle = arctic
  ctx.fillRect(0, 0, width, height * 0.12)
}

function fallbackEarthDay(): THREE.CanvasTexture {
  const width = 1024
  const height = 512
  const el = canvas(width, height)
  const ctx = el.getContext('2d')!
  const ocean = ctx.createLinearGradient(0, 0, 0, height)
  ocean.addColorStop(0, '#123f60')
  ocean.addColorStop(0.48, '#104767')
  ocean.addColorStop(1, '#0a2f4d')
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, width, height)
  const land = ctx.createLinearGradient(0, height * 0.2, width, height * 0.8)
  land.addColorStop(0, '#6d7e54')
  land.addColorStop(0.45, '#8d875b')
  land.addColorStop(1, '#567450')
  drawLand(ctx, width, height, land)
  // 轻微的云与地表起伏
  const random = seededRandom(24)
  ctx.globalAlpha = 0.06
  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#d8c28b'
    ctx.beginPath()
    ctx.ellipse(random() * width, random() * height, 6 + random() * 26, 2 + random() * 8, random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  const texture = new THREE.CanvasTexture(el)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function fallbackEarthNight(): THREE.CanvasTexture {
  const width = 1024
  const height = 512
  const el = canvas(width, height)
  const ctx = el.getContext('2d')!
  ctx.fillStyle = '#000408'
  ctx.fillRect(0, 0, width, height)
  const random = seededRandom(104)
  for (let i = 0; i < 900; i += 1) {
    const x = random() * width
    const y = (0.18 + random() * 0.64) * height
    const alpha = 0.15 + random() * 0.8
    ctx.fillStyle = `rgba(255, 205, 130, ${alpha})`
    ctx.fillRect(x, y, random() < 0.86 ? 1 : 2.2, random() < 0.86 ? 1 : 2.2)
  }
  const texture = new THREE.CanvasTexture(el)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function fallbackClouds(): THREE.CanvasTexture {
  const width = 1024
  const height = 512
  const el = canvas(width, height)
  const ctx = el.getContext('2d')!
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)
  const random = seededRandom(940)
  for (let i = 0; i < 100; i += 1) {
    const x = random() * width
    const y = (0.1 + random() * 0.8) * height
    const rx = 20 + random() * 100
    const ry = 5 + random() * 22
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, rx)
    gradient.addColorStop(0, `rgba(255,255,255,${0.22 + random() * 0.4})`)
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(random() * Math.PI)
    ctx.translate(-x, -y)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  const texture = new THREE.CanvasTexture(el)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function fallbackNormal(): THREE.CanvasTexture {
  const el = canvas(2, 2)
  const ctx = el.getContext('2d')!
  ctx.fillStyle = 'rgb(128,128,255)'
  ctx.fillRect(0, 0, 2, 2)
  const texture = new THREE.CanvasTexture(el)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function fallbackSpecular(): THREE.CanvasTexture {
  const width = 512
  const height = 256
  const el = canvas(width, height)
  const ctx = el.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  drawLand(ctx, width, height, '#151515')
  const texture = new THREE.CanvasTexture(el)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function fallbackSun(): THREE.CanvasTexture {
  const width = 1024
  const height = 512
  const el = canvas(width, height)
  const ctx = el.getContext('2d')!
  const base = ctx.createLinearGradient(0, 0, 0, height)
  base.addColorStop(0, '#ffd474')
  base.addColorStop(0.5, '#f8a83f')
  base.addColorStop(1, '#d86b24')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)
  const random = seededRandom(66)
  for (let i = 0; i < 1400; i += 1) {
    const x = random() * width
    const y = random() * height
    const radius = 2 + random() * 16
    ctx.fillStyle = `rgba(${255},${120 + random() * 120},${30 + random() * 60},${0.03 + random() * 0.2})`
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(el)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function fallbackStars(): THREE.CanvasTexture {
  const width = 1024
  const height = 512
  const el = canvas(width, height)
  const ctx = el.getContext('2d')!
  ctx.fillStyle = '#01030a'
  ctx.fillRect(0, 0, width, height)
  const random = seededRandom(818)
  const band = ctx.createLinearGradient(0, height * 0.42, width, height * 0.6)
  band.addColorStop(0, 'rgba(110,130,160,0)')
  band.addColorStop(0.5, 'rgba(130,145,175,0.16)')
  band.addColorStop(1, 'rgba(110,130,160,0)')
  ctx.fillStyle = band
  ctx.fillRect(0, height * 0.34, width, height * 0.28)
  for (let i = 0; i < 1600; i += 1) {
    const x = random() * width
    const y = random() * height
    const size = random() < 0.94 ? 0.5 + random() * 1.2 : 1.5 + random() * 1.8
    const alpha = 0.25 + random() * 0.75
    ctx.fillStyle = `rgba(${210 + random() * 45},${220 + random() * 35},${240},${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(el)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createStarDotTexture(): THREE.CanvasTexture {
  const el = canvas(64, 64)
  const ctx = el.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.24, 'rgba(255,246,218,0.85)')
  gradient.addColorStop(0.6, 'rgba(170,196,220,0.18)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(el)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createSunGlowTexture(): THREE.CanvasTexture {
  const el = canvas(256, 256)
  const ctx = el.getContext('2d')!
  const gradient = ctx.createRadialGradient(128, 128, 4, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,248,215,1)')
  gradient.addColorStop(0.12, 'rgba(255,214,130,0.9)')
  gradient.addColorStop(0.34, 'rgba(247,164,71,0.35)')
  gradient.addColorStop(0.65, 'rgba(201,112,45,0.09)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(el)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createOrbitDiscTexture(): THREE.CanvasTexture {
  const size = 512
  const el = canvas(size, size)
  const ctx = el.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.26, size / 2, size / 2, size * 0.5)
  gradient.addColorStop(0, 'rgba(40,78,74,0)')
  gradient.addColorStop(0.55, 'rgba(59,100,89,0.05)')
  gradient.addColorStop(0.78, 'rgba(83,111,94,0.14)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(el)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class TextureLibrary {
  readonly textures: Record<TextureKey, THREE.Texture>
  readonly fallbackTextures: Record<TextureKey, THREE.Texture>
  readonly realTextures = new Map<TextureKey, THREE.Texture>()
  readonly failures: string[] = []
  private disposed = false
  private readonly baseUrl: string
  private readonly maxAnisotropy: number

  constructor(baseUrl: string, maxAnisotropy: number) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    this.maxAnisotropy = maxAnisotropy
    const fallbacks: Record<TextureKey, THREE.Texture> = {
      earthDay: fallbackEarthDay(),
      earthNight: fallbackEarthNight(),
      earthClouds: fallbackClouds(),
      earthNormal: fallbackNormal(),
      earthSpecular: fallbackSpecular(),
      sun: fallbackSun(),
      stars: fallbackStars(),
    }
    this.fallbackTextures = fallbacks
    this.textures = { ...fallbacks }
  }

  async loadAll(onProgress: (progress: TextureProgress) => void): Promise<TextureProgress> {
    const total = SPECS.length
    let loaded = 0
    const failures: string[] = []
    const report = () => onProgress({ loaded, total, failures: [...failures] })
    report()

    const loadOne = (spec: TextureSpec): Promise<void> =>
      new Promise((resolve) => {
        let settled = false
        const finish = (texture?: THREE.Texture, error?: boolean) => {
          if (settled) return
          settled = true
          loaded += 1
          if (error || !texture) {
            failures.push(spec.label)
          } else {
            if (this.disposed) {
              texture.dispose()
            } else {
              texture.colorSpace = spec.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
              texture.wrapS = spec.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
              texture.wrapT = THREE.RepeatWrapping
              texture.anisotropy = this.maxAnisotropy
              texture.needsUpdate = true
              this.textures[spec.key] = texture
              this.realTextures.set(spec.key, texture)
            }
          }
          report()
          resolve()
        }

        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin('anonymous')
        const timer = window.setTimeout(() => finish(undefined, true), 12_000)
        loader.load(
          `${this.baseUrl}${spec.file}`,
          (texture) => {
            window.clearTimeout(timer)
            finish(texture)
          },
          undefined,
          () => {
            window.clearTimeout(timer)
            finish(undefined, true)
          },
        )
      })

    await Promise.all(SPECS.map(loadOne))
    this.failures.splice(0, this.failures.length, ...failures)
    return { loaded, total, failures: [...failures] }
  }

  dispose(): void {
    this.disposed = true
    const all = new Set<THREE.Texture>([
      ...Object.values(this.textures),
      ...Object.values(this.fallbackTextures),
    ])
    for (const texture of all) texture.dispose()
    this.realTextures.clear()
  }
}
