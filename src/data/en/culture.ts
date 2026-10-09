/**
 * The 24 Solar Terms · Cultural value (English edition)
 *
 * Six aspects. Every entry in `examples` is a concrete example (a specific place,
 * a specific activity, a specific work or a specific practice).
 * National-level intangible cultural heritage items connected with the solar
 * terms follow the public introductions on the China Intangible Cultural
 * Heritage Network (ihchina.cn).
 *
 * `id` and `icon` values are copied verbatim from the Chinese source file.
 */

export interface CultureAspectEn {
  id: string
  icon: string // a single emoji
  title: string // 3–6 words
  summary: string // roughly 25–45 words
  examples: string[] // same number of items as the Chinese source, each roughly 25–55 words
}

export const CULTURE_INTRO_EN: string =
  'The solar terms were first created for farming, but they seeped into Chinese life far beyond the farming season. When to sow and when to harvest the wheat — look at the solar terms. When to eat spring pancakes and when to drink summer herbal tea — the solar terms again. Walking out among the green and sweeping the graves at Qingming, making offerings to the ancestors at the Winter Solstice, putting on autumn fat at the Beginning of Autumn — still the solar terms. They cut the year into twenty-four segments, each with a name, a phenology, a food and a ritual, and they have left behind poetry and prose, painting, seal carving and proverbs. In 2006 they entered the national intangible cultural heritage list, and in 2016 they became intangible cultural heritage of humanity. Today the solar terms are still a way of translating the rhythms of nature into everyday arrangements.'

export const CULTURE_ASPECTS_EN: CultureAspectEn[] = [
  {
    id: 'agriculture',
    icon: '🌾',
    title: 'A timetable for farm work',
    summary:
      'The earliest function of the solar terms was to guide the farming season. They translate the annual motion of the sun into a timetable for sowing, tending, harvesting and storing, and they are still an important reference for judging the rhythm of farm work in the countryside.',
    examples: [
      'Proverbs long in circulation — "around Qingming, plant melons and beans", "White Dew comes early, Cold Dew comes late, the Autumn Equinox is just the time to sow wheat" — tie the solar terms to specific stages of cultivation and distil experience that farmers accumulated over generations.',
      'Around Grain in Ear, winter wheat in the north enters the rush of the harvest while the south is busy transplanting rice: one end reaping, the other planting. The name "Grain in Ear" itself means "grain with awns may be sown", and this is the most intense stretch of the farming year.',
      'Around Awakening of Insects the temperature rises and the first spring thunder sounds, and spring ploughing and land preparation begin one after another on the North China Plain and in the Yangtze valley; around Frost’s Descent, crops that fear frost — sweet potatoes, radishes — have to be brought in quickly to prepare for the winter.',
    ],
  },
  {
    id: 'daily-life',
    icon: '🏮',
    title: 'A rhythm inside everyday life',
    summary:
      'The solar terms give daily life its time coordinates: when to count the nines of winter, when to change one’s clothes, when to walk out among the green and sweep the graves, when to make offerings to the ancestors and gather the family — all of it is written into the twenty-four terms.',
    examples: [
      'From the Winter Solstice people "count the nines", painting a "nine-nine cold-dispelling chart" and colouring one plum petal each day; when all eighty-one petals are filled in, spring has arrived. It is a clever way of breaking a long winter into countable days, and it is especially popular in the north.',
      'Qingming is both a solar term and a festival. In the lower Yangtze, besides sweeping the graves people go out among the green and fly kites; in many parts of the north the old Cold Food custom survives, with no fires lit and only cold food eaten on that day.',
      'At the Beginning of Autumn comes "putting on autumn fat": people in the north hold that the bitter summer leaves one thin, so on that day they eat braised or roast meat to build themselves up. The old saying "wrap up in spring, freeze in autumn" likewise reminds people not to hurry into thick clothes when the season turns.',
    ],
  },
  {
    id: 'food-health',
    icon: '🥟',
    title: 'Eating according to the solar terms',
    summary:
      'The Chinese table follows the solar terms: what to eat in which season rests both on what the land produces and on the idea of keeping the body in step with the climate, and it has left many fixed festival foods behind.',
    examples: [
      'At the Winter Solstice the north eats dumplings and the south eats glutinous rice balls, while in Sichuan and Chongqing people drink mutton soup. The day is regarded as "the birth of the first yang", and eating something hot is a shared concern everywhere.',
      'At Qingming the lower Yangtze eats qingtuan, bright green balls of glutinous rice flour made with mugwort or oat-grass juice; in the north, the legacy of Cold Food makes cold snacks such as fried dough twists the custom.',
      'At the Beginning of Summer the lower Yangtze has the custom of "weighing people", hanging a large steelyard under a tree to weigh each person, so that no one will grow thin over the summer; around Suzhou people also make a point of "tasting the three new things" — cherries, green plums and wheat.',
      'At Awakening of Insects people eat pears, held in the north to moisten dryness and clear internal heat; at Frost’s Descent they eat persimmons — "eat a persimmon at Frost’s Descent and your nose will not run," as the saying goes. There is also putting on autumn fat at the Beginning of Autumn, summer herbal tea at Major Heat, and "midsummer mutton" around Xuzhou at the start of the dog days.',
    ],
  },
  {
    id: 'literature-art',
    icon: '🖌️',
    title: 'Written into poetry, painting and calligraphy',
    summary:
      'The solar terms supplied a subject and a set of images that recur again and again. Poets wrote of the season, painters painted the New Year, seal carvers cut the names of the terms, and the terms also became a common framework for calendars, cultural merchandise and visual design.',
    examples: [
      '"Poems on the Twenty-four Qi", preserved in the Dunhuang manuscripts and formerly attributed to Yuan Zhen of the Tang, sings of each of the twenty-four solar terms in turn; Du Fu’s "Little Winter Solstice" — "the times and human affairs press on day by day; at the Winter Solstice yang is born and spring comes again" — writes of the Winter Solstice, and Lu You’s "Seasonal Rain" — "the seasonal rain comes at Grain in Ear, rice shoots are transplanted in every field" — writes of Grain in Ear.',
      '"A Collective Explanation of the Seventy-two Phenologies of the Monthly Ordinances", written by Wu Cheng in the Yuan dynasty, divides each solar term into three phenologies, seventy-two in all, and explains the origin of each name one by one; it is the ancient work most often cited in studies of solar-term phenology.',
      'The "twenty-four flower-sign winds" pair each of the eight terms from Minor Cold to Grain Rain with three flowers: in Minor Cold, plum blossom, camellia and narcissus, and in Grain Rain, peony, bramble rose and chinaberry. It is the classic statement of the solar terms joined to plant phenology.',
      'Today solar-term subjects also appear in Chinese painting, seal carving, paper cutting, calligraphy and cultural design, while solar-term calendars, themed illustrations and countdowns in the style of the Winter Olympics give the traditional images new ways of being presented.',
    ],
  },
  {
    id: 'local-customs',
    icon: '🎋',
    title: 'Seasonal rites in different regions',
    summary:
      'When the solar terms reach different places they grow different rites. Quite a few solar-term folk customs have been entered on the national list of representative intangible cultural heritage items and have become part of local cultural identity.',
    examples: [
      'The "Jiuhua Beginning of Spring rite" in Jiuhua township, Kecheng district, Quzhou, Zhejiang, holds a welcoming-spring ceremony at the Wutong Ancestral Hall; the "proclaiming spring and encouraging farming" rite in Suichang, Zhejiang, had the local magistrate issue the spring ordinance and urge on farming — both are customs of the Beginning of Spring.',
      'Among the Dong people of Shiqian, Guizhou, "speaking of spring" means going from village to village around the Beginning of Spring, chanting spring verses and urging people to farm; in Neixiang county, Nanyang, Henan, the "beating the spring ox" rite whips a spring ox to signal the start of spring ploughing.',
      'Sanmen county in Zhejiang holds a clan "winter rite" at the Winter Solstice, worshipping winter and the ancestors; the Zhuang "Frost’s Descent festival" in Tiandeng, Daxin, Debao, Jingxi and Napo in Guangxi is a large-scale folk event held during Frost’s Descent.',
      'In Anren, Hunan, the "spring fair" (ganfenshe, 赶分社) sacrifices to the gods and prays for grain on the she day at the Spring Equinox; the "Beginning of Summer custom" at Banshan in Hangzhou sees off spring and welcomes summer; the "Grain in Ear ploughing festival" in the Meiyuan mountain area of Yunhe, Zhejiang, opens the summer ploughing; and around Jiaojiang in Taizhou people "send off the Major Heat boat".',
    ],
  },
  {
    id: 'heritage',
    icon: '🏛️',
    title: 'Safeguarding and passing on the heritage',
    summary:
      'The solar terms entered the national intangible cultural heritage list in 2006 and the Representative List of the Intangible Cultural Heritage of Humanity in 2016. Since then a framework has taken shape in which specialist bodies, communities and schools all take part, and the ways of transmission have grown more diverse.',
    examples: [
      'In 2006 the "twenty-four solar terms of the traditional Chinese calendar" was included in the first batch of the national list of representative intangible cultural heritage items; on 30 November 2016 it was inscribed on the UNESCO Representative List of the Intangible Cultural Heritage of Humanity.',
      'Under the guidance of the Intangible Cultural Heritage Department of the Ministry of Culture and Tourism, coordinated by the China Intangible Cultural Heritage Protection Centre and led by the China Agricultural Museum, a working group for the protection of the twenty-four solar terms was set up in May 2014 and drew up the "Five-Year Protection Plan for the Twenty-four Solar Terms (2017–2021)".',
      'Dengfeng and Neixiang in Henan; Anren and Huayuan in Hunan; Gongshu and Kecheng in Hangzhou, Suichang and Sanmen in Zhejiang; Shiqian in Guizhou; Tiandeng in Guangxi and other places rely on transmission bases to carry out surveys, transmission and outreach alongside their local rites and folk customs.',
      'The opening ceremony of the Beijing 2022 Winter Olympics used the twenty-four solar terms as a countdown; localities also bring solar-term knowledge into classrooms and daily life through themed exhibitions, school programmes, solar-term calendars and cultural merchandise.',
    ],
  },
]
