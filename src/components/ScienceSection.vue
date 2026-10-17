<script setup lang="ts">
import { computed, ref } from 'vue'
import { SCIENCE_FAQ, SCIENCE_INTRO } from '../data/science'
import { useObservatory } from '../stores/observatory'
import { SEASON_META } from '../data/term-catalog'
import type { Season } from '../data/types'

const store = useObservatory()
const { solarState, activeTerm, isSimulated } = store

const openId = ref<string>(SCIENCE_FAQ[0]?.id ?? '')
const currentSeason = computed(() => activeTerm.value.season)
const seasonMeta = computed(() => SEASON_META[currentSeason.value])
const declination = computed(() => solarState.value.declination)
const declinationText = computed(() => {
  const value = declination.value
  return `${value >= 0 ? '北纬' : '南纬'} ${Math.abs(value).toFixed(2)}°`
})
const sunDistanceText = computed(() => `${solarState.value.sunDistanceAU.toFixed(4)} AU`)
const movementText = computed(() => (solarState.value.isNorthward ? '直射点正在北移' : '直射点正在南移'))

const seasonPositions: Array<{ season: Season; cx: number; cy: number; label: string }> = [
  { season: '春', cx: 76, cy: 116, label: '春分' },
  { season: '夏', cx: 190, cy: 50, label: '夏至' },
  { season: '秋', cx: 304, cy: 116, label: '秋分' },
  { season: '冬', cx: 190, cy: 182, label: '冬至' },
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
            <p class="section-kicker"><span>卷五</span> 问四时</p>
            <h2 id="science-title">太阳走到哪里，<br />四季就从哪里来</h2>
          </div>
        </header>
        <p class="science-intro">{{ SCIENCE_INTRO }}</p>

        <div class="science-diagram" aria-label="地球绕太阳公转与固定倾斜地轴的示意图">
          <svg viewBox="0 0 380 236" role="img" aria-labelledby="season-diagram-title">
            <title id="season-diagram-title">地球在四个节气位置时的地轴倾斜示意，地轴全年指向同一方向</title>
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
            <text x="190" y="146" text-anchor="middle" class="diagram-sun-label">太阳</text>
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
              <text :x="point.cx" :y="point.cy + 29" text-anchor="middle" class="diagram-label">{{ point.label }}</text>
            </g>
            <text x="324" y="28" text-anchor="end" class="diagram-note">地轴方向全年基本不变</text>
          </svg>
          <p>地轴与轨道法线的夹角约 23.44°。四个位置不是按实际距离与大小绘制。</p>
        </div>

        <div class="science-live-data" :style="{ '--season-color': seasonMeta.color }">
          <div class="science-live-data__head">
            <span>此刻的太阳</span>
            <em>{{ isSimulated ? '模拟时间' : '实时' }}</em>
          </div>
          <dl>
            <div><dt>太阳直射点</dt><dd>{{ declinationText }}</dd></div>
            <div><dt>太阳距离</dt><dd>{{ sunDistanceText }}</dd></div>
            <div><dt>太阳黄经</dt><dd>{{ solarState.sunLongitude.toFixed(2) }}°</dd></div>
          </dl>
          <p>{{ currentSeason }}季 · {{ movementText }}。数值随上方模拟时间更新。</p>
        </div>
      </div>

      <div class="faq-list">
        <article
          v-for="(faq, index) in SCIENCE_FAQ"
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
        <p class="science-footnote">
          节气描述的是太阳视黄经的位置；具体的冷暖、晴雨与物候，仍要由大气环流、海拔、海陆分布与当年天气决定。
        </p>
      </div>
    </div>
  </section>
</template>
