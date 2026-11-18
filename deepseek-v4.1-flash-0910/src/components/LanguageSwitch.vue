<script setup lang="ts">
/**
 * 语言切换
 *
 * 用「分段控件」而不是下拉框：只有两种语言，两个选项同时可见最省事，
 * 也让当前语言一目了然。选择会写进 localStorage 与 URL（?lang=），因此可以分享。
 */
import { useI18n } from '@/i18n'
import { LOCALES, LOCALE_LABELS } from '@/i18n'

const { locale, setLocale, t } = useI18n()
</script>

<template>
  <div class="lang-switch" role="group" :aria-label="t('app.langSwitch')">
    <button
      v-for="l in LOCALES"
      :key="l"
      class="lang-btn"
      :class="{ 'is-active': locale === l }"
      type="button"
      :lang="l === 'zh' ? 'zh-CN' : 'en'"
      :aria-pressed="locale === l"
      :title="t(l === 'zh' ? 'app.langZh' : 'app.langEn')"
      @click="setLocale(l)"
    >
      {{ LOCALE_LABELS[l] }}
    </button>
  </div>
</template>
