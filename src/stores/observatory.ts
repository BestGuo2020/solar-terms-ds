import { computed, readonly, ref } from 'vue'
import {
  activeTermAt,
  solarStateAt,
  solarTermsOfYear,
  termInstantInYear,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
} from '../astro/solar-terms.ts'
import {
  DAY_MS,
  beijingParts,
  beijingYear,
  clamp,
  daysInMonth,
  describeOffset,
  endOfBeijingYear,
  formatDateCN,
  formatDateWithWeekday,
  formatDateTimeCN,
  formatTimeHMS,
  fromBeijing,
  humanizeDuration,
  parseBeijingDatetimeLocal,
  startOfBeijingYear,
  toDatetimeLocalValue,
  weekdayCN,
} from '../astro/beijing-time.ts'
import { SEASON_META, OPPOSITE_SEASON } from '../data/term-catalog.ts'
import type { TermOccurrence } from '../data/types.ts'

export interface SpeedOption {
  /** 每现实一秒推进多少天 */
  daysPerSecond: number
  label: string
  detail: string
}

export const SPEED_OPTIONS: readonly SpeedOption[] = [
  { daysPerSecond: 1 / 24, label: '1 小时/秒', detail: '适合细看地球自转与晨昏线' },
  { daysPerSecond: 0.25, label: '6 小时/秒', detail: '约四秒过一天，推荐' },
  { daysPerSecond: 1, label: '1 天/秒', detail: '快速浏览全年四季变化' },
]

export type SimulationMode = 'live' | 'simulated'

const MIN_SIM_MS = fromBeijing(SUPPORTED_YEAR_MIN, 1, 1, 0, 0, 0)
const MAX_SIM_MS = endOfBeijingYear(SUPPORTED_YEAR_MAX)

const initialNow = Date.now()
const simMs = ref(Math.floor(initialNow / 1000) * 1000)
const mode = ref<SimulationMode>('live')
const isPlaying = ref(false)
const speedDaysPerSecond = ref(SPEED_OPTIONS[1].daysPerSecond)
const boundaryNotice = ref<string | null>(null)
let lastLiveSync = initialNow

const selectedYear = computed(() => beijingYear(simMs.value))
const yearTerms = computed(() => solarTermsOfYear(selectedYear.value))
const yearTermMap = computed(
  () => new Map(yearTerms.value.map((occurrence) => [occurrence.term.index, occurrence])),
)
const activeWindow = computed(() => activeTermAt(simMs.value))
const solarState = computed(() => solarStateAt(simMs.value))
const activeTerm = computed(() => activeWindow.value.current.term)
const activeOccurrence = computed(() => activeWindow.value.current)
const nextOccurrence = computed(() => activeWindow.value.next)
const activeTermAtSelectedYear = computed(
  () => yearTermMap.value.get(activeTerm.value.index) ?? activeOccurrence.value,
)
const solarLongitude = computed(() => solarState.value.sunLongitude)
const orbitAngle = computed(() => (solarLongitude.value + 180) % 360)
const seasonMeta = computed(() => SEASON_META[activeTerm.value.season])
const oppositeSeason = computed(() => OPPOSITE_SEASON[activeTerm.value.season])
const isSimulated = computed(() => mode.value === 'simulated')
const dateText = computed(() => formatDateCN(simMs.value))
const weekdayText = computed(() => weekdayCN(simMs.value))
const fullDateText = computed(() => formatDateWithWeekday(simMs.value))
const timeText = computed(() => formatTimeHMS(simMs.value))
const simulatedOffsetText = computed(() =>
  isSimulated.value ? describeOffset(simMs.value - Date.now()) : '跟随现实时间',
)
const datetimeInputValue = computed(() => toDatetimeLocalValue(simMs.value))
const timelineFraction = computed(() => {
  const start = startOfBeijingYear(selectedYear.value)
  const end = endOfBeijingYear(selectedYear.value)
  return clamp((simMs.value - start) / (end - start), 0, 1)
})
const termProgressPercent = computed(() => activeWindow.value.progress * 100)
const elapsedText = computed(() => humanizeDuration(activeWindow.value.elapsedMs))
const remainingText = computed(() => humanizeDuration(activeWindow.value.remainingMs))
const yearStartText = computed(() => formatDateCN(startOfBeijingYear(selectedYear.value)))

function notifyBoundary(message: string): void {
  boundaryNotice.value = message
}

function clearBoundaryNotice(): void {
  boundaryNotice.value = null
}

/** 暂停并设成模拟时间；所有跳转都走这里，确保界面上不会把模拟时间误标成实时。 */
function setSimulatedTime(ms: number, options: { keepPlaying?: boolean } = {}): void {
  const next = clamp(Math.round(ms), MIN_SIM_MS, MAX_SIM_MS)
  mode.value = 'simulated'
  if (!options.keepPlaying) isPlaying.value = false
  simMs.value = next
  clearBoundaryNotice()
}

function tick(deltaSeconds: number): void {
  if (document.visibilityState === 'hidden') return
  if (mode.value === 'live') {
    const now = Date.now()
    if (now - lastLiveSync >= 900) {
      lastLiveSync = now
      simMs.value = now
    }
    return
  }
  if (!isPlaying.value) return

  const safeDelta = Math.min(Math.max(deltaSeconds, 0), 0.25)
  const next = simMs.value + safeDelta * 1000 * speedDaysPerSecond.value * DAY_MS
  if (next >= MAX_SIM_MS) {
    simMs.value = MAX_SIM_MS
    isPlaying.value = false
    notifyBoundary('已经到达本站支持范围的终点：2100 年。可拖动时间轴回看其他年份。')
    return
  }
  if (next <= MIN_SIM_MS) {
    simMs.value = MIN_SIM_MS
    isPlaying.value = false
    notifyBoundary('已经到达本站支持范围的起点：1900 年。')
    return
  }
  simMs.value = next
}

function play(): void {
  if (isPlaying.value) return
  if (mode.value === 'live') {
    mode.value = 'simulated'
    simMs.value = Date.now()
  }
  isPlaying.value = true
  clearBoundaryNotice()
}

function pause(): void {
  isPlaying.value = false
}

function togglePlayback(): void {
  if (isPlaying.value) pause()
  else play()
}

function goToNow(): void {
  mode.value = 'live'
  isPlaying.value = false
  const now = Date.now()
  lastLiveSync = now
  simMs.value = Math.floor(now / 1000) * 1000
  clearBoundaryNotice()
}

function syncLiveClock(): void {
  if (mode.value === 'live') {
    const now = Date.now()
    lastLiveSync = now
    simMs.value = Math.floor(now / 1000) * 1000
  }
}

function setSpeed(daysPerSecond: number): void {
  const option = SPEED_OPTIONS.find((item) => item.daysPerSecond === daysPerSecond)
  if (option) speedDaysPerSecond.value = option.daysPerSecond
}

/** 跳到某公历年的某节气交节时刻。 */
function selectTerm(year: number, termIndex: number): TermOccurrence {
  const occurrence = termInstantInYear(year, termIndex)
  setSimulatedTime(occurrence.ms)
  return occurrence
}

function selectTermInSelectedYear(termIndex: number): TermOccurrence {
  return selectTerm(selectedYear.value, termIndex)
}

function selectOccurrence(occurrence: TermOccurrence): void {
  setSimulatedTime(occurrence.ms)
}

/** 跳到下一个节气的交节时刻（跨年也正确）。 */
function selectNextTerm(): TermOccurrence {
  const occurrence = activeWindow.value.next
  setSimulatedTime(occurrence.ms)
  return occurrence
}

/** 跳到当前区间的起点，而不是再往前一个节气。 */
function selectCurrentTermStart(): TermOccurrence {
  const occurrence = activeWindow.value.current
  setSimulatedTime(occurrence.ms)
  return occurrence
}

/** 选择年份时尽量保留月、日、时、分、秒。 */
function setYear(year: number): void {
  const targetYear = clamp(Math.round(year), SUPPORTED_YEAR_MIN, SUPPORTED_YEAR_MAX)
  const parts = beijingParts(simMs.value)
  const targetDay = Math.min(parts.day, daysInMonth(targetYear, parts.month))
  setSimulatedTime(
    fromBeijing(targetYear, parts.month, targetDay, parts.hour, parts.minute, parts.second),
  )
}

/** 把年份切换到某一节气所在的年份并选中该节气，供节气谱/详情导航使用。 */
function selectTermInYearOfSimulation(termIndex: number): TermOccurrence {
  return selectTerm(selectedYear.value, termIndex)
}

function setFromDatetimeInput(value: string): { ok: boolean; error?: string; ms?: number } {
  const parsed = parseBeijingDatetimeLocal(value)
  if (parsed === null) return { ok: false, error: '请输入有效的日期与时间。' }
  if (parsed < MIN_SIM_MS || parsed > MAX_SIM_MS) {
    return {
      ok: false,
      error: `演示年份只支持 ${SUPPORTED_YEAR_MIN}—${SUPPORTED_YEAR_MAX} 年。`,
    }
  }
  setSimulatedTime(parsed)
  return { ok: true, ms: parsed }
}

function seekTimeline(fraction: number): void {
  const start = startOfBeijingYear(selectedYear.value)
  const end = endOfBeijingYear(selectedYear.value)
  const safe = clamp(fraction, 0, 1)
  setSimulatedTime(start + safe * (end - start))
}

function getOccurrenceInSelectedYear(termIndex: number): TermOccurrence | undefined {
  return yearTermMap.value.get(termIndex)
}

/** 供 UI 展示：当前节气的实际交节时刻，以及所选年份中该节气的交节时刻。 */
const occurrenceContext = computed(() => {
  const actual = activeWindow.value.current
  const selected = yearTermMap.value.get(actual.term.index) ?? actual
  return {
    actual,
    selectedYearOccurrence: selected,
    exceedsSelectedYear: actual.ms < startOfBeijingYear(selectedYear.value),
  }
})

export function useObservatory() {
  return {
    // 状态
    simMs: readonly(simMs),
    mode: readonly(mode),
    isPlaying: readonly(isPlaying),
    speedDaysPerSecond: readonly(speedDaysPerSecond),
    boundaryNotice: readonly(boundaryNotice),
    supportedYears: { min: SUPPORTED_YEAR_MIN, max: SUPPORTED_YEAR_MAX },

    // 派生天文状态
    selectedYear,
    yearTerms,
    yearTermMap,
    activeWindow,
    activeTerm,
    activeOccurrence,
    nextOccurrence,
    activeTermAtSelectedYear,
    occurrenceContext,
    solarState,
    solarLongitude,
    orbitAngle,
    seasonMeta,
    oppositeSeason,
    isSimulated,
    dateText,
    weekdayText,
    fullDateText,
    timeText,
    datetimeInputValue,
    simulatedOffsetText,
    timelineFraction,
    termProgressPercent,
    elapsedText,
    remainingText,
    yearStartText,

    // 操作
    tick,
    play,
    pause,
    togglePlayback,
    goToNow,
    syncLiveClock,
    setSpeed,
    selectTerm,
    selectTermInSelectedYear,
    selectTermInYearOfSimulation,
    selectOccurrence,
    selectNextTerm,
    selectCurrentTermStart,
    setYear,
    setFromDatetimeInput,
    seekTimeline,
    getOccurrenceInSelectedYear,
    formatDateTimeCN,
    clearBoundaryNotice,
  }
}
