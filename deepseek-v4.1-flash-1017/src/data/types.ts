export type Season = '春' | '夏' | '秋' | '冬'

export interface TermPoem {
  text: string
  author: string
  source: string
}

export interface SolarTerm {
  /** 0 = 立春，23 = 大寒，按传统顺序 */
  index: number
  name: string
  pinyin: string
  /** 太阳地心视黄经，单位度 */
  longitude: number
  season: Season
  major: boolean
  meaning: string
  climate: string
  phenology: string
  pentads: [string, string, string]
  farming: string
  custom: string
  food: string
  poem: TermPoem
  proverb: string
}

export interface TermOccurrence {
  term: SolarTerm
  /** 交节瞬间的 Unix 毫秒（UTC） */
  ms: number
}

export interface ActiveTermWindow {
  current: TermOccurrence
  next: TermOccurrence
  progress: number
  elapsedMs: number
  remainingMs: number
}

export interface SolarSnapshot {
  sunLongitude: number
  sunDistanceAU: number
  declination: number
  subsolarLongitude: number
  isNorthward: boolean
}

export interface HistoryEvent {
  id: string
  era: string
  year: string
  title: string
  detail: string
  source: string
}

export interface CultureAspect {
  id: string
  icon: string
  title: string
  summary: string
  examples: string[]
}

export interface ScienceFaq {
  id: string
  question: string
  answer: string
  keyPoints: string[]
}

export interface SourceRef {
  id: string
  title: string
  publisher?: string
  url?: string
  note?: string
  group: '历法与天文' | '历史与非遗' | '技术与图像'
}

export interface SongCell {
  char: string
  pinyin: string
  /** null 表示衬字 */
  termIndex: number | null
  gloss: string
}

export interface SongLine {
  id: string
  season: Season
  text: string
  summary: string
  chars: SongCell[]
}
