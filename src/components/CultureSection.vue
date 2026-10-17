<script setup lang="ts">
import { CULTURE_ASPECTS, CULTURE_INTRO } from '../data/culture'

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
        <p class="section-kicker"><span>卷三</span> 风物</p>
        <h2 id="culture-title">节气落在人间，<br />长成了什么？</h2>
      </div>
      <div class="section-heading__aside">
        <p>{{ CULTURE_INTRO }}</p>
      </div>
    </header>

    <div class="culture-grid">
      <article
        v-for="(aspect, index) in CULTURE_ASPECTS"
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
      <blockquote>
        清明前后种瓜点豆，冬至桌上端一碗热汤圆。节气真正留下来的方式，不只是历法上的名词，而是仍然被使用的生活。
      </blockquote>
      <p class="culture-quote__from">一种仍然活着的时间知识</p>
    </aside>
  </section>
</template>
