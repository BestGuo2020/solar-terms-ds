/**
 * The 24 Solar Terms · Historical origins (English edition)
 *
 * Timeline in chronological order. Eras, titles of sources, persons and figures
 * have been checked against published literature.
 * Where scholars still disagree (for example the date of composition of the
 * "Canon of Yao" in the Shangshu, or the criteria for calling a solar term name
 * "first attested"), the wording in `detail` stays cautious and does not treat
 * legend as historical fact.
 *
 * `id` values are copied verbatim from the Chinese source file so that the two
 * editions can be aligned entry by entry.
 */

export interface HistoryEventEn {
  id: string // short kebab-case id, identical to the Chinese source
  era: string // era label, e.g. 'Shang–Zhou', 'Warring States', 'Western Han', 'Yuan', 'Contemporary'
  year: string // displayed date, e.g. 'c. 11th century BCE', '104 BCE', '1281', '2016'
  title: string // headline of 8–16 words
  detail: string // explanation of roughly 55–110 words
  source?: string // key source, e.g. 'Zhouli (Rites of Zhou), "Diguan–Dasitu"（《周礼·地官·大司徒》）'
}

export const HISTORY_TIMELINE_EN: HistoryEventEn[] = [
  {
    id: 'gnomon-shadow',
    era: 'Shang–Zhou',
    year: 'c. 11th century BCE onwards',
    title: 'Measuring noon shadows to fix the two solstices',
    detail:
      'In Shang and Zhou times people already knew how to set up a vertical pole (the biao, 表) and measure the length of its noon shadow with a horizontal scale laid on the ground (the gui, 圭). The day with the longest shadow was taken as the Winter Solstice, the day with the shortest as the Summer Solstice. The Zhouli records the practice of "using the earth-gnomon method to measure the depth of the earth and rectify the sun’s shadow", which shows that by the Western Zhou at the latest, fixing the two solstices by shadow measurement was a technique held at state level.',
    source: 'Zhouli (Rites of Zhou), "Diguan–Dasitu"（《周礼·地官·大司徒》）',
  },
  {
    id: 'yaodian-four-seasons',
    era: 'Western Zhou',
    year: 'c. 10th–8th century BCE',
    title: 'The Canon of Yao fixes the four seasons by stars',
    detail:
      'The "Canon of Yao" in the Shangshu describes the four seasons in four star groups. "The day is of medium length, the star is Bird" and "the night is of medium length, the star is Xu" mark the dusks of equal day and night, at mid-spring and mid-autumn; "the day is longest, the star is Fire" marks the longest day, at mid-summer, when Fire is seen at dusk; "the day is shortest, the star is Mao" marks the shortest day, at mid-winter, when Mao is seen at dusk. This is the earliest surviving documentary clue to fixing the four seasons by stars. Scholars still disagree about when the received "Canon of Yao" was compiled.',
    source: 'Shangshu (Book of Documents), "Canon of Yao"（《尚书·尧典》）',
  },
  {
    id: 'spring-autumn-two-solsices',
    era: 'Spring and Autumn period',
    year: '655 BCE',
    title: 'The two equinoxes and two solstices become determinable',
    detail:
      'The Zuo Zhuan to the Spring and Autumn Annals (Duke Xi, year 5) notes: "In the fifth year, spring, royal first month, on the xinhai day, the first of the month, the sun reached its southernmost point." "The sun reaching its southernmost point" is the Winter Solstice — the longest noon shadow, when the sun is at its southern extreme. With the Summer Solstice of the shortest shadow and the Spring and Autumn Equinoxes of equal day and night, people of the Spring and Autumn period could already fix four key nodes. Their calculations were not yet precise, though: later scholars note that such records often fall two or three days ahead of the actual term.',
    source: 'Zuo Zhuan to the Spring and Autumn Annals, Duke Xi, year 5（《春秋左传·僖公五年》）',
  },
  {
    id: 'eight-terms-fen-zhi-qi-bi',
    era: 'Spring and Autumn period',
    year: '655 BCE',
    title: 'Eight seasonal nodes: the equinoxes, solstices and season beginnings',
    detail:
      'The Zuo Zhuan, again under the fifth year of Duke Xi, says: "Whenever there is a fen, a zhi, a qi or a bi, the colours of the clouds and the appearances of things must be recorded," so that provision could be made against famine. Fen and zhi are the Spring and Autumn Equinoxes and the Summer and Winter Solstices; qi and bi are the Beginnings of Spring, Summer, Autumn and Winter (lichun, lixia, liqiu and lidong, 立春、立夏、立秋、立冬). Taken together, the four come to exactly eight seasonal nodes, which shows that by the Spring and Autumn period the nodes being observed and recorded had grown from four to eight.',
    source: 'Zuo Zhuan to the Spring and Autumn Annals, Duke Xi, year 5（《春秋左传·僖公五年》）',
  },
  {
    id: 'lvshi-chunqiu-eight-terms',
    era: 'Warring States',
    year: 'c. 239 BCE',
    title: 'The Lüshi Chunqiu records a complete set of eight terms',
    detail:
      'Compiled at the end of the Warring States period, the Lüshi Chunqiu arranges celestial phenomena, phenology and government ordinances month by month in its "Twelve Annals". Eight solar term names already appear: the Beginnings of Spring, Summer, Autumn and Winter (lichun, lixia, liqiu and lidong), together with "day and night divided" (the Spring and Autumn Equinoxes) in mid-spring and mid-autumn, "the day reaches its longest" (the Summer Solstice) in mid-summer, and "the day reaches its shortest" (the Winter Solstice) in mid-winter. It also notes phenological signs such as the east wind thawing the ice and hibernating insects beginning to stir, but it does not yet list all twenty-four names.',
    source: 'Lüshi Chunqiu, "Twelve Annals"（《吕氏春秋·十二纪》）',
  },
  {
    id: 'huainanzi-first-full-list',
    era: 'Western Han',
    year: 'c. 139 BCE',
    title: 'The twenty-four solar terms appear in full for the first time',
    detail:
      'The "Tianwenxun" chapter of the Huainanzi, compiled under the direction of Liu An, King of Huainan, records the names of all twenty-four solar terms in full for the first time, arranged with the Winter Solstice as the starting point: Winter Solstice, Minor Cold, Major Cold, the Beginning of Spring, Rain Water, Awakening of Insects, the Spring Equinox, Pure Brightness, Grain Rain, and so on through Minor Snow and Major Snow. The book also locates each term by the direction of the handle of the Dipper, the degrees of the twenty-eight lunar mansions and the twelve pitch pipes, binding the solar terms firmly to astronomical observation.',
    source: 'Huainanzi, "Tianwenxun"（《淮南子·天文训》）',
  },
  {
    id: 'taichu-calendar',
    era: 'Western Han',
    year: '104 BCE',
    title: 'The Taichu Calendar writes the terms into the calendar',
    detail:
      'In the first year of the Taichu era of Emperor Wu of Han (104 BCE), the Taichu Calendar, drawn up by Deng Ping, Luoxia Hong and others, was formally promulgated. It was the first time the twenty-four solar terms were written into a state calendar: each term was given its astronomical position, and any month containing no "mid-term" (zhongqi, 中气) was declared a leap month following the month before it. This intercalation rule was carried on by later calendars and became the basic principle by which the Chinese lunisolar calendar places its leap months.',
    source: 'Taichu Calendar（《太初历》）',
  },
  {
    id: 'shoushi-calendar',
    era: 'Yuan',
    year: '1281',
    title: 'The Shoushi Calendar refines the length of the tropical year',
    detail:
      'Kublai Khan, Emperor Shizu of Yuan, ordered Xu Heng, Guo Shoujing, Wang Xun and others to reform the calendar. They set up observation posts in many parts of the country and measured the heavens directly; the Shoushi Calendar was completed in 1280 and came into use from 1281. It set one tropical year at 365.2425 days, only about 26 seconds away from the value measured today, matching the accuracy of the current Gregorian calendar more than three centuries earlier, and it provided a more reliable time base for computing the solar terms.',
    source: 'Shoushi Calendar（《授时历》）',
  },
  {
    id: 'shixian-calendar-fixed-qi',
    era: 'Qing',
    year: '1645',
    title: 'From the "flat-qi" method to the "fixed-qi" method',
    detail:
      'The Shixian Calendar, promulgated in the second year of the Shunzhi reign (1645), adopted the "fixed-qi" method (dingqi, 定气) for dating the calendar, which follows the sun’s actual motion: every 15° the sun travels along the ecliptic marks one solar term. This replaced the earlier "flat-qi" method (pingqi, 平气), which simply divided one tropical year into 24 equal parts. Because the Earth’s orbit around the sun is an ellipse and its speed varies, the number of days between neighbouring terms is no longer fixed once dingqi is used, while the moments of the terms come closer to the real astronomical events.',
    source: 'Shixian Calendar（《时宪历》）',
  },
  {
    id: 'national-ich-list',
    era: 'Contemporary',
    year: '2006',
    title: 'The twenty-four solar terms enter the national heritage list',
    detail:
      'In 2006 the "twenty-four solar terms of the traditional Chinese calendar" was included in the first batch of the national list of representative intangible cultural heritage items. In 2011 the Jiuhua Beginning of Spring rite, the "proclaiming spring and encouraging farming" ceremony and the Shiqian "speaking of spring" were added to the extended list for that item; in 2014 the Sanmen winter rite, the Zhuang Frost’s Descent festival, the Miao autumn-chasing festival and the Anren spring fair (ganfenshe, 赶分社) were added as well. These concrete seasonal rites turn the solar terms from calendrical knowledge into a visible, lived folk life.',
    source: 'China Intangible Cultural Heritage Network（中国非物质文化遗产网）',
  },
  {
    id: 'unesco-inscription',
    era: 'Contemporary',
    year: '2016',
    title: 'Inscribed on the Representative List of the Intangible Cultural Heritage of Humanity',
    detail:
      'On 30 November 2016, at the eleventh session of the Intergovernmental Committee for the Safeguarding of the Intangible Cultural Heritage, held in Addis Ababa, the capital of Ethiopia, the nomination submitted by China — "The Twenty-four Solar Terms, knowledge in China of time and practices developed through observation of the sun’s annual motion" — passed review and was formally inscribed on the UNESCO Representative List of the Intangible Cultural Heritage of Humanity.',
    source: 'UNESCO（联合国教科文组织）',
  },
  {
    id: 'beijing-2022-countdown',
    era: 'Contemporary',
    year: '2022',
    title: 'A solar-term countdown opens the Beijing Winter Olympics',
    detail:
      'On 4 February 2022 the XXIV Olympic Winter Games opened in Beijing, and the day happened to be the Beginning of Spring (lichun). The opening ceremony used the twenty-four solar terms as its countdown, counting from Rain Water all the way to the Beginning of Spring, and set the names of the terms alongside classical poetry and images of nature from every part of China, so that this ancient body of time knowledge was seen by audiences around the world.',
    source: 'Opening ceremony of the Beijing 2022 Winter Olympics（北京冬奥会开幕式）',
  },
  {
    id: 'living-heritage-today',
    era: 'Contemporary',
    year: '21st century',
    title: 'The solar terms keep growing in the present day',
    detail:
      'Today the solar terms serve both as a reference for farming and as a rhythm for daily life. The China Agricultural Museum leads work on safeguarding and passing on the twenty-four solar terms; localities rely on transmission bases to revive rites such as the Beginning of Spring ceremony, the winter rite and the Frost’s Descent festival; and exhibitions on solar-term themes, school programmes, cultural merchandise and solar-term calendars keep appearing. Farming proverbs such as "around Qingming, plant melons and beans" are still used in the fields.',
    source: 'China Agricultural Museum（中国农业博物馆）',
  },
]

export const HISTORY_INTRO_EN: string =
  'The twenty-four solar terms were not born on a single day: Chinese astronomers "measured" them out little by little over a very long time. At first people set up a pole and watched its shadow, fixing the Winter and Summer Solstices; then, from the stars and the length of day and night, they recognised the Spring and Autumn Equinoxes, completing eight terms. By the end of the Warring States period all eight were in place; in the Western Han the Huainanzi’s "Tianwenxun" chapter wrote down all twenty-four names in full for the first time, and in 104 BCE the Taichu Calendar entered them into the state calendar. Later calendars kept improving: the Shoushi Calendar of the Yuan computed the tropical year, and the Shixian Calendar of the Qing switched to the dingqi method, making the terms ever more accurate. In 2016 they were inscribed on the Representative List of the Intangible Cultural Heritage of Humanity.'
