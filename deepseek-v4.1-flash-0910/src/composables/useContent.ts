/**
 * 内容数据的组合式封装
 *
 * 组件通过它拿到**当前语言**下的详情与长文内容；
 * 内部依赖 i18n 的响应式 locale，因此切换语言时所有引用都会自动重算。
 */

import { computed, type ComputedRef } from 'vue'
import { useI18n } from '@/i18n'
import { contentFor, detailOf, type ContentBundle, type TermDetailView } from '@/data'

export function useContent(): {
  locale: ComputedRef<'zh' | 'en'>
  content: ComputedRef<ContentBundle>
} {
  const { locale } = useI18n()
  return {
    locale,
    content: computed(() => contentFor(locale.value)),
  }
}

/** 按节气序号取本地化详情；传入的是取值函数，便于跟随响应式来源 */
export function useTermDetail(indexSource: () => number): ComputedRef<TermDetailView> {
  const { locale } = useI18n()
  return computed(() => detailOf(indexSource(), locale.value))
}
