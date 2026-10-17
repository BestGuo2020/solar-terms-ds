<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useObservatory } from '../stores/observatory'

const { activeTerm, isSimulated } = useObservatory()
const menuOpen = ref(false)

const navItems = [
  { href: '#observatory', label: '观测台' },
  { href: '#terms', label: '岁时谱' },
  { href: '#history', label: '源流' },
  { href: '#culture', label: '风物' },
  { href: '#song', label: '节气歌' },
  { href: '#science', label: '问四时' },
  { href: '#sources', label: '参考' },
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
    <a class="brand" href="#top" aria-label="观象 · 二十四节气，回到页面顶部" @click="closeMenu">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="25" cy="22" r="6" fill="currentColor" />
          <ellipse cx="25" cy="22" rx="17" ry="8.5" stroke="currentColor" stroke-opacity=".55" transform="rotate(-18 25 22)" />
          <circle cx="9" cy="28" r="1.9" fill="currentColor" fill-opacity=".85" />
          <path d="M4 41h40" stroke="currentColor" stroke-opacity=".28" />
        </svg>
      </span>
      <span class="brand-words">
        <strong>观象</strong>
        <small>二十四节气</small>
      </span>
    </a>

    <nav class="desktop-nav" aria-label="页面导航">
      <a v-for="item in navItems" :key="item.href" :href="item.href">{{ item.label }}</a>
    </nav>

    <div class="header-now">
      <span class="header-now__dot" :class="{ 'is-sim': isSimulated }" aria-hidden="true"></span>
      <span class="header-now__copy">
        <small>{{ isSimulated ? '模拟时间' : '此刻' }}</small>
        <strong>{{ activeTerm.name }}</strong>
      </span>
    </div>

    <button
      type="button"
      class="menu-toggle"
      :aria-expanded="menuOpen"
      aria-controls="mobile-navigation"
      :aria-label="menuOpen ? '关闭导航菜单' : '打开导航菜单'"
      @click="menuOpen = !menuOpen"
    >
      <span></span>
      <span></span>
    </button>

    <nav
      v-if="menuOpen"
      id="mobile-navigation"
      class="mobile-nav"
      aria-label="移动端页面导航"
    >
      <a v-for="(item, index) in navItems" :key="item.href" :href="item.href" @click="closeMenu">
        <span>0{{ index + 1 }}</span>{{ item.label }}
      </a>
      <p class="mobile-nav__note">拖动地球、选一个节气，或者继续向下阅读。</p>
    </nav>
  </header>
</template>
