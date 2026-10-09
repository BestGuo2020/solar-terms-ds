<script setup lang="ts">
/**
 * 页面总装
 *
 * 布局（桌面）：顶栏 → 3D 舞台 + 节气详情区 → 底部时间控制 → 下方阅读区。
 * 移动端把详情区与控制区改为纵向排布，避免遮挡地球与轨道。
 */
import { computed, onMounted } from 'vue'
import CultureSection from '@/components/CultureSection.vue'
import HistorySection from '@/components/HistorySection.vue'
import LanguageSwitch from '@/components/LanguageSwitch.vue'
import ScienceSection from '@/components/ScienceSection.vue'
import SceneStage from '@/components/SceneStage.vue'
import SongSection from '@/components/SongSection.vue'
import SourcesSection from '@/components/SourcesSection.vue'
import TermDetailPanel from '@/components/TermDetailPanel.vue'
import TermOverview from '@/components/TermOverview.vue'
import TimeControls from '@/components/TimeControls.vue'
import { formatDateISO, formatTimeHM, formatYearLabel, weekdayLabel } from '@/astro/time'
import { YEAR_MAX, YEAR_MIN } from '@/astro/solarTerms'
import { useSimulation } from '@/composables/useSimulation'
import { useI18n } from '@/i18n'
import { TERMS, assertDataConsistency } from '@/data'

const { t, locale } = useI18n()
const { realNowMs, isSimulated, jumpToTerm, displayYear, activeTerm } = useSimulation()

const displayYearLabel = computed(() => formatYearLabel(displayYear.value, locale.value))

/** 当前节气的本地化名称（3D 状态里带的始终是中文名） */
const activeTermName = computed(() => {
  const base = TERMS[activeTerm.value.index]
  return base ? (locale.value === 'en' ? base.nameEn : base.name) : activeTerm.value.name
})

const nowText = computed(
  () =>
    `${formatDateISO(realNowMs.value)} ${weekdayLabel(realNowMs.value, locale.value)} ${formatTimeHM(realNowMs.value)}`,
)

/** 3D 场景里点击节气标记 → 跳到该节气交节时刻 */
function onSelectTerm(index: number) {
  jumpToTerm(displayYear.value, index)
}

onMounted(() => {
  assertDataConsistency()
})
</script>

<template>
  <header class="site-header">
    <div class="brand">
      <h1>{{ t('app.title') }}</h1>
      <span class="brand-sub">{{ t('app.subtitle') }}</span>
    </div>
    <LanguageSwitch />
    <div class="header-clock">
      <span class="badge" :class="isSimulated ? 'badge-sim' : 'badge-live'">
        {{ isSimulated ? t('common.simulated') : t('common.live') }}
      </span>
      <span class="now-label">{{ t('common.now') }}</span>
      <time :datetime="formatDateISO(realNowMs)">{{ nowText }}</time>
      <span class="now-label">{{ t('common.beijingTime') }}</span>
    </div>
  </header>

  <!--
    首屏：3D 舞台 + 时间控制 + 节气详情。
    DOM 顺序为「场景 → 时间控制 → 详情」，与移动端的阅读顺序一致；
    桌面端用 grid 把详情区放到右栏、时间控制放到整行底部。
  -->
  <div class="stage">
    <SceneStage @select-term="onSelectTerm" />
    <TimeControls />
    <TermDetailPanel />
  </div>

  <main class="reading">
    <TermOverview />
    <HistorySection />
    <CultureSection />
    <SongSection />
    <ScienceSection />
    <SourcesSection />
  </main>

  <footer class="site-footer">
    <p>
      {{
        t('footer.current', {
          year: displayYearLabel,
          term: activeTermName,
          lon: activeTerm.longitude,
        })
      }}
    </p>
    <p>{{ t('footer.method') }}</p>
    <p>{{ t('footer.range', { min: YEAR_MIN, max: YEAR_MAX }) }}</p>
    <p>{{ t('footer.credits') }}</p>
    <p class="footer-scale">{{ t('footer.scaleNote') }}</p>
  </footer>
</template>
