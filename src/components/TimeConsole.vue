<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  SPEED_OPTIONS,
  useObservatory,
} from '../stores/observatory'
import {
  endOfBeijingYear,
  formatDateTimeCN,
  formatMonthDayTime,
  fromBeijing,
  startOfBeijingYear,
} from '../astro/beijing-time'
import { SEASON_META } from '../data/term-catalog'

const store = useObservatory()
const {
  simMs,
  isPlaying,
  speedDaysPerSecond,
  boundaryNotice,
  dateText,
  weekdayText,
  timeText,
  datetimeInputValue,
  isSimulated,
  simulatedOffsetText,
  selectedYear,
  yearTerms,
  yearTermMap,
  activeTerm,
  activeOccurrence,
  nextOccurrence,
  seasonMeta,
  termProgressPercent,
  elapsedText,
  remainingText,
  timelineFraction,
} = store

const draftValue = ref(datetimeInputValue.value)
const editingDraft = ref(false)
const draftError = ref('')
const yearMin = store.supportedYears.min
const yearMax = store.supportedYears.max
const years = Array.from({ length: yearMax - yearMin + 1 }, (_, index) => yearMin + index)

watch(datetimeInputValue, (value) => {
  if (!editingDraft.value) draftValue.value = value
})

const rangeValue = computed(() => Math.round(timelineFraction.value * 1000))
const yearStart = computed(() => startOfBeijingYear(selectedYear.value))
const yearEnd = computed(() => endOfBeijingYear(selectedYear.value))
const yearSpan = computed(() => yearEnd.value - yearStart.value)
const activeBand = computed(() => {
  const start = Math.max(0, Math.min(1, (activeOccurrence.value.ms - yearStart.value) / yearSpan.value))
  const end = Math.max(0, Math.min(1, (nextOccurrence.value.ms - yearStart.value) / yearSpan.value))
  return {
    left: `${start * 100}%`,
    width: `${Math.max(0.4, (end - start) * 100)}%`,
  }
})
const tickMarks = computed(() =>
  yearTerms.value.map((occurrence) => {
    const fraction = (occurrence.ms - yearStart.value) / yearSpan.value
    return {
      name: occurrence.term.name,
      index: occurrence.term.index,
      major: occurrence.term.major,
      season: occurrence.term.season,
      color: SEASON_META[occurrence.term.season].color,
      left: `${Math.max(0, Math.min(100, fraction * 100))}%`,
      label: `${occurrence.term.name} · ${formatMonthDayTime(occurrence.ms)}`,
      active: occurrence.term.index === activeTerm.value.index,
    }
  }),
)
const monthMarks = computed(() => {
  const start = yearStart.value
  const span = yearSpan.value
  return Array.from({ length: 12 }, (_, index) => {
    const ms = fromBeijing(selectedYear.value, index + 1, 1)
    return {
      label: `${index + 1}月`,
      left: `${Math.max(0, Math.min(100, ((ms - start) / span) * 100))}%`,
    }
  })
})
const timelineValueText = computed(
  () => `${dateText.value} ${timeText.value}，当前节气 ${activeTerm.value.name}`,
)
const currentTermOccurrenceText = computed(() =>
  formatDateTimeCN(activeOccurrence.value.ms, true),
)
const nextTermOccurrenceText = computed(() =>
  formatDateTimeCN(nextOccurrence.value.ms, true),
)
const selectedYearTermText = computed(() => {
  const occurrence = yearTermMap.value.get(activeTerm.value.index)
  if (!occurrence) return '—'
  return formatDateTimeCN(occurrence.ms, true)
})
const boundaryMin = `${yearMin}-01-01T00:00:00`
const boundaryMax = `${yearMax}-12-31T23:59:59`

function togglePlay(): void {
  store.togglePlayback()
}

function chooseSpeed(daysPerSecond: number): void {
  store.setSpeed(daysPerSecond)
}

function goToToday(): void {
  store.goToNow()
  draftError.value = ''
  editingDraft.value = false
}

function onDraftFocus(): void {
  editingDraft.value = true
}

function onDraftBlur(): void {
  editingDraft.value = false
}

function applyDraft(): void {
  const result = store.setFromDatetimeInput(draftValue.value)
  if (!result.ok) {
    draftError.value = result.error ?? '时间无效。'
    return
  }
  draftError.value = ''
  editingDraft.value = false
  draftValue.value = store.datetimeInputValue.value
}

function onYearChange(event: Event): void {
  const value = Number((event.target as HTMLSelectElement).value)
  if (!Number.isFinite(value)) return
  store.setYear(value)
  draftError.value = ''
  editingDraft.value = false
}

function onRangeInput(event: Event): void {
  const target = event.target as HTMLInputElement
  store.seekTimeline(Number(target.value) / 1000)
}

function setToCurrentTermStart(): void {
  store.selectCurrentTermStart()
}

function setToNextTerm(): void {
  store.selectNextTerm()
}
</script>

<template>
  <section class="time-console" aria-labelledby="time-console-title">
    <header class="console-head">
      <div class="console-title">
        <p class="console-kicker">日月之行</p>
        <h2 id="time-console-title">时间控制</h2>
      </div>

      <div class="console-status" :class="isSimulated ? 'is-simulated' : 'is-live'">
        <span class="console-status__dot" aria-hidden="true"></span>
        <span>{{ isSimulated ? '模拟时间' : '实时 · 跟随北京时间' }}</span>
        <span class="console-status__detail">{{ simulatedOffsetText }}</span>
      </div>

      <div class="console-actions">
        <button type="button" class="play-button" :aria-label="isPlaying ? '暂停模拟时间' : '播放模拟时间'" @click="togglePlay">
          <svg v-if="!isPlaying" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.2v13.6L19 12 8 5.2Z" fill="currentColor" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6.4" y="5" width="4.3" height="14" rx=".7" fill="currentColor" />
            <rect x="13.3" y="5" width="4.3" height="14" rx=".7" fill="currentColor" />
          </svg>
          <span>{{ isPlaying ? '暂停' : '播放' }}</span>
        </button>

        <div class="speed-control" role="group" aria-label="模拟速度">
          <span class="speed-control__label">速度</span>
          <button
            v-for="option in SPEED_OPTIONS"
            :key="option.label"
            type="button"
            class="speed-button"
            :class="{ 'is-active': speedDaysPerSecond === option.daysPerSecond }"
            :aria-pressed="speedDaysPerSecond === option.daysPerSecond"
            :title="option.detail"
            :aria-label="`模拟速度 ${option.label}：${option.detail}`"
            @click="chooseSpeed(option.daysPerSecond)"
          >
            {{ option.label }}
          </button>
        </div>

        <button type="button" class="today-button" @click="goToToday">
          回到今天
        </button>
      </div>
    </header>

    <div class="console-readout">
      <div class="readout-clock">
        <p class="readout-label">
          {{ isSimulated ? '模拟时间' : '当前真实时间' }} · 北京时间
          <span class="zone-chip">UTC+8</span>
        </p>
        <div class="readout-date">{{ dateText }}<span>{{ weekdayText }}</span></div>
        <time class="readout-time" :datetime="new Date(simMs).toISOString()">{{ timeText }}</time>
      </div>

      <div class="readout-term">
        <div class="readout-term__head">
          <div>
            <p class="readout-label">
              当前已进入
              <span class="readout-season" :style="{ color: seasonMeta.color }">{{ seasonMeta.label }}</span>
            </p>
            <p class="readout-term__name">{{ activeTerm.name }}</p>
          </div>
          <div class="readout-term__longitude">
            <span>节气黄经</span>
            <strong>{{ activeTerm.longitude }}°</strong>
          </div>
        </div>
        <p class="readout-term__timing">
          本节气交节：<strong>{{ currentTermOccurrenceText }}</strong>
        </p>
        <p class="readout-term__timing readout-term__timing--next">
          下一节气：<strong>{{ nextOccurrence.term.name }}</strong> · {{ nextTermOccurrenceText }}
        </p>
        <div
          class="term-progress"
          role="progressbar"
          aria-label="当前节气区间进度"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(termProgressPercent)"
        >
          <span :style="{ width: `${termProgressPercent}%` }"></span>
        </div>
        <p class="readout-term__elapsed">
          已进入 {{ elapsedText }} · 距下一交节约 {{ remainingText }}
        </p>
        <p v-if="selectedYearTermText" class="readout-term__selected-year">
          {{ selectedYear }} 年内该节气：{{ selectedYearTermText }}
        </p>
      </div>

      <div class="readout-tools">
        <label class="field">
          <span class="field__label">年份</span>
          <select :value="selectedYear" aria-label="选择演示年份" @change="onYearChange">
            <option v-for="year in years" :key="year" :value="year">{{ year }} 年</option>
          </select>
        </label>

        <form class="jump-form" @submit.prevent="applyDraft">
          <label class="field field--datetime">
            <span class="field__label">日期与时间 <em>北京时间</em></span>
            <input
              v-model="draftValue"
              type="datetime-local"
              step="1"
              :min="boundaryMin"
              :max="boundaryMax"
              aria-label="选择日期与时间，按北京时间解释"
              @focus="onDraftFocus"
              @blur="onDraftBlur"
            />
          </label>
          <button type="submit" class="jump-button">前往该时刻</button>
        </form>
        <p v-if="draftError" class="field-error" role="alert">{{ draftError }}</p>

        <div class="term-jump">
          <button type="button" @click="setToCurrentTermStart">回到本节气起点</button>
          <button type="button" @click="setToNextTerm">跳到下一节气</button>
        </div>
      </div>
    </div>

    <div class="timeline-block">
      <div class="timeline-head">
        <p>
          {{ selectedYear }} 年 · 北京时间
          <span class="timeline-head__hint">轨道下方的 24 个刻度是真实交节时刻</span>
        </p>
        <p class="timeline-head__readout">{{ dateText }} {{ timeText }}</p>
      </div>

      <div class="timeline-track-area">
        <div class="month-row" aria-hidden="true">
          <span
            v-for="month in monthMarks"
            :key="month.label"
            class="month-label"
            :style="{ left: month.left }"
          >{{ month.label }}</span>
        </div>

        <div class="timeline-track">
          <span class="timeline-band" :style="activeBand" aria-hidden="true"></span>
          <span class="timeline-fill" :style="{ width: `${rangeValue / 10}%` }" aria-hidden="true"></span>
          <div class="term-ticks" aria-hidden="true">
            <span
              v-for="tick in tickMarks"
              :key="tick.index"
              class="term-tick"
              :class="{ 'is-major': tick.major, 'is-active': tick.active }"
              :style="{ left: tick.left, '--tick-color': tick.color }"
              :title="tick.label"
            ></span>
          </div>
          <span class="timeline-cursor" :style="{ left: `${rangeValue / 10}%` }" aria-hidden="true">
            <i></i>
          </span>
          <input
            class="timeline-range"
            type="range"
            min="0"
            max="1000"
            step="1"
            :value="rangeValue"
            :aria-valuetext="timelineValueText"
            aria-label="年度时间轴，拖动以模拟一年中的任意时刻"
            @input="onRangeInput"
          />
        </div>
      </div>

      <div class="timeline-footer">
        <p>
          节气间隔并不相等：受地球椭圆轨道与开普勒第二定律影响，约在 14.7—15.7 天之间变化。
          <a href="#sources">查看计算方式与精度</a>
        </p>
        <p>支持 {{ yearMin }}—{{ yearMax }} 年 · 时区：Asia/Shanghai（UTC+8 标准时）</p>
      </div>
    </div>

    <p v-if="boundaryNotice" class="boundary-notice" role="status">
      <span>{{ boundaryNotice }}</span>
      <button type="button" aria-label="关闭范围提示" @click="store.clearBoundaryNotice()">×</button>
    </p>
  </section>
</template>
