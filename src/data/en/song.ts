/**
 * The Song of the 24 Solar Terms — English edition
 *
 * 这首歌诀是**汉字助记口诀**，翻译成英文就失去了它作为助记手段的意义。
 * 因此英文版保留汉字原文（那才是重点），另配拼音与英文解释；
 * 字与节气的对应关系来自 `../song.ts`，本文件只负责语言。
 *
 * 注意：同一个字在不同位置代表不同节气 —— 第 1 字与第 4 字都是「春」，
 * 但分别指立春与春分；两个「雪」分别指小雪与大雪。英文解释必须按位置写清楚。
 */

export interface SongCharEn {
  /** 该字与节气名的对应说明（拼音统一取自 ../song.ts，此处不再重复） */
  gloss: string
}

export interface SongLineEn {
  /** 整句（汉字原文，与中文版一致） */
  text: string
  /** 逐句解释 */
  summary: string
  chars: SongCharEn[]
}

export const SONG_LINES_EN: readonly SongLineEn[] = [
  {
    text: '春雨惊春清谷天',
    summary:
      'The first line names the six spring terms: Beginning of Spring (立春), Rain Water (雨水), Awakening of Insects (惊蛰), Spring Equinox (春分), Pure Brightness (清明) and Grain Rain (谷雨). The final character 天 ("sky") is only there to pad the line to seven characters and make it scan — it names no term.',
    chars: [
      { gloss: '春 comes first, standing for **Beginning of Spring (立春)**, the start of spring.' },
      { gloss: '雨 ("rain") stands for **Rain Water (雨水)**, when rain becomes more frequent.' },
      { gloss: '惊 ("startle") stands for **Awakening of Insects (惊蛰)**, when spring thunder rouses the hibernating insects.' },
      { gloss: 'This second 春 means **Spring Equinox (春分)**, when day and night are equal — not the Beginning of Spring at the head of the line.' },
      { gloss: '清 ("clear") stands for **Pure Brightness (清明)**, when the skies clear and the land turns green.' },
      { gloss: '谷 ("grain") stands for **Grain Rain (谷雨)**, the rain that brings the grain on.' },
      { gloss: '天 ("sky") is a filler character added for rhyme. It names no solar term.' },
    ],
  },
  {
    text: '夏满芒夏暑相连',
    summary:
      'The second line names the six summer terms: Beginning of Summer (立夏), Grain Buds (小满), Grain in Ear (芒种), Summer Solstice (夏至), Minor Heat (小暑) and Major Heat (大暑). “暑相连” — “the heats come one after another” — is a reminder that the two heat terms arrive back to back.',
    chars: [
      { gloss: '夏 comes first, standing for **Beginning of Summer (立夏)**, the start of summer.' },
      { gloss: '满 ("full") stands for **Grain Buds (小满)**, when the summer grain is filling out but not yet ripe.' },
      { gloss: '芒 ("awn") stands for **Grain in Ear (芒种)**, when awned crops ripen and planting and harvesting overlap.' },
      { gloss: 'This second 夏 means **Summer Solstice (夏至)**, the longest day — not the Beginning of Summer at the head of the line.' },
      { gloss: '暑 ("heat") stands for **Minor Heat (小暑)**, when the weather turns genuinely hot.' },
      { gloss: '相 ("one another") is part of the phrase 相连, “linked together” — it is not a term name.' },
      { gloss: '连 ("linked") carries on from 暑相连 and stands for **Major Heat (大暑)**, which follows hard on Minor Heat.' },
    ],
  },
  {
    text: '秋处露秋寒霜降',
    summary:
      'The third line names the six autumn terms: Beginning of Autumn (立秋), End of Heat (处暑), White Dew (白露), Autumn Equinox (秋分), Cold Dew (寒露) and Frost’s Descent (霜降). The last character 降 joins with 霜 in front of it to spell the name 霜降.',
    chars: [
      { gloss: '秋 comes first, standing for **Beginning of Autumn (立秋)**, the start of autumn.' },
      { gloss: '处 means “to end, to withdraw” — it stands for **End of Heat (处暑)**, when the heat comes to a stop.' },
      { gloss: '露 ("dew") stands for **White Dew (白露)**, when cool nights bring dew that turns white.' },
      { gloss: 'This second 秋 means **Autumn Equinox (秋分)**, when day and night are equal again — not the Beginning of Autumn at the head of the line.' },
      { gloss: '寒 ("cold") stands for **Cold Dew (寒露)**, when the dew turns cold.' },
      { gloss: '霜 ("frost") joins with the next character to spell **Frost’s Descent (霜降)**.' },
      { gloss: '降 ("descend") does not name a term on its own — it completes the name 霜降 (frost descending) with the 霜 before it.' },
    ],
  },
  {
    text: '冬雪雪冬小大寒',
    summary:
      'The fourth line names the six winter terms: Beginning of Winter (立冬), Minor Snow (小雪), Major Snow (大雪), Winter Solstice (冬至), Minor Cold (小寒) and Major Cold (大寒). The two 雪 mean Minor Snow and Major Snow respectively; the closing 寒 joins with 小 and 大 before it to spell 小寒 and 大寒.',
    chars: [
      { gloss: '冬 comes first, standing for **Beginning of Winter (立冬)**, the start of winter.' },
      { gloss: 'The first 雪 stands for **Minor Snow (小雪)**, when snow begins to fall.' },
      { gloss: 'The second 雪 stands for **Major Snow (大雪)**, when snowfall increases — a different term from the Minor Snow before it.' },
      { gloss: 'This second 冬 means **Winter Solstice (冬至)**, the shortest day — not the Beginning of Winter at the head of the line.' },
      { gloss: '小 ("minor") stands for **Minor Cold (小寒)**, when the weather grows cold.' },
      { gloss: '大 ("major") stands for **Major Cold (大寒)**, the coldest stretch of the year.' },
      { gloss: '寒 ("cold") does not name a term on its own — it forms 小寒 and 大寒 together with the 小 and 大 before it.' },
    ],
  },
] as const
