import { TERM_DETAILS } from './term-data.ts'
import type { Season, SolarTerm } from './types.ts'

const MAJOR_LONGITUDES = new Set([0, 90, 180, 270])

/**
 * 24 个节气的名称、黄经、季节与风物内容。
 *
 * 数组按传统顺序（立春 → 大寒）排列；index 0..23 只表示这一传统顺序，
 * 不表示公历年内的时间先后。天文层会把它们按真实交节时刻重新排序。
 */
export const SOLAR_TERMS: SolarTerm[] = (TERM_DETAILS as Omit<SolarTerm, 'major'>[]).map(
  (term) => ({
    ...term,
    pentads: term.pentads as [string, string, string],
    major: MAJOR_LONGITUDES.has(term.longitude),
  }),
)

export const TERM_BY_INDEX: readonly SolarTerm[] = SOLAR_TERMS
export const TERM_BY_NAME: ReadonlyMap<string, SolarTerm> = new Map(
  SOLAR_TERMS.map((term) => [term.name, term]),
)

export const SEASON_ORDER: readonly Season[] = ['春', '夏', '秋', '冬']
export const SEASON_META: Record<Season, { label: string; color: string; opposite: Season }> = {
  春: { label: '春季', color: '#91b49a', opposite: '秋' },
  夏: { label: '夏季', color: '#c88463', opposite: '冬' },
  秋: { label: '秋季', color: '#c9a35d', opposite: '春' },
  冬: { label: '冬季', color: '#8299b7', opposite: '夏' },
}

export const OPPOSITE_SEASON: Record<Season, Season> = {
  春: '秋',
  夏: '冬',
  秋: '春',
  冬: '夏',
}

export function termByIndex(index: number): SolarTerm {
  const term = SOLAR_TERMS[index]
  if (!term) throw new Error(`Unknown solar term index: ${index}`)
  return term
}

export function normalizeLongitude(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}
