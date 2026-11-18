<script setup lang="ts">
import { useI18n } from '../i18n/index.ts'

const { locale, setLocale, t } = useI18n()
</script>

<template>
  <div class="lang-switch" role="group" :aria-label="t('lang.group')">
    <button
      type="button"
      class="lang-button"
      :class="{ 'is-active': locale === 'zh' }"
      :aria-pressed="locale === 'zh'"
      :aria-label="t('lang.ariaZh')"
      :title="t('lang.toZh')"
      @click="setLocale('zh')"
    >
      中
    </button>
    <span class="lang-switch__divider" aria-hidden="true"></span>
    <button
      type="button"
      class="lang-button"
      :class="{ 'is-active': locale === 'en' }"
      :aria-pressed="locale === 'en'"
      :aria-label="t('lang.ariaEn')"
      :title="t('lang.toEn')"
      @click="setLocale('en')"
    >
      EN
    </button>
  </div>
</template>
