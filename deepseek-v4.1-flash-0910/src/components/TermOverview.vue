<script setup lang="ts">
/**
 * 二十四节气一览：按四季分组，给出该年份每个节气的准确交节时刻。
 * 点击任意一项会暂停播放并跳到该节气的交节瞬间。
 */
import { computed } from 'vue'
import { formatMonthDayTime } from '@/astro/time'
import { useSimulation } from '@/composables/useSimulation'
import { useI18n } from '@/i18n'
import { SEASON_GROUPS, seasonName, termName } from '@/data'

const { t, locale } = useI18n()
const { displayYear, termsOfDisplayYear, jumpToTerm, activeTerm, simMs } = useSimulation()

interface Chip {
  index: number
  name: string
  longitude: number
  major: boolean
  momentText: string
  isCurrent: boolean
}

const bands = computed(() => {
  const byIndex = new Map(termsOfDisplayYear.value.map((x) => [x.index, x]))
  const currentIndex = activeTerm.value.index
  const now = simMs.value
  const loc = locale.value

  return SEASON_GROUPS.map((g) => ({
    season: g.season,
    seasonLabel: seasonName(g.season, loc),
    firstTermName: termName(g.firstTerm.index, loc),
    fromLon: g.terms[0].longitude,
    toLon: g.terms[5].longitude,
    items: g.terms.map((base): Chip => {
      const m = byIndex.get(base.index)
      return {
        index: base.index,
        name: termName(base.index, loc),
        longitude: base.longitude,
        major: base.major,
        momentText: m ? formatMonthDayTime(m.ms, loc) : '—',
        isCurrent: base.index === currentIndex,
      }
    }),
    // 供模板判断「已过去 / 未到」用不上，这里只保留必要字段
    _now: now,
  }))
})
</script>

<template>
  <section id="terms" class="section" aria-labelledby="terms-title">
    <div class="section-title">
      <span class="num">{{ t('overview.num') }}</span>
      <h2 id="terms-title">{{ t('overview.title', { year: displayYear }) }}</h2>
    </div>
    <p class="section-intro">{{ t('overview.intro') }}</p>

    <div v-for="group in bands" :key="group.season" class="season-band">
      <div class="season-band-title">
        <span
          class="dot"
          :style="{
            background: `var(--${group.season === '春' ? 'spring' : group.season === '夏' ? 'summer' : group.season === '秋' ? 'autumn' : 'winter'})`,
          }"
        ></span>
        {{ t('overview.seasonBand', { season: group.seasonLabel, first: group.firstTermName }) }}
        <span class="range">
          {{ t('overview.longitudeRange', { from: group.fromLon, to: group.toLon }) }}
        </span>
      </div>

      <div class="term-grid">
        <button
          v-for="item in group.items"
          :key="item.index"
          class="term-chip"
          :class="{ 'is-current': item.isCurrent }"
          type="button"
          :aria-current="item.isCurrent ? 'date' : undefined"
          :title="
            t('overview.chipTitle', {
              term: item.name,
              year: displayYear,
              moment: item.momentText,
            })
          "
          @click="jumpToTerm(displayYear, item.index)"
        >
          <span class="chip-top">
            <span class="chip-name">
              {{ item.name }}
              <span v-if="item.major" class="chip-major">{{ t('overview.pivotal') }}</span>
            </span>
            <span class="chip-lon">{{ item.longitude }}°</span>
          </span>
          <span class="chip-time">{{ item.momentText }}</span>
          <span v-if="item.isCurrent" class="chip-time chip-now">{{ t('overview.current') }}</span>
        </button>
      </div>
    </div>
  </section>
</template>
