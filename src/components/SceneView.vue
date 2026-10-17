<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useObservatory } from '../stores/observatory'
import {
  SolarSystemScene,
  type GuideToggles,
  type SceneAssetState,
  type SceneFrameState,
  type ViewPreset,
} from '../three/SolarSystemScene'

const emit = defineEmits<{ (event: 'select-term', termIndex: number): void }>()

const store = useObservatory()
const {
  simMs,
  activeTerm,
  seasonMeta,
  solarLongitude,
  orbitAngle,
  solarState,
  dateText,
  weekdayText,
  timeText,
  isSimulated,
  simulatedOffsetText,
  selectedYear,
} = store

const viewport = ref<HTMLDivElement | null>(null)
const engine = shallowRef<SolarSystemScene | null>(null)
const activeView = ref<ViewPreset>('default')
const webglError = ref<string | null>(null)
const contextLost = ref(false)
const assetState = ref<SceneAssetState>({ loaded: 0, total: 7, failures: [] })
const texturesSettled = ref(false)
const qualityLabel = ref('自适应')
const loadingLabel = computed(() => {
  if (!texturesSettled.value) {
    return assetState.value.loaded === 0
      ? '正在准备地球影像'
      : `正在载入纹理 ${assetState.value.loaded}/${assetState.value.total}`
  }
  if (assetState.value.failures.length > 0) return '部分纹理已使用替代材质'
  return '观测台就绪'
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
  label: string
  ariaLabel: string
}> = [
  { key: 'axis', label: '地轴', ariaLabel: '显示或隐藏地轴、轨道法线及 23.4 度夹角' },
  { key: 'equator', label: '赤道', ariaLabel: '显示或隐藏地球赤道' },
  { key: 'tropics', label: '回归线', ariaLabel: '显示或隐藏南北回归线' },
  { key: 'revolution', label: '公转方向', ariaLabel: '显示或隐藏地球公转方向箭头' },
  { key: 'labels', label: '节气名', ariaLabel: '显示或隐藏轨道上的二十四节气名称' },
]

const viewOptions: Array<{ value: ViewPreset; label: string }> = [
  { value: 'overview', label: '轨道总览' },
  { value: 'earth', label: '地球近景' },
  { value: 'default', label: '恢复默认视角' },
]

const formattedLongitude = computed(() => solarLongitude.value.toFixed(2))
const formattedOrbitAngle = computed(() => orbitAngle.value.toFixed(2))
const formattedDeclination = computed(() => {
  const value = solarState.value.declination
  const hemisphere = value >= 0 ? '北纬' : '南纬'
  return `${hemisphere} ${Math.abs(value).toFixed(1)}°`
})

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
    qualityLabel.value = scene.getSupportedQuality()
    engine.value = scene
    document.addEventListener('visibilitychange', handleVisibilityChange)
  } catch (error) {
    console.error(error)
    webglError.value = '当前浏览器未能初始化 WebGL 三维场景。你仍然可以使用下方时间轴与右侧节气详情。'
    texturesSettled.value = true
  }
})

watch(
  guides,
  (value) => engine.value?.setGuides(value),
  { deep: true },
)

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
          <p class="scene-now__kicker">此刻，地球在轨道上</p>
          <div class="scene-now__time">
            <time :datetime="new Date(simMs).toISOString()">{{ timeText }}</time>
            <span class="scene-now__zone">北京时间 · UTC+8</span>
          </div>
          <p class="scene-now__date">{{ dateText }} · {{ weekdayText }}</p>
          <p class="scene-now__term">
            <span :style="{ color: seasonMeta.color }">{{ activeTerm.name }}</span>
            <span class="scene-now__divider">/</span>
            <span>{{ seasonMeta.label }} · 太阳黄经 {{ formattedLongitude }}°</span>
          </p>
        </div>

        <div class="scene-status">
          <span class="status-badge" :class="isSimulated ? 'is-simulated' : 'is-live'">
            <i aria-hidden="true"></i>
            {{ isSimulated ? '模拟时间' : '即时 · 实时' }}
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
        <h3>三维观测台未启动</h3>
        <p>{{ webglError }}</p>
      </div>

      <div v-if="contextLost" class="scene-error scene-error--small" role="alert">
        <h3>图形上下文暂时中断</h3>
        <p>浏览器已暂停三维渲染。刷新页面可以重新进入观测台。</p>
      </div>

      <p class="scene-scale">尺寸与距离不按实际比例</p>
      <p class="scene-instruction">
        <span class="scene-instruction__mouse">拖动旋转 · 滚轮缩放 · 点按轨道光点查看节气 · 方向键也能转动视角</span>
        <span class="scene-instruction__touch">单指旋转 · 双指缩放 · 点按光点或节气名查看</span>
      </p>
    </div>

    <div class="scene-toolbar">
      <div class="view-presets" role="group" aria-label="相机视角">
        <span class="toolbar-label">视角</span>
        <button
          v-for="view in viewOptions"
          :key="view.value"
          type="button"
          class="toolbar-button"
          :class="{ 'is-active': activeView === view.value }"
          :aria-pressed="activeView === view.value"
          @click="setView(view.value)"
        >
          {{ view.label }}
        </button>
      </div>

      <div class="guide-toggles" role="group" aria-label="辅助标识">
        <span class="toolbar-label">辅助</span>
        <button
          v-for="guide in guideOptions"
          :key="guide.key"
          type="button"
          class="guide-toggle"
          :class="{ 'is-on': guides[guide.key] }"
          :aria-pressed="guides[guide.key]"
          :aria-label="guide.ariaLabel"
          :title="guide.ariaLabel"
          @click="toggleGuide(guide.key)"
        >
          <span class="guide-toggle__mark" aria-hidden="true"></span>
          {{ guide.label }}
        </button>
      </div>
    </div>

    <div class="coordinate-strip">
      <div class="coordinate-strip__item">
        <span class="coordinate-strip__label">太阳地心视黄经</span>
        <strong>λ<sub>☉</sub> = {{ formattedLongitude }}°</strong>
      </div>
      <span class="coordinate-strip__operator" aria-hidden="true">+ 180°</span>
      <div class="coordinate-strip__item">
        <span class="coordinate-strip__label">地球轨道方位角</span>
        <strong>φ<sub>⊕</sub> = {{ formattedOrbitAngle }}°</strong>
      </div>
      <p class="coordinate-strip__note">
        从黄道北极俯视，黄经沿逆时针增大；地球在太阳的相反方向，所以轨道标记取
        λ<sub>☉</sub> + 180°。太阳直射点：{{ formattedDeclination }}。图中天体与轨道为观感尺寸，
        <span class="coordinate-strip__scale">尺寸与距离不按实际比例</span>。
      </p>
    </div>

    <div class="scene-meta-row">
      <p class="scene-meta-row__hint">
        <span aria-hidden="true">◌</span>
        轨道刻度按真实太阳黄经排布；下方滑块上的刻度来自当年实际交节时刻，并非等距。
        <span class="scene-meta-row__tilt" :class="{ 'is-off': !guides.axis }">地轴与轨道法线约成 23.4°</span>
      </p>
      <p class="scene-meta-row__quality">{{ qualityLabel }} · 隐藏页面时暂停渲染</p>
    </div>
  </div>
</template>
