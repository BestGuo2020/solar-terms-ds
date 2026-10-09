/**
 * 二十四节气交节时刻求解
 *
 * 二十四节气以**太阳地心视黄经**定义：春分 0°、夏至 90°、秋分 180°、冬至 270°，
 * 相邻节气相差 15°。因此求交节时刻等价于反解方程
 *
 *     λ☉(t) = 目标黄经
 *
 * 其中 λ☉ 由 VSOP87 截断级数 + 章动 + 光行差给出（见 sun.ts）。
 *
 * 解法：以「太阳黄经平均每 0.98564736°/日」为斜率的牛顿迭代。
 * 真实角速度在 ±3.4% 之间变化（近日点快、远日点慢），故迭代以约 0.03 的
 * 比率收敛，初值即使偏差 5 天，6 次迭代后残差也可忽略。
 *
 * **绝不是把一年平分成 24 段**：自 1645 年《时宪历》起中国即改用定气法，
 * 各节气间隔在 14.7—15.7 日之间变化。
 */

import { TERMS, type Season, type TermBase } from '../data/terms'
import { deltaTSeconds } from './deltaT'
import { DEG, julianDayFromUnix, sunApparentLongitude, unixFromJulianDay } from './sun'
import { beijingParts, beijingYear, fromBeijing } from './time'

/**
 * 正常支持的年份范围。
 *
 * 不是拍脑袋定的，两头各有依据：
 *  · 下沿 −2000 年：VSOP87 的行星理论在这一带仍有一角秒级的表现，
 *    再往前误差增长较快；
 *  · 上沿 +6000 年：ΔT 的外推值到这一年已达约 5 小时，
 *    「交节时刻」尚可标注，但再往后 ΔT 会超过一天，连公历**日期**都不再可靠
 *    （见 scripts/longterm-report.cjs 的实测数据）。
 *
 * 区间之内按 `precisionAt()` 分级标注精度；这不是硬墙，
 * 而是「我们敢为结果负责」的边界。
 */
export const YEAR_MIN = -2000
export const YEAR_MAX = 6000

/** 兼容旧名（原先只有 1900—2100） */
export const MIN_YEAR = YEAR_MIN
export const MAX_YEAR = YEAR_MAX

export type PrecisionLevel = 'A' | 'B' | 'C' | 'D'

export interface PrecisionInfo {
  level: PrecisionLevel
  /** 交节时刻的精度说法 */
  timeLabel: string
  /** 公历日期是否仍然可靠 */
  dateReliable: boolean
  /** 一句话说明这一档的依据 */
  note: string
}

/**
 * 按年份给出精度等级。
 * 依据来自 scripts/longterm-report.cjs 实测的 ΔT 量级与 VSOP87 截断级数的适用范围。
 */
export function precisionAt(year: number): PrecisionInfo {
  const y = Math.round(year)
  if (y >= 1900 && y <= 2100) {
    return {
      level: 'A',
      timeLabel: '±1 分钟',
      dateReliable: true,
      note: 'ΔT 使用 1973—2025 年实测锚点，并与日本国立天文台《暦要項》逐条比对。',
    }
  }
  if ((y >= 1000 && y < 1900) || (y > 2100 && y <= 2400)) {
    return {
      level: 'B',
      timeLabel: '约 ±5 分钟',
      dateReliable: true,
      note: 'ΔT 由分段多项式给出，量级在几分钟；VSOP87 截断级数在此区间表现良好。',
    }
  }
  if ((y >= -500 && y < 1000) || (y > 2400 && y <= 3000)) {
    return {
      level: 'C',
      timeLabel: '约 ±30 分钟',
      dateReliable: true,
      note: 'ΔT 的外推开始占主导（公元 3000 年已达约 74 分钟），时刻误差相应放大，日期仍可靠。',
    }
  }
  return {
    level: 'D',
    timeLabel: '数小时量级',
    dateReliable: true,
    note:
      'ΔT 外推值达数小时（公元 6000 年约 5 小时），交节时刻只能作趋势参考；' +
      '公历日期仍然正确。再往后 ΔT 会超过一天，届时连日期也不可靠，故不在此范围内提供。',
  }
}

/** 页面当前支持的年份范围（用于界面上的说明文字） */
export const YEAR_RANGE_TEXT = `${YEAR_MIN} — ${YEAR_MAX} 年`


/** 太阳黄经的平均变化率（度/日） */
const MEAN_RATE_DEG_PER_DAY = 0.98564736
/** 回归年长度（日） */
const TROPICAL_YEAR_DAYS = 365.2422
const DAY_MS = 86400000

export interface TermMoment {
  index: number
  name: string
  /** 太阳地心视黄经（度） */
  longitude: number
  season: Season
  major: boolean
  pinyin: string
  /** 交节瞬间（Unix 毫秒，UTC） */
  ms: number
  /** 交节瞬间的儒略日（力学时 TT） */
  jde: number
}

/** 由黄经给出当年近似的年内序号（1 月 1 日 = 1），仅用作牛顿迭代初值 */
function approximateDayOfYear(longitude: number): number {
  const raw = 79 + longitude / MEAN_RATE_DEG_PER_DAY
  // 折算回 [1, 回归年长度] 区间
  const wrapped = (((raw - 1) % TROPICAL_YEAR_DAYS) + TROPICAL_YEAR_DAYS) % TROPICAL_YEAR_DAYS
  return wrapped + 1
}

/** 以固定斜率做牛顿迭代，反解 λ☉ = target 的儒略日（TT） */
function solveTermJde(guessMs: number, targetDeg: number): number {
  const target = targetDeg * DEG
  const slope = MEAN_RATE_DEG_PER_DAY * DEG
  let jde = julianDayFromUnix(guessMs)
  for (let i = 0; i < 30; i++) {
    const lam = sunApparentLongitude(jde)
    // 归一到 (−π, π]，避免 0°/360° 处跳变
    const diff = Math.atan2(Math.sin(lam - target), Math.cos(lam - target))
    if (Math.abs(diff) < 1e-11) break
    jde -= diff / slope
  }
  return jde
}

/** 求某个节气在指定公历年的交节时刻（北京时间所属年份 = year） */
function computeTermMoment(year: number, base: TermBase): TermMoment {
  const doy = approximateDayOfYear(base.longitude)
  let guessMs = fromBeijing(year, 1, 1) + (doy - 1) * DAY_MS

  let jde = solveTermJde(guessMs, base.longitude)
  let ms = toUtcMs(jde)

  // 边界保护：若解落到相邻公历年（理论上不会，因初值已在数日内），平移一个回归年重解
  for (let guard = 0; guard < 4; guard++) {
    const y = beijingYear(ms)
    if (y === year) break
    const shift = (year - y) * TROPICAL_YEAR_DAYS * DAY_MS
    guessMs += shift
    jde = solveTermJde(guessMs, base.longitude)
    ms = toUtcMs(jde)
  }

  return {
    index: base.index,
    name: base.name,
    longitude: base.longitude,
    season: base.season,
    major: base.major,
    pinyin: base.pinyin,
    ms,
    jde,
  }
}

/** 力学时儒略日（TT）→ Unix 毫秒（UTC）：先减去 ΔT */
function toUtcMs(jde: number): number {
  const approx = unixFromJulianDay(jde)
  const p = beijingParts(approx)
  const dt = deltaTSeconds(p.year, p.month)
  return approx - dt * 1000
}

const yearCache = new Map<number, TermMoment[]>()

/** 某公历年内 24 个节气，按时间先后排序（小寒 → 大寒 → 立春 → … → 冬至） */
export function solarTermsOfYear(year: number): TermMoment[] {
  const cached = yearCache.get(year)
  if (cached) return cached
  const list = TERMS.map((t) => computeTermMoment(year, t)).sort((a, b) => a.ms - b.ms)
  if (yearCache.size > 400) yearCache.clear()
  yearCache.set(year, list)
  return list
}

/** 便于按节气序号取用：index 0..23 → 该年该节气的交节时刻 */
export function termMomentOfYear(year: number, index: number): TermMoment {
  const list = solarTermsOfYear(year)
  const found = list.find((t) => t.index === index)
  if (!found) throw new Error(`未找到节气 index=${index} year=${year}`)
  return found
}

export interface TermWindow {
  /** 当前已进入的节气区间（上一个已到达的交节时刻） */
  current: TermMoment
  /** 下一个节气 */
  next: TermMoment
  /** 当前区间起点（= current.ms） */
  startMs: number
  /** 当前区间终点（= next.ms） */
  endMs: number
  /** 已过去的毫秒数 */
  elapsedMs: number
  /** 距离下一节气的毫秒数 */
  remainingMs: number
  /** 区间进度 0—1 */
  progress: number
}

/**
 * 判定某个时刻「已进入哪个节气区间」。
 * 跨年与交节前后均正确：内部会取相邻三年的节气表再定位。
 */
export function activeTermAt(ms: number): TermWindow {
  const y = beijingYear(ms)
  // 三张表按时间先后衔接，本身就等价于合并排序后的序列，无需再拼数组排序
  const tables = [solarTermsOfYear(y - 1), solarTermsOfYear(y), solarTermsOfYear(y + 1)]

  let current: TermMoment | null = null
  let next: TermMoment | null = null
  outer: for (const list of tables) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].ms <= ms) {
        current = list[i]
      } else {
        next = list[i]
        break outer
      }
    }
  }
  // 兜底：极端情况下（不应发生）退化为该年首尾
  if (!current) current = tables[1][0]
  if (!next) next = tables[1][tables[1].length - 1]

  const span = next.ms - current.ms
  return {
    current,
    next,
    startMs: current.ms,
    endMs: next.ms,
    elapsedMs: ms - current.ms,
    remainingMs: next.ms - ms,
    progress: span > 0 ? Math.min(1, Math.max(0, (ms - current.ms) / span)) : 0,
  }
}

/** 指定时刻的太阳视黄经（度） */
export function sunLongitudeAtMs(ms: number): number {
  return sunApparentLongitude(sunJdeAtMs(ms)) / DEG
}

/** 指定时刻对应的力学时儒略日 */
export function sunJdeAtMs(ms: number): number {
  const p = beijingParts(ms)
  return julianDayFromUnix(ms) + deltaTSeconds(p.year, p.month) / 86400
}

/** 求某节气自某年起、大于给定时刻的最近一次交节（跨年查找用） */
export function nextOccurrence(index: number, afterMs: number): TermMoment {
  let y = beijingYear(afterMs)
  for (let i = 0; i < 3; i++) {
    const m = termMomentOfYear(y + i, index)
    if (m.ms > afterMs) return m
  }
  return termMomentOfYear(y + 3, index)
}
