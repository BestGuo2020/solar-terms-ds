<script setup lang="ts">
/** 文化价值：农业生产、日常生活、饮食养生、文学艺术、地方习俗、非遗传承 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { useContent } from '@/composables/useContent'

const { t } = useI18n()
const { content } = useContent()
const aspects = computed(() => content.value.culture)
</script>

<template>
  <section id="culture" class="section" aria-labelledby="culture-title">
    <div class="section-title">
      <span class="num">{{ t('culture.num') }}</span>
      <h2 id="culture-title">{{ t('culture.title') }}</h2>
    </div>
    <p class="section-intro">{{ content.cultureIntro }}</p>

    <div class="culture-grid">
      <article v-for="a in aspects" :key="a.id" class="culture-card">
        <div class="icon" aria-hidden="true">{{ a.icon }}</div>
        <h3>{{ a.title }}</h3>
        <p class="summary">{{ a.summary }}</p>
        <ul>
          <li v-for="(ex, i) in a.examples" :key="i">{{ ex }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>
