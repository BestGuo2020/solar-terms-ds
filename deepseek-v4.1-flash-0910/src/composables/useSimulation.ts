/**
 * 统一的模拟时间状态
 *
 * 全站只有这一个时间源：时间轴、日期选择、播放、3D 场景、节气判定、
 * 详情面板全部由它驱动，绝不各自推算，避免出现「轨道位置和文字对不上」。
 *
 * 两种模式：
 *   live —— 跟随真实时钟（默认）。simMs 每 250ms 与 Date.now() 对齐一次。
 *   sim  —— 模拟时间。播放时按 speedDaysPerSec 推进；暂停则冻结。
 */

import { computed, ref, readonly } from 'vue'
import {
  activeTermAt,
  YEAR_MAX,
  YEAR_MIN,
  solarTermsOfYear,
  sunLongitudeAtMs,
  termMomentOfYear,
  type TermMoment,
} from '@/astro/solarTerms'
import { beijingParts, beijingYear, fromBeijing } from '@/astro/time'

export type TimeMode = 'live' | 'sim'

export interface SpeedOption {
  value: number
  label: string
  labelEn: string
  hint: string
  hintEn: string
}

/** 可选的模拟速度（单位为「天/秒」）。中英文案都放在这里，避免两处走样。 */
export const SPEED_OPTIONS: readonly SpeedOption[] = [
  {
    value: 1 / 24,
    label: '1 小时 / 秒',
    labelEn: '1 hour / sec',
    hint: '细看地球自转与昼夜推移',
    hintEn: "Watch Earth's rotation and the day–night line",
  },
  {
    value: 0.25,
    label: '6 小时 / 秒',
    labelEn: '6 hours / sec',
    hint: '观察晨昏线扫过地表',
    hintEn: 'See the terminator sweep across the globe',
  },
  {
    value: 1,
    label: '1 天 / 秒',
    labelEn: '1 day / sec',
    hint: '一天一秒，四季变化清晰',
    hintEn: 'One day per second — the seasons unfold clearly',
  },
  {
    value: 5,
    label: '5 天 / 秒',
    labelEn: '5 days / sec',
    hint: '约 73 秒走完一年',
    hintEn: 'A full year in about 73 seconds',
  },
  {
    value: 15,
    label: '15 天 / 秒',
    labelEn: '15 days / sec',
    hint: '约 24 秒走完一年，能看出节气间隔不均',
    hintEn: 'A year in about 24 seconds; the uneven spacing becomes visible',
  },
  {
    value: 30,
    label: '30 天 / 秒',
    labelEn: '30 days / sec',
    hint: '约 12 秒走完一年，适合快速总览',
    hintEn: 'A year in about 12 seconds — good for a quick overview',
  },
] as const

const MS_PER_DAY = 86400000

/** 支持的时间下限与上限（北京时间） */
export const TIME_MIN_MS = fromBeijing(YEAR_MIN, 1, 1, 0, 0, 0)
export const TIME_MAX_MS = fromBeijing(YEAR_MAX, 12, 31, 23, 59, 59)

// ───────────────────────── 状态 ─────────────────────────

const simMs = ref(clampMs(Date.now()))
const mode = ref<TimeMode>('live')
const playing = ref(false)
const speedDaysPerSec = ref(1)
/** 真实「现在」，用于显示对照时间 */
const realNowMs = ref(Date.now())

let liveAccumulator = 0

function clampMs(ms: number): number {
  if (!Number.isFinite(ms)) return Date.now()
  // 注意：这里**不做四舍五入**。交节瞬间本身就是一个精确到毫秒的时间戳，
  // 若把它 round 到稍早的半毫秒，节气区间判定就会退回上一个节气，
  // 出现「点立春却显示大寒」这种错位。
  return Math.min(TIME_MAX_MS, Math.max(TIME_MIN_MS, ms))
}

// ───────────────────────── 派生量 ─────────────────────────

/** 当前所在的节气区间（含下一个节气与进度） */
const termWindow = computed(() => activeTermAt(simMs.value))
/** 已进入的节气（对象来自缓存，引用稳定，不会每帧触发重渲染） */
const activeTerm = computed<TermMoment>(() => termWindow.value.current)
const nextTerm = computed<TermMoment>(() => termWindow.value.next)
/** 当前显示年份（北京时间） */
const displayYear = computed(() => beijingYear(simMs.value))
/** 该年份的 24 个节气（按时间先后） */
const termsOfDisplayYear = computed<TermMoment[]>(() => solarTermsOfYear(displayYear.value))
/** 当前太阳地心视黄经（度） */
const sunLongitude = computed(() => sunLongitudeAtMs(simMs.value))
/** 距离区间起点的进度 0—1 */
const termProgress = computed(() => termWindow.value.progress)
/** 是否处于模拟时间 */
const isSimulated = computed(() => mode.value === 'sim')
/** 与真实时间的偏差（毫秒，正数表示超前） */
const timeOffsetMs = computed(() => simMs.value - realNowMs.value)
/** 是否在支持范围内 */
const withinRange = computed(() => simMs.value >= TIME_MIN_MS && simMs.value <= TIME_MAX_MS)

// ───────────────────────── 操作 ─────────────────────────

function setSimMs(ms: number) {
  mode.value = 'sim'
  simMs.value = clampMs(ms)
}

function play() {
  if (mode.value === 'live') {
    // 从「现在」接管，避免从旧位置突然跳变
    simMs.value = clampMs(Date.now())
    mode.value = 'sim'
  }
  playing.value = true
}

function pause() {
  playing.value = false
}

function togglePlay() {
  if (playing.value) pause()
  else play()
}

/** 回到今天（真实时间） */
function goToday() {
  mode.value = 'live'
  playing.value = false
  realNowMs.value = Date.now()
  simMs.value = clampMs(Date.now())
}

/** 跳到某年某节气的准确交节时刻，并暂停播放 */
function jumpToTerm(year: number, index: number) {
  playing.value = false
  const y = Math.min(YEAR_MAX, Math.max(YEAR_MIN, Math.round(year)))
  const m = termMomentOfYear(y, index)
  setSimMs(m.ms)
}

/** 只切换年份，保留月、日与时刻 */
function setYear(year: number) {
  const y = Math.min(YEAR_MAX, Math.max(YEAR_MIN, Math.round(year)))
  const p = beijingParts(simMs.value)
  setSimMs(fromBeijing(y, p.month, p.day, p.hour, p.minute, p.second))
}

/** 按北京时间字段设置时刻 */
function setBeijingDateTime(year: number, month: number, day: number, hour = 0, minute = 0) {
  setSimMs(fromBeijing(year, month, day, hour, minute, 0))
}

/** 调整年份（前后一年） */
function stepYear(delta: number) {
  setYear(displayYear.value + delta)
}

/** 调整模拟速度（天/秒） */
function setSpeed(daysPerSecond: number) {
  if (!Number.isFinite(daysPerSecond) || daysPerSecond <= 0) return
  speedDaysPerSec.value = daysPerSecond
}

/**
 * 由 3D 主循环每帧调用。
 * @param dtSeconds 距上一帧的真实秒数
 */
function tick(dtSeconds: number) {
  if (mode.value === 'live') {
    liveAccumulator += dtSeconds
    // 实时模式下不必每帧刷新，4 Hz 足够，也省掉大量无谓的重渲染
    if (liveAccumulator >= 0.25) {
      liveAccumulator = 0
      realNowMs.value = Date.now()
      simMs.value = clampMs(realNowMs.value)
    }
    return
  }
  if (!playing.value) return
  simMs.value = clampMs(simMs.value + dtSeconds * speedDaysPerSec.value * MS_PER_DAY)
}

export function useSimulation() {
  return {
    // 状态
    simMs: readonly(simMs),
    mode: readonly(mode),
    playing: readonly(playing),
    speedDaysPerSec: readonly(speedDaysPerSec),
    realNowMs: readonly(realNowMs),
    // 派生
    termWindow,
    activeTerm,
    nextTerm,
    displayYear,
    termsOfDisplayYear,
    sunLongitude,
    termProgress,
    isSimulated,
    timeOffsetMs,
    withinRange,
    // 操作
    play,
    pause,
    togglePlay,
    goToday,
    setSimMs,
    jumpToTerm,
    setYear,
    stepYear,
    setBeijingDateTime,
    setSpeed,
    tick,
  }
}

/** 供 3D 主循环直接读取的原始值（不走响应式追踪） */
export const simTimeRaw = {
  get ms() {
    return simMs.value
  },
  tick,
}
