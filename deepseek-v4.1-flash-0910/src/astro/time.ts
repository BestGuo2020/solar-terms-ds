/**
 * 北京时间（UTC+8）工具
 *
 * 说明：
 *  · 中国自 1991 年夏令时结束后全年 UTC+8；官方天文年历（紫金山天文台《中国天文年历》）
 *    发布节气时刻时统一使用东经 120° 标准时。为保证与官方表格一致，
 *    本页在全时段统一采用固定 UTC+8，而不套用历史上的夏令时规则。
 *  · 内部**不使用 JavaScript 的 Date 对象**做历法换算，而是走 `julian.ts` 的
 *    儒略日算法。Date 在 0—99 年会被当成 19xx，且可表示范围止于 ±27 万年左右；
 *    改用儒略日后，年份不再有上限，也能正确处理公元前的年份。
 */

import {
  formatYearCN as formatAstronomicalYearCN,
  formatYearISO,
  gregorianFromJd,
  jdFromGregorian,
  jdToUnixMs,
  unixMsToJd,
} from './julian'

/** 只有两种语言，天文层不想依赖 i18n 模块，故在这里就地声明 */
export type DisplayLocale = 'zh' | 'en'

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_EN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS_EN_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** 「2025 年」「公元前 501 年」/「2025」「501 BCE」 */
function yearLabel(year: number, locale: DisplayLocale): string {
  if (locale === 'en') {
    return year > 0 ? String(year) : `${1 - year} BCE`
  }
  return formatAstronomicalYearCN(year)
}

export const BEIJING_OFFSET_MS = 8 * 3600 * 1000

/** UTC+8 对应的小数日偏移 */
const BEIJING_OFFSET_DAYS = BEIJING_OFFSET_MS / 86400000

export interface ClockParts {
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

/** Unix 毫秒（UTC）→ 北京时间各字段 */
export function beijingParts(ms: number): ClockParts {
  const p = gregorianFromJd(unixMsToJd(ms) + BEIJING_OFFSET_DAYS)
  return {
    year: p.year,
    month: p.month,
    day: p.day,
    hour: p.hour,
    minute: p.minute,
    second: p.second,
    weekday: p.weekday,
  }
}

/** 北京时间各字段 → Unix 毫秒（UTC） */
export function fromBeijing(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number {
  const fractionalDay = day + (hour * 3600 + minute * 60 + second) / 86400
  const jd = jdFromGregorian(year, month, fractionalDay) - BEIJING_OFFSET_DAYS
  // 儒略日是浮点数，直接换算会得到 …5999.9998 这类值，
  // 而 Unix 毫秒是整数；不四舍五入的话「11:06:00」会被读成「11:05:59.999」。
  return Math.round(jdToUnixMs(jd))
}

/** 取北京时间所属年份 */
export function beijingYear(ms: number): number {
  return gregorianFromJd(unixMsToJd(ms) + BEIJING_OFFSET_DAYS).year
}

/** 北京时间的年内序号（1 月 1 日 = 1） */
export function beijingDayOfYear(ms: number): number {
  const p = beijingParts(ms)
  const start = fromBeijing(p.year, 1, 1)
  return Math.floor((ms - start) / 86400000) + 1
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function weekdayLabel(ms: number, locale: DisplayLocale = 'zh', short = false): string {
  const w = beijingParts(ms).weekday
  if (locale === 'en') return short ? WEEKDAYS_EN_SHORT[w] : WEEKDAYS_EN[w]
  return '星期' + WEEKDAYS[w]
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** 年份是否落在常用四位年份区间内（决定用哪种格式书写） */
function isCommonEra4Digit(year: number): boolean {
  return year >= 1 && year <= 9999
}

/** 中文「2025年3月20日」/ 英文「20 March 2025」 */
export function formatDateCN(ms: number, locale: DisplayLocale = 'zh'): string {
  const p = beijingParts(ms)
  if (locale === 'en') {
    return `${p.day} ${MONTHS_EN[p.month - 1]} ${yearLabel(p.year, 'en')}`
  }
  if (isCommonEra4Digit(p.year)) return `${p.year}年${p.month}月${p.day}日`
  return `${formatAstronomicalYearCN(p.year)} ${p.month} 月 ${p.day} 日`
}

/** 「2025-03-20」；超出四位年份时按 ISO 8601 扩展年书写 */
export function formatDateISO(ms: number): string {
  const p = beijingParts(ms)
  if (isCommonEra4Digit(p.year)) {
    return `${p.year}-${pad(p.month)}-${pad(p.day)}`
  }
  return `${formatYearISO(p.year)}-${pad(p.month)}-${pad(p.day)}`
}

/** 「11:06」 */
export function formatTimeHM(ms: number): string {
  const p = beijingParts(ms)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** 「11:06:23」 */
export function formatTimeHMS(ms: number): string {
  const p = beijingParts(ms)
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

/**
 * 「2025-03-20 11:06」；公元前或五位以上年份改用中文写法，
 * 例如「公元前 2001 年 10 月 14 日 17:14」—— 负号年份对普通读者太不友好。
 * （需要机器可读形式时请用 formatDateISO。）
 */
export function formatDateTimeCN(ms: number, locale: DisplayLocale = 'zh'): string {
  const p = beijingParts(ms)
  if (locale === 'en') {
    const y = yearLabel(p.year, 'en')
    return `${p.day} ${MONTHS_EN_SHORT[p.month - 1]} ${y} ${formatTimeHM(ms)}`
  }
  if (!isCommonEra4Digit(p.year)) {
    return `${formatAstronomicalYearCN(p.year)} ${p.month} 月 ${p.day} 日 ${formatTimeHM(ms)}`
  }
  return `${formatDateISO(ms)} ${formatTimeHM(ms)}`
}

/** 中文「3月20日 11:06」/ 英文「20 Mar 11:06」 */
export function formatMonthDayTime(ms: number, locale: DisplayLocale = 'zh'): string {
  const p = beijingParts(ms)
  if (locale === 'en') {
    return `${p.day} ${MONTHS_EN_SHORT[p.month - 1]} ${pad(p.hour)}:${pad(p.minute)}`
  }
  return `${p.month}月${p.day}日 ${pad(p.hour)}:${pad(p.minute)}`
}

/**
 * `<input type="datetime-local">` 的值：`YYYY-MM-DDTHH:mm`。
 * 该控件只支持四位年份，故超出 1—9999 年时返回 null，
 * 由界面改用普通文本框承接（见 TimeControls.vue）。
 */
export function toDateTimeLocalValue(ms: number): string | null {
  const p = beijingParts(ms)
  if (!isCommonEra4Digit(p.year)) return null
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

/** 解析 `YYYY-MM-DDTHH:mm`（可带秒），返回北京时间字段；格式非法返回 null */
export function parseDateTimeLocal(value: string): ClockParts | null {
  const m = /^(-?\d{1,6})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(
    value.trim(),
  )
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const hour = Number(m[4] ?? 0)
  const minute = Number(m[5] ?? 0)
  const second = Number(m[6] ?? 0)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (hour > 23 || minute > 59 || second > 59) return null
  return { year, month, day, hour, minute, second, weekday: 0 }
}

/** 把一段毫秒差描述成「还有 12 天 3 小时」/「已过去 …」 */
export function humanizeDuration(msAbs: number, locale: DisplayLocale = 'zh'): string {
  const totalMinutes = Math.floor(msAbs / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (locale === 'en') {
    if (days > 0) return `${days} d ${hours} h`
    if (hours > 0) return `${hours} h ${minutes} min`
    return `${minutes} min`
  }
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  return `${minutes} 分钟`
}

/** 供界面显示：按语言给出年份写法 */
export function formatYearLabel(year: number, locale: DisplayLocale = 'zh'): string {
  return locale === 'en' ? yearLabel(year, 'en') : formatAstronomicalYearCN(year)
}
