/**
 * 二十四节气歌（通行四句版本）及其逐字映射
 *
 *   春雨惊春清谷天，
 *   夏满芒夏暑相连。
 *   秋处露秋寒霜降，
 *   冬雪雪冬小大寒。
 *
 * 说明：歌诀为了押韵与字数整齐，用了衬字，并且同一个字在不同位置
 * 代表不同节气（例如第 1 字与第 4 字都是「春」，但分别指立春与春分；
 * 两句里的「夏」分别指立夏与夏至；两个「雪」分别指小雪与大雪）。
 * 因此下面的映射是**按位置**逐一给出的，共 24 个节气位、4 个衬字位。
 */

export type Season = '春' | '夏' | '秋' | '冬'

export interface SongChar {
  /** 歌诀中的一个字 */
  char: string
  /** 该字的汉语拼音（带声调）—— 中英文版共用这一份，避免两处走样 */
  pinyin: string
  /** 对应节气 index（0 立春 … 23 大寒）；null 表示衬字，不对应节气 */
  termIndex: number | null
  /** 该字与节气名的对应说明 */
  gloss: string
}

export interface SongLine {
  /** 整句歌诀 */
  text: string
  /** 所属季节 */
  season: Season
  /** 逐句解释 */
  summary: string
  chars: SongChar[]
}

export const SONG_LINES: readonly SongLine[] = [
  {
    text: '春雨惊春清谷天',
    season: '春',
    summary:
      '这一句唱的是春季六个节气：立春、雨水、惊蛰、春分、清明、谷雨。句中的「天」只是为凑足七字、押韵顺口的衬字，并不代表节气。',
    chars: [
      { char: '春', pinyin: 'chūn', termIndex: 0, gloss: '「春」在首位，指春季开始的**立春**。' },
      { char: '雨', pinyin: 'yǔ', termIndex: 1, gloss: '「雨」指降水渐多的**雨水**。' },
      { char: '惊', pinyin: 'jīng', termIndex: 2, gloss: '「惊」指春雷始鸣、蛰虫惊动的**惊蛰**。' },
      { char: '春', pinyin: 'chūn', termIndex: 3, gloss: '此处第二个「春」指昼夜平分的**春分**，与首字的立春不同。' },
      { char: '清', pinyin: 'qīng', termIndex: 4, gloss: '「清」指天清地明的**清明**。' },
      { char: '谷', pinyin: 'gǔ', termIndex: 5, gloss: '「谷」指雨生百谷的**谷雨**。' },
      { char: '天', pinyin: 'tiān', termIndex: null, gloss: '「天」是押韵衬字，没有对应的节气。' },
    ],
  },
  {
    text: '夏满芒夏暑相连',
    season: '夏',
    summary:
      '这一句唱的是夏季六个节气：立夏、小满、芒种、夏至、小暑、大暑。「暑相连」提示小暑、大暑两个带「暑」字的节气紧接而来。',
    chars: [
      { char: '夏', pinyin: 'xià', termIndex: 6, gloss: '「夏」在首位，指夏季开始的**立夏**。' },
      { char: '满', pinyin: 'mǎn', termIndex: 7, gloss: '「满」指夏熟作物籽粒渐满的**小满**。' },
      { char: '芒', pinyin: 'máng', termIndex: 8, gloss: '「芒」指有芒作物成熟、忙种忙收的**芒种**。' },
      { char: '夏', pinyin: 'xià', termIndex: 9, gloss: '此处第二个「夏」指白昼最长的**夏至**，与首字的立夏不同。' },
      { char: '暑', pinyin: 'shǔ', termIndex: 10, gloss: '「暑」指天气开始炎热的**小暑**。' },
      { char: '相', pinyin: 'xiāng', termIndex: null, gloss: '「相连」是连接语，本身不是节气名。' },
      { char: '连', pinyin: 'lián', termIndex: 11, gloss: '「连」承接「暑相连」，指紧接小暑而来的**大暑**。' },
    ],
  },
  {
    text: '秋处露秋寒霜降',
    season: '秋',
    summary:
      '这一句唱的是秋季六个节气：立秋、处暑、白露、秋分、寒露、霜降。末字「降」与前面的「霜」合成节气名「霜降」。',
    chars: [
      { char: '秋', pinyin: 'qiū', termIndex: 12, gloss: '「秋」在首位，指秋季开始的**立秋**。' },
      { char: '处', pinyin: 'chǔ', termIndex: 13, gloss: '「处」是终止、躲藏之意，指暑气到此为止的**处暑**。' },
      { char: '露', pinyin: 'lù', termIndex: 14, gloss: '「露」指夜凉结露、露色转白的**白露**。' },
      { char: '秋', pinyin: 'qiū', termIndex: 15, gloss: '此处第二个「秋」指昼夜再次平分的**秋分**，与首字的立秋不同。' },
      { char: '寒', pinyin: 'hán', termIndex: 16, gloss: '「寒」指露水已寒的**寒露**。' },
      { char: '霜', pinyin: 'shuāng', termIndex: 17, gloss: '「霜」与下一字合成**霜降**。' },
      { char: '降', pinyin: 'jiàng', termIndex: null, gloss: '「降」本身不单独代表节气，它与前面的「霜」组成节气名「霜降」（「降」读 jiàng，指降霜）。' },
    ],
  },
  {
    text: '冬雪雪冬小大寒',
    season: '冬',
    summary:
      '这一句唱的是冬季六个节气：立冬、小雪、大雪、冬至、小寒、大寒。两个「雪」分别指小雪与大雪，末字「寒」与前面的「小」「大」分别合成小寒、大寒。',
    chars: [
      { char: '冬', pinyin: 'dōng', termIndex: 18, gloss: '「冬」在首位，指冬季开始的**立冬**。' },
      { char: '雪', pinyin: 'xuě', termIndex: 19, gloss: '第一个「雪」指开始降雪的**小雪**。' },
      { char: '雪', pinyin: 'xuě', termIndex: 20, gloss: '第二个「雪」指降雪增多的**大雪**，与前面的小雪不同。' },
      { char: '冬', pinyin: 'dōng', termIndex: 21, gloss: '此处第二个「冬」指白昼最短的**冬至**，与首字的立冬不同。' },
      { char: '小', pinyin: 'xiǎo', termIndex: 22, gloss: '「小」指天气渐冷的**小寒**。' },
      { char: '大', pinyin: 'dà', termIndex: 23, gloss: '「大」指一年中最冷的**大寒**。' },
      { char: '寒', pinyin: 'hán', termIndex: null, gloss: '「寒」本身不单独代表节气，它与前面的「小」「大」分别组成「小寒」「大寒」。' },
    ],
  },
] as const

/** 歌诀中按顺序出现的 24 个节气 index（用于校验映射完整性） */
export const SONG_TERM_SEQUENCE: readonly number[] = SONG_LINES.flatMap((line) =>
  line.chars.map((c) => c.termIndex).filter((i): i is number => i !== null),
)
