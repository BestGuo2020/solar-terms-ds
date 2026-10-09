/**
 * ΔT = TT − UT1 的估算
 *
 * 分两段处理：
 *
 * 1. **1973—2025 年用实测锚点值线性插值**（DELTA_T_ANCHORS，见 deltaTTable.ts）。
 *    这一段有 IERS / USNO 的直接观测，多来源交叉核对差异 ≤ 0.05 秒。
 *
 * 2. **其余年份用 Espenak & Meeus 分段多项式**，即 NASA 五千年日食月食目录
 *    （NASA/TP-2006-214141）给出的标准表达式，也是天文年历与节气推算中通行的
 *    ΔT 近似方法。
 *
 * 两段之间做平滑过渡（见 BLEND_* 常量）。这一点在 2025 年之后尤其重要：
 * E&M 多项式对 2025 年给出约 74.5 秒，而实测只有约 69.2 秒，
 * 相差约 5 秒。若直接切换，ΔT 会在一年内跳变 5 秒；平滑过渡把它摊到十年，
 * 折算成每年约 0.5 秒的变化率，与历史上 ΔT 的实际变化幅度相当。
 *
 * 几秒的 ΔT 偏差只会让交节时刻（世界时）产生同等量级的偏移，
 * 远小于本页标注的 ±1 分钟精度。
 */

import {
  DELTA_T_ANCHOR_FIRST,
  DELTA_T_ANCHOR_LAST,
  interpolateDeltaT,
} from './deltaTTable'

/** 锚点区间下沿的过渡长度（年） */
const BLEND_BELOW = 5
/** 锚点区间上沿的过渡长度（年）—— 2025 年后无实测值，故过渡长一些 */
const BLEND_ABOVE = 10

/** Espenak & Meeus 分段多项式（NASA/TP-2006-214141） */
function polynomialDeltaT(y: number): number {
  let t: number

  if (y < 1900) {
    // 超出本页支持范围，给出连续近似值以免出现断点
    const u = (y - 1820) / 100
    return -20 + 32 * u * u
  }
  if (y < 1920) {
    t = y - 1900
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t
  }
  if (y < 1941) {
    t = y - 1920
    return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t * t * t
  }
  if (y < 1961) {
    t = y - 1950
    return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547
  }
  if (y < 1986) {
    t = y - 1975
    return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718
  }
  if (y < 2005) {
    t = y - 2000
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t * t +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    )
  }
  if (y < 2050) {
    t = y - 2000
    return 62.92 + 0.32217 * t + 0.005589 * t * t
  }
  if (y < 2150) {
    const u = (y - 1820) / 100
    return -20 + 32 * u * u - 0.5628 * (2150 - y)
  }
  const u = (y - 1820) / 100
  return -20 + 32 * u * u
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** 返回指定年份（可含小数月）的 ΔT，单位：秒 */
export function deltaTSeconds(year: number, month = 7): number {
  // 用月中作为该月的代表时刻
  const y = year + (month - 0.5) / 12

  // ① 实测锚点区间
  const observed = interpolateDeltaT(y)
  if (observed !== null) return observed

  const polynomial = polynomialDeltaT(y)

  // ② 下沿过渡：锚点起点之前 BLEND_BELOW 年内与实测值混合
  if (y < DELTA_T_ANCHOR_FIRST) {
    const edge = interpolateDeltaT(DELTA_T_ANCHOR_FIRST)
    if (edge === null) return polynomial
    const w = clamp01((y - (DELTA_T_ANCHOR_FIRST - BLEND_BELOW)) / BLEND_BELOW)
    return polynomial * (1 - w) + edge * w
  }

  // ③ 上沿过渡：锚点终点之后 BLEND_ABOVE 年内与实测值混合
  const edge = interpolateDeltaT(DELTA_T_ANCHOR_LAST)
  if (edge === null) return polynomial
  const w = clamp01((y - DELTA_T_ANCHOR_LAST) / BLEND_ABOVE)
  return edge * (1 - w) + polynomial * w
}

/** ΔT 折算为天 */
export function deltaTDays(year: number, month = 7): number {
  return deltaTSeconds(year, month) / 86400
}

/** 供界面说明使用：当前的 ΔT 来源描述 */
export const DELTA_T_SOURCE = {
  observedRange: `${DELTA_T_ANCHOR_FIRST}—${DELTA_T_ANCHOR_LAST}`,
  blendBelow: BLEND_BELOW,
  blendAbove: BLEND_ABOVE,
} as const
