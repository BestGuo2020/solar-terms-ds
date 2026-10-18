<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SONG_LINES } from '../data/song'
import { useObservatory } from '../stores/observatory'
import type { SongCell, SongLine } from '../data/types'
import { useI18n } from '../i18n/index.ts'
import {
  getLocalizedSongLines,
  getSeasonName,
  getTermName,
} from '../i18n/content.ts'

const emit = defineEmits<{ (event: 'select-term', termIndex: number): void }>()
const store = useObservatory()
const { locale, t } = useI18n()
const { activeTerm } = store

const hint = ref('')
const localizedLines = computed(() => getLocalizedSongLines(locale.value, SONG_LINES))
const defaultHint = computed(() => t('song.hintDefault'))
const displayHint = computed(() => hint.value || defaultHint.value)

const lineTerms = computed(() =>
  localizedLines.value.map((line) => ({
    line,
    seasonName: getSeasonName(line.season, locale.value),
    terms: line.chars
      .filter((cell): cell is SongCell & { termIndex: number } => cell.termIndex !== null)
      .map((cell) => getTermName(cell.termIndex, locale.value)),
  })),
)

function termNameForCell(cell: SongCell): string {
  return cell.termIndex === null ? '' : getTermName(cell.termIndex, locale.value)
}

function showHint(cell: SongCell): void {
  const separator = locale.value === 'en' ? ': ' : '：'
  hint.value =
    cell.termIndex === null
      ? cell.gloss
      : `${t('song.charTerm', { char: cell.char, term: termNameForCell(cell) })}${separator}${cell.gloss}`
}

function resetHint(): void {
  hint.value = ''
}

watch(locale, resetHint)

function selectCell(cell: SongCell): void {
  if (cell.termIndex === null) return
  store.selectTermInSelectedYear(cell.termIndex)
  hint.value = t('song.hintSelected', {
    term: termNameForCell(cell),
    year: store.selectedYear.value,
  })
  emit('select-term', cell.termIndex)
}

function lineSeasonName(line: SongLine): string {
  if (locale.value === 'en') return getSeasonName(line.season, 'en')
  return line.season
}
</script>

<template>
  <section id="song" class="reading-section song-section" aria-labelledby="song-title">
    <header class="section-heading section-heading--split">
      <div>
        <p class="section-kicker"><span>{{ t('song.kicker') }}</span> {{ t('song.kickerTitle') }}</p>
        <h2 id="song-title">{{ t('song.titleA') }}<br />{{ t('song.titleB') }}</h2>
      </div>
      <div class="section-heading__aside">
        <p>{{ t('song.aside') }}</p>
      </div>
    </header>

    <p v-if="locale === 'en'" class="song-language-note">{{ t('song.englishSongNote') }}</p>

    <div class="song-grid">
      <article
        v-for="group in lineTerms"
        :key="group.line.id"
        class="song-line"
        :class="`song-line--${group.line.season}`"
      >
        <div class="song-line__head">
          <span class="song-line__season" aria-hidden="true">{{ lineSeasonName(group.line) }}</span>
          <span class="song-line__count">{{ t('song.count') }}</span>
        </div>

        <div
          class="song-characters"
          role="group"
          :aria-label="t('song.lineAria', { season: group.seasonName, text: group.line.text })"
        >
          <template v-for="(cell, index) in group.line.chars" :key="`${group.line.id}-${index}`">
            <button
              v-if="cell.termIndex !== null"
              type="button"
              class="song-char"
              :class="{ 'is-active': activeTerm.index === cell.termIndex }"
              :aria-label="t('song.charAria', {
                char: cell.char,
                position: index + 1,
                term: termNameForCell(cell),
                gloss: cell.gloss,
              })"
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
              :aria-label="t('song.fillerAria', { char: cell.char, gloss: cell.gloss })"
              :data-char-position="index"
              :title="cell.gloss"
              @mouseenter="showHint(cell)"
              @mouseleave="resetHint"
            >{{ cell.char }}</span>
          </template>
        </div>

        <p class="song-line__summary">{{ group.line.summary }}</p>
        <p class="song-line__terms" :aria-label="t('song.termListLabel')">
          <span v-for="term in group.terms" :key="term">{{ term }}</span>
        </p>
      </article>
    </div>

    <div class="song-hint" role="status" aria-live="polite">
      <span class="song-hint__mark" aria-hidden="true">{{ t('song.hintMark') }}</span>
      <p>{{ displayHint }}</p>
    </div>

    <div class="song-notes">
      <div>
        <h3>{{ t('song.notesTitle1') }}</h3>
        <p>{{ t('song.notesBody1') }}</p>
      </div>
      <div>
        <h3>{{ t('song.notesTitle2') }}</h3>
        <p>{{ t('song.notesBody2') }}</p>
      </div>
    </div>
  </section>
</template>
