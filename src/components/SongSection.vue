<script setup lang="ts">
/**
 * 二十四节气歌（通行四句版本）
 *
 * 这首歌诀是**汉字助记口诀**，所以英文版也保留汉字原文，另配拼音与英文解释。
 * 同一个字在不同位置代表不同节气（第 1 字与第 4 字都是「春」，但分别指立春与春分；
 * 两句里的「夏」分别指立夏与夏至；两个「雪」分别指小雪与大雪），
 * 因此映射是**按位置**给出的，点哪个字就跳哪个节气。
 */
import { computed, ref } from 'vue'
import { useSimulation } from '@/composables/useSimulation'
import { useI18n } from '@/i18n'
import { useContent, useTermDetail } from '@/composables/useContent'
import { termName } from '@/data'

const { t, locale } = useI18n()
const { content } = useContent()
const { activeTerm, displayYear, jumpToTerm } = useSimulation()

const picked = ref<{ line: number; char: number } | null>(null)

/** 当前展示的映射：优先用用户点选的字，否则跟随当前节气 */
const currentPick = computed(() => {
  const lines = content.value.song
  if (picked.value) {
    const line = lines[picked.value.line]
    const ch = line?.chars[picked.value.char]
    if (ch) return { ch, line }
  }
  for (const line of lines) {
    for (const ch of line.chars) {
      if (ch.termIndex === activeTerm.value.index) return { ch, line }
    }
  }
  return null
})

const legendTermIndex = computed(() => currentPick.value?.ch.termIndex ?? null)
const legendDetail = useTermDetail(() => legendTermIndex.value ?? 0)

/** 当前语言下的节气名 */
function termLabelOf(index: number | null): string {
  return index === null ? t('song.fillerTitle') : termName(index, locale.value)
}

/** 歌诀中的加粗标记转成 HTML（内容为本站自有静态数据） */
function glossHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--gold)">$1</strong>')
}

/** 单击歌诀中的字：既更新右侧说明，也联动 3D 场景与详情面板 */
function onCharClick(lineIndex: number, charIndex: number, termIndex: number | null) {
  picked.value = { line: lineIndex, char: charIndex }
  if (termIndex !== null) jumpToTerm(displayYear.value, termIndex)
}

const seasonVar = (s: string) =>
  s === '春' ? 'spring' : s === '夏' ? 'summer' : s === '秋' ? 'autumn' : 'winter'
</script>

<template>
  <section id="song" class="section" aria-labelledby="song-title">
    <div class="section-title">
      <span class="num">{{ t('song.num') }}</span>
      <h2 id="song-title">{{ t('song.title') }}</h2>
    </div>
    <p class="section-intro">{{ t('song.intro') }}</p>

    <div class="song-wrap">
      <div class="song-lines">
        <div
          v-for="(line, li) in content.song"
          :key="li"
          class="song-line"
          :style="{ borderLeftColor: `var(--${seasonVar(line.season)})` }"
        >
          <div class="song-chars" role="group" :aria-label="t('song.lineAria', { n: li + 1, text: line.text })">
            <button
              v-for="(ch, ci) in line.chars"
              :key="ci"
              class="song-char"
              :class="{
                'is-term': ch.termIndex !== null,
                'is-filler': ch.termIndex === null,
                'is-current': ch.termIndex === activeTerm.index,
              }"
              type="button"
              :disabled="ch.termIndex === null"
              :aria-label="
                ch.termIndex === null
                  ? t('song.charAriaFiller', { char: ch.char })
                  : t('song.charAriaTerm', { char: ch.char, term: termLabelOf(ch.termIndex) })
              "
              :title="ch.termIndex === null ? t('song.fillerTitle') : termLabelOf(ch.termIndex)"
              @click="onCharClick(li, ci, ch.termIndex)"
            >
              <span class="song-char-glyph">{{ ch.char }}</span>
              <span class="song-char-pinyin">{{ ch.pinyin }}</span>
            </button>
          </div>
          <p class="line-summary" v-html="glossHtml(line.summary)"></p>
        </div>
        <p class="song-hint">{{ t('song.hint') }}</p>
      </div>

      <aside class="song-legend" aria-live="polite">
        <template v-if="currentPick">
          <div class="legend-head">
            <span class="legend-char">{{ currentPick.ch.char }}</span>
            <span class="legend-pinyin">{{ currentPick.ch.pinyin }}</span>
            <span class="legend-term">
              {{
                currentPick.ch.termIndex === null
                  ? t('song.fillerTitle')
                  : termLabelOf(currentPick.ch.termIndex)
              }}
            </span>
            <span v-if="currentPick.ch.termIndex !== null" class="legend-lon">
              {{ t('hud.solarLongitude') }} {{ legendDetail.longitude }}° · {{ legendDetail.seasonLabel }}
            </span>
          </div>
          <p v-html="glossHtml(currentPick.ch.gloss)"></p>
          <p class="legend-from">{{ t('song.legendFrom', { line: currentPick.line.text }) }}</p>
          <button
            v-if="currentPick.ch.termIndex !== null"
            class="btn btn-primary"
            type="button"
            @click="jumpToTerm(displayYear, currentPick.ch.termIndex)"
          >
            {{ t('song.jumpButton', { year: displayYear, term: termLabelOf(currentPick.ch.termIndex) }) }}
          </button>
          <p v-else class="hint">{{ t('song.legendFiller') }}</p>
        </template>
        <p v-else class="hint">{{ t('song.legendEmpty') }}</p>
      </aside>
    </div>
  </section>
</template>
