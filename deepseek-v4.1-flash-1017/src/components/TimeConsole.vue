<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SPEED_OPTIONS, useObservatory } from '../stores/observatory'
import {
  endOfBeijingYear,
  formatDateTimeCN,
  formatMonthDayTime,
  fromBeijing,
  startOfBeijingYear,
} from '../astro/beijing-time'
import { useI18n } from '../i18n/index.ts'
import { getLocalizedTermByIndex, getSeasonName, getTermName } from '../i18n/content.ts'
import { SEASON_META } from '../data/term-catalog.ts'

const store = useObservatory()
const { locale, t } = useI18n()
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

const localizedActiveTerm = computed(() =>
  getLocalizedTermByIndex(activeTerm.value.index, locale.value),
)
const localizedSeasonName = computed(() =>
  getSeasonName(activeTerm.value.season, locale.value),
)
const localizedNextName = computed(() =>
  getTermName(nextOccurrence.value.term.index, locale.value),
)

const draftValue = ref(datetimeInputValue.value)
const editingDraft = ref(false)
const draftError = ref('')
const yearMin = store.supportedYears.min
const yearMax = store.supportedYears.max
const years = Array.from({ length: yearMax - yearMin + 1 }, (_, index) => yearMin + index)

const MONTHS_ZH = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
      index: occurrence.term.index,
      major: occurrence.term.major,
      color: SEASON_META[occurrence.term.season].color,
      left: `${Math.max(0, Math.min(100, fraction * 100))}%`,
      label: `${getTermName(occurrence.term.index, locale.value)} · ${formatMonthDayTime(occurrence.ms, locale.value)}`,
      active: occurrence.term.index === activeTerm.value.index,
    }
  }),
)
const monthMarks = computed(() => {
  const start = yearStart.value
  const span = yearSpan.value
  const labels = locale.value === 'en' ? MONTHS_EN : MONTHS_ZH
  return Array.from({ length: 12 }, (_, index) => {
    const ms = fromBeijing(selectedYear.value, index + 1, 1)
    return {
      label: labels[index],
      left: `${Math.max(0, Math.min(100, ((ms - start) / span) * 100))}%`,
    }
  })
})
const timelineValueText = computed(
  () => `${dateText.value} ${timeText.value}, ${localizedActiveTerm.value.name}`,
)
const currentTermOccurrenceText = computed(() =>
  formatDateTimeCN(activeOccurrence.value.ms, true, locale.value),
)
const nextTermOccurrenceText = computed(() =>
  formatDateTimeCN(nextOccurrence.value.ms, true, locale.value),
)
const selectedYearTermText = computed(() => {
  const occurrence = yearTermMap.value.get(activeTerm.value.index)
  if (!occurrence) return '—'
  return formatDateTimeCN(occurrence.ms, true, locale.value)
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
    draftError.value = result.error ?? t('time.invalid')
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
        <p class="console-kicker">{{ t('time.kicker') }}</p>
        <h2 id="time-console-title">{{ t('time.title') }}</h2>
      </div>

      <div class="console-status" :class="isSimulated ? 'is-simulated' : 'is-live'">
        <span class="console-status__dot" aria-hidden="true"></span>
        <span>{{ isSimulated ? t('time.simStatus') : t('time.liveStatus') }}</span>
        <span class="console-status__detail">{{ simulatedOffsetText }}</span>
      </div>

      <div class="console-actions">
        <button
          type="button"
          class="play-button"
          :aria-label="isPlaying ? t('time.pauseAria') : t('time.playAria')"
          @click="togglePlay"
        >
          <svg v-if="!isPlaying" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.2v13.6L19 12 8 5.2Z" fill="currentColor" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6.4" y="5" width="4.3" height="14" rx=".7" fill="currentColor" />
            <rect x="13.3" y="5" width="4.3" height="14" rx=".7" fill="currentColor" />
          </svg>
          <span>{{ isPlaying ? t('time.pause') : t('time.play') }}</span>
        </button>

        <div class="speed-control" role="group" :aria-label="t('time.speedAria')">
          <span class="speed-control__label">{{ t('time.speed') }}</span>
          <button
            v-for="option in SPEED_OPTIONS"
            :key="option.labelKey"
            type="button"
            class="speed-button"
            :class="{ 'is-active': speedDaysPerSecond === option.daysPerSecond }"
            :aria-pressed="speedDaysPerSecond === option.daysPerSecond"
            :title="t(option.detailKey)"
            :aria-label="t('time.speedOptionAria', { label: t(option.labelKey), detail: t(option.detailKey) })"
            @click="chooseSpeed(option.daysPerSecond)"
          >
            {{ t(option.labelKey) }}
          </button>
        </div>

        <button type="button" class="today-button" @click="goToToday">
          {{ t('time.today') }}
        </button>
      </div>
    </header>

    <div class="console-readout">
      <div class="readout-clock">
        <p class="readout-label">
          {{ isSimulated ? t('time.simTime') : t('time.realTime') }} · {{ t('common.beijingTime') }}
          <span class="zone-chip">{{ t('common.utc8') }}</span>
        </p>
        <div class="readout-date">{{ dateText }}<span>{{ weekdayText }}</span></div>
        <time class="readout-time" :datetime="new Date(simMs).toISOString()">{{ timeText }}</time>
      </div>

      <div class="readout-term">
        <div class="readout-term__head">
          <div>
            <p class="readout-label">
              {{ t('time.currentEntered') }}
              <span class="readout-season" :style="{ color: seasonMeta.color }">{{ localizedSeasonName }}</span>
            </p>
            <p class="readout-term__name">{{ localizedActiveTerm.name }}</p>
          </div>
          <div class="readout-term__longitude">
            <span>{{ t('time.termLongitude') }}</span>
            <strong>{{ activeTerm.longitude }}°</strong>
          </div>
        </div>
        <p class="readout-term__timing">
          {{ t('time.termBegan') }} <strong>{{ currentTermOccurrenceText }}</strong>
        </p>
        <p class="readout-term__timing readout-term__timing--next">
          {{ t('time.nextTerm') }} <strong>{{ localizedNextName }}</strong> · {{ nextTermOccurrenceText }}
        </p>
        <div
          class="term-progress"
          role="progressbar"
          :aria-label="t('time.progressAria')"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(termProgressPercent)"
        >
          <span :style="{ width: `${termProgressPercent}%` }"></span>
        </div>
        <p class="readout-term__elapsed">
          {{ t('time.elapsed', { elapsed: elapsedText, remaining: remainingText }) }}
        </p>
        <p v-if="selectedYearTermText" class="readout-term__selected-year">
          {{ t('time.selectedYearTerm', { year: selectedYear, time: selectedYearTermText }) }}
        </p>
      </div>

      <div class="readout-tools">
        <label class="field">
          <span class="field__label">{{ t('time.yearLabel') }}</span>
          <select :value="selectedYear" :aria-label="t('time.ariaYear')" @change="onYearChange">
            <option v-for="year in years" :key="year" :value="year">{{ t('time.yearOption', { year }) }}</option>
          </select>
        </label>

        <form class="jump-form" @submit.prevent="applyDraft">
          <label class="field field--datetime">
            <span class="field__label">{{ t('time.dateTimeLabel') }} <em>{{ t('time.dateTimeHint') }}</em></span>
            <input
              v-model="draftValue"
              type="datetime-local"
              step="1"
              :min="boundaryMin"
              :max="boundaryMax"
              :aria-label="t('time.ariaDate')"
              @focus="onDraftFocus"
              @blur="onDraftBlur"
            />
          </label>
          <button type="submit" class="jump-button">{{ t('time.jump') }}</button>
        </form>
        <p v-if="draftError" class="field-error" role="alert">{{ draftError }}</p>

        <div class="term-jump">
          <button type="button" @click="setToCurrentTermStart">{{ t('time.currentStart') }}</button>
          <button type="button" @click="setToNextTerm">{{ t('time.nextJump') }}</button>
        </div>
      </div>
    </div>

    <div class="timeline-block">
      <div class="timeline-head">
        <p>
          {{ t('time.timelineTitle', { year: selectedYear }) }}
          <span class="timeline-head__hint">{{ t('time.timelineHint') }}</span>
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
            :aria-label="t('time.timelineAria')"
            @input="onRangeInput"
          />
        </div>
      </div>

      <div class="timeline-footer">
        <p>
          {{ t('time.intervalNote') }}
          <a href="#sources">{{ t('time.calcLink') }}</a>
        </p>
        <p>{{ t('time.support', { min: yearMin, max: yearMax }) }}</p>
      </div>
    </div>

    <p v-if="boundaryNotice" class="boundary-notice" role="status">
      <span>{{ boundaryNotice }}</span>
      <button type="button" :aria-label="t('common.ariaDismiss')" @click="store.clearBoundaryNotice()">×</button>
    </p>
  </section>
</template>
