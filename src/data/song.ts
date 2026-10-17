import type { SongLine } from './types.ts'

/**
 * 常见七言四句《二十四节气歌》。
 *
 * 全歌 28 个字，其中 24 个位置依次对应二十四节气，余下 4 个是衬字。
 * 映射严格按「位置」而非按字面：第一、四字都是「春」，分别指立春与春分；
 * 两句中的「夏」「冬」，以及两个「雪」，也都按所在位置区分。
 *
 * 第二句以「连」承接「暑相连」，在此作为大暑的点击位置；第三句以「霜」
 * 代表「霜降」；句末的「天」「相」「降」「寒」是衬字。
 */
export const SONG_LINES: readonly SongLine[] = [
  {
    id: 'spring',
    season: '春',
    text: '春雨惊春清谷天',
    summary: '立春、雨水、惊蛰、春分、清明、谷雨。句末「天」为七言押韵的衬字。',
    chars: [
      { char: '春', pinyin: 'chūn', termIndex: 0, gloss: '首位「春」指立春。' },
      { char: '雨', pinyin: 'yǔ', termIndex: 1, gloss: '「雨」指雨水。' },
      { char: '惊', pinyin: 'jīng', termIndex: 2, gloss: '「惊」指惊蛰。' },
      { char: '春', pinyin: 'chūn', termIndex: 3, gloss: '这里第二个「春」指春分，不是立春。' },
      { char: '清', pinyin: 'qīng', termIndex: 4, gloss: '「清」指清明。' },
      { char: '谷', pinyin: 'gǔ', termIndex: 5, gloss: '「谷」指谷雨。' },
      { char: '天', pinyin: 'tiān', termIndex: null, gloss: '衬字，不单独代表节气。' },
    ],
  },
  {
    id: 'summer',
    season: '夏',
    text: '夏满芒夏暑相连',
    summary: '立夏、小满、芒种、夏至、小暑、大暑。「暑相连」写小暑之后紧接着大暑。',
    chars: [
      { char: '夏', pinyin: 'xià', termIndex: 6, gloss: '首位「夏」指立夏。' },
      { char: '满', pinyin: 'mǎn', termIndex: 7, gloss: '「满」指小满。' },
      { char: '芒', pinyin: 'máng', termIndex: 8, gloss: '「芒」指芒种。' },
      { char: '夏', pinyin: 'xià', termIndex: 9, gloss: '这里第二个「夏」指夏至，不是立夏。' },
      { char: '暑', pinyin: 'shǔ', termIndex: 10, gloss: '「暑」指小暑。' },
      { char: '相', pinyin: 'xiāng', termIndex: null, gloss: '与末字「连」组成「相连」，本身为衬字。' },
      {
        char: '连',
        pinyin: 'lián',
        termIndex: 11,
        gloss: '「暑相连」指小暑之后紧接大暑；本页在此位置映射大暑。',
      },
    ],
  },
  {
    id: 'autumn',
    season: '秋',
    text: '秋处露秋寒霜降',
    summary: '立秋、处暑、白露、秋分、寒露、霜降。句末「降」与「霜」合成「霜降」。',
    chars: [
      { char: '秋', pinyin: 'qiū', termIndex: 12, gloss: '首位「秋」指立秋。' },
      { char: '处', pinyin: 'chǔ', termIndex: 13, gloss: '「处」指处暑。' },
      { char: '露', pinyin: 'lù', termIndex: 14, gloss: '「露」指白露。' },
      { char: '秋', pinyin: 'qiū', termIndex: 15, gloss: '这里第二个「秋」指秋分，不是立秋。' },
      { char: '寒', pinyin: 'hán', termIndex: 16, gloss: '「寒」指寒露。' },
      { char: '霜', pinyin: 'shuāng', termIndex: 17, gloss: '「霜」与末字「降」合成霜降。' },
      { char: '降', pinyin: 'jiàng', termIndex: null, gloss: '与「霜」组成「霜降」，本页作为衬字。' },
    ],
  },
  {
    id: 'winter',
    season: '冬',
    text: '冬雪雪冬小大寒',
    summary: '立冬、小雪、大雪、冬至、小寒、大寒。两个「雪」与两个「冬」也须按位置区分。',
    chars: [
      { char: '冬', pinyin: 'dōng', termIndex: 18, gloss: '首位「冬」指立冬。' },
      { char: '雪', pinyin: 'xuě', termIndex: 19, gloss: '第一个「雪」指小雪。' },
      { char: '雪', pinyin: 'xuě', termIndex: 20, gloss: '第二个「雪」指大雪，不是小雪。' },
      { char: '冬', pinyin: 'dōng', termIndex: 21, gloss: '这里第二个「冬」指冬至，不是立冬。' },
      { char: '小', pinyin: 'xiǎo', termIndex: 22, gloss: '「小」与末字「寒」合成小寒。' },
      { char: '大', pinyin: 'dà', termIndex: 23, gloss: '「大」与末字「寒」合成大寒。' },
      { char: '寒', pinyin: 'hán', termIndex: null, gloss: '与「小」「大」分别合成小寒、大寒，此处作为衬字。' },
    ],
  },
] as const

export const SONG_TERM_SEQUENCE: readonly number[] = SONG_LINES.flatMap((line) =>
  line.chars.map((cell) => cell.termIndex).filter((index): index is number => index !== null),
)
