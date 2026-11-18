<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../i18n/index.ts'
import { getCultureIntro, getLocalizedCulture } from '../i18n/content.ts'

const { locale, t } = useI18n()
const aspects = computed(() => getLocalizedCulture(locale.value))
const intro = computed(() => getCultureIntro(locale.value))

const GLYPHS: Record<string, string> = {
  agriculture: '农',
  'daily-life': '日',
  'food-health': '食',
  'literature-art': '文',
  'local-customs': '俗',
  heritage: '承',
}
</script>

<template>
  <section id="culture" class="reading-section culture-section" aria-labelledby="culture-title">
    <header class="section-heading section-heading--split">
      <div>
        <p class="section-kicker"><span>{{ t('culture.kicker') }}</span> {{ t('culture.kickerTitle') }}</p>
        <h2 id="culture-title">{{ t('culture.titleA') }}<br />{{ t('culture.titleB') }}</h2>
      </div>
      <div class="section-heading__aside">
        <p>{{ intro }}</p>
      </div>
    </header>

    <div class="culture-grid">
      <article
        v-for="(aspect, index) in aspects"
        :key="aspect.id"
        class="culture-card"
        :class="`culture-card--${aspect.id}`"
      >
        <div class="culture-card__top">
          <span class="culture-card__number">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="culture-card__glyph" aria-hidden="true">{{ GLYPHS[aspect.id] ?? '节' }}</span>
        </div>
        <h3>{{ aspect.title }}</h3>
        <p class="culture-card__summary">{{ aspect.summary }}</p>
        <ul class="culture-card__examples">
          <li v-for="example in aspect.examples" :key="example">{{ example }}</li>
        </ul>
      </article>
    </div>

    <aside class="culture-quote">
      <p class="culture-quote__mark" aria-hidden="true">“</p>
      <blockquote>{{ t('culture.quote') }}</blockquote>
      <p class="culture-quote__from">{{ t('culture.quoteFrom') }}</p>
    </aside>
  </section>
</template>
