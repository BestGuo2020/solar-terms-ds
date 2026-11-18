/**
 * 3D 场景常量与配色
 *
 * ⚠️ 尺寸与距离不按真实比例 ⚠️
 *   真实比例下 1 AU ≈ 215 个太阳半径、地球半径只有太阳的 1/109。
 *   若严格按比例，地球在屏幕上会小于一个像素。因此这里把太阳与地球
 *   都显著放大、把日地距离显著缩短。**天体的大小与距离不按实际比例**，
 *   但**方向、角度、黄经位置与光照关系严格按天体力学计算**——
 *   地轴 23.44° 的倾角、轨道面的方位、受光面的朝向都是真实的。
 *   轨道则保留了真实的近圆椭圆特征（见 sceneFrame 与 Orbit 模块）。
 */

export const SCENE = {
  /** 1 天文单位对应的场景长度 */
  auScale: 44,
  /** 太阳半径（场景单位，非真实比例） */
  sunRadius: 3.4,
  /** 地球半径（场景单位，非真实比例）。放大以便在轨道总览下也能一眼找到地球 */
  earthRadius: 1.6,
  /** 云层球半径系数 */
  cloudScale: 1.006,
  /** 大气辉光球半径系数 */
  atmosphereScale: 1.06,
  /** 星空天球半径 */
  skyRadius: 900,
  /** 公转方向指示箭头所在的轨道角度（场景方位角，度） */
  revolutionArrowAt: 205,
} as const

/** 传统配色（克制的中国色） */
export const PALETTE = {
  /** 墨蓝夜色 */
  ink: 0x070a12,
  /** 描金 */
  gold: 0xd8b271,
  /** 淡金 */
  goldSoft: 0xb99a63,
  /** 朱砂 */
  vermilion: 0xc0503a,
  /** 石青 */
  azure: 0x4a86b8,
  /** 青碧 */
  jade: 0x5f9e8f,
  /** 宣纸米 */
  paper: 0xe9dfc9,
  /** 轨道线 */
  orbit: 0x4a5a78,
  /** 当前节气区间高亮 */
  arcActive: 0xd8b271,
} as const

/** 节气在场景中的颜色（按季节） */
export const SEASON_COLORS: Record<string, number> = {
  春: 0x6fbf7a,
  夏: 0xd8a24a,
  秋: 0xc87a4a,
  冬: 0x6f9fd8,
}

/** 画质档位 */
export type QualityTier = 'high' | 'medium' | 'low'

export interface QualitySettings {
  tier: QualityTier
  /** 球体分段数 */
  sphereSegments: number
  /** 云层与大气是否启用 */
  clouds: boolean
  atmosphere: boolean
  /** 每帧最多渲染的星空点数 */
  starCount: number
  /** 像素比上限 */
  maxPixelRatio: number
  /** 是否启用抗锯齿 */
  antialias: boolean
  /** 节气标签：是否显示次要节气名称 */
  minorLabels: boolean
}

/** 依据设备能力挑选画质档位 */
export function detectQuality(): QualitySettings {
  const nav = typeof navigator === 'undefined' ? null : navigator
  const ua = nav?.userAgent ?? ''
  const maxTouch = nav?.maxTouchPoints ?? 0
  // iPadOS 13+ 的 Safari 默认伪装成 Macintosh，只能靠触摸点数识别
  const isIPadOS = /Macintosh/.test(ua) && maxTouch > 1
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MiuiBrowser|UCBrowser|Quark/i.test(ua) || isIPadOS
  const cores = nav?.hardwareConcurrency || 4
  const mem = (nav as unknown as { deviceMemory?: number })?.deviceMemory ?? 8
  const smallScreen =
    typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 520
  const reduced =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  if (isMobile && (cores <= 4 || mem <= 4)) {
    // 省电档：降低球体分段与星空点数，限制像素比。
    // 抗锯齿保留 —— 移动 GPU 普遍是瓦片式渲染，MSAA 代价很低，
    // 关掉反而会让轨道线与节气标记出现明显的锯齿。
    return {
      tier: 'low',
      sphereSegments: 48,
      clouds: true,
      atmosphere: true,
      starCount: 700,
      maxPixelRatio: 1.75,
      antialias: true,
      minorLabels: false,
    }
  }
  if (isMobile || cores <= 6 || reduced || smallScreen) {
    return {
      tier: 'medium',
      sphereSegments: 64,
      clouds: true,
      atmosphere: true,
      starCount: 1600,
      maxPixelRatio: 2,
      antialias: true,
      // 小屏上 24 个标签会挤成一团、互相压住，默认只显示四个分至点
      // （用户可在「辅助选项」里打开全部）
      minorLabels: !smallScreen,
    }
  }
  return {
    tier: 'high',
    sphereSegments: 96,
    clouds: true,
    atmosphere: true,
    starCount: 3000,
    maxPixelRatio: 2,
    antialias: true,
    minorLabels: !smallScreen,
  }
}
