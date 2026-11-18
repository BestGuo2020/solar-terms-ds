<script setup lang="ts">
import { computed } from 'vue'
import { useObservatory } from '../stores/observatory'
import { useI18n } from '../i18n/index.ts'
import { getSeasonName, getTermName } from '../i18n/content.ts'
import SceneView from './SceneView.vue'
import TermDetail from './TermDetail.vue'
import TimeConsole from './TimeConsole.vue'

const emit = defineEmits<{ (event: 'select-term', termIndex: number): void }>()
const store = useObservatory()
const { locale, t } = useI18n()
const { activeTerm, solarLongitude, remainingText, isSimulated } = store

const activeTermName = computed(() => getTermName(activeTerm.value.index, locale.value))
const seasonName = computed(() => getSeasonName(activeTerm.value.season, locale.value))
const termDescriptor = computed(() => `${activeTermName.value} · ${seasonName.value}`)

function onSceneTermSelected(termIndex: number): void {
  emit('select-term', termIndex)
}
</script>

<template>
  <section id="observatory" class="observatory-section" aria-labelledby="hero-title">
    <div class="hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">
          <span class="eyebrow__line" aria-hidden="true"></span>
          {{ t('hero.eyebrow') }}
        </p>
        <h1 id="hero-title">
          {{ t('hero.titleA') }}<br />
          <em>{{ t('hero.titleB') }}</em>
        </h1>
        <p class="hero-lede">{{ t('hero.lede') }}</p>
        <div class="hero-live">
          <span class="hero-live__tag">{{ isSimulated ? t('hero.simulatedTag') : t('hero.liveTag') }}</span>
          <strong>{{ termDescriptor }}</strong>
          <span class="hero-live__sep"></span>
          <span>{{ t('hero.sunLongitude', { lon: solarLongitude.toFixed(2) }) }}</span>
          <span class="hero-live__sep"></span>
          <span>{{ t('hero.untilNext', { time: remainingText }) }}</span>
        </div>
        <div class="hero-links">
          <a class="text-link" href="#terms">{{ t('hero.termsLink') }} <span aria-hidden="true">↓</span></a>
          <a class="text-link text-link--muted" href="#history">{{ t('hero.historyLink') }} <span aria-hidden="true">↘</span></a>
        </div>
      </div>

      <div class="hero-aside" aria-hidden="true">
        <div class="hero-aside__ring">
          <span class="hero-aside__sun"></span>
          <span class="hero-aside__orbit hero-aside__orbit--one"></span>
          <span class="hero-aside__orbit hero-aside__orbit--two"></span>
          <span class="hero-aside__earth"></span>
          <span class="hero-aside__label hero-aside__label--one">{{ t('hero.asideEcliptic') }}</span>
          <span class="hero-aside__label hero-aside__label--two">{{ t('hero.asideObserve') }}</span>
        </div>
        <p class="hero-aside__quote">{{ t('hero.quote') }}</p>
        <p class="hero-aside__source">{{ t('hero.quoteSource') }}</p>
      </div>
    </div>

    <div class="observatory-grid">
      <SceneView @select-term="onSceneTermSelected" />
      <TermDetail />
    </div>

    <TimeConsole />
  </section>
</template>
