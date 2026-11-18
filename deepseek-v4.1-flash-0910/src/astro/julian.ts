/**
 * 历法换算：公历（格里高利历）↔ 儒略日
 *
 * 为什么不直接用 JavaScript 的 Date？
 *   · `Date.UTC(y, …)` 在 0 ≤ y ≤ 99 时会把年份当成 19xx（`Date.UTC(50,0,1)` 得到 1950 年），
 *     这对「公元前 / 早期公元」的年份是致命的；
 *   · Date 的可表示范围止于 ±273 790 年左右，超出即 NaN；
 *   · Date 的语义绑在 Unix 纪元与 UTC 上，而天文计算需要的是**连续的儒略日**。
 *
 * 这里改用 Meeus《Astronomical Algorithms》第 7 章的算法自行换算，
 * 全程只用浮点数，因此**没有年份上限，也不会在 0—99 年出错**。
 *
 * 历法约定：一律使用**外推格里高利历（proleptic Gregorian）**，
 * 即把 1582 年 10 月 15 日才启用的格里高利历规则向前后无限延伸。
 * 这与 ISO 8601 一致，也便于跨千年比较。
 * 天文学年号约定：year 0 = 公元前 1 年，year −1 = 公元前 2 年。
 *
 * 参考：Jean Meeus, *Astronomical Algorithms*, 2nd ed., Chapter 7 "Julian Day"。
 */

/** Unix 纪元（1970-01-01T00:00:00Z）对应的儒略日 */
export const JD_UNIX_EPOCH = 2440587.5

/** 一天的毫秒数 */
export const MS_PER_DAY = 86400000

/** Unix 毫秒（UTC）→ 儒略日（UT） */
export function unixMsToJd(ms: number): number {
  return ms / MS_PER_DAY + JD_UNIX_EPOCH
}

/** 儒略日（UT）→ Unix 毫秒（UTC） */
export function jdToUnixMs(jd: number): number {
  return (jd - JD_UNIX_EPOCH) * MS_PER_DAY
}

/**
 * 公历日期 → 儒略日（外推格里高利历）。
 * @param day 可带小数（含时分秒）
 */
export function jdFromGregorian(year: number, month: number, day: number): number {
  let y = Math.floor(year)
  let m = Math.floor(month)
  if (m <= 2) {
    y -= 1
    m += 12
  }
  // 格里高利历的世纪修正项
  const a = Math.floor(y / 100)
  const b = 2 - a + Math.floor(a / 4)
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5
  )
}

export interface GregorianParts {
  /** 天文学年号：0 = 公元前 1 年 */
  year: number
  /** 1—12 */
  month: number
  /** 1—31 */
  day: number
  hour: number
  minute: number
  second: number
  /** 0=周日 … 6=周六 */
  weekday: number
}

/**
 * 儒略日 → 公历日期（外推格里高利历）。
 * 与 `jdFromGregorian` 严格互逆。
 */
export function gregorianFromJd(jd: number): GregorianParts {
  const z = Math.floor(jd + 0.5)
  const f = jd + 0.5 - z

  const alpha = Math.floor((z - 1867216.25) / 36524.25)
  const a = z + 1 + alpha - Math.floor(alpha / 4)
  const b = a + 1524
  const c = Math.floor((b - 122.1) / 365.25)
  const d = Math.floor(365.25 * c)
  const e = Math.floor((b - d) / 30.6001)

  const dayWithFraction = b - d - Math.floor(30.6001 * e) + f
  const day = Math.floor(dayWithFraction)
  const frac = dayWithFraction - day

  const month = e < 14 ? e - 1 : e - 13
  const year = month > 2 ? c - 4716 : c - 4715

  // 用秒为单位拆分，避免浮点误差累积（先四舍五入到最接近的秒）
  let secondsOfDay = Math.round(frac * 86400)
  if (secondsOfDay >= 86400) secondsOfDay -= 86400

  // 儒略日 0 落在星期一（JD 0 = 公元前 4713 年 1 月 1 日 12h，为星期一）
  const weekday = (((z + 1) % 7) + 7) % 7

  return {
    year,
    month,
    day,
    hour: Math.floor(secondsOfDay / 3600),
    minute: Math.floor((secondsOfDay % 3600) / 60),
    second: secondsOfDay % 60,
    weekday,
  }
}

/**
 * 把年份格式化成中文习惯的写法。
 * 天文学年号 0 对应「公元前 1 年」，−1 对应「公元前 2 年」。
 */
export function formatYearCN(astronomicalYear: number): string {
  const y = Math.round(astronomicalYear)
  return y > 0 ? `${y} 年` : `公元前 ${1 - y} 年`
}

/**
 * 把年份写成 ISO 8601 的扩展形式（用于 <input type="number"> 之外的场合）。
 * 公元 1—9999 年用四位补零；其余年份按 ISO 8601 用带符号的扩展年。
 */
export function formatYearISO(astronomicalYear: number): string {
  const y = Math.round(astronomicalYear)
  if (y >= 0 && y <= 9999) return String(y).padStart(4, '0')
  return y < 0 ? `-${String(-y).padStart(6, '0')}` : `+${String(y).padStart(6, '0')}`
}
