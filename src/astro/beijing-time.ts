/**
 * 北京时间工具。
 *
 * 本项目在全部年份统一采用 UTC+8 标准时，这是《中国天文年历》公布节气时刻
 * 时使用的口径；历史上个别年份的夏令时不在历法时刻中叠加。
 * 场景与界面内部的 Unix 时间始终是 UTC，仅在显示与输入时转换为北京时间。
 */

export const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000
export const DAY_MS = 86_400_000
const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const

export interface BeijingParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: number
}

const pad = (value: number, width = 2) => String(value).padStart(width, '0')

export function beijingParts(ms: number): BeijingParts {
  const date = new Date(ms + BEIJING_OFFSET_MS)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    weekday: date.getUTCDay(),
  }
}

export function fromBeijing(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number {
  return Date.UTC(year, month - 1, day, hour, minute, second) - BEIJING_OFFSET_MS
}

export function beijingYear(ms: number): number {
  return beijingParts(ms).year
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function startOfBeijingYear(year: number): number {
  return fromBeijing(year, 1, 1, 0, 0, 0)
}

export function endOfBeijingYear(year: number): number {
  return fromBeijing(year, 12, 31, 23, 59, 59) + 999
}

export function formatDateCN(ms: number): string {
  const p = beijingParts(ms)
  return `${p.year}年${p.month}月${p.day}日`
}

export function formatDateWithWeekday(ms: number): string {
  const p = beijingParts(ms)
  return `${p.year}年${p.month}月${p.day}日 ${WEEKDAYS[p.weekday]}`
}

export function formatMonthDay(ms: number): string {
  const p = beijingParts(ms)
  return `${p.month}月${p.day}日`
}

export function formatTimeHMS(ms: number): string {
  const p = beijingParts(ms)
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

export function formatTimeHM(ms: number): string {
  const p = beijingParts(ms)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

export function formatDateTimeCN(ms: number, includeSeconds = false): string {
  return `${formatDateCN(ms)} ${includeSeconds ? formatTimeHMS(ms) : formatTimeHM(ms)}`
}

export function formatMonthDayTime(ms: number): string {
  return `${formatMonthDay(ms)} ${formatTimeHM(ms)}`
}

export function weekdayCN(ms: number): string {
  return WEEKDAYS[beijingParts(ms).weekday]
}

/** 为原生 date 输入生成 YYYY-MM-DD */
export function toDateInputValue(ms: number): string {
  const p = beijingParts(ms)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** 为原生 time 输入生成 HH:MM:SS */
export function toTimeInputValue(ms: number): string {
  const p = beijingParts(ms)
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

/** 为原生 datetime-local 输入生成带秒的本地值 */
export function toDatetimeLocalValue(ms: number): string {
  return `${toDateInputValue(ms)}T${toTimeInputValue(ms)}`
}

/**
 * 解析 datetime-local 的值，并按北京时间解释。
 * 返回 null 表示格式或日期不合法。
 */
export function parseBeijingDatetimeLocal(value: string): number | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] ?? 0)
  if (month < 1 || month > 12) return null
  if (day < 1 || day > daysInMonth(year, month)) return null
  if (hour > 23 || minute > 59 || second > 59) return null
  return fromBeijing(year, month, day, hour, minute, second)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function humanizeDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(Math.abs(ms) / 60_000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  return `${minutes} 分钟`
}

export function describeOffset(offsetMs: number): string {
  const absolute = Math.abs(offsetMs)
  if (absolute < 30_000) return '与现实时间基本同步'
  const span = humanizeDuration(absolute)
  return offsetMs > 0 ? `比现实时间早 ${span}` : `比现实时间晚 ${span}`
}

/** 当前年份加小数部分的近似值，仅用于天文计算的初值/展示。 */
export function decimalYear(ms: number): number {
  const p = beijingParts(ms)
  return p.year + (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Date.UTC(p.year, 0, 1)) /
    (365.2422 * DAY_MS)
}
