<script setup lang="ts">
import { computed } from 'vue'
import { SOURCES } from '../data/sources'
import type { SourceRef } from '../data/types'
import { SOURCE_COPY_EN } from '../data/en/sources.ts'
import { useI18n } from '../i18n/index.ts'
import type { MessageKey } from '../i18n/messages.ts'

const { locale, t } = useI18n()

const GROUP_ORDER: SourceRef['group'][] = ['历法与天文', '历史与非遗', '技术与图像']
const GROUP_LABEL_KEYS: Record<SourceRef['group'], MessageKey> = {
  历法与天文: 'sources.group.calendar',
  历史与非遗: 'sources.group.heritage',
  技术与图像: 'sources.group.technology',
}

const localizedSources = computed(() =>
  SOURCES.map((source) => {
    if (locale.value !== 'en') return source
    const copy = SOURCE_COPY_EN[source.id]
    return {
      ...source,
      title: copy?.title ?? source.title,
      publisher: copy?.publisher ?? source.publisher,
      note: copy?.note ?? source.note,
    }
  }),
)

const groupedSources = computed(() =>
  GROUP_ORDER.map((group) => ({
    group,
    labelKey: GROUP_LABEL_KEYS[group],
    items: localizedSources.value.filter((source) => source.group === group),
  })),
)

const caveatKeys: MessageKey[] = [
  'sources.caveat1',
  'sources.caveat2',
  'sources.caveat3',
  'sources.caveat4',
  'sources.caveat5',
]

const supportedYears = computed(() => t('method.supportedYears'))
</script>

<template>
  <section id="sources" class="sources-section" aria-labelledby="sources-title">
    <div class="sources-inner">
      <header class="section-heading section-heading--on-dark section-heading--split">
        <div>
          <p class="section-kicker"><span>{{ t('sources.kicker') }}</span> {{ t('sources.kickerTitle') }}</p>
          <h2 id="sources-title">{{ t('sources.titleA') }}<br />{{ t('sources.titleB') }}</h2>
        </div>
        <div class="section-heading__aside">
          <p>{{ t('sources.aside') }}</p>
        </div>
      </header>

      <div class="method-grid" :aria-label="t('sources.methodAria')">
        <article class="method-card">
          <span class="method-card__index">01</span>
          <h3>{{ t('sources.methodTitle1') }}</h3>
          <p>{{ t('method.algorithm') }}</p>
        </article>
        <article class="method-card">
          <span class="method-card__index">02</span>
          <h3>{{ t('sources.methodTitle2') }}</h3>
          <p>{{ t('sources.timeBody', { years: supportedYears, timezone: t('method.timezone') }) }}</p>
        </article>
        <article class="method-card">
          <span class="method-card__index">03</span>
          <h3>{{ t('sources.methodTitle3') }}</h3>
          <p>{{ t('method.precision') }}</p>
        </article>
        <article class="method-card">
          <span class="method-card__index">04</span>
          <h3>{{ t('sources.methodTitle4') }}</h3>
          <p>{{ t('method.scene') }}</p>
        </article>
      </div>

      <div class="source-columns">
        <div v-for="group in groupedSources" :key="group.group" class="source-group">
          <h3>{{ t(group.labelKey) }}</h3>
          <ol class="source-list">
            <li v-for="source in group.items" :key="source.id">
              <p class="source-title">
                <a
                  v-if="source.url"
                  :href="source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="t('sources.linkAria', { title: source.title })"
                >{{ source.title }}</a>
                <span v-else>{{ source.title }}</span>
              </p>
              <p v-if="source.publisher" class="source-publisher">{{ source.publisher }}</p>
              <p v-if="source.note" class="source-note">{{ source.note }}</p>
            </li>
          </ol>
        </div>
      </div>

      <div class="data-caveats">
        <h3>{{ t('sources.caveatsTitle') }}</h3>
        <ul>
          <li v-for="key in caveatKeys" :key="key">{{ t(key) }}</li>
        </ul>
      </div>

      <div id="texture-credits" class="texture-credits">
        <h3>{{ t('sources.textureTitle') }}</h3>
        <p>{{ t('sources.textureBody') }}</p>
        <p class="texture-credits__links">
          <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">Solar System Scope · CC BY 4.0</a>
          <span aria-hidden="true">·</span>
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
          <span aria-hidden="true">·</span>
          <a href="https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets" target="_blank" rel="noopener noreferrer">three.js planet textures</a>
        </p>
        <p class="texture-credits__local">
          {{ t('sources.textureLocal') }}
          <a href="/textures/CREDITS.md" target="_blank" rel="noopener">public/textures/CREDITS.md</a>
        </p>
      </div>

      <p class="sources-signoff">{{ t('sources.signoff') }}</p>
    </div>
  </section>
</template>
