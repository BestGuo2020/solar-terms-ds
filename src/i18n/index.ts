import { computed, readonly, ref, watch } from 'vue'
import { messages, type MessageKey } from './messages.ts'
import type { Locale } from './types.ts'

const STORAGE_KEY = 'guanxiang.locale'
const supportedLocales: Locale[] = ['zh', 'en']

function isLocale(value: string | null | undefined): value is Locale {
  return value === 'zh' || value === 'en'
}

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh'
  try {
    const queryLocale = new URLSearchParams(window.location.search).get('lang')
    if (isLocale(queryLocale)) return queryLocale
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Privacy modes can deny storage; fall back to Chinese.
  }
  return 'zh'
}

const locale = ref<Locale>(detectInitialLocale())

export type TranslateParams = Record<string, string | number>

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key]
    return value === undefined ? match : String(value)
  })
}

function translateFor(target: Locale, key: MessageKey, params?: TranslateParams): string {
  return interpolate(messages[target][key], params)
}

export function t(key: MessageKey, params?: TranslateParams): string {
  return translateFor(locale.value, key, params)
}

export function tn(target: Locale, key: MessageKey, params?: TranslateParams): string {
  return translateFor(target, key, params)
}

function applyDocumentLocale(value: Locale): void {
  if (typeof document === 'undefined') return
  const dictionary = messages[value]
  document.documentElement.lang = dictionary['app.htmlLang']
  document.documentElement.dataset.locale = value
  document.documentElement.classList.toggle('lang-en', value === 'en')
  document.documentElement.classList.toggle('lang-zh', value === 'zh')
  document.title = dictionary['app.title']
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (description) description.content = dictionary['app.description']
  const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
  if (ogTitle) ogTitle.content = dictionary['app.title']
  const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]')
  if (ogDescription) ogDescription.content = dictionary['app.description']
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Not fatal: the switch still works for this page view.
  }
}

watch(locale, applyDocumentLocale, { immediate: true })

function syncLocaleQuery(value: Locale): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  try {
    const url = new URL(window.location.href)
    if (value === 'en') url.searchParams.set('lang', 'en')
    else url.searchParams.delete('lang')
    window.history.replaceState(null, '', url)
  } catch {
    // The switch still works even if the URL cannot be rewritten.
  }
}

export function setLocale(next: Locale): void {
  if (!supportedLocales.includes(next)) return
  locale.value = next
  syncLocaleQuery(next)
}

export function toggleLocale(): void {
  setLocale(locale.value === 'zh' ? 'en' : 'zh')
}

export function useI18n() {
  const isEnglish = computed(() => locale.value === 'en')
  return {
    locale: readonly(locale),
    isEnglish,
    t,
    tn,
    setLocale,
    toggleLocale,
  }
}

export type { Locale }
