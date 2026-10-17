<script setup lang="ts">
import { computed } from 'vue'
import { useObservatory } from '../stores/observatory'
import { formatDateTimeCN } from '../astro/beijing-time'
import { OPPOSITE_SEASON, SEASON_META } from '../data/term-catalog'

const store = useObservatory()
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

const SEASON_NOTES = {
  春: '生发 · 木气初动',
  夏: '繁盛 · 阳气至盛',
  秋: '收敛 · 金气渐肃',
  冬: '闭藏 · 水气归藏',
} as const

const seasonNote = computed(() => SEASON_NOTES[activeTerm.value.season])
const oppositeSeasonLabel = computed(() => SEASON_META[OPPOSITE_SEASON[activeTerm.value.season]].label)
const crossYearOccurrence = computed(() => {
  const occurrence = yearTermMap.value.get(activeTerm.value.index)
  if (!occurrence) return null
  if (occurrence.ms === activeOccurrence.value.ms) return null
  return occurrence
})
const currentStartText = computed(() => formatDateTimeCN(activeOccurrence.value.ms, true))
const nextStartText = computed(() => formatDateTimeCN(nextOccurrence.value.ms, true))
const selectedYearStartText = computed(() => {
  if (!crossYearOccurrence.value) return null
  return formatDateTimeCN(crossYearOccurrence.value.ms, true)
})
const panelStyle = computed(() => ({
  '--season-color': seasonMeta.value.color,
}))
</script>

<template>
  <aside class="term-panel" :style="panelStyle" aria-labelledby="term-panel-title">
    <span class="term-panel__watermark" aria-hidden="true">{{ activeTerm.season }}</span>

    <header class="term-panel__header">
      <div class="term-panel__heading">
        <p class="term-panel__overline">
          当前区间 · 第 {{ activeTerm.index + 1 }} 个节气
          <span class="term-panel__season">{{ seasonNote }}</span>
        </p>
        <h2 id="term-panel-title" aria-live="polite">
          {{ activeTerm.name }}
          <span class="term-panel__pinyin">{{ activeTerm.pinyin }}</span>
        </h2>
        <p class="term-panel__meta">
          <span>{{ seasonMeta.label }}</span>
          <span class="meta-dot"></span>
          <span>南半球 {{ oppositeSeasonLabel }}</span>
          <span v-if="activeTerm.major" class="major-chip">分至点</span>
        </p>
      </div>
      <div class="term-panel__longitude">
        <span>太阳黄经</span>
        <strong>{{ activeTerm.longitude }}<sup>°</sup></strong>
        <small>本节气定义值</small>
      </div>
    </header>

    <div class="term-panel__timing">
      <div class="timing-line">
        <span class="timing-line__label">已进入</span>
        <p>
          <strong>{{ activeTerm.name }}</strong>
          <span>始于 {{ currentStartText }}</span>
        </p>
      </div>
      <div
        class="timing-progress"
        role="progressbar"
        aria-label="当前节气区间进度"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(termProgressPercent)"
      >
        <span :style="{ width: `${termProgressPercent}%` }"></span>
      </div>
      <div class="timing-line timing-line--next">
        <span class="timing-line__label">下一交节</span>
        <p>
          <strong>{{ nextOccurrence.term.name }}</strong>
          <span>{{ nextStartText }}</span>
        </p>
      </div>
      <p class="term-panel__duration">
        已过 {{ elapsedText }}，距下一节气约 {{ remainingText }}。
        <span>{{ selectedYear }} 年 · 北京时间</span>
      </p>
      <p class="term-panel__scroll-cue">向下滚动 · 农事 · 习俗 · 饮食 · 诗</p>
      <p v-if="selectedYearStartText" class="term-panel__cross-year">
        当前区间从上一公历年延续而来；{{ selectedYear }} 年内该节气交节于 {{ selectedYearStartText }}。
      </p>
    </div>

    <div
      class="term-panel__scroll"
      tabindex="0"
      aria-label="节气详情内容，可滚动阅读"
    >
      <section class="detail-section detail-section--lead">
        <h3>名与义</h3>
        <p>{{ activeTerm.meaning }}</p>
      </section>

      <section class="detail-section">
        <h3>气候 <span>地域不同，感受不同</span></h3>
        <p>{{ activeTerm.climate }}</p>
      </section>

      <section class="detail-section">
        <h3>物候 <span>三候</span></h3>
        <p>{{ activeTerm.phenology }}</p>
        <div class="pentad-row">
          <div v-for="(pentad, index) in activeTerm.pentads" :key="pentad" class="pentad">
            <span>{{ ['一候', '二候', '三候'][index] }}</span>
            <strong>{{ pentad }}</strong>
          </div>
        </div>
      </section>

      <section class="detail-section">
        <h3>农事</h3>
        <p>{{ activeTerm.farming }}</p>
      </section>

      <div class="detail-columns">
        <section class="detail-section">
          <h3>习俗</h3>
          <p>{{ activeTerm.custom }}</p>
        </section>
        <section class="detail-section">
          <h3>饮食</h3>
          <p>{{ activeTerm.food }}</p>
        </section>
      </div>

      <blockquote class="poem-card">
        <span class="poem-card__mark" aria-hidden="true">诗</span>
        <p>“{{ activeTerm.poem.text }}”</p>
        <footer>— {{ activeTerm.poem.author }}《{{ activeTerm.poem.source.replace(/[《》]/g, '') }}》</footer>
      </blockquote>

      <div class="proverb">
        <span>农谚</span>
        <p>{{ activeTerm.proverb }}</p>
      </div>

      <p class="region-note">
        气候、物候与农事以中国东部季风区为主要参照；东北、西北、青藏高原与华南的物候并不同步，传统习俗也各有地方形态。
      </p>
    </div>

    <footer class="term-panel__footer">
      <button type="button" class="term-nav-button" @click="store.selectCurrentTermStart()">
        <span>本节气交节</span>
        <strong>回到起点</strong>
      </button>
      <button type="button" class="term-nav-button term-nav-button--next" @click="store.selectNextTerm()">
        <span>下一节气</span>
        <strong>{{ nextOccurrence.term.name }} →</strong>
      </button>
    </footer>
  </aside>
</template>
