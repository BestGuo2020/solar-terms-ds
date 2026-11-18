<script setup lang="ts">
/**
 * 3D 舞台：视图容器 + HUD 浮层 + 视角与辅助线控制
 *
 * 这里是唯一推进模拟时间的地方：SceneManager 每帧回调 onFrame，
 * 我们先把统一时间往前推，再由同一个时刻算出场景状态返回，
 * 因此地球位置、太阳黄经、轨道高亮与节气文字永远出自同一个时间戳。
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { earthStateAt } from '@/astro/bodyPosition'
import { obliquityDegAt } from '@/astro/sceneFrame'
import { activeTermAt, solarTermsOfYear } from '@/astro/solarTerms'
import { beijingYear, formatDateTimeCN, formatYearLabel, humanizeDuration } from '@/astro/time'
import { useSimulation } from '@/composables/useSimulation'
import { useI18n } from '@/i18n'
import { TERMS } from '@/data'
import { SceneManager, type GuideToggles, type SceneState, type ViewPreset } from '@/three/SceneManager'

const emit = defineEmits<{ (e: 'select-term', index: number): void }>()

const { t, locale } = useI18n()
const {
  simMs,
  displayYear,
  isSimulated,
  activeTerm,
  nextTerm,
  termProgress: progress,
  sunLongitude,
  timeOffsetMs,
  tick,
} = useSimulation()

const viewportRef = ref<HTMLDivElement | null>(null)
const manager = shallowRef<SceneManager | null>(null)
const loading = ref(true)
const loadLabel = ref('')
const loadPercent = ref(0)
const fatal = ref<string | null>(null)
const contextLost = ref(false)
const fallbackTextures = ref<import('@/i18n/messages').MessageKey[]>([])
const qualityTier = ref<'high' | 'medium' | 'low'>('high')

const guides = ref<GuideToggles>({
  axis: true,
  equator: true,
  tropics: true,
  revolution: true,
  ecliptic: false,
  labels: true,
  minorLabels: true,
  stars: true,
})

const currentView = ref<ViewPreset>('default')
// 窄屏默认收起辅助选项面板，避免遮挡地球与轨道
const showPanel = ref(typeof window === 'undefined' || window.innerWidth > 900)
// 窄屏默认折叠「黄经 ↔ 场景角度」的详细说明（关键关系那一行始终可见）
const showMapNote = ref(typeof window === 'undefined' || window.innerWidth > 900)

/** 季节的中文键 → i18n 键名后缀 */
function seasonVar(season: string): string {
  return season === '春' ? 'spring' : season === '夏' ? 'summer' : season === '秋' ? 'autumn' : 'winter'
}

/** 当前节气的本地化名称（3D 状态里带的始终是中文名） */
const activeTermName = computed(() => {
  const base = TERMS[activeTerm.value.index]
  return base ? (locale.value === 'en' ? base.nameEn : base.name) : activeTerm.value.name
})
const nextTermName = computed(() => {
  const base = TERMS[nextTerm.value.index]
  return base ? (locale.value === 'en' ? base.nameEn : base.name) : nextTerm.value.name
})

const activeMomentText = computed(
  () => `${formatDateTimeCN(activeTerm.value.ms, locale.value)} · ${t('common.beijingTime')}`,
)
const nextMomentText = computed(
  () => `${formatDateTimeCN(nextTerm.value.ms, locale.value)} · ${t('common.beijingTime')}`,
)

const remainingText = computed(() => {
  const d = nextTerm.value.ms - simMs.value
  return d > 0 ? t('hud.remaining', { d: humanizeDuration(d, locale.value) }) : t('hud.aboutToBegin')
})
const elapsedText = computed(() => {
  const d = simMs.value - activeTerm.value.ms
  return d >= 0 ? t('hud.elapsed', { d: humanizeDuration(d, locale.value) }) : ''
})

const longitudeText = computed(() => sunLongitude.value.toFixed(3))
const sceneAzimuthText = computed(() => (((sunLongitude.value + 180) % 360) + 360) % 360)
/** 当前显示年代的地轴倾角（黄赤交角），随年代缓慢变化 */
const epochObliquity = computed(() => obliquityDegAt(displayYear.value))
const displayYearLabel = computed(() => formatYearLabel(displayYear.value, locale.value))

const declinationText = computed(() => {
  const d = earthStateAt(simMs.value).declination
  const hemi = d >= 0 ? t('common.north') : t('common.south')
  return locale.value === 'en'
    ? `${Math.abs(d).toFixed(2)}° ${hemi}`
    : `${hemi} ${Math.abs(d).toFixed(2)}°`
})

const offsetText = computed(() => {
  const abs = Math.abs(timeOffsetMs.value)
  if (abs < 60000) return t('hud.offsetSame')
  const d = humanizeDuration(abs, locale.value)
  return timeOffsetMs.value > 0 ? t('hud.offsetAhead', { d }) : t('hud.offsetBehind', { d })
})

const sceneAriaLabel = computed(() =>
  t('scene.aria', {
    term: activeTermName.value,
    lon: longitudeText.value,
    time: formatDateTimeCN(simMs.value, locale.value),
  }),
)

/** 每帧：先推进统一时间，再用同一时刻组装场景状态 */
function buildFrameState(dt: number): SceneState {
  tick(dt)
  const ms = simMs.value
  const st = earthStateAt(ms)
  const win = activeTermAt(ms)
  const year = beijingYear(ms)
  return {
    ms,
    sunLongitude: st.sunLongitude,
    distanceAU: st.distanceAU,
    gast: st.gast,
    obliquityDeg: st.obliquityDeg,
    activeTerm: win.current,
    nextTerm: win.next,
    terms: solarTermsOfYear(year),
    displayYear: year,
  }
}

let ro: ResizeObserver | null = null
let narrowQuery: MediaQueryList | null = null

/** 屏幕变窄（手机/竖屏）时自动收起辅助选项面板，免得挡住地球与轨道 */
function onNarrowChange(ev: MediaQueryListEvent | MediaQueryList) {
  if (ev.matches) showPanel.value = false
}

onMounted(async () => {
  const el = viewportRef.value
  if (!el) return

  ro = new ResizeObserver(() => manager.value?.resize())
  ro.observe(el)

  narrowQuery = window.matchMedia('(max-width: 900px)')
  narrowQuery.addEventListener('change', onNarrowChange)

  loadLabel.value = t('scene.loadingText')

  try {
    const m = new SceneManager(el, {
      onSelectTerm: (index) => emit('select-term', index),
      onProgress: (p) => {
        loadPercent.value = Math.round((p.loaded / p.total) * 100)
        loadLabel.value = t('scene.loadingItem', { label: t(p.labelKey) })
      },
      onContextLost: () => {
        contextLost.value = true
      },
      onFrame: buildFrameState,
    })
    m.setLocale(locale.value)
    await m.init()
    if (!el.isConnected) {
      m.dispose()
      return
    }
    manager.value = m
    m.attachVisibilityHandling()
    // 次要节气名称的默认值跟随画质档位（省电档默认只显示四个分至点），
    // 但用户之后可以自行打开。
    guides.value = { ...guides.value, minorLabels: m.defaultMinorLabels }
    m.setGuides(guides.value)
    fallbackTextures.value = [...m.fallbackTextures]
    qualityTier.value = m.qualityTier
    loading.value = false
  } catch {
    fatal.value = t('scene.fatalText')
    loading.value = false
  }
})

watch(
  guides,
  (g) => manager.value?.setGuides(g),
  { deep: true },
)

// 切换语言时重建 3D 场景里的文字（轨道节气标签、太阳/地球标签、提示层）
watch(locale, (l) => {
  manager.value?.setLocale(l)
  if (fatal.value) fatal.value = t('scene.fatalText')
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  narrowQuery?.removeEventListener('change', onNarrowChange)
  narrowQuery = null
  manager.value?.dispose()
  manager.value = null
})

function setView(v: ViewPreset) {
  currentView.value = v
  manager.value?.setView(v)
}

function reload() {
  window.location.reload()
}
</script>

<template>
  <div class="viewport-column">
    <div class="viewport-wrap">
      <div
        ref="viewportRef"
        class="viewport"
        role="img"
        :aria-label="sceneAriaLabel"
        aria-describedby="scene-help"
      ></div>

      <p id="scene-help" class="sr-only">{{ t('scene.help') }}</p>

      <!-- 顶部浮层：桌面端为完整读出卡，窄屏改为紧凑胶囊，尽量不遮挡地球与轨道 -->
      <div class="hud hud-top">
        <div
          class="term-card only-desktop"
          :style="{ borderLeftColor: `var(--${seasonVar(activeTerm.season)})` }"
        >
          <div class="term-head">
            <span class="term-name">{{ activeTermName }}</span>
            <span class="term-pinyin">{{ activeTerm.pinyin }}</span>
            <span class="term-season" :class="`season-chip-${activeTerm.season}`">
              {{ t(`common.season.${seasonVar(activeTerm.season)}` as never) }}
            </span>
            <span class="badge" :class="isSimulated ? 'badge-sim' : 'badge-live'">
              {{ isSimulated ? t('common.simulated') : t('common.live') }}
            </span>
          </div>

          <dl>
            <dt>{{ t('hud.solarLongitude') }}</dt>
            <dd>λ☉ = {{ longitudeText }}°</dd>
            <dt>{{ t('hud.termBegins') }}</dt>
            <dd>{{ activeMomentText }}</dd>
            <dt>{{ t('hud.nextTerm') }}</dt>
            <dd>{{ nextTermName }} · {{ nextMomentText }}</dd>
            <dt>{{ t('hud.subsolarPoint') }}</dt>
            <dd>{{ declinationText }}</dd>
          </dl>

          <div class="term-progress">
            <div class="bar"><span :style="{ width: `${(progress * 100).toFixed(2)}%` }"></span></div>
            <div class="meta">
              <span>{{ elapsedText }}</span>
              <span>{{ remainingText }}</span>
            </div>
          </div>
          <p v-if="isSimulated" class="offset-note">{{ offsetText }}</p>
        </div>

        <div
          class="term-pill only-mobile"
          :style="{ borderLeftColor: `var(--${seasonVar(activeTerm.season)})` }"
        >
          <span class="pill-name">{{ activeTermName }}</span>
          <span class="pill-lon">λ☉ {{ longitudeText }}°</span>
          <span class="pill-phi" :title="t('hud.pillPhiTitle')">
            φ {{ sceneAzimuthText.toFixed(1) }}°
          </span>
          <span v-if="isSimulated" class="badge badge-sim">{{ t('common.simulated') }}</span>
        </div>

        <div class="hud-controls">
          <div class="hud-btn-row">
            <button
              class="btn"
              :class="{ 'is-active': currentView === 'overview' }"
              type="button"
              @click="setView('overview')"
            >
              {{ t('view.overview') }}
            </button>
            <button
              class="btn"
              :class="{ 'is-active': currentView === 'earth' }"
              type="button"
              @click="setView('earth')"
            >
              {{ t('view.earth') }}
            </button>
            <button class="btn" type="button" @click="setView('default')">
              {{ t('view.reset') }}
            </button>
            <button class="btn" type="button" :aria-pressed="showPanel" @click="showPanel = !showPanel">
              {{ showPanel ? t('view.guidesHide') : t('view.guides') }}
            </button>
          </div>

          <div v-if="showPanel" class="hud-panel">
            <div class="toggle-grid">
              <label class="toggle">
                <input v-model="guides.axis" type="checkbox" />{{ t('guide.axis') }}
              </label>
              <label class="toggle">
                <input v-model="guides.equator" type="checkbox" />{{ t('guide.equator') }}
              </label>
              <label class="toggle">
                <input v-model="guides.tropics" type="checkbox" />{{ t('guide.tropics') }}
              </label>
              <label class="toggle">
                <input v-model="guides.revolution" type="checkbox" />{{ t('guide.revolution') }}
              </label>
              <label class="toggle">
                <input v-model="guides.ecliptic" type="checkbox" />{{ t('guide.ecliptic') }}
              </label>
              <label class="toggle">
                <input v-model="guides.stars" type="checkbox" />{{ t('guide.stars') }}
              </label>
              <label class="toggle">
                <input v-model="guides.labels" type="checkbox" />{{ t('guide.labels') }}
              </label>
              <label class="toggle" :title="qualityTier === 'low' ? t('guide.minorLabelsLowTier') : ''">
                <input v-model="guides.minorLabels" type="checkbox" />{{ t('guide.minorLabels') }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="scale-warning">{{ t('scene.notToScale') }}</div>

      <!-- 加载 / 错误浮层 -->
      <div v-if="loading" class="overlay">
        <div class="spinner" aria-hidden="true"></div>
        <h3>{{ t('scene.loadingTitle') }}</h3>
        <div class="load-bar"><span :style="{ width: `${loadPercent}%` }"></span></div>
        <p>{{ loadLabel }}</p>
      </div>

      <div v-else-if="fatal" class="overlay">
        <h3>{{ t('scene.fatalTitle') }}</h3>
        <p>{{ fatal }}</p>
      </div>

      <div v-else-if="contextLost" class="overlay">
        <h3>{{ t('scene.ctxLostTitle') }}</h3>
        <p>{{ t('scene.ctxLostText') }}</p>
        <button class="btn btn-primary" type="button" @click="reload">{{ t('common.reload') }}</button>
      </div>

      <div v-if="!loading && !fatal && fallbackTextures.length" class="texture-warning">
        {{ t('scene.textureFallback', { list: fallbackTextures.map((k) => t(k)).join(' / ') }) }}
      </div>
    </div>

    <!-- 黄经与场景角度的对应说明：
         桌面端浮在视口左下角并完整展开；窄屏只保留一行关键关系，详细说明按需展开。 -->
    <div class="map-note-block">
      <p class="map-note map-note-compact">{{ t('mapNote.compact') }}</p>
      <button
        class="map-note-toggle"
        type="button"
        :aria-expanded="showMapNote"
        aria-controls="map-note-full"
        @click="showMapNote = !showMapNote"
      >
        {{ t('mapNote.toggle') }}
        <span aria-hidden="true">{{ showMapNote ? '▴' : '▾' }}</span>
      </button>
      <p v-show="showMapNote" id="map-note-full" class="map-note">
        {{
          t('mapNote.body', {
            phi: sceneAzimuthText.toFixed(2),
            eps: epochObliquity.toFixed(2),
            year: displayYearLabel,
          })
        }}
      </p>
    </div>
  </div>
</template>
