<script setup lang="ts">
/** 参考来源与数据精度说明 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { useContent } from '@/composables/useContent'

const { t } = useI18n()
const { content } = useContent()
const sources = computed(() => content.value.sources)
</script>

<template>
  <section id="sources" class="section" aria-labelledby="sources-title">
    <div class="section-title">
      <span class="num">{{ t('sources.num') }}</span>
      <h2 id="sources-title">{{ t('sources.title') }}</h2>
    </div>

    <div class="data-note">
      <h3>{{ t('sources.dataNoteTitle') }}</h3>
      <p>{{ content.dataNote }}</p>
    </div>

    <div class="sources" style="margin-top: 1.2rem">
      <div v-for="s in sources" :key="s.id" class="source-item">
        <span class="src-title">{{ s.title }}</span>
        <span v-if="s.publisher" class="src-pub"> · {{ s.publisher }}</span>
        <template v-if="s.url">
          <br />
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.url }}</a>
        </template>
        <span v-if="s.note" class="src-note">{{ s.note }}</span>
      </div>
    </div>
  </section>
</template>
