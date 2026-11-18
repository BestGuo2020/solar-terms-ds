<script setup lang="ts">
import { computed } from 'vue'
import { useObservatory } from '../stores/observatory'
import { formatDateTimeCN } from '../astro/beijing-time'
import { useI18n } from '../i18n/index.ts'
import {
  getLocalizedTerm,
  getSeasonName,
  getTermName,
} from '../i18n/content.ts'
import type { MessageKey } from '../i18n/messages.ts'

const store = useObservatory()
const { locale, t } = useI18n()
const {
  activeTerm,
  activeOccurrence,
  nextOccurrence,
  seasonMeta,
  termProgressPercent,
  elapsedText,
  remainingText,
  selectedYear,
  yearTermMap,
} = store

const localizedTerm = computed(() => getLocalizedTerm(activeTerm.value, locale.value))
const seasonName = computed(() => getSeasonName(activeTerm.value.season, locale.value))
const oppositeSeasonLabel = computed(() => localizedTerm.value.oppositeSeasonName)
const seasonNote = computed(() => {
  const keyBySeason: Record<string, MessageKey> = {
    春: 'term.seasonNote.spring',
    夏: 'term.seasonNote.summer',
    秋: 'term.seasonNote.autumn',
    冬: 'term.seasonNote.winter',
  }
  return t(keyBySeason[activeTerm.value.season])
})
const nextTermName = computed(() => getTermName(nextOccurrence.value.term.index, locale.value))
const crossYearOccurrence = computed(() => {
  const occurrence = yearTermMap.value.get(activeTerm.value.index)
  if (!occurrence) return null
  if (occurrence.ms === activeOccurrence.value.ms) return null
  return occurrence
})
const currentStartText = computed(() =>
  formatDateTimeCN(activeOccurrence.value.ms, true, locale.value),
)
const nextStartText = computed(() =>
  formatDateTimeCN(nextOccurrence.value.ms, true, locale.value),
)
const selectedYearStartText = computed(() => {
  if (!crossYearOccurrence.value) return null
  return formatDateTimeCN(crossYearOccurrence.value.ms, true, locale.value)
})
const termSubtitle = computed(() =>
  locale.value === 'en'
    ? `${localizedTerm.value.nativeName} · ${localizedTerm.value.pinyin}`
    : localizedTerm.value.pinyin,
)
const poemAttribution = computed(() => {
  const poem = localizedTerm.value.poem
  if (locale.value === 'en') return `${poem.author} · ${poem.source}`
  return `${poem.author}《${poem.source.replace(/[《》]/g, '')}》`
})
const panelStyle = computed(() => ({
  '--season-color': seasonMeta.value.color,
}))
const pentadLabels = computed(() => [
  t('term.pentad1'),
  t('term.pentad2'),
  t('term.pentad3'),
])

function setToCurrentStart(): void {
  store.selectCurrentTermStart()
}

function setToNextTerm(): void {
  store.selectNextTerm()
}
</script>

<template>
  <aside class="term-panel" :style="panelStyle" :aria-labelledby="'term-panel-title'">
    <span class="term-panel__watermark" aria-hidden="true">{{ activeTerm.season }}</span>

    <header class="term-panel__header">
      <div class="term-panel__heading">
        <p class="term-panel__overline">
          {{ t('term.currentPeriod', { order: activeTerm.index + 1 }) }}
          <span class="term-panel__season">{{ seasonNote }}</span>
        </p>
        <h2 id="term-panel-title" aria-live="polite">
          {{ localizedTerm.name }}
          <span class="term-panel__pinyin">{{ termSubtitle }}</span>
        </h2>
        <p class="term-panel__meta">
          <span>{{ seasonName }}</span>
          <span class="meta-dot"></span>
          <span>{{ t('term.opposite', { season: oppositeSeasonLabel }) }}</span>
          <span v-if="localizedTerm.major" class="major-chip">{{ t('term.major') }}</span>
        </p>
      </div>
      <div class="term-panel__longitude">
        <span>{{ t('term.solarLongitude') }}</span>
        <strong>{{ localizedTerm.longitude }}<sup>°</sup></strong>
        <small>{{ t('term.definingValue') }}</small>
      </div>
    </header>

    <div class="term-panel__timing">
      <div class="timing-line">
        <span class="timing-line__label">{{ t('term.current') }}</span>
        <p>
          <strong>{{ localizedTerm.name }}</strong>
          <span>{{ t('common.since') }} {{ currentStartText }}</span>
        </p>
      </div>
      <div
        class="timing-progress"
        role="progressbar"
        :aria-label="t('term.progressAria')"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(termProgressPercent)"
      >
        <span :style="{ width: `${termProgressPercent}%` }"></span>
      </div>
      <div class="timing-line timing-line--next">
        <span class="timing-line__label">{{ t('term.nextTerm') }}</span>
        <p>
          <strong>{{ nextTermName }}</strong>
          <span>{{ nextStartText }}</span>
        </p>
      </div>
      <p class="term-panel__duration">
        {{ t('term.elapsedUntil', { elapsed: elapsedText, remaining: remainingText }) }}
        <span>{{ t('term.selectedYearMeta', { year: selectedYear }) }}</span>
      </p>
      <p class="term-panel__scroll-cue">{{ t('term.scrollCue') }}</p>
      <p v-if="selectedYearStartText" class="term-panel__cross-year">
        {{ t('term.crossYear', { year: selectedYear, time: selectedYearStartText }) }}
      </p>
    </div>

    <div
      class="term-panel__scroll"
      tabindex="0"
      :aria-label="t('term.panelAria')"
    >
      <section class="detail-section detail-section--lead">
        <h3>{{ t('term.meaning') }}</h3>
        <p>{{ localizedTerm.meaning }}</p>
      </section>

      <section class="detail-section">
        <h3>{{ t('term.climate') }} <span>{{ t('term.climateNote') }}</span></h3>
        <p>{{ localizedTerm.climate }}</p>
      </section>

      <section class="detail-section">
        <h3>{{ t('term.phenology') }} <span>{{ t('term.phenologyNote') }}</span></h3>
        <p>{{ localizedTerm.phenology }}</p>
        <div class="pentad-row">
          <div v-for="(pentad, index) in localizedTerm.pentads" :key="`${index}-${pentad}`" class="pentad">
            <span>{{ pentadLabels[index] }}</span>
            <strong>{{ pentad }}</strong>
          </div>
        </div>
      </section>

      <section class="detail-section">
        <h3>{{ t('term.farming') }}</h3>
        <p>{{ localizedTerm.farming }}</p>
      </section>

      <div class="detail-columns">
        <section class="detail-section">
          <h3>{{ t('term.customs') }}</h3>
          <p>{{ localizedTerm.custom }}</p>
        </section>
        <section class="detail-section">
          <h3>{{ t('term.food') }}</h3>
          <p>{{ localizedTerm.food }}</p>
        </section>
      </div>

      <blockquote class="poem-card">
        <span class="poem-card__mark" aria-hidden="true">{{ t('term.poem') }}</span>
        <p>“{{ localizedTerm.poem.text }}”</p>
        <footer>— {{ poemAttribution }}</footer>
      </blockquote>

      <div class="proverb">
        <span>{{ t('term.proverb') }}</span>
        <p>{{ localizedTerm.proverb }}</p>
      </div>

      <p class="region-note">{{ t('term.regionNote') }}</p>
    </div>

    <footer class="term-panel__footer">
      <button type="button" class="term-nav-button" @click="setToCurrentStart">
        <span>{{ t('term.navCurrent') }}</span>
        <strong>{{ t('term.navCurrentStrong') }}</strong>
      </button>
      <button type="button" class="term-nav-button term-nav-button--next" @click="setToNextTerm">
        <span>{{ t('term.navNext') }}</span>
        <strong>{{ nextTermName }} →</strong>
      </button>
    </footer>
  </aside>
</template>
