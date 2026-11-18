<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useObservatory } from '../stores/observatory'
import { useI18n } from '../i18n/index.ts'
import { getTermName } from '../i18n/content.ts'
import type { MessageKey } from '../i18n/messages.ts'
import LanguageSwitch from './LanguageSwitch.vue'

const { activeTerm, isSimulated } = useObservatory()
const { locale, t } = useI18n()
const menuOpen = ref(false)

const activeTermName = computed(() => getTermName(activeTerm.value.index, locale.value))

const navItems: Array<{ href: string; labelKey: MessageKey }> = [
  { href: '#observatory', labelKey: 'nav.observatory' },
  { href: '#terms', labelKey: 'nav.terms' },
  { href: '#history', labelKey: 'nav.history' },
  { href: '#culture', labelKey: 'nav.culture' },
  { href: '#song', labelKey: 'nav.song' },
  { href: '#science', labelKey: 'nav.science' },
  { href: '#sources', labelKey: 'nav.sources' },
]

function closeMenu(): void {
  menuOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && menuOpen.value) {
    closeMenu()
    const button = document.querySelector<HTMLButtonElement>('.menu-toggle')
    button?.focus()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="site-header">
    <a class="brand" href="#top" :aria-label="t('brand.homeAria')" @click="closeMenu">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="25" cy="22" r="6" fill="currentColor" />
          <ellipse cx="25" cy="22" rx="17" ry="8.5" stroke="currentColor" stroke-opacity=".55" transform="rotate(-18 25 22)" />
          <circle cx="9" cy="28" r="1.9" fill="currentColor" fill-opacity=".85" />
          <path d="M4 41h40" stroke="currentColor" stroke-opacity=".28" />
        </svg>
      </span>
      <span class="brand-words">
        <strong>{{ t('brand.name') }}</strong>
        <small>{{ t('brand.subtitle') }}</small>
      </span>
    </a>

    <nav class="desktop-nav" :aria-label="t('nav.aria')">
      <a v-for="item in navItems" :key="item.href" :href="item.href">{{ t(item.labelKey) }}</a>
    </nav>

    <LanguageSwitch class="header-language" />

    <div class="header-now">
      <span class="header-now__dot" :class="{ 'is-sim': isSimulated }" aria-hidden="true"></span>
      <span class="header-now__copy">
        <small>{{ isSimulated ? t('header.simulated') : t('header.now') }}</small>
        <strong>{{ activeTermName }}</strong>
      </span>
    </div>

    <button
      type="button"
      class="menu-toggle"
      :aria-expanded="menuOpen"
      aria-controls="mobile-navigation"
      :aria-label="menuOpen ? t('menu.close') : t('menu.open')"
      @click="menuOpen = !menuOpen"
    >
      <span></span>
      <span></span>
    </button>

    <nav
      v-if="menuOpen"
      id="mobile-navigation"
      class="mobile-nav"
      :aria-label="t('nav.mobileAria')"
    >
      <a v-for="(item, index) in navItems" :key="item.href" :href="item.href" @click="closeMenu">
        <span>0{{ index + 1 }}</span>{{ t(item.labelKey) }}
      </a>
      <p class="mobile-nav__note">{{ t('nav.note') }}</p>
    </nav>
  </header>
</template>
