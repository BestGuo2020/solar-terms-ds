<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../i18n/index.ts'

const { locale, t } = useI18n()
const year = new Date().getFullYear()
const period = computed(() => (locale.value === 'en' ? '.' : '。'))
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="footer-brand">
        <p class="footer-seal" aria-hidden="true">观象</p>
        <div>
          <h2>{{ t('footer.title') }}</h2>
          <p>{{ t('footer.description') }}</p>
        </div>
      </div>

      <div class="footer-columns">
        <div>
          <h3>{{ t('footer.readHeading') }}</h3>
          <a href="#observatory">{{ t('footer.observatory') }}</a>
          <a href="#history">{{ t('footer.history') }}</a>
          <a href="#song">{{ t('footer.song') }}</a>
          <a href="#sources">{{ t('footer.sources') }}</a>
        </div>
        <div>
          <h3>{{ t('footer.dataHeading') }}</h3>
          <a href="https://ich.unesco.org/en/RL/the-twenty-four-solar-terms-knowledge-in-china-of-time-and-practices-developed-through-the-observation-of-the-sun-s-annual-motion-00647" target="_blank" rel="noopener noreferrer">{{ t('footer.unesco') }}</a>
          <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener noreferrer">{{ t('footer.astronomyEngine') }}</a>
          <a href="https://threejs.org/docs/" target="_blank" rel="noopener noreferrer">{{ t('footer.threejs') }}</a>
        </div>
      </div>
    </div>

    <div class="site-footer__bottom">
      <p>{{ t('footer.legal') }}</p>
      <p>
        {{ t('footer.credits') }}
        <a href="#texture-credits">{{ t('footer.textureCredits') }}</a>{{ period }}
      </p>
      <p>{{ t('footer.copyright', { year }) }}</p>
    </div>
  </footer>
</template>
