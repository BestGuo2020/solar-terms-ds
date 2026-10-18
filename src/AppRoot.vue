<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useObservatory } from './stores/observatory'
import { formatDateTimeCN } from './astro/beijing-time.ts'
import { useI18n } from './i18n/index.ts'
import { getLocalizedTermByIndex } from './i18n/content.ts'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import ObservatorySection from './components/ObservatorySection.vue'
import TermIndex from './components/TermIndex.vue'
import HistorySection from './components/HistorySection.vue'
import CultureSection from './components/CultureSection.vue'
import SongSection from './components/SongSection.vue'
import ScienceSection from './components/ScienceSection.vue'
import SourcesSection from './components/SourcesSection.vue'

const store = useObservatory()
const { locale, t } = useI18n()
const announcement = ref('')
const toastVisible = ref(false)
const toastText = ref('')
let toastTimer: number | null = null

function buildSelectionMessage(): string {
  const baseTerm = store.activeTerm.value
  const term = getLocalizedTermByIndex(baseTerm.index, locale.value)
  const occurrence = store.activeOccurrence.value
  return t('toast.selected', {
    year: store.selectedYear.value,
    term: term.name,
    time: formatDateTimeCN(occurrence.ms, true, locale.value),
  })
}

function announceOnly(): void {
  announcement.value = ''
  window.setTimeout(() => {
    announcement.value = buildSelectionMessage()
  }, 20)
}

function showToast(): void {
  const message = buildSelectionMessage()
  announcement.value = ''
  window.setTimeout(() => {
    announcement.value = message
  }, 20)
  toastText.value = message
  toastVisible.value = true
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastVisible.value = false
    toastTimer = null
  }, 7200)
}

function onSceneTermSelected(): void {
  announceOnly()
}

function onReadingTermSelected(): void {
  showToast()
}

function dismissToast(): void {
  toastVisible.value = false
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer)
    toastTimer = null
  }
}

function goToObservatory(): void {
  dismissToast()
  const section = document.querySelector<HTMLElement>('#observatory')
  if (!section) return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

onBeforeUnmount(() => {
  if (toastTimer !== null) window.clearTimeout(toastTimer)
})
</script>

<template>
  <a class="skip-link" href="#main">{{ t('a11y.skip') }}</a>
  <div id="top" class="page-shell">
    <SiteHeader />

    <main id="main" tabindex="-1">
      <ObservatorySection @select-term="onSceneTermSelected" />

      <div class="reading-scroll">
        <div class="scroll-cover">
          <div class="scroll-cover__rule" aria-hidden="true"></div>
          <p class="scroll-cover__eyebrow">{{ t('cover.eyebrow') }}</p>
          <h2>
            {{ t('cover.titleA') }}<br />
            <em>{{ t('cover.titleB') }}</em>
          </h2>
          <p class="scroll-cover__lede">{{ t('cover.lede') }}</p>
          <div class="scroll-cover__seasons" aria-hidden="true">
            <span>{{ t('cover.seasonSpring') }}</span><i></i>
            <span>{{ t('cover.seasonSummer') }}</span><i></i>
            <span>{{ t('cover.seasonAutumn') }}</span><i></i>
            <span>{{ t('cover.seasonWinter') }}</span>
          </div>
          <p class="scroll-cover__hint">{{ t('cover.scrollHint') }}</p>
        </div>

        <TermIndex @select-term="onReadingTermSelected" />
        <HistorySection />
        <CultureSection />
        <SongSection @select-term="onReadingTermSelected" />
        <ScienceSection />
      </div>

      <SourcesSection />
    </main>

    <SiteFooter />

    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>

    <Transition name="toast">
      <div v-if="toastVisible" class="selection-toast">
        <div class="selection-toast__mark" aria-hidden="true">{{ t('brand.name').slice(0, 1) }}</div>
        <div class="selection-toast__copy">
          <p>{{ toastText }}</p>
          <span>{{ t('toast.paused') }}</span>
        </div>
        <button type="button" class="selection-toast__action" @click="goToObservatory">{{ t('toast.back') }}</button>
        <button type="button" class="selection-toast__close" :aria-label="t('toast.close')" @click="dismissToast">×</button>
      </div>
    </Transition>
  </div>
</template>
