import { SearchSunLongitude, Seasons, SiderealTime, SunPosition } from 'astronomy-engine'
import { SOLAR_TERMS, normalizeLongitude, termByIndex } from '../data/term-catalog.ts'
import type { ActiveTermWindow, SolarSnapshot, SolarTerm, TermOccurrence } from '../data/types.ts'
import { DAY_MS, beijingParts, beijingYear } from './beijing-time.ts'

/**
 * 支持用户选择的年份。界面上不开放此范围之外的年份。
 * 为了给 1 月/12 月判定“上一节气 / 下一节气”，内部允许计算相邻一年。
 */
export const SUPPORTED_YEAR_MIN = 1900
export const SUPPORTED_YEAR_MAX = 2100
const INTERNAL_YEAR_MIN = SUPPORTED_YEAR_MIN - 1
const INTERNAL_YEAR_MAX = SUPPORTED_YEAR_MAX + 1

const TROPICAL_YEAR_DAYS = 365.2422
const SEARCH_WINDOW_DAYS = 30
const DAYS_BEFORE_GUESS = 12
const rad = Math.PI / 180
const norm180 = (degrees: number): number => {
  let value = normalizeLongitude(degrees)
  if (value > 180) value -= 360
  return value
}

const termCache = new Map<number, readonly TermOccurrence[]>()
const termByYearIndexCache = new Map<number, ReadonlyMap<number, TermOccurrence>>()
const seasonAnchorCache = new Map<number, number>()

function assertYear(year: number): void {
  if (!Number.isInteger(year) || year < INTERNAL_YEAR_MIN || year > INTERNAL_YEAR_MAX) {
    throw new RangeError(`Solar-term year out of internal range: ${year}`)
  }
}

/** 以当年春分作为平均运动的基准点，仅用于给精确求根提供搜索窗口。 */
function marchEquinoxMs(year: number): number {
  const cached = seasonAnchorCache.get(year)
  if (cached !== undefined) return cached
  const anchor = Seasons(year).mar_equinox.date.getTime()
  seasonAnchorCache.set(year, anchor)
  return anchor
}

/**
 * 计算某节气在某个公历年内的交节时刻。
 *
 * 输出并非平均切分：先利用春分点与太阳平均角速度估计一个 ±十几天的窗口，
 * 再由 Astronomy Engine 的 SearchSunLongitude 精确求太阳视黄经到达目标值的瞬间。
 * 对四立、二分二至及 12 个中气一视同仁，没有固定日期表。
 */
function solveOccurrence(year: number, term: SolarTerm): TermOccurrence {
  let offsetDays = (term.longitude / 360) * TROPICAL_YEAR_DAYS
  // 小寒到惊蛰发生在当年春分之前，以上一年的春分为基准估算。
  if (term.longitude > 270) offsetDays -= TROPICAL_YEAR_DAYS
  const guessMs = marchEquinoxMs(year) + (offsetDays - DAYS_BEFORE_GUESS) * DAY_MS
  let found = SearchSunLongitude(
    term.longitude % 360,
    new Date(guessMs),
    SEARCH_WINDOW_DAYS,
  )
  if (!found) {
    // 理论上不会发生；扩大窗口后仍找不到则显式报错，而不是退化为固定日期。
    found = SearchSunLongitude(
      term.longitude % 360,
      new Date(guessMs - 10 * DAY_MS),
      SEARCH_WINDOW_DAYS + 20,
    )
  }
  if (!found) throw new Error(`Cannot solve solar term ${term.name} for ${year}`)

  let ms = found.date.getTime()
  let eventYear = beijingParts(ms).year
  for (let guard = 0; guard < 3 && eventYear !== year; guard += 1) {
    const shift = (year - eventYear) * TROPICAL_YEAR_DAYS * DAY_MS
    const retry = SearchSunLongitude(
      term.longitude % 360,
      new Date(ms + shift - 3 * DAY_MS),
      SEARCH_WINDOW_DAYS,
    )
    if (!retry) break
    ms = retry.date.getTime()
    eventYear = beijingParts(ms).year
  }
  if (eventYear !== year) {
    throw new Error(`Solved ${term.name} outside year ${year}: ${new Date(ms).toISOString()}`)
  }
  return { term, ms }
}

/** 某公历年内的 24 个节气，按真实交节时刻排序（小寒 → … → 冬至）。 */
export function solarTermsOfYear(year: number): readonly TermOccurrence[] {
  assertYear(year)
  const cached = termCache.get(year)
  if (cached) return cached
  const occurrences = SOLAR_TERMS.map((term) => solveOccurrence(year, term)).sort(
    (a, b) => a.ms - b.ms,
  )
  termCache.set(year, occurrences)
  return occurrences
}

export function termOccurrencesByIndex(year: number): ReadonlyMap<number, TermOccurrence> {
  assertYear(year)
  const cached = termByYearIndexCache.get(year)
  if (cached) return cached
  const map = new Map<number, TermOccurrence>()
  for (const occurrence of solarTermsOfYear(year)) map.set(occurrence.term.index, occurrence)
  termByYearIndexCache.set(year, map)
  return map
}

/** 某公历年的某个节气交节时刻。 */
export function termInstantInYear(year: number, termIndex: number): TermOccurrence {
  const occurrence = termOccurrencesByIndex(year).get(termIndex)
  if (!occurrence) throw new Error(`Missing term ${termIndex} in ${year}`)
  return occurrence
}

/**
 * 判断某个时刻已进入的节气区间。
 * 把前后三年一起纳入判断，因此跨年、交节时刻前后 1 毫秒都保持正确。
 */
export function activeTermAt(ms: number): ActiveTermWindow {
  const year = beijingYear(ms)
  let current: TermOccurrence | null = null
  let next: TermOccurrence | null = null

  for (const candidateYear of [year - 1, year, year + 1]) {
    if (candidateYear < INTERNAL_YEAR_MIN || candidateYear > INTERNAL_YEAR_MAX) continue
    const terms = solarTermsOfYear(candidateYear)
    for (const occurrence of terms) {
      if (occurrence.ms <= ms) {
        current = occurrence
      } else if (!next) {
        next = occurrence
        break
      }
    }
    if (next) break
  }

  // 兜底只会在极端边界触发，不应影响正常年份。
  if (!current) current = solarTermsOfYear(Math.max(INTERNAL_YEAR_MIN, year))[0]
  if (!next) {
    const tail = solarTermsOfYear(Math.min(INTERNAL_YEAR_MAX, year + 1))
    next = tail[tail.length - 1]
  }

  const span = next.ms - current.ms
  return {
    current,
    next,
    elapsedMs: Math.max(0, ms - current.ms),
    remainingMs: Math.max(0, next.ms - ms),
    progress: span > 0 ? Math.min(1, Math.max(0, (ms - current.ms) / span)) : 0,
  }
}

/**
 * 某一时刻太阳的地心视黄经与太阳直射点信息。
 * 太阳视黄经来自 Astronomy Engine 的 SunPosition（真实黄道、含章动与光行差）。
 */
export function solarStateAt(ms: number): SolarSnapshot {
  const date = new Date(ms)
  const position = SunPosition(date)
  const sunLongitude = normalizeLongitude(position.elon)
  const T = ((ms / DAY_MS + 2440587.5) - 2451545.0) / 36525
  // Meeus 22.3 的平黄赤交角；章动对该处小于一角秒，肉眼/说明层面可忽略。
  const arcsec = 21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T
  const obliquity = (23 + 26 / 60 + arcsec / 3600) * rad
  const lambda = position.elon * rad
  const ra = Math.atan2(Math.cos(obliquity) * Math.sin(lambda), Math.cos(lambda)) / rad
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(lambda)) / rad
  const gast = normalizeLongitude(SiderealTime(date) * 15)
  const subsolarLongitude = norm180(ra - gast)
  const distance = Math.hypot(position.vec.x, position.vec.y, position.vec.z)
  return {
    sunLongitude,
    sunDistanceAU: distance,
    declination,
    subsolarLongitude,
    isNorthward: sunLongitude >= 270 || sunLongitude < 90,
  }
}

/** 黄经在某两个节气之间的现实进度，用于验证与调试。 */
export function currentTermNameAt(ms: number): string {
  return activeTermAt(ms).current.term.name
}

export function isValidSupportedYear(year: number): boolean {
  return Number.isInteger(year) && year >= SUPPORTED_YEAR_MIN && year <= SUPPORTED_YEAR_MAX
}

/** 把黄经归一化并给出传统顺序中的节气名称，供界面辅助显示。 */
export function nearestTermAtLongitude(longitude: number): SolarTerm {
  const normalized = normalizeLongitude(longitude)
  let best = termByIndex(0)
  let bestDistance = 360
  for (const term of SOLAR_TERMS) {
    let distance = Math.abs(normalized - term.longitude)
    distance = Math.min(distance, 360 - distance)
    if (distance < bestDistance) {
      bestDistance = distance
      best = term
    }
  }
  return best
}
