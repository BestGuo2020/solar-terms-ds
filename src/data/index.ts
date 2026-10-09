/**
 * 内容数据汇总入口（中英双语）
 *
 * 设计要点：
 *  · **基础表（terms.ts）与语言无关**，中英文名称都放在那里；
 *  · 长文内容按语言分文件：中文在 src/data/*.ts，英文在 src/data/en/*.ts；
 *  · 组件不直接碰这两个来源，而是通过本文件把它们**归一成同一套视图模型**
 *    （TermDetailView / ContentBundle），于是模板里不需要满篇 `if (en)`。
 *  · 英文版在诗词、三候、农谚这些「中文原文本身就是价值」的地方保留汉字原文，
 *    视图模型里用 `original` 字段带出来。
 */

import type { Locale } from '@/i18n'
import { TERMS, TERM_BY_NAME, type Season, type TermBase } from './terms'
import { TERM_DETAILS, type TermDetail } from './termDetails'
import { SONG_LINES } from './song'

import { HISTORY_TIMELINE, HISTORY_INTRO } from './history'
import { CULTURE_ASPECTS, CULTURE_INTRO } from './culture'
import { SCIENCE_FAQ } from './science'
import { SOURCES, DATA_NOTE } from './sources'

import { TERM_DETAILS_EN } from './en/termDetails'
import { HISTORY_TIMELINE_EN, HISTORY_INTRO_EN } from './en/history'
import { CULTURE_ASPECTS_EN, CULTURE_INTRO_EN } from './en/culture'
import { SCIENCE_FAQ_EN } from './en/science'
import { SOURCES_EN, DATA_NOTE_EN } from './en/sources'
import { SONG_LINES_EN } from './en/song'

export { TERMS, TERM_BY_NAME }
export type { TermBase, Season }

// ───────────────────────── 视图模型 ─────────────────────────

export interface PentadView {
  /** 「初候 / 二候 / 三候」的本地化标签 */
  label: string
  /** 当前语言下的正文 */
  text: string
  /** 汉字原文（仅英文版带出，用于并列展示） */
  original?: string
}

export interface PoemView {
  /** 当前语言下的诗句（英文版是译文） */
  text: string
  /** 汉字原句（仅英文版带出） */
  original?: string
  author: string
  source: string
}

export interface ProverbView {
  text: string
  original?: string
}

export interface TermDetailView {
  index: number
  /** 当前语言的节气名 */
  name: string
  /** 中文名（英文版下作为副标题显示） */
  nameZh: string
  /** 英文名 */
  nameEn: string
  pinyin: string
  longitude: number
  /** 季节的中文键（'春'|'夏'|'秋'|'冬'），配色与分组都用它 */
  season: Season
  /** 季节的本地化名称 */
  seasonLabel: string
  major: boolean
  meaning: string
  climate: string
  phenology: string
  pentads: PentadView[]
  farming: string
  custom: string
  food: string
  poem?: PoemView
  proverb?: ProverbView
}

export interface SongCharView {
  char: string
  pinyin: string
  termIndex: number | null
  gloss: string
}

export interface SongLineView {
  text: string
  season: Season
  summary: string
  chars: SongCharView[]
}

export interface ContentBundle {
  locale: Locale
  historyIntro: string
  history: typeof HISTORY_TIMELINE
  cultureIntro: string
  culture: typeof CULTURE_ASPECTS
  science: typeof SCIENCE_FAQ
  sources: typeof SOURCES
  dataNote: string
  song: SongLineView[]
}

// ───────────────────────── 本地化小工具 ─────────────────────────

/** 「初候 / 二候 / 三候」——属于领域数据而非界面文案，故与详情放在一起 */
const PENTAD_LABELS: Record<Locale, readonly string[]> = {
  zh: ['初候', '二候', '三候'],
  en: ['First pentad', 'Second pentad', 'Third pentad'],
}

const SEASON_LABELS: Record<Locale, Record<Season, string>> = {
  zh: { 春: '春季', 夏: '夏季', 秋: '秋季', 冬: '冬季' },
  en: { 春: 'Spring', 夏: 'Summer', 秋: 'Autumn', 冬: 'Winter' },
}

/** 季节的中文键 → 本地化名称 */
export function seasonName(season: Season, locale: Locale): string {
  return SEASON_LABELS[locale]?.[season] ?? season
}

/** 取某个节气的本地化名称（含序号兜底） */
export function termName(index: number, locale: Locale): string {
  const base = TERMS[index]
  if (!base) return String(index)
  return locale === 'en' ? base.nameEn : base.name
}

// ───────────────────────── 详情归一 ─────────────────────────

/** 缺详情时的兜底，保证界面不崩 */
function fallbackView(index: number, locale: Locale): TermDetailView {
  const base = TERMS[index] ?? TERMS[0]
  return {
    index,
    name: locale === 'en' ? base.nameEn : base.name,
    nameZh: base.name,
    nameEn: base.nameEn,
    pinyin: base.pinyin,
    longitude: base.longitude,
    season: base.season,
    seasonLabel: seasonName(base.season, locale),
    major: base.major,
    meaning: '',
    climate: '',
    phenology: '',
    pentads: PENTAD_LABELS[locale].map((label) => ({ label, text: '' })),
    farming: '',
    custom: '',
    food: '',
  }
}

function fromZh(d: TermDetail, base: TermBase): TermDetailView {
  return {
    index: d.index,
    name: d.name,
    nameZh: base.name,
    nameEn: base.nameEn,
    pinyin: d.pinyin,
    longitude: d.longitude,
    season: d.season as Season,
    seasonLabel: seasonName(d.season as Season, 'zh'),
    major: base.major,
    meaning: d.meaning,
    climate: d.climate,
    phenology: d.phenology,
    pentads: d.pentads.map((text, i) => ({ label: PENTAD_LABELS.zh[i], text })),
    farming: d.farming,
    custom: d.custom,
    food: d.food,
    poem: d.poem
      ? { text: d.poem.text, author: d.poem.author, source: d.poem.source }
      : undefined,
    proverb: d.proverb ? { text: d.proverb } : undefined,
  }
}

function fromEn(d: (typeof TERM_DETAILS_EN)[number], base: TermBase): TermDetailView {
  const seasonKey: Season =
    d.season === 'Spring' ? '春' : d.season === 'Summer' ? '夏' : d.season === 'Autumn' ? '秋' : '冬'
  return {
    index: d.index,
    name: d.name,
    nameZh: d.nameZh,
    nameEn: d.name,
    pinyin: d.pinyin,
    longitude: d.longitude,
    season: seasonKey,
    seasonLabel: seasonName(seasonKey, 'en'),
    major: base.major,
    meaning: d.meaning,
    climate: d.climate,
    phenology: d.phenology,
    pentads: d.pentads.map((p, i) => ({
      label: PENTAD_LABELS.en[i],
      text: p.en,
      original: p.zh,
    })),
    farming: d.farming,
    custom: d.custom,
    food: d.food,
    poem: d.poem
      ? { text: d.poem.en, original: d.poem.zh, author: d.poem.author, source: d.poem.source }
      : undefined,
    proverb: d.proverb ? { text: d.proverb.en, original: d.proverb.zh } : undefined,
  }
}

const zhByIndex = new Map(TERM_DETAILS.map((d) => [d.index, d]))
const enByIndex = new Map(TERM_DETAILS_EN.map((d) => [d.index, d]))

/** 取某个节气的详情（已按语言归一） */
export function detailOf(index: number, locale: Locale = 'zh'): TermDetailView {
  const base = TERMS[index]
  if (!base) return fallbackView(index, locale)
  if (locale === 'en') {
    const d = enByIndex.get(index)
    return d ? fromEn(d, base) : fallbackView(index, locale)
  }
  const d = zhByIndex.get(index)
  return d ? fromZh(d, base) : fallbackView(index, locale)
}

// ───────────────────────── 内容包 ─────────────────────────

/** 取一整套本地化内容 */
export function contentFor(locale: Locale): ContentBundle {
  if (locale === 'en') {
    return {
      locale,
      historyIntro: HISTORY_INTRO_EN,
      history: HISTORY_TIMELINE_EN,
      cultureIntro: CULTURE_INTRO_EN,
      culture: CULTURE_ASPECTS_EN,
      science: SCIENCE_FAQ_EN,
      sources: SOURCES_EN,
      dataNote: DATA_NOTE_EN,
      song: SONG_LINES.map((line, li) => {
        const en = SONG_LINES_EN[li]
        return {
          text: line.text,
          season: line.season,
          summary: en?.summary ?? '',
          chars: line.chars.map((c, ci) => ({
            char: c.char,
            pinyin: c.pinyin,
            termIndex: c.termIndex,
            gloss: en?.chars[ci]?.gloss ?? '',
          })),
        }
      }),
    }
  }
  return {
    locale,
    historyIntro: HISTORY_INTRO,
    history: HISTORY_TIMELINE,
    cultureIntro: CULTURE_INTRO,
    culture: CULTURE_ASPECTS,
    science: SCIENCE_FAQ,
    sources: SOURCES,
    dataNote: DATA_NOTE,
    song: SONG_LINES.map((line) => ({
      text: line.text,
      season: line.season,
      summary: line.summary,
      chars: line.chars.map((c) => ({
        char: c.char,
        pinyin: c.pinyin,
        termIndex: c.termIndex,
        gloss: c.gloss,
      })),
    })),
  }
}

// ───────────────────────── 分组与自检 ─────────────────────────

export interface SeasonGroup {
  season: Season
  /** 该季的第一个节气（用于「春 · 立春起」这类标题） */
  firstTerm: TermBase
  terms: TermBase[]
}

export const SEASON_GROUPS: readonly SeasonGroup[] = [
  { season: '春', firstTerm: TERMS[0], terms: TERMS.slice(0, 6) },
  { season: '夏', firstTerm: TERMS[6], terms: TERMS.slice(6, 12) },
  { season: '秋', firstTerm: TERMS[12], terms: TERMS.slice(12, 18) },
  { season: '冬', firstTerm: TERMS[18], terms: TERMS.slice(18, 24) },
]

let checked = false

/**
 * 开发期一致性检查：中英两套内容都要与基础表对齐，
 * 否则会出现「名字与黄经不匹配」「英文条目缺项」这类难查的问题。
 */
export function assertDataConsistency(): string[] {
  if (checked) return []
  checked = true
  const problems: string[] = []

  // 基础表自检
  if (TERMS.length !== 24) problems.push(`基础表条目数为 ${TERMS.length}，应为 24`)
  for (const t of TERMS) {
    if (!t.nameEn || !t.nameEn.trim()) problems.push(`${t.name} 缺少英文名`)
  }

  // 中文详情
  if (TERM_DETAILS.length !== 24) problems.push(`中文详情条目数为 ${TERM_DETAILS.length}，应为 24`)
  for (const base of TERMS) {
    const d = zhByIndex.get(base.index)
    if (!d) {
      problems.push(`缺少 ${base.name}（index ${base.index}）的中文详情`)
    } else {
      if (d.name !== base.name) problems.push(`index ${base.index} 中文名不一致：${d.name}`)
      if (d.longitude !== base.longitude) problems.push(`${base.name} 中文详情黄经不一致`)
      if (d.season !== base.season) problems.push(`${base.name} 中文详情季节不一致`)
    }
  }

  // 英文详情
  if (TERM_DETAILS_EN.length !== 24) {
    problems.push(`英文详情条目数为 ${TERM_DETAILS_EN.length}，应为 24`)
  }
  for (const base of TERMS) {
    const d = enByIndex.get(base.index)
    if (!d) {
      problems.push(`缺少 ${base.nameEn}（index ${base.index}）的英文详情`)
      continue
    }
    if (d.name !== base.nameEn) problems.push(`index ${base.index} 英文名不一致：${d.name}`)
    if (d.longitude !== base.longitude) problems.push(`${base.nameEn} 英文详情黄经不一致`)
    if (!d.meaning?.trim() || !d.climate?.trim() || !d.phenology?.trim()) {
      problems.push(`${base.nameEn} 英文详情有空字段`)
    }
    if (!Array.isArray(d.pentads) || d.pentads.length !== 3) {
      problems.push(`${base.nameEn} 英文三候不是 3 条`)
    }
  }

  // 节气歌：中英两份必须逐字对应
  if (SONG_LINES_EN.length !== SONG_LINES.length) {
    problems.push(`节气歌中英行数不一致：${SONG_LINES.length} vs ${SONG_LINES_EN.length}`)
  }
  SONG_LINES.forEach((line, li) => {
    const en = SONG_LINES_EN[li]
    if (!en) return
    if (en.chars.length !== line.chars.length) {
      problems.push(`节气歌第 ${li + 1} 句中英字数不一致`)
    }
  })

  // 其余内容：条目数一致、id 对齐
  const compareIds = (label: string, a: { id: string }[], b2: { id: string }[]) => {
    if (a.length !== b2.length) {
      problems.push(`${label}中英条目数不一致：${a.length} vs ${b2.length}`)
      return
    }
    const bIds = new Set(b2.map((x) => x.id))
    for (const x of a) if (!bIds.has(x.id)) problems.push(`${label}英文版缺少 id=${x.id}`)
  }
  compareIds('历史时间线', HISTORY_TIMELINE, HISTORY_TIMELINE_EN)
  compareIds('文化价值', CULTURE_ASPECTS, CULTURE_ASPECTS_EN)
  compareIds('科普问答', SCIENCE_FAQ, SCIENCE_FAQ_EN)
  compareIds('参考来源', SOURCES, SOURCES_EN)

  if (problems.length && import.meta.env?.DEV) {
    console.warn('[内容数据一致性] 发现问题：\n' + problems.join('\n'))
  }
  return problems
}
