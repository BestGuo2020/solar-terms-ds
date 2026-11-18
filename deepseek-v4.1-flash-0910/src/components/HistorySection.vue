<script setup lang="ts">
/** 历史渊源：从圭表测影到入选人类非物质文化遗产 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { useContent } from '@/composables/useContent'

const { t } = useI18n()
const { content } = useContent()

/** 关键节点加粗显示（id 中英一致，故高亮逻辑与语言无关） */
const KEY_IDS = new Set([
  'huainanzi-first-full-list',
  'taichu-calendar',
  'shixian-calendar-fixed-qi',
  'unesco-inscription',
])

const events = computed(() => content.value.history)
</script>

<template>
  <section id="history" class="section" aria-labelledby="history-title">
    <div class="section-title">
      <span class="num">{{ t('history.num') }}</span>
      <h2 id="history-title">{{ t('history.title') }}</h2>
    </div>
    <p class="section-intro">{{ content.historyIntro }}</p>

    <ol class="timeline-list" style="list-style: none; margin: 0; padding-left: 1.6rem">
      <li
        v-for="ev in events"
        :key="ev.id"
        class="hist-item"
        :class="{ 'is-key': KEY_IDS.has(ev.id) }"
      >
        <div class="hist-era">
          <span class="era">{{ ev.era }}</span>
          <span class="year">{{ ev.year }}</span>
        </div>
        <h3>{{ ev.title }}</h3>
        <p>{{ ev.detail }}</p>
        <div v-if="ev.source" class="hist-source">{{ ev.source }}</div>
      </li>
    </ol>
  </section>
</template>
