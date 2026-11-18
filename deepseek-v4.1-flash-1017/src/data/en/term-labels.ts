import type { Season } from '../types.ts'

/** 与 TERM_DETAILS_EN 的完整英文名保持一致；用于详情、列表与无障碍名称。 */
export const TERM_NAMES_EN: readonly string[] = [
  'Beginning of Spring',
  'Rain Water',
  'Awakening of Insects',
  'Spring Equinox',
  'Pure Brightness',
  'Grain Rain',
  'Beginning of Summer',
  'Grain Buds',
  'Grain in Ear',
  'Summer Solstice',
  'Minor Heat',
  'Major Heat',
  'Beginning of Autumn',
  'End of Heat',
  'White Dew',
  'Autumn Equinox',
  'Cold Dew',
  "Frost's Descent",
  'Beginning of Winter',
  'Minor Snow',
  'Major Snow',
  'Winter Solstice',
  'Minor Cold',
  'Major Cold',
]

export const SEASON_LABELS_EN: Record<Season, string> = {
  春: 'Spring',
  夏: 'Summer',
  秋: 'Autumn',
  冬: 'Winter',
}

export const SEASON_OPPOSITE_EN: Record<Season, Season> = {
  春: '秋',
  夏: '冬',
  秋: '春',
  冬: '夏',
}
