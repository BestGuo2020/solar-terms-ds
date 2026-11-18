<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useObservatory } from '../stores/observatory'
import { useI18n } from '../i18n/index.ts'
import { getLocalizedTermByIndex, getSeasonName } from '../i18n/content.ts'
import type { MessageKey } from '../i18n/messages.ts'
import {
  SolarSystemScene,
  type GuideToggles,
  type SceneAssetState,
  type SceneFrameState,
  type ViewPreset,
} from '../three/SolarSystemScene'

const emit = defineEmits<{ (event: 'select-term', termIndex: number): void }>()

const store = useObservatory()
const { locale, t } = useI18n()
const {
  simMs,
  activeTerm,
  solarLongitude,
  orbitAngle,
  solarState,
  seasonMeta,
  dateText,
  weekdayText,
  timeText,
  isSimulated,
  simulatedOffsetText,
  selectedYear,
} = store

const localizedActiveTerm = computed(() =>
  getLocalizedTermByIndex(activeTerm.value.index, locale.value),
)
const localizedSeasonName = computed(() =>
  getSeasonName(activeTerm.value.season, locale.value),
)

const viewport = ref<HTMLDivElement | null>(null)
const engine = shallowRef<SolarSystemScene | null>(null)
const activeView = ref<ViewPreset>('default')
const webglError = ref(false)
const contextLost = ref(false)
const assetState = ref<SceneAssetState>({ loaded: 0, total: 7, failures: [] })
const texturesSettled = ref(false)
const qualityTier = ref<'high' | 'low'>('high')

const loadingLabel = computed(() => {
  if (!texturesSettled.value) {
    return assetState.value.loaded === 0
      ? t('scene.loadingPreparing')
      : t('scene.loadingProgress', {
          loaded: assetState.value.loaded,
          total: assetState.value.total,
        })
  }
  if (assetState.value.failures.length > 0) return t('scene.loadingFallback')
  return t('scene.loadingReady')
})

const guides = ref<GuideToggles>({
  axis: true,
  equator: true,
  tropics: true,
  revolution: true,
  labels: true,
})

const guideOptions: Array<{
  key: keyof GuideToggles
  labelKey: MessageKey
  ariaKey: MessageKey
}> = [
  { key: 'axis', labelKey: 'scene.guide.axis', ariaKey: 'scene.guide.axisAria' },
  { key: 'equator', labelKey: 'scene.guide.equator', ariaKey: 'scene.guide.equatorAria' },
  { key: 'tropics', labelKey: 'scene.guide.tropics', ariaKey: 'scene.guide.tropicsAria' },
  { key: 'revolution', labelKey: 'scene.guide.revolution', ariaKey: 'scene.guide.revolutionAria' },
  { key: 'labels', labelKey: 'scene.guide.labels', ariaKey: 'scene.guide.labelsAria' },
]

const viewOptions: Array<{ value: ViewPreset; labelKey: MessageKey }> = [
  { value: 'overview', labelKey: 'scene.viewOverview' },
  { value: 'earth', labelKey: 'scene.viewEarth' },
  { value: 'default', labelKey: 'scene.viewDefault' },
]

const formattedLongitude = computed(() => solarLongitude.value.toFixed(2))
const formattedOrbitAngle = computed(() => orbitAngle.value.toFixed(2))
const formattedDeclination = computed(() => {
  const value = solarState.value.declination
  if (locale.value === 'en') {
    return `${Math.abs(value).toFixed(1)}° ${value >= 0 ? 'N' : 'S'}`
  }
  return `${value >= 0 ? '北纬' : '南纬'} ${Math.abs(value).toFixed(1)}°`
})
const qualityLabel = computed(() =>
  qualityTier.value === 'low' ? t('scene.qualityLow') : t('scene.qualityHigh'),
)

function setView(view: ViewPreset): void {
  activeView.value = view
  engine.value?.setView(view)
}

function toggleGuide(key: keyof GuideToggles): void {
  guides.value = { ...guides.value, [key]: !guides.value[key] }
}

function handleSelectTerm(termIndex: number): void {
  store.selectTermInSelectedYear(termIndex)
  emit('select-term', termIndex)
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') store.syncLiveClock()
}

onMounted(async () => {
  await nextTick()
  const el = viewport.value
  if (!el) return
  try {
    const scene = new SolarSystemScene({
      container: el,
      textureBaseUrl: `${import.meta.env.BASE_URL}textures/`,
      onSelectTerm: handleSelectTerm,
      onFrame: (_delta) => {
        store.tick(_delta)
        const active = store.activeWindow.value
        const windowState = active.current
        const frameState: SceneFrameState = {
          sunLongitude: store.solarState.value.sunLongitude,
          subsolarLongitude: store.solarState.value.subsolarLongitude,
          activeTermIndex: windowState.term.index,
          activeTermLongitude: windowState.term.longitude,
          nextTermLongitude: active.next.term.longitude,
        }
        return frameState
      },
      onAssetProgress: (progress) => {
        assetState.value = progress
      },
      onTexturesSettled: (failures) => {
        assetState.value = { ...assetState.value, failures }
        texturesSettled.value = true
      },
      onContextLost: () => {
        contextLost.value = true
      },
      onContextRestored: () => {
        contextLost.value = false
      },
    })
    scene.setGuides(guides.value)
    scene.setLocale(locale.value)
    qualityTier.value = scene.quality.low ? 'low' : 'high'
    engine.value = scene
    document.addEventListener('visibilitychange', handleVisibilityChange)
  } catch (error) {
    console.error(error)
    webglError.value = true
    texturesSettled.value = true
  }
})

watch(
  guides,
  (value) => engine.value?.setGuides(value),
  { deep: true },
)

watch(locale, (value) => {
  engine.value?.setLocale(value)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  engine.value?.dispose()
  engine.value = null
})
</script>

<template>
  <div class="scene-card">
    <div
      ref="viewport"
      class="scene-viewport"
      :class="{ 'is-earth-view': activeView === 'earth' }"
      :data-current-term="activeTerm.name"
      :data-active-term-index="activeTerm.index"
      :data-solar-longitude="formattedLongitude"
      :data-simulation-mode="isSimulated ? 'simulated' : 'live'"
      :data-sim-ms="simMs"
      :data-selected-year="selectedYear"
      :data-view="activeView"
      :data-textures-loaded="texturesSettled"
    >
      <div class="scene-veil" aria-hidden="true"></div>

      <div class="scene-hud scene-hud--top">
        <div class="scene-now">
          <p class="scene-now__kicker">{{ t('scene.nowKicker') }}</p>
          <div class="scene-now__time">
            <time :datetime="new Date(simMs).toISOString()">{{ timeText }}</time>
            <span class="scene-now__zone">{{ t('scene.beijingTime') }}</span>
          </div>
          <p class="scene-now__date">{{ dateText }} · {{ weekdayText }}</p>
          <p class="scene-now__term">
            <span :style="{ color: seasonMeta.color }">{{ localizedActiveTerm.name }}</span>
            <span class="scene-now__divider">/</span>
            <span>
              {{ localizedSeasonName }}<span class="scene-now__longitude"> · {{ t('hero.sunLongitude', { lon: formattedLongitude }) }}</span>
            </span>
          </p>
        </div>

        <div class="scene-status">
          <span class="status-badge" :class="isSimulated ? 'is-simulated' : 'is-live'">
            <i aria-hidden="true"></i>
            {{ isSimulated ? t('scene.statusSimulated') : t('scene.statusLive') }}
          </span>
          <span v-if="isSimulated" class="scene-status__hint">{{ simulatedOffsetText }}</span>
        </div>
      </div>

      <div
        v-if="!texturesSettled || assetState.failures.length"
        class="scene-loading"
        :class="{ 'is-warning': texturesSettled }"
        role="status"
        aria-live="polite"
      >
        <span class="scene-loading__orbit" aria-hidden="true"><i></i></span>
        <span>{{ loadingLabel }}</span>
        <span v-if="!texturesSettled" class="scene-loading__count">{{ assetState.loaded }}/{{ assetState.total }}</span>
      </div>

      <div v-if="webglError" class="scene-error">
        <div class="scene-error__diagram" aria-hidden="true">
          <span class="scene-error__sun"></span>
          <span class="scene-error__orbit"></span>
          <span class="scene-error__earth"></span>
        </div>
        <h3>{{ t('scene.errorTitle') }}</h3>
        <p>{{ t('scene.errorWebgl') }}</p>
      </div>

      <div v-if="contextLost" class="scene-error scene-error--small" role="alert">
        <h3>{{ t('scene.contextLostTitle') }}</h3>
        <p>{{ t('scene.contextLostText') }}</p>
      </div>

      <p class="scene-scale">{{ t('scene.scale') }}</p>
      <p class="scene-instruction">
        <span class="scene-instruction__mouse">{{ t('scene.mouseHint') }}</span>
        <span class="scene-instruction__touch">{{ t('scene.touchHint') }}</span>
      </p>
    </div>

    <div class="scene-toolbar">
      <div class="view-presets" role="group" :aria-label="t('scene.viewGroupAria')">
        <span class="toolbar-label">{{ t('scene.viewLabel') }}</span>
        <button
          v-for="view in viewOptions"
          :key="view.value"
          type="button"
          class="toolbar-button"
          :class="{ 'is-active': activeView === view.value }"
          :aria-pressed="activeView === view.value"
          @click="setView(view.value)"
        >
          {{ t(view.labelKey) }}
        </button>
      </div>

      <div class="guide-toggles" role="group" :aria-label="t('scene.guideGroupAria')">
        <span class="toolbar-label">{{ t('scene.guideLabel') }}</span>
        <button
          v-for="guide in guideOptions"
          :key="guide.key"
          type="button"
          class="guide-toggle"
          :class="{ 'is-on': guides[guide.key] }"
          :aria-pressed="guides[guide.key]"
          :aria-label="t(guide.ariaKey)"
          :title="t(guide.ariaKey)"
          @click="toggleGuide(guide.key)"
        >
          <span class="guide-toggle__mark" aria-hidden="true"></span>
          {{ t(guide.labelKey) }}
        </button>
      </div>
    </div>

    <div class="coordinate-strip">
      <div class="coordinate-strip__item">
        <span class="coordinate-strip__label">{{ t('scene.coordSolar') }}</span>
        <strong>λ<sub>☉</sub> = {{ formattedLongitude }}°</strong>
      </div>
      <span class="coordinate-strip__operator" aria-hidden="true">{{ t('scene.coordFormula') }}</span>
      <div class="coordinate-strip__item">
        <span class="coordinate-strip__label">{{ t('scene.coordOrbit') }}</span>
        <strong>φ<sub>⊕</sub> = {{ formattedOrbitAngle }}°</strong>
      </div>
      <p class="coordinate-strip__note">
        {{ t('scene.coordNote', { declination: formattedDeclination }) }}
        <span class="coordinate-strip__scale">{{ t('scene.coordScale') }}</span>
      </p>
    </div>

    <div class="scene-meta-row">
      <p class="scene-meta-row__hint">
        <span aria-hidden="true">◌</span>
        {{ t('scene.metaTicks') }}
        <span class="scene-meta-row__tilt" :class="{ 'is-off': !guides.axis }">{{ t('scene.metaTilt') }}</span>
      </p>
      <p class="scene-meta-row__quality">{{ qualityLabel }}{{ t('scene.qualitySuffix') }}</p>
    </div>
  </div>
</template>
