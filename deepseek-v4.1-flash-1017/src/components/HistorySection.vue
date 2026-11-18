<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../i18n/index.ts'
import { getHistoryIntro, getLocalizedHistory } from '../i18n/content.ts'

const { locale, t } = useI18n()
const events = computed(() => getLocalizedHistory(locale.value))
const intro = computed(() => getHistoryIntro(locale.value))
</script>

<template>
  <section id="history" class="reading-section history-section" aria-labelledby="history-title">
    <header class="section-heading section-heading--split">
      <div>
        <p class="section-kicker"><span>{{ t('history.kicker') }}</span> {{ t('history.kickerTitle') }}</p>
        <h2 id="history-title">{{ t('history.titleA') }}<br />{{ t('history.titleB') }}</h2>
      </div>
      <div class="section-heading__aside">
        <p>{{ intro }}</p>
      </div>
    </header>

    <div class="history-figures">
      <div class="history-figure">
        <strong>{{ t('history.figure1Title') }}</strong>
        <span>{{ t('history.figure1Sub') }}</span>
      </div>
      <div class="history-figure">
        <strong>{{ t('history.figure2Title') }}</strong>
        <span>{{ t('history.figure2Sub') }}</span>
      </div>
      <div class="history-figure">
        <strong>{{ t('history.figure3Title') }}</strong>
        <span>{{ t('history.figure3Sub') }}</span>
      </div>
      <div class="history-figure">
        <strong>{{ t('history.figure4Title') }}</strong>
        <span>{{ t('history.figure4Sub') }}</span>
      </div>
    </div>

    <ol class="history-timeline" :aria-label="t('history.timelineAria')">
      <li
        v-for="(event, index) in events"
        :key="event.id"
        class="history-item"
        :class="index % 2 === 0 ? 'history-item--left' : 'history-item--right'"
      >
        <div class="history-marker" aria-hidden="true"><span></span></div>
        <article class="history-card">
          <header class="history-card__head">
            <div>
              <p class="history-card__era">{{ event.era }}</p>
              <h3>{{ event.title }}</h3>
            </div>
            <p class="history-card__year">{{ event.year }}</p>
          </header>
          <p class="history-card__detail">{{ event.detail }}</p>
          <p v-if="event.source" class="history-card__source">
            <span>{{ t('history.sourceAside') }}</span>{{ event.source }}
          </p>
        </article>
      </li>
    </ol>

    <p class="history-caveat">{{ t('history.caveat') }}</p>
  </section>
</template>
