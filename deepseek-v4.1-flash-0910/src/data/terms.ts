/**
 * 二十四节气基础表（顺序、名称、太阳黄经、季节）
 *
 * 黄经定义：以太阳地心视黄经为准
 *   春分 0°、清明 15°、谷雨 30°、立夏 45° …… 相邻节气相差 15°。
 * 立春为一年中的第一个节气，其黄经为 315°。
 *
 * 这张表是**天文与命名的事实来源**，与语言无关：中英文名称都放在这里，
 * 避免另开一张对照表日后走样。气候、物候等长文内容见 termDetails.ts（中文）
 * 与 en/termDetails.ts（英文）。
 *
 * 英文名采用二十四节气申遗与对外传播中的通行译法。
 */

export type Season = '春' | '夏' | '秋' | '冬'

export interface TermBase {
  /** 0 = 立春 … 23 = 大寒 */
  index: number
  name: string
  /** 英文名称（通行译法） */
  nameEn: string
  /** 太阳地心视黄经（度，0—345） */
  longitude: number
  season: Season
  /** 是否为「分至」四大气节点 */
  major: boolean
  pinyin: string
}

export const TERMS: readonly TermBase[] = [
  { index: 0, name: '立春', nameEn: 'Beginning of Spring', longitude: 315, season: '春', major: false, pinyin: 'lì chūn' },
  { index: 1, name: '雨水', nameEn: 'Rain Water', longitude: 330, season: '春', major: false, pinyin: 'yǔ shuǐ' },
  { index: 2, name: '惊蛰', nameEn: 'Awakening of Insects', longitude: 345, season: '春', major: false, pinyin: 'jīng zhé' },
  { index: 3, name: '春分', nameEn: 'Spring Equinox', longitude: 0, season: '春', major: true, pinyin: 'chūn fēn' },
  { index: 4, name: '清明', nameEn: 'Pure Brightness', longitude: 15, season: '春', major: false, pinyin: 'qīng míng' },
  { index: 5, name: '谷雨', nameEn: 'Grain Rain', longitude: 30, season: '春', major: false, pinyin: 'gǔ yǔ' },
  { index: 6, name: '立夏', nameEn: 'Beginning of Summer', longitude: 45, season: '夏', major: false, pinyin: 'lì xià' },
  { index: 7, name: '小满', nameEn: 'Grain Buds', longitude: 60, season: '夏', major: false, pinyin: 'xiǎo mǎn' },
  { index: 8, name: '芒种', nameEn: 'Grain in Ear', longitude: 75, season: '夏', major: false, pinyin: 'máng zhòng' },
  { index: 9, name: '夏至', nameEn: 'Summer Solstice', longitude: 90, season: '夏', major: true, pinyin: 'xià zhì' },
  { index: 10, name: '小暑', nameEn: 'Minor Heat', longitude: 105, season: '夏', major: false, pinyin: 'xiǎo shǔ' },
  { index: 11, name: '大暑', nameEn: 'Major Heat', longitude: 120, season: '夏', major: false, pinyin: 'dà shǔ' },
  { index: 12, name: '立秋', nameEn: 'Beginning of Autumn', longitude: 135, season: '秋', major: false, pinyin: 'lì qiū' },
  { index: 13, name: '处暑', nameEn: 'End of Heat', longitude: 150, season: '秋', major: false, pinyin: 'chǔ shǔ' },
  { index: 14, name: '白露', nameEn: 'White Dew', longitude: 165, season: '秋', major: false, pinyin: 'bái lù' },
  { index: 15, name: '秋分', nameEn: 'Autumn Equinox', longitude: 180, season: '秋', major: true, pinyin: 'qiū fēn' },
  { index: 16, name: '寒露', nameEn: 'Cold Dew', longitude: 195, season: '秋', major: false, pinyin: 'hán lù' },
  { index: 17, name: '霜降', nameEn: "Frost's Descent", longitude: 210, season: '秋', major: false, pinyin: 'shuāng jiàng' },
  { index: 18, name: '立冬', nameEn: 'Beginning of Winter', longitude: 225, season: '冬', major: false, pinyin: 'lì dōng' },
  { index: 19, name: '小雪', nameEn: 'Minor Snow', longitude: 240, season: '冬', major: false, pinyin: 'xiǎo xuě' },
  { index: 20, name: '大雪', nameEn: 'Major Snow', longitude: 255, season: '冬', major: false, pinyin: 'dà xuě' },
  { index: 21, name: '冬至', nameEn: 'Winter Solstice', longitude: 270, season: '冬', major: true, pinyin: 'dōng zhì' },
  { index: 22, name: '小寒', nameEn: 'Minor Cold', longitude: 285, season: '冬', major: false, pinyin: 'xiǎo hán' },
  { index: 23, name: '大寒', nameEn: 'Major Cold', longitude: 300, season: '冬', major: false, pinyin: 'dà hán' },
] as const

/** 由黄经查节气基础信息 */
export const TERM_BY_LONGITUDE: ReadonlyMap<number, TermBase> = new Map(
  TERMS.map((t) => [t.longitude, t]),
)

/** 由中文名查节气基础信息 */
export const TERM_BY_NAME: ReadonlyMap<string, TermBase> = new Map(TERMS.map((t) => [t.name, t]))

/** 由英文名查节气基础信息 */
export const TERM_BY_NAME_EN: ReadonlyMap<string, TermBase> = new Map(
  TERMS.map((t) => [t.nameEn, t]),
)
