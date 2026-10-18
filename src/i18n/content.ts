import type { Locale } from './types.ts'
import { SOLAR_TERMS, SEASON_META, OPPOSITE_SEASON } from '../data/term-catalog.ts'
import type {
  CultureAspect,
  HistoryEvent,
  ScienceFaq,
  Season,
  SolarTerm,
  SongLine,
} from '../data/types.ts'
import { HISTORY_TIMELINE, HISTORY_INTRO, HISTORY_INTRO_EN } from '../data/history.ts'
import { CULTURE_ASPECTS, CULTURE_INTRO, CULTURE_INTRO_EN } from '../data/culture.ts'
import { SCIENCE_FAQ, SCIENCE_INTRO, SCIENCE_INTRO_EN } from '../data/science.ts'
import { TERM_DETAILS_EN } from '../data/en/term-details.ts'
import { SEASON_LABELS_EN, TERM_NAMES_EN } from '../data/en/term-labels.ts'
import { HISTORY_TIMELINE_EN } from '../data/en/history.ts'
import { CULTURE_ASPECTS_EN } from '../data/en/culture.ts'
import { SCIENCE_FAQ_EN } from '../data/en/science.ts'
import { SONG_LINES_EN } from '../data/en/song.ts'

export interface LocalizedTerm {
  index: number
  name: string
  nativeName: string
  pinyin: string
  longitude: number
  season: Season
  seasonName: string
  oppositeSeasonName: string
  major: boolean
  meaning: string
  climate: string
  phenology: string
  pentads: [string, string, string]
  farming: string
  custom: string
  food: string
  poem: { text: string; author: string; source: string }
  proverb: string
}

export interface LocalizedHistoryEvent {
  id: string
  era: string
  year: string
  title: string
  detail: string
  source: string
}

export interface LocalizedScienceFaq {
  id: string
  question: string
  answer: string
  keyPoints: string[]
}

export const SEASON_LABEL: Record<Locale, Record<Season, string>> = {
  zh: {
    春: '春季',
    夏: '夏季',
    秋: '秋季',
    冬: '冬季',
  },
  en: SEASON_LABELS_EN,
}

const EN_BY_INDEX = new Map(TERM_DETAILS_EN.map((term) => [term.index, term]))

const ENGLISH_SEASON_TO_CANONICAL: Record<string, Season> = {
  Spring: '春',
  Summer: '夏',
  Autumn: '秋',
  Winter: '冬',
}

const HISTORY_EN_NORMALIZED: LocalizedHistoryEvent[] = HISTORY_TIMELINE_EN.map((event) => ({
  id: event.id,
  era: event.era,
  year: event.year,
  title: event.title,
  detail: event.detail,
  source: event.source ?? '',
}))

const SCIENCE_EN_NORMALIZED: LocalizedScienceFaq[] = SCIENCE_FAQ_EN.map((faq) => ({
  id: faq.id,
  question: faq.question,
  answer: faq.answer,
  keyPoints: faq.keyPoints ?? [],
}))

export function getLocalizedTerm(term: SolarTerm, locale: Locale): LocalizedTerm {
  const en = EN_BY_INDEX.get(term.index)
  if (locale === 'en' && en) {
    const season = ENGLISH_SEASON_TO_CANONICAL[en.season] ?? term.season
    let poem = {
      text: en.poem?.en ?? term.poem.text,
      author: en.poem?.author ?? term.poem.author,
      source: en.poem?.source ?? term.poem.source,
    }
    // Keep the uncertainty that the Chinese edition already carries.
    if (term.index === 4) poem = { ...poem, author: 'Du Mu (attributed)' }
    if (term.index === 10) poem = { ...poem, author: 'Yuan Zhen (attributed)' }

    return {
      index: term.index,
      name: en.name,
      nativeName: en.nameZh,
      pinyin: en.pinyin,
      longitude: term.longitude,
      season,
      seasonName: SEASON_LABELS_EN[season],
      oppositeSeasonName: SEASON_LABELS_EN[OPPOSITE_SEASON[season]],
      major: term.major,
      meaning: en.meaning,
      climate: en.climate,
      phenology: en.phenology,
      pentads: [
        en.pentads[0]?.en ?? '',
        en.pentads[1]?.en ?? '',
        en.pentads[2]?.en ?? '',
      ],
      farming: en.farming,
      custom: en.custom,
      food: en.food,
      poem,
      proverb: en.proverb?.en ?? term.proverb,
    }
  }

  return {
    index: term.index,
    name: term.name,
    nativeName: term.name,
    pinyin: term.pinyin,
    longitude: term.longitude,
    season: term.season,
    seasonName: SEASON_LABEL.zh[term.season],
    oppositeSeasonName: SEASON_LABEL.zh[OPPOSITE_SEASON[term.season]],
    major: term.major,
    meaning: term.meaning,
    climate: term.climate,
    phenology: term.phenology,
    pentads: term.pentads,
    farming: term.farming,
    custom: term.custom,
    food: term.food,
    poem: term.poem,
    proverb: term.proverb,
  }
}

export function getLocalizedTermByIndex(index: number, locale: Locale): LocalizedTerm {
  const base = SOLAR_TERMS[index]
  if (!base) throw new Error(`Unknown solar term index: ${index}`)
  return getLocalizedTerm(base, locale)
}

export function getLocalizedTerms(locale: Locale): LocalizedTerm[] {
  return SOLAR_TERMS.map((term) => getLocalizedTerm(term, locale))
}

export function getTermName(index: number, locale: Locale): string {
  const chinese = SOLAR_TERMS[index]
  if (!chinese) return ''
  return locale === 'en' ? TERM_NAMES_EN[index] : chinese.name
}

export function getTermNativeName(index: number, locale: Locale): string {
  const chinese = SOLAR_TERMS[index]
  if (!chinese) return ''
  return locale === 'en' ? (EN_BY_INDEX.get(index)?.nameZh ?? chinese.name) : chinese.name
}

export function getSeasonName(season: Season, locale: Locale): string {
  return SEASON_LABEL[locale][season]
}

export function getSeasonMeta(season: Season) {
  return SEASON_META[season]
}

export function getHistoryIntro(locale: Locale): string {
  return locale === 'en' ? HISTORY_INTRO_EN : HISTORY_INTRO
}

export function getCultureIntro(locale: Locale): string {
  return locale === 'en' ? CULTURE_INTRO_EN : CULTURE_INTRO
}

export function getScienceIntro(locale: Locale): string {
  return locale === 'en' ? SCIENCE_INTRO_EN : SCIENCE_INTRO
}

export function getLocalizedHistory(locale: Locale): LocalizedHistoryEvent[] {
  return locale === 'en'
    ? HISTORY_EN_NORMALIZED
    : HISTORY_TIMELINE.map((event: HistoryEvent) => ({ ...event }))
}

export function getLocalizedCulture(locale: Locale): CultureAspect[] {
  return locale === 'en'
    ? (CULTURE_ASPECTS_EN as CultureAspect[])
    : CULTURE_ASPECTS
}

export function getLocalizedScience(locale: Locale): LocalizedScienceFaq[] {
  if (locale === 'en') return SCIENCE_EN_NORMALIZED
  return SCIENCE_FAQ.map((faq: ScienceFaq) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    keyPoints: faq.keyPoints,
  }))
}

export function getLocalizedSongLines(
  locale: Locale,
  zhLines: readonly SongLine[],
): readonly SongLine[] {
  if (locale !== 'en') return zhLines
  return zhLines.map((line, lineIndex) => {
    const enLine = SONG_LINES_EN[lineIndex]
    return {
      ...line,
      summary: enLine?.summary.replace(/\*\*/g, '') ?? line.summary,
      chars: line.chars.map((cell, charIndex) => ({
        ...cell,
        gloss: enLine?.chars[charIndex]?.gloss.replace(/\*\*/g, '') ?? cell.gloss,
      })),
    }
  })
}
