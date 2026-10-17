<script setup lang="ts">
import { computed } from 'vue'
import { useObservatory } from '../stores/observatory'
import { SOLAR_TERMS, SEASON_META, SEASON_ORDER } from '../data/term-catalog'
import { formatMonthDayTime } from '../astro/beijing-time'
import type { Season } from '../data/types'

const emit = defineEmits<{ (event: 'select-term', termIndex: number): void }>()
const store = useObservatory()
const { selectedYear, yearTermMap, activeTerm } = store

const seasonGroups = computed(() =>
  SEASON_ORDER.map((season: Season) => ({
    season,
    meta: SEASON_META[season],
    terms: SOLAR_TERMS.filter((term) => term.season === season).map((term) => {
      const occurrence = yearTermMap.value.get(term.index)
      return {
        term,
        occurrence,
        timeLabel: occurrence ? formatMonthDayTime(occurrence.ms) : '—',
        fullLabel: occurrence ? `${term.name} · ${selectedYear.value} 年 ${formatMonthDayTime(occurrence.ms)}` : term.name,
      }
    }),
  })),
)

function chooseTerm(termIndex: number): void {
  store.selectTermInSelectedYear(termIndex)
  emit('select-term', termIndex)
}
</script>

<template>
  <section id="terms" class="reading-section term-index-section" aria-labelledby="terms-title">
    <header class="section-heading section-heading--split">
      <div>
        <p class="section-kicker"><span>卷一</span> 岁时谱</p>
        <h2 id="terms-title">一年的二十四个刻度</h2>
      </div>
      <div class="section-heading__aside">
        <p>
          下方时刻均为 <strong>{{ selectedYear }}</strong> 年的真实交节时刻。点击任意一格，
          地球会停到那一刻，观测台与节气详情同步切换。
        </p>
        <p class="section-heading__note">当前区间若从上一公历年延续，以详情中的实际交节时刻为准。</p>
      </div>
    </header>

    <div class="term-index" :data-year="selectedYear">
      <section
        v-for="group in seasonGroups"
        :key="group.season"
        class="term-group"
        :style="{ '--season-color': group.meta.color }"
        :aria-labelledby="`season-${group.season}`"
      >
        <div class="term-group__label">
          <span class="term-group__glyph" aria-hidden="true">{{ group.season }}</span>
          <div>
            <h3 :id="`season-${group.season}`">{{ group.meta.label }}</h3>
            <p>{{ group.terms[0]?.term.name }} — {{ group.terms[group.terms.length - 1]?.term.name }}</p>
          </div>
        </div>
        <div class="term-group__grid">
          <button
            v-for="item in group.terms"
            :key="item.term.index"
            type="button"
            class="term-card"
            :class="{
              'is-active': activeTerm.index === item.term.index,
              'is-major': item.term.major,
            }"
            :aria-label="`${item.fullLabel}，太阳黄经 ${item.term.longitude} 度。点击跳转到该节气`"
            :aria-current="activeTerm.index === item.term.index ? 'true' : undefined"
            :data-term-index="item.term.index"
            :data-term-name="item.term.name"
            @click="chooseTerm(item.term.index)"
          >
            <span class="term-card__top">
              <span class="term-card__order">{{ String(item.term.index + 1).padStart(2, '0') }}</span>
              <span v-if="activeTerm.index === item.term.index" class="term-card__now">当前</span>
              <span v-else class="term-card__lambda">λ {{ item.term.longitude }}°</span>
            </span>
            <span class="term-card__name">{{ item.term.name }}</span>
            <span class="term-card__pinyin">{{ item.term.pinyin }}</span>
            <span class="term-card__date">{{ item.timeLabel }}</span>
            <span v-if="item.term.major" class="term-card__major">分至</span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
