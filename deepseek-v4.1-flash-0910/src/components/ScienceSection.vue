<script setup lang="ts">
/** 科普问答：为什么有四季、为什么节气间隔不等、为什么公历日期稳定、南北半球季节相反等 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { useContent } from '@/composables/useContent'

const { t } = useI18n()
const { content } = useContent()
const faqs = computed(() => content.value.science)
</script>

<template>
  <section id="science" class="section" aria-labelledby="science-title">
    <div class="section-title">
      <span class="num">{{ t('science.num') }}</span>
      <h2 id="science-title">{{ t('science.title') }}</h2>
    </div>
    <p class="section-intro">{{ t('science.intro') }}</p>

    <div class="faq-list">
      <details v-for="(f, i) in faqs" :key="f.id" class="faq" :open="i === 0">
        <summary>{{ f.question }}</summary>
        <div class="faq-body">
          <p>{{ f.answer }}</p>
          <ul v-if="f.keyPoints?.length" class="key-points">
            <li v-for="(k, j) in f.keyPoints" :key="j">{{ k }}</li>
          </ul>
        </div>
      </details>
    </div>
  </section>
</template>
