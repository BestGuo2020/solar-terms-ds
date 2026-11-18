<script setup lang="ts">
/**
 * 底部时间控制条
 *
 * 播放 / 暂停 / 速度 / 日期时间 / 回到今天 / 年份，以及一条可拖动的年度时间轴。
 * 时间轴上的刻度按每个节气的**真实交节时刻**摆放，因此刻度间距肉眼可见地
 * 疏密不均 —— 这正是「定气法」下节气间隔 14.7—15.7 天不等的直观体现。
 */
import { computed, ref } from 'vue'
import {
  beijingParts,
  formatDateTimeCN,
  formatTimeHM,
  formatYearLabel,
  fromBeijing,
  humanizeDuration,
  parseDateTimeLocal,
  toDateTimeLocalValue,
} from '@/astro/time'
import { precisionAt, YEAR_MAX, YEAR_MIN } from '@/astro/solarTerms'
import { SPEED_OPTIONS, useSimulation } from '@/composables/useSimulation'
import { useI18n } from '@/i18n'
import { TERMS, termName } from '@/data'



const { t, locale } = useI18n()

/** 速度选项的文案随语言变化 */
/** 时间轴下的月份刻度：中文用「1月」，英文用「Jan」 */
const monthAxis = computed(() =>
  t('time.monthAxis')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

const speedOptions = computed(() =>
  SPEED_OPTIONS.map((s) => ({
    value: s.value,
    label: locale.value === 'en' ? s.labelEn : s.label,
    hint: locale.value === 'en' ? s.hintEn : s.hint,
  })),
)

const {
  simMs,
  playing,
  speedDaysPerSec,
  displayYear,
  termsOfDisplayYear,
  isSimulated,
  timeOffsetMs,
  realNowMs,
  togglePlay,
  pause,
  goToday,
  setSimMs,
  jumpToTerm,
  setYear,
  stepYear,
  setBeijingDateTime,
  setSpeed,
} = useSimulation()

const yearStartMs = computed(() => fromBeijing(displayYear.value, 1, 1))
const yearEndMs = computed(() => fromBeijing(displayYear.value + 1, 1, 1))
const yearSpan = computed(() => yearEndMs.value - yearStartMs.value)

/** 时间轴 0—1 的归一化位置 */
const sliderValue = computed(() => {
  const v = (simMs.value - yearStartMs.value) / yearSpan.value
  return Math.min(1, Math.max(0, v))
})

const ticks = computed(() =>
  termsOfDisplayYear.value.map((term) => ({
    index: term.index,
    name: termName(term.index, locale.value),
    major: TERMS[term.index]?.major === true,
    longitude: term.longitude,
    moment: term,
    pos: Math.min(1, Math.max(0, (term.ms - yearStartMs.value) / yearSpan.value)),
    label: formatTimeHM(term.ms),
    date: `${beijingParts(term.ms).month}/${beijingParts(term.ms).day}`,
  })),
)

const currentTickIndex = computed(() => {
  // 时间轴上「刚刚过去」的那个刻度
  let idx = -1
  for (const tick of ticks.value) {
    if (tick.moment.ms <= simMs.value) idx = tick.index
  }
  return idx
})

/** 年份输入框的下拉候选：跨越「赛博永生」关心的大跨度年代 */
const YEAR_PRESETS = [-2000, -1000, -500, 1, 500, 1000, 1500, 1900, 2000, 2025, 2100, 2400, 3000, 4000, 5000, 6000]

const precision = computed(() => precisionAt(displayYear.value))
/** 精度分档的文案统一放在 i18n 里，这里只按档位拼键名 */
const precisionTimeLabel = computed(() => t(`precision.${precision.value.level}.time` as never))
const precisionNote = computed(() => t(`precision.${precision.value.level}.note` as never))
const yearLabel = computed(() => formatYearLabel(displayYear.value, locale.value))

/** datetime-local 只支持四位年份；超出 1—9999 年时改用普通文本框 */
const dateTimeValue = computed(() => toDateTimeLocalValue(simMs.value))
const useNativePicker = computed(() => dateTimeValue.value !== null)
const dateTimeText = computed(() => {
  const v = dateTimeValue.value
  if (v) return v
  const p = beijingParts(simMs.value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
})

function commitDateTime(value: string) {
  const p = parseDateTimeLocal(value)
  if (!p) return
  setBeijingDateTime(p.year, p.month, p.day, p.hour, p.minute)
}

function onSliderInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  setSimMs(yearStartMs.value + v * yearSpan.value)
}

function onDateTimeChange(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (!v) return
  // 形如 2025-03-20T17:01；页面统一按北京时间解释这个值
  commitDateTime(v)
}

function onYearInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (!Number.isFinite(v)) return
  setYear(v)
}

const offsetText = computed(() => {
  const abs = Math.abs(timeOffsetMs.value)
  if (abs < 60000) return t('hud.offsetSame')
  const d = humanizeDuration(abs, locale.value)
  return timeOffsetMs.value > 0 ? t('hud.offsetAhead', { d }) : t('hud.offsetBehind', { d })
})

function onSpeedChange(e: Event) {
  setSpeed(Number((e.target as HTMLSelectElement).value))
}

/** 点击时间轴刻度：暂停播放并跳到该节气交节时刻 */
function selectTick(index: number) {
  pause()
  jumpToTerm(displayYear.value, index)
}

/** 拖动时间轴时先暂停，避免与自动播放互相拉扯 */
const scrubbing = ref(false)
function onScrubStart() {
  scrubbing.value = true
  if (playing.value) pause()
}
function onScrubEnd() {
  scrubbing.value = false
}
</script>

<template>
  <div class="timebar" :class="{ 'is-scrubbing': scrubbing }" :aria-label="t('time.aria')">
    <div class="timebar-row timebar-main">
      <div class="transport tb-transport">
        <button
          class="play-btn"
          type="button"
          :aria-label="playing ? t('time.pause') : t('time.play')"
          :title="playing ? t('time.pauseShort') : t('time.playShort')"
          @click="togglePlay"
        >
          <span aria-hidden="true">{{ playing ? '❚❚' : '▶' }}</span>
        </button>
      </div>

      <div class="field tb-speed">
        <label for="speed-select">{{ t('time.speed') }}</label>
        <select id="speed-select" :value="speedDaysPerSec" @change="onSpeedChange">
          <option v-for="s in speedOptions" :key="s.value" :value="s.value" :title="s.hint">
            {{ s.label }}
          </option>
        </select>
      </div>

      <div class="field tb-datetime">
        <label for="datetime-input">{{ t('time.datetime') }}</label>
        <!-- datetime-local 只支持四位年份，公元前与万年以外改用文本框承接 -->
        <input
          v-if="useNativePicker"
          id="datetime-input"
          type="datetime-local"
          :value="dateTimeValue"
          :min="`${YEAR_MIN < 1 ? 1 : YEAR_MIN}-01-01T00:00`"
          :max="`${YEAR_MAX > 9999 ? 9999 : YEAR_MAX}-12-31T23:59`"
          :title="t('time.datetimeTitle')"
          @change="onDateTimeChange"
        />
        <input
          v-else
          id="datetime-input"
          type="text"
          inputmode="numeric"
          :value="dateTimeText"
          placeholder="YYYY-MM-DDTHH:mm"
          :title="t('time.datetimeFallback')"
          @change="onDateTimeChange"
        />
      </div>

      <div class="field tb-year">
        <label for="year-input">{{ t('time.year') }}</label>
        <div class="year-stepper">
          <button
            type="button"
            :disabled="displayYear <= YEAR_MIN"
            :aria-label="t('time.prevYear')"
            @click="stepYear(-1)"
          >
            ‹
          </button>
          <input
            id="year-input"
            type="number"
            :value="displayYear"
            :min="YEAR_MIN"
            :max="YEAR_MAX"
            step="1"
            list="year-presets"
            :title="t('time.yearTitle', { min: YEAR_MIN, max: YEAR_MAX })"
            @change="onYearInput"
          />
          <datalist id="year-presets">
            <option v-for="y in YEAR_PRESETS" :key="y" :value="y" />
          </datalist>
          <button
            type="button"
            :disabled="displayYear >= YEAR_MAX"
            :aria-label="t('time.nextYear')"
            @click="stepYear(1)"
          >
            ›
          </button>
        </div>
      </div>

      <button class="btn btn-primary tb-today" type="button" @click="goToday">{{ t('time.today') }}</button>

      <div class="timebar-status tb-status">
        <span class="badge" :class="isSimulated ? 'badge-sim' : 'badge-live'">
          {{ isSimulated ? t('common.simulated') : t('common.live') }}
        </span>
        <span :title="t('time.realNow', { time: formatDateTimeCN(realNowMs, locale) })">
          {{ formatDateTimeCN(simMs, locale) }}
          <span class="muted-inline">{{ t('common.beijingTime') }}</span>
        </span>
        <span v-if="isSimulated" class="tb-offset">{{ offsetText }}</span>
        <!-- 精度分级：年份越远离当代，ΔT 外推的不确定度越大，如实标出来 -->
        <span
          class="precision-badge"
          :class="`is-level-${precision.level}`"
          :title="t('detail.precision', { level: precision.level, label: precisionTimeLabel }) + ' — ' + precisionNote"
        >
          {{ t('detail.precision', { level: precision.level, label: precisionTimeLabel }) }}
        </span>
      </div>
    </div>

    <!-- 年度时间轴 -->
    <div class="timebar-row timebar-timeline">
      <div class="timeline" style="flex: 1; min-width: 0">
        <label class="sr-only" for="year-timeline">
          {{ t('time.timelineLabel', { year: yearLabel }) }}
        </label>
        <input
          id="year-timeline"
          type="range"
          min="0"
          max="1"
          step="0.00001"
          :value="sliderValue"
          :aria-valuetext="t('time.timelineValue', { year: yearLabel, time: formatDateTimeCN(simMs, locale) })"
          @input="onSliderInput"
          @pointerdown="onScrubStart"
          @pointerup="onScrubEnd"
          @pointercancel="onScrubEnd"
          @keydown="onScrubStart"
          @keyup="onScrubEnd"
        />

        <div class="tick-strip" aria-hidden="true">
          <button
            v-for="tick in ticks"
            :key="tick.index"
            class="tick"
            :class="{ 'is-major': tick.major, 'is-current': tick.index === currentTickIndex }"
            type="button"
            tabindex="-1"
            :style="{ left: `${tick.pos * 100}%` }"
            :title="
              t('time.tickTitle', {
                term: tick.name,
                date: tick.date,
                time: tick.label,
                lon: tick.longitude,
              })
            "
            @click="selectTick(tick.index)"
          >
            <i></i>
          </button>
        </div>

        <div class="timeline-axis">
          <span v-for="m in monthAxis" :key="m">{{ m }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
