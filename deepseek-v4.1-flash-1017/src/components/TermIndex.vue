<script setup lang="ts">
import { computed } from 'vue'
import { useObservatory } from '../stores/observatory'
import { SOLAR_TERMS, SEASON_META, SEASON_ORDER } from '../data/term-catalog'
import { formatMonthDayTime } from '../astro/beijing-time'
import type { Season } from '../data/types'
import { useI18n } from '../i18n/index.ts'
import {
  getSeasonName,
  getTermName,
  getTermNativeName,
} from '../i18n/content.ts'

const emit = defineEmits<{ (event: 'select-term', termIndex: number): void }>()
const store = useObservatory()
const { locale, t } = useI18n()
const { selectedYear, yearTermMap, activeTerm } = store

const seasonGroups = computed(() =>
  SEASON_ORDER.map((season: Season) => {
    const terms = SOLAR_TERMS.filter((term) => term.season === season).map((term) => {
      const occurrence = yearTermMap.value.get(term.index)
      const name = getTermName(term.index, locale.value)
      const timeLabel = occurrence ? formatMonthDayTime(occurrence.ms, locale.value) : '—'
      const fullLabel = occurrence
        ? t('terms.cardAria', {
            name,
            year: selectedYear.value,
            time: formatMonthDayTime(occurrence.ms, locale.value),
            longitude: term.longitude,
          })
        : t('terms.aria', { name, longitude: term.longitude })
      return {
        term,
        name,
        nativeName: getTermNativeName(term.index, locale.value),
        occurrence,
        timeLabel,
        fullLabel,
      }
    })
    return {
      season,
      meta: SEASON_META[season],
      seasonName: getSeasonName(season, locale.value),
      first: terms[0]?.name ?? '',
      last: terms[terms.length - 1]?.name ?? '',
      terms,
    }
  }),
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
        <p class="section-kicker"><span>{{ t('terms.kicker') }}</span> {{ t('terms.kickerTitle') }}</p>
        <h2 id="terms-title">{{ t('terms.title') }}</h2>
      </div>
      <div class="section-heading__aside">
        <p>{{ t('terms.aside', { year: selectedYear }) }}</p>
        <p class="section-heading__note">{{ t('terms.note') }}</p>
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
            <h3 :id="`season-${group.season}`">{{ group.seasonName }}</h3>
            <p>{{ t('terms.groupRange', { first: group.first, last: group.last }) }}</p>
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
            :aria-label="item.fullLabel"
            :aria-current="activeTerm.index === item.term.index ? 'true' : undefined"
            :data-term-index="item.term.index"
            :data-term-name="item.term.name"
            :data-term-name-localized="item.name"
            @click="chooseTerm(item.term.index)"
          >
            <span class="term-card__top">
              <span class="term-card__order">{{ String(item.term.index + 1).padStart(2, '0') }}</span>
              <span v-if="activeTerm.index === item.term.index" class="term-card__now">{{ t('terms.current') }}</span>
              <span v-else class="term-card__lambda">λ {{ item.term.longitude }}°</span>
            </span>
            <span class="term-card__name">{{ item.name }}</span>
            <span class="term-card__pinyin">
              {{ locale === 'en' ? `${item.nativeName} · ${item.term.pinyin}` : item.term.pinyin }}
            </span>
            <span class="term-card__date">{{ item.timeLabel }}</span>
            <span v-if="item.term.major" class="term-card__major">{{ t('terms.major') }}</span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
