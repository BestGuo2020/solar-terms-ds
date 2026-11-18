/**
 * 轻量国际化（i18n）
 *
 * 为什么不用 vue-i18n？
 *   本站需要翻译的界面文案只有一百多条，而占篇幅 95% 的内容（24 节气详情、历史、
 *   文化、科普、来源）是**结构化长文**，本来就应该按语言分文件维护，而不是塞进
 *   消息字典里。因此这里用一个约 100 行的实现：没有额外依赖，键名有 TS 编译期检查，
 *   语言状态是全局响应式 ref，切语言即时生效。
 *
 * 语言优先级：URL 的 ?lang= → localStorage → 浏览器语言 → 中文。
 * 切换时会同步更新 URL（可分享）、<html lang>、页面标题与描述。
 */

import { computed, ref, type ComputedRef } from 'vue'
import { MESSAGES, type MessageKey } from './messages'

export type Locale = 'zh' | 'en'
export const LOCALES: readonly Locale[] = ['zh', 'en'] as const
export const LOCALE_LABELS: Record<Locale, string> = { zh: '中文', en: 'English' }
/** <html lang> 与 Intl 用的 BCP 47 标签 */
export const LOCALE_TAGS: Record<Locale, string> = { zh: 'zh-CN', en: 'en' }

const STORAGE_KEY = 'jieqi.locale'
const FALLBACK: Locale = 'zh'

function isLocale(v: unknown): v is Locale {
  return v === 'zh' || v === 'en'
}

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return FALLBACK
  try {
    const fromUrl = new URL(window.location.href).searchParams.get('lang')
    if (isLocale(fromUrl)) return fromUrl
  } catch {
    /* 忽略 */
  }
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    /* 隐私模式下可能不可用 */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : ''
  // 浏览器语言不是中文时默认给英文；中文环境保持中文
  if (nav && !/^zh\b/i.test(nav)) return 'en'
  return FALLBACK
}

const locale = ref<Locale>(detectInitialLocale())

/** 当前语言（只读，模板里直接用） */
export const currentLocale: ComputedRef<Locale> = computed(() => locale.value)
export const isEnglish: ComputedRef<boolean> = computed(() => locale.value === 'en')

/** 取一条界面文案。`vars` 里的值会替换掉文案中的 {占位符}。 */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const dict = MESSAGES[locale.value] ?? MESSAGES.zh
  let text: string = dict[key] ?? MESSAGES.zh[key] ?? key
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in vars ? String(vars[name]) : whole,
    )
  }
  return text
}

/** 按语言二选一（用于少量只分两种语言的场合） */
export function pick(zhText: string, enText: string): string {
  return locale.value === 'en' ? enText : zhText
}

/** 季节中文字 → 本地化名称 */
export function seasonLabel(season: string, short = false): string {
  const key = (
    {
      春: short ? 'common.season.springShort' : 'common.season.spring',
      夏: short ? 'common.season.summerShort' : 'common.season.summer',
      秋: short ? 'common.season.autumnShort' : 'common.season.autumn',
      冬: short ? 'common.season.winterShort' : 'common.season.winter',
    } as const
  )[season as '春' | '夏' | '秋' | '冬']
  return key ? t(key) : season
}

/** 文本方向与语言标记同步到文档上 */
function applyDocumentLocale(next: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = LOCALE_TAGS[next]
  document.documentElement.dataset.locale = next
  document.title = t('app.docTitle')
}

/** 切换语言（并记住选择、写进 URL） */
export function setLocale(next: Locale) {
  if (!isLocale(next) || next === locale.value) return
  locale.value = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* 忽略 */
  }
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('lang', next)
    window.history.replaceState(null, '', url.toString())
  } catch {
    /* 忽略 */
  }
  applyDocumentLocale(next)
}

export function toggleLocale() {
  setLocale(locale.value === 'zh' ? 'en' : 'zh')
}

/** 在应用挂载时调用一次 */
export function initLocale() {
  applyDocumentLocale(locale.value)
}

/**
 * 组合式用法：在组件里 `const { t, locale, setLocale } = useI18n()`。
 * 注意模板里直接用全局的 `t()` 也可以，但那样不会随语言变化重新求值；
 * 凡是需要「切语言立刻更新」的地方，都要经过响应式的 `locale`。
 */
export function useI18n() {
  return {
    locale: currentLocale,
    isEnglish,
    t: (key: MessageKey, vars?: Record<string, string | number>) => {
      // 读一下 locale，让调用方的 computed 建立依赖，切语言时能重算
      void locale.value
      return t(key, vars)
    },
    seasonLabel,
    pick,
    setLocale,
    toggleLocale,
  }
}

export type { MessageKey }
export { MESSAGES }
