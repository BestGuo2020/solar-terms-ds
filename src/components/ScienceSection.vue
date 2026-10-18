<script setup lang="ts">
import { computed, ref } from 'vue'
import { useObservatory } from '../stores/observatory'
import { SEASON_META } from '../data/term-catalog'
import type { Season } from '../data/types'
import { useI18n } from '../i18n/index.ts'
import {
  getLocalizedScience,
  getScienceIntro,
  getSeasonName,
} from '../i18n/content.ts'

const store = useObservatory()
const { locale, t } = useI18n()
const { solarState, activeTerm, isSimulated } = store

const faqs = computed(() => getLocalizedScience(locale.value))
const intro = computed(() => getScienceIntro(locale.value))
const openId = ref<string>(faqs.value[0]?.id ?? '')
const currentSeason = computed(() => activeTerm.value.season)
const seasonMeta = computed(() => SEASON_META[currentSeason.value])
const seasonName = computed(() => getSeasonName(currentSeason.value, locale.value))
const declination = computed(() => solarState.value.declination)
const declinationText = computed(() => {
  const value = declination.value
  if (locale.value === 'en') {
    return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? 'N' : 'S'}`
  }
  return `${value >= 0 ? '北纬' : '南纬'} ${Math.abs(value).toFixed(2)}°`
})
const sunDistanceText = computed(() => `${solarState.value.sunDistanceAU.toFixed(4)} AU`)
const movementText = computed(() =>
  solarState.value.isNorthward ? t('science.northward') : t('science.southward'),
)

const seasonPositions: Array<{ season: Season; cx: number; cy: number; labelKey: 'science.diagramSpring' | 'science.diagramSummer' | 'science.diagramAutumn' | 'science.diagramWinter' }> = [
  { season: '春', cx: 76, cy: 116, labelKey: 'science.diagramSpring' },
  { season: '夏', cx: 190, cy: 50, labelKey: 'science.diagramSummer' },
  { season: '秋', cx: 304, cy: 116, labelKey: 'science.diagramAutumn' },
  { season: '冬', cx: 190, cy: 182, labelKey: 'science.diagramWinter' },
]

function toggleFaq(id: string): void {
  openId.value = openId.value === id ? '' : id
}
</script>

<template>
  <section
    id="science"
    class="reading-section science-section"
    aria-labelledby="science-title"
    :style="{ '--season-color': seasonMeta.color }"
  >
    <div class="science-layout">
      <div class="science-side">
        <header class="section-heading">
          <div>
            <p class="section-kicker"><span>{{ t('science.kicker') }}</span> {{ t('science.kickerTitle') }}</p>
            <h2 id="science-title">{{ t('science.titleA') }}<br />{{ t('science.titleB') }}</h2>
          </div>
        </header>
        <p class="science-intro">{{ intro }}</p>

        <div class="science-diagram" :aria-label="t('science.diagramAria')">
          <svg viewBox="0 0 380 236" role="img" aria-labelledby="season-diagram-title">
            <title id="season-diagram-title">{{ t('science.diagramTitle') }}</title>
            <defs>
              <radialGradient id="science-sun-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#f8dea2" />
                <stop offset="45%" stop-color="#dcad64" />
                <stop offset="100%" stop-color="#dcad64" stop-opacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="190" cy="116" rx="144" ry="84" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-dasharray="3 5" />
            <circle cx="190" cy="116" r="45" fill="url(#science-sun-glow)" opacity=".6" />
            <circle cx="190" cy="116" r="13" fill="#d6ad68" />
            <text x="190" y="146" text-anchor="middle" class="diagram-sun-label">{{ t('science.diagramSun') }}</text>
            <g v-for="point in seasonPositions" :key="point.season" :class="{ 'is-current': point.season === currentSeason }">
              <circle :cx="point.cx" :cy="point.cy" r="10" fill="#f2eddf" stroke="currentColor" stroke-opacity=".35" />
              <line
                :x1="point.cx - 12"
                :y1="point.cy + 13"
                :x2="point.cx - 5"
                :y2="point.cy - 12"
                stroke="currentColor"
                stroke-opacity=".55"
                stroke-width="1.3"
              />
              <line :x1="point.cx - 12" :y1="point.cy + 13" :x2="point.cx - 12" :y2="point.cy + 7" stroke="currentColor" stroke-opacity=".28" stroke-dasharray="2 2" />
              <text :x="point.cx" :y="point.cy + 29" text-anchor="middle" class="diagram-label">{{ t(point.labelKey) }}</text>
            </g>
            <text x="324" y="28" text-anchor="end" class="diagram-note">{{ t('science.diagramAxisNote') }}</text>
          </svg>
          <p>{{ t('science.diagramNote') }}</p>
        </div>

        <div class="science-live-data" :style="{ '--season-color': seasonMeta.color }">
          <div class="science-live-data__head">
            <span>{{ t('science.liveTitle') }}</span>
            <em>{{ isSimulated ? t('science.simLabel') : t('science.liveLabel') }}</em>
          </div>
          <dl>
            <div><dt>{{ t('science.metaSubsolar') }}</dt><dd>{{ declinationText }}</dd></div>
            <div><dt>{{ t('science.metaDistance') }}</dt><dd>{{ sunDistanceText }}</dd></div>
            <div><dt>{{ t('science.metaLongitude') }}</dt><dd>{{ solarState.sunLongitude.toFixed(2) }}°</dd></div>
          </dl>
          <p>{{ t('science.liveNote', { season: seasonName, movement: movementText }) }}</p>
        </div>
      </div>

      <div class="faq-list">
        <article
          v-for="(faq, index) in faqs"
          :key="faq.id"
          class="faq-item"
          :class="{ 'is-open': openId === faq.id }"
        >
          <h3>
            <button
              type="button"
              class="faq-question"
              :aria-expanded="openId === faq.id"
              :aria-controls="`faq-answer-${faq.id}`"
              :id="`faq-question-${faq.id}`"
              @click="toggleFaq(faq.id)"
            >
              <span class="faq-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <span>{{ faq.question }}</span>
              <i aria-hidden="true"></i>
            </button>
          </h3>
          <div
            v-show="openId === faq.id"
            :id="`faq-answer-${faq.id}`"
            class="faq-answer"
            role="region"
            :aria-labelledby="`faq-question-${faq.id}`"
          >
            <p>{{ faq.answer }}</p>
            <ul>
              <li v-for="point in faq.keyPoints" :key="point">{{ point }}</li>
            </ul>
          </div>
        </article>
        <p class="science-footnote">{{ t('science.footnote') }}</p>
      </div>
    </div>
  </section>
</template>
