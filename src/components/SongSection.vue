<script setup lang="ts">
import { computed, ref } from 'vue'
import { SONG_LINES } from '../data/song'
import { termByIndex } from '../data/term-catalog'
import { useObservatory } from '../stores/observatory'
import type { SongCell } from '../data/types'

const emit = defineEmits<{ (event: 'select-term', termIndex: number): void }>()
const store = useObservatory()
const { activeTerm } = store

const defaultHint = '悬停、聚焦或轻触歌中的任意节气字位，查看它对应的完整节气；点击会把地球停到该节气的交节时刻。'
const hint = ref(defaultHint)

const lineTerms = computed(() =>
  SONG_LINES.map((line) => ({
    ...line,
    terms: line.chars
      .filter((cell): cell is SongCell & { termIndex: number } => cell.termIndex !== null)
      .map((cell) => termByIndex(cell.termIndex)),
  })),
)

function termNameForCell(cell: SongCell): string {
  return cell.termIndex === null ? '' : termByIndex(cell.termIndex).name
}

function showHint(cell: SongCell): void {
  hint.value =
    cell.termIndex === null
      ? cell.gloss
      : `${cell.char} → ${termNameForCell(cell)}：${cell.gloss}`
}

function resetHint(): void {
  hint.value = defaultHint
}

function selectCell(cell: SongCell): void {
  if (cell.termIndex === null) return
  store.selectTermInSelectedYear(cell.termIndex)
  hint.value = `已定位至 ${termNameForCell(cell)}。地球与详情已同步到 ${store.selectedYear.value} 年的交节时刻。`
  emit('select-term', cell.termIndex)
}
</script>

<template>
  <section id="song" class="reading-section song-section" aria-labelledby="song-title">
    <header class="section-heading section-heading--split">
      <div>
        <p class="section-kicker"><span>卷四</span> 节气歌</p>
        <h2 id="song-title">四句，二十八字，<br />藏着一整年</h2>
      </div>
      <div class="section-heading__aside">
        <p>
          这是流传最广的四句节气歌。二十八字里有二十四个节气，余下四字是衬字。
          字字对应一个位置，不能只看字面，尤其要留意重复出现的「春」「夏」「秋」「冬」「雪」。
        </p>
      </div>
    </header>

    <div class="song-grid">
      <article
        v-for="line in lineTerms"
        :key="line.id"
        class="song-line"
        :class="`song-line--${line.season}`"
      >
        <div class="song-line__head">
          <span class="song-line__season" aria-hidden="true">{{ line.season }}</span>
          <span class="song-line__count">{{ line.terms.length }} 个节气</span>
        </div>

        <div class="song-characters" role="group" :aria-label="`${line.season}季节气歌：${line.text}`">
          <template v-for="(cell, index) in line.chars" :key="`${line.id}-${index}`">
            <button
              v-if="cell.termIndex !== null"
              type="button"
              class="song-char"
              :class="{ 'is-active': activeTerm.index === cell.termIndex }"
              :aria-label="`${cell.char}，第 ${index + 1} 个字位，对应${termNameForCell(cell)}。${cell.gloss} 点击跳转。`"
              :data-char-position="index"
              :data-term-index="cell.termIndex"
              :data-term-name="termNameForCell(cell)"
              @mouseenter="showHint(cell)"
              @mouseleave="resetHint"
              @focus="showHint(cell)"
              @blur="resetHint"
              @click="selectCell(cell)"
            >
              {{ cell.char }}
            </button>
            <span
              v-else
              class="song-char is-filler"
              :aria-label="`${cell.char}，衬字。${cell.gloss}`"
              :data-char-position="index"
              :title="cell.gloss"
              @mouseenter="showHint(cell)"
              @mouseleave="resetHint"
            >{{ cell.char }}</span>
          </template>
        </div>

        <p class="song-line__summary">{{ line.summary }}</p>
        <p class="song-line__terms">
          <span v-for="term in line.terms" :key="term.index">{{ term.name }}</span>
        </p>
      </article>
    </div>

    <div class="song-hint" role="status" aria-live="polite">
      <span class="song-hint__mark" aria-hidden="true">简</span>
      <p>{{ hint }}</p>
    </div>

    <div class="song-notes">
      <div>
        <h3>为什么同字不同义？</h3>
        <p>
          歌诀为押韵和整齐只取了节气名的一部分。第 1 字「春」指立春，第 4 字「春」才指春分；
          两个「夏」、两个「雪」、两个「冬」也分别对应不同节气。本页的点击映射按位置建立，而不是按字去重。
        </p>
      </div>
      <div>
        <h3>衬字怎样处理？</h3>
        <p>
          「天」收束春句，「相」与「连」组成「暑相连」，第三句的「降」和第四句的「寒」补足七言。
          「暑相连」写小暑后紧接大暑，因此本页把「连」的字位映射为大暑；其余四个衬字不单独链接到节气。
        </p>
      </div>
    </div>
  </section>
</template>
