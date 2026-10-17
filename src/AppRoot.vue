<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useObservatory } from './stores/observatory'
import { formatDateTimeCN } from './astro/beijing-time'
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
const announcement = ref('')
const toastVisible = ref(false)
const toastText = ref('')
let toastTimer: number | null = null

function buildSelectionMessage(): string {
  const term = store.activeTerm.value
  const occurrence = store.activeOccurrence.value
  return `已定位到 ${store.selectedYear.value} 年 ${term.name} 交节时刻：${formatDateTimeCN(occurrence.ms, true)}，北京时间。地球位置与节气详情已同步。`
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
  <a class="skip-link" href="#main">跳到主要内容</a>
  <div id="top" class="page-shell">
    <SiteHeader />

    <main id="main" tabindex="-1">
      <ObservatorySection @select-term="onSceneTermSelected" />

      <div class="reading-scroll">
        <div class="scroll-cover">
          <div class="scroll-cover__rule" aria-hidden="true"></div>
          <p class="scroll-cover__eyebrow">四时之书 · 岁时长卷</p>
          <h2>太阳的一小步，<br /><em>人间的一年。</em></h2>
          <p class="scroll-cover__lede">
            从观测太阳的影子开始，中国人把一年写成二十四个名字。
            接下来的长卷，从节气的时间谱系，读到它在土地、餐桌和诗行中的回声。
          </p>
          <div class="scroll-cover__seasons" aria-hidden="true">
            <span>春</span><i></i>
            <span>夏</span><i></i>
            <span>秋</span><i></i>
            <span>冬</span>
          </div>
          <p class="scroll-cover__hint">向下展卷</p>
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
        <div class="selection-toast__mark" aria-hidden="true">定</div>
        <div class="selection-toast__copy">
          <p>{{ toastText }}</p>
          <span>时间已暂停在交节瞬间。</span>
        </div>
        <button type="button" class="selection-toast__action" @click="goToObservatory">回观测台</button>
        <button type="button" class="selection-toast__close" aria-label="关闭提示" @click="dismissToast">×</button>
      </div>
    </Transition>
  </div>
</template>
