<script setup lang="ts">
/**
 * 节气详情面板
 *
 * 区分两件事（这是二十四节气最容易被混淆的地方）：
 *   · 节气区间 —— 当前已经进入哪个节气，从它的交节时刻算起；
 *   · 交节时刻 —— 该节气开始的那一个确切瞬间。
 *
 * 英文版在诗词、三候、农谚这些「中文原文本身就是价值」的地方并列显示汉字原文。
 */
import { computed } from 'vue'
import {
  beijingParts,
  beijingYear,
  formatDateCN,
  formatDateTimeCN,
  formatTimeHM,
  humanizeDuration,
  weekdayLabel,
} from '@/astro/time'
import { useSimulation } from '@/composables/useSimulation'
import { useI18n } from '@/i18n'
import { useContent, useTermDetail } from '@/composables/useContent'
import { HISTORY_TIMELINE } from '@/data/history'
import { HISTORY_TIMELINE_EN } from '@/data/en/history'

const { t, locale } = useI18n()
const { content } = useContent()
const {
  activeTerm,
  nextTerm,
  simMs,
  displayYear,
  isSimulated,
  termProgress: progress,
  jumpToTerm,
} = useSimulation()

const detail = useTermDetail(() => activeTerm.value.index)
/** 下一节气的本地化名称（3D 场景传来的 nextTerm 只有中文名） */
const nextDetail = useTermDetail(() => nextTerm.value.index)

const momentText = computed(() => {
  const ms = activeTerm.value.ms
  return `${formatDateCN(ms, locale.value)} ${weekdayLabel(ms, locale.value)} ${formatTimeHM(ms)}`
})
const nextMomentText = computed(() => {
  const ms = nextTerm.value.ms
  return `${formatDateCN(ms, locale.value)} ${formatTimeHM(ms)}`
})

/** 当前时刻是否就是交节当天 */
const sameDayAsMoment = computed(() => {
  const a = beijingParts(activeTerm.value.ms)
  const b = beijingParts(simMs.value)
  return a.year === b.year && a.month === b.month && a.day === b.day
})

const remainingText = computed(() =>
  humanizeDuration(Math.max(0, nextTerm.value.ms - simMs.value), locale.value),
)

/** 该节气在节气歌中的位置（若有） */
const songRef = computed(() => {
  for (const line of content.value.song) {
    for (const c of line.chars) {
      if (c.termIndex === activeTerm.value.index) return { line: line.text, char: c.char }
    }
  }
  return null
})

/** 历史脉络：从中英各自的时间线里找提到本节气的那一条 */
const historyHint = computed(() => {
  const list = locale.value === 'en' ? HISTORY_TIMELINE_EN : HISTORY_TIMELINE
  const name = detail.value.name
  const nameZh = detail.value.nameZh
  return list.find((h) => h.detail.includes(name) || h.detail.includes(nameZh)) ?? null
})

function goToNext() {
  // 用下一节气自身所在的年份，跨年（冬至 → 次年小寒）才不会跳错
  jumpToTerm(beijingYear(nextTerm.value.ms), nextTerm.value.index)
}
</script>

<template>
  <aside class="detail-panel" :aria-label="t('detail.aria')">
    <div class="detail-head">
      <span class="name">{{ detail.name }}</span>
      <span v-if="locale === 'en'" class="name-zh">{{ detail.nameZh }} · {{ detail.pinyin }}</span>
      <span class="idx">
        {{ t('detail.position', { n: activeTerm.index + 1, season: detail.seasonLabel }) }}
        <template v-if="detail.major">{{ t('detail.pivotal') }}</template>
      </span>
    </div>

    <!-- 交节时刻（精确瞬间） -->
    <dl class="detail-moment">
      <dt>{{ t('detail.exactMoment') }}</dt>
      <dd>
        <em>{{ t('detail.momentZone', { moment: momentText, zone: t('common.beijingTime') }) }}</em>
        <template v-if="sameDayAsMoment">
          <span class="badge badge-sim" style="margin-left: 0.4rem">{{ t('detail.today') }}</span>
        </template>
      </dd>
      <dt>{{ t('hud.solarLongitude') }}</dt>
      <dd>λ☉ = {{ detail.longitude }}°</dd>
      <dt>{{ t('detail.nextTerm') }}</dt>
      <dd>
        {{ nextDetail.name }} · {{ nextMomentText }}
        <span class="muted-sm">{{ t('duration.in', { d: remainingText }) }}</span>
      </dd>
    </dl>

    <div class="term-progress term-progress-flush">
      <div class="bar"><span :style="{ width: `${(progress * 100).toFixed(2)}%` }"></span></div>
      <div class="meta">
        <span>{{ t('detail.intervalOf', { term: detail.name }) }}</span>
        <span>{{ (progress * 100).toFixed(1) }}%</span>
      </div>
    </div>

    <div v-if="isSimulated" class="detail-section">
      <p class="map-note">
        {{ t('detail.simNotice', { time: formatDateTimeCN(simMs, locale) }) }}
      </p>
    </div>

    <div class="detail-section">
      <h4>{{ t('detail.meaning') }}</h4>
      <p>{{ detail.meaning }}</p>
    </div>

    <div class="detail-section">
      <h4>{{ t('detail.climate') }}</h4>
      <p>{{ detail.climate }}</p>
    </div>

    <div class="detail-section">
      <h4>{{ t('detail.phenology') }}</h4>
      <p>{{ detail.phenology }}</p>
      <ul class="pentads">
        <li v-for="(p, i) in detail.pentads" :key="i" class="pentad">
          <span class="pentad-label">{{ p.label }}</span>
          <span class="pentad-text">{{ p.text }}</span>
          <span v-if="p.original" class="pentad-original">{{ p.original }}</span>
        </li>
      </ul>
      <p class="muted-xs">{{ t('detail.pentadSource') }}</p>
    </div>

    <div class="detail-section">
      <h4>{{ t('detail.farming') }}</h4>
      <p>{{ detail.farming }}</p>
    </div>

    <div class="detail-section">
      <h4>{{ t('detail.custom') }}</h4>
      <p>{{ detail.custom }}</p>
      <p class="muted-xs">{{ t('detail.customNote') }}</p>
    </div>

    <div class="detail-section">
      <h4>{{ t('detail.food') }}</h4>
      <p>{{ detail.food }}</p>
    </div>

    <div v-if="detail.poem" class="detail-section">
      <h4>{{ t('detail.poetry') }}</h4>
      <blockquote class="poem">
        <div class="verse">{{ detail.poem.text }}</div>
        <div v-if="detail.poem.original" class="verse-original">{{ detail.poem.original }}</div>
        <div class="attr">
          {{ t('detail.poemAttribution', { author: detail.poem.author, source: detail.poem.source }) }}
        </div>
      </blockquote>
      <div v-if="detail.proverb" class="proverb">
        <span class="proverb-label">{{ t('detail.proverb') }}</span>
        <span class="proverb-text">{{ detail.proverb.text }}</span>
        <span v-if="detail.proverb.original" class="proverb-original">{{ detail.proverb.original }}</span>
      </div>
    </div>

    <div v-else-if="detail.proverb" class="detail-section">
      <h4>{{ t('detail.proverb') }}</h4>
      <div class="proverb">
        <span class="proverb-text">{{ detail.proverb.text }}</span>
        <span v-if="detail.proverb.original" class="proverb-original">{{ detail.proverb.original }}</span>
      </div>
    </div>

    <div v-if="songRef" class="detail-section">
      <h4>{{ t('detail.inSong') }}</h4>
      <p class="muted-sm-body">
        {{ t('detail.inSongBody', { char: songRef.char, line: songRef.line }) }}
      </p>
    </div>

    <div v-if="historyHint" class="detail-section">
      <h4>{{ t('detail.historyHint') }}</h4>
      <p class="muted-sm-body">{{ historyHint.year }} · {{ historyHint.title }}</p>
    </div>

    <div class="detail-section detail-actions">
      <button class="btn" type="button" @click="goToNext">
        {{ t('detail.jumpNext', { term: nextDetail.name }) }}
      </button>
      <button
        class="btn"
        type="button"
        :title="t('detail.gotoMoment')"
        @click="jumpToTerm(displayYear, activeTerm.index)"
      >
        {{ t('detail.gotoMoment') }}
      </button>
    </div>
  </aside>
</template>
