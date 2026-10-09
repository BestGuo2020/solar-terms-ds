/**
 * The 24 Solar Terms · References and data note (English edition)
 *
 * Note: every `url` in SOURCES_EN is copied verbatim from the Chinese source file
 * and was verified by actually visiting it (HTTP 200). Entries whose real address
 * could not be confirmed are given without a `url` field, keeping only the
 * bibliographic information. The entries for ancient works are primary sources with no official
 * online address, so no link is provided.
 *
 * `id` values and `url` values are copied verbatim from the Chinese source file.
 */

export interface SourceRefEn {
  id: string
  title: string // name of the reference
  publisher?: string // institution / author
  url?: string // official or reachable link
  note?: string // one sentence saying which part of the page this reference supports
}

export const SOURCES_EN: SourceRefEn[] = [
  {
    id: 'unesco-element',
    title:
      "The Twenty-Four Solar Terms, knowledge in China of time and practices developed through observation of the sun's annual motion",
    publisher: 'UNESCO Intangible Cultural Heritage（联合国教科文组织非物质文化遗产）',
    url: 'https://ich.unesco.org/en/RL/the-twenty-four-solar-terms-knowledge-in-china-of-time-and-practices-developed-through-the-observation-of-the-sun-s-annual-motion-00647',
    note: 'The official entry page for the inscription of the twenty-four solar terms on the Representative List of the Intangible Cultural Heritage of Humanity (decision 11.COM 10.B.6); it supports the account of the successful 2016 inscription in "Historical origins".',
  },
  {
    id: 'ihchina-solar-terms',
    title:
      'The Twenty-Four Solar Terms feature (general introduction, detailed explanations, heritage list, solar-term culture)（二十四节气专题（节气总说、节气详解、节气名录、节气文化））',
    publisher:
      'China Intangible Cultural Heritage Network · China Intangible Cultural Heritage Digital Museum, under the Ministry of Culture and Tourism of the People’s Republic of China（中国非物质文化遗产网 · 中国非物质文化遗产数字博物馆）',
    url: 'https://www.ihchina.cn/solar_terms.html',
    note: 'Provides the general introduction to the solar terms, the twenty-four flower-sign winds and the song of the solar terms, together with official introductions to national-level items such as the Jiuhua Beginning of Spring rite, proclaiming spring and encouraging farming, the Shiqian speaking of spring, the Sanmen winter rite, the Zhuang Frost’s Descent festival, the Miao autumn-chasing festival, the Anren spring fair, the Banshan Beginning of Summer custom, the sending off of the Major Heat boat, the Meiyuan Grain in Ear ploughing festival and the Neixiang beating-the-spring-ox custom; it supports the sections on local customs and on heritage transmission in "Cultural value".',
  },
  {
    id: 'mct-announcement',
    title:
      'The "Twenty-Four Solar Terms" is formally inscribed on the UNESCO Representative List of the Intangible Cultural Heritage of Humanity（“二十四节气”正式列入联合国教科文组织人类非物质文化遗产代表作名录）',
    publisher:
      'Ministry of Culture and Tourism of the People’s Republic of China（中华人民共和国文化和旅游部）',
    url: 'https://www.mct.gov.cn/whzx/bnsj/dwwhllj/201612/t20161214_773196.html',
    note: 'The official announcement published on 30 November 2016, covering the course of the nomination, the dates of the national list and its two extended lists, the working group for the protection of the twenty-four solar terms and the "Five-Year Protection Plan for the Twenty-four Solar Terms (2017–2021)"; it supports the transmission material in "Historical origins" and "Cultural value".',
  },
  {
    id: 'pmo-cas',
    title: 'Purple Mountain Observatory, Chinese Academy of Sciences (official website)（中国科学院紫金山天文台（官方网站））',
    publisher: 'Purple Mountain Observatory, Chinese Academy of Sciences (PMO)（中国科学院紫金山天文台）',
    url: 'https://pmo.cas.cn/',
    note: 'The institution that computes and publishes the moments of the Chinese calendar and the twenty-four solar terms, and the compiler and publisher of the Chinese Astronomical Almanac; modern solar term moments follow the almanac it issues, and it supports the statements in "Science FAQ" and in the data note about where solar term moments are published.',
  },
  {
    id: 'weather-cn-division',
    title: 'The division and calculation of the twenty-four solar terms（二十四节气划分与计算）',
    publisher:
      'China Weather Web, Public Meteorological Service Centre of the China Meteorological Administration（中国天气网（中国气象局公共气象服务中心））',
    url: 'https://www.weather.com.cn/jiangxi/qxxw/11/2620066.shtml',
    note: 'Explains the difference between the pingqi and dingqi methods, the adoption of the dingqi method by the Qing Shixian Calendar in 1645, and the reason why the twenty-four solar terms correspond roughly to Gregorian dates; it supports the explanations of term intervals and of the stability of Gregorian dates in "Science FAQ".',
  },
  {
    id: 'chen-guangzhong-order',
    title: 'Chen Guangzhong: the question of the ordering of the twenty-four solar terms（陈广忠：二十四节气的排序问题）',
    publisher:
      'China Intangible Cultural Heritage Network; author: Chen Guangzhong, School of Literature, Anhui University（中国非物质文化遗产网（作者：安徽大学文学院 陈广忠））',
    url: 'https://www.ihchina.cn/luntan_details/22611.html',
    note: 'Sorts out the names, order and documentary basis of the twenty-four solar terms recorded in the "Tianwenxun" chapter of the Huainanzi and examines issues such as the change of name from "Qizhe" to "Jingzhe"; it supports the Huainanzi entry in "Historical origins" and the material on the seventy-two phenologies.',
  },
  {
    id: 'yueling-qihou',
    title: '"A Collective Explanation of the Seventy-two Phenologies of the Monthly Ordinances"（《月令七十二候集解》）',
    publisher: 'Written by Wu Cheng, Yuan dynasty（元·吴澄 撰）',
    note: 'A Yuan dynasty work that explains the phenological names of the seventy-two phenologies term by term; it supports the literature and art section of "Cultural value" and the account of the seventy-two phenologies in "Science FAQ". The original text of the ancient work has no official online address, so no link is provided.',
  },
  {
    id: 'huainanzi-tianwen',
    title: 'Huainanzi, "Tianwenxun"（《淮南子·天文训》）',
    publisher: 'Written by Liu An and others, Western Han（西汉·刘安 等 撰）',
    note: 'The document that records the names of the twenty-four solar terms in full for the first time (c. 139 BCE); it supports the entry "The twenty-four solar terms appear in full for the first time" in "Historical origins". The original text of the ancient work has no official online address, so no link is provided.',
  },
  {
    id: 'meeus-astronomical-algorithms',
    title: 'Astronomical Algorithms (2nd edition)',
    publisher: 'Jean Meeus',
    note: 'The standard reference for computing the apparent solar longitude and the Julian day. The inversion of the sun’s apparent geocentric ecliptic longitude and the corrections for nutation and aberration used for the solar term moments on this page follow this book; it is a formal publication with no official free online address, so no link is provided.',
  },
  {
    id: 'nasa-delta-t',
    title: 'Delta T (ΔT) — Five Millennium Canon of Solar Eclipses',
    publisher:
      'NASA Goddard Space Flight Center (Fred Espenak & Jean Meeus); the ΔT polynomials are on the deltatpoly page of the same site. Astronomical constants may also be taken from the Astronomical Applications Department of the United States Naval Observatory (aa.usno.navy.mil, which could not be reached for verification from this network environment, so no link is provided)（NASA 戈达德太空飞行中心；美国海军天文台）',
    url: 'https://eclipse.gsfc.nasa.gov/SEcat5/deltat.html',
    note: 'Provides historical values of ΔT, modern observational data and extrapolated trends, as well as the piecewise polynomials derived by Espenak & Meeus; this page uses those polynomials outside the interval covered by the measured anchors.',
  },
  {
    id: 'iers-earth-rotation',
    title: 'IERS EOP products and bulletins (Bulletin A / B / C, EOP 14 C04)',
    publisher:
      'International Earth Rotation and Reference Systems Service (IERS)（国际地球自转与参考系统服务）',
    url: 'https://datacenter.iers.org/',
    note: 'The official measured source for ΔT = TT − UT1. The annual ΔT anchor values for 1973–2025 on this page are converted from the UT1−UTC and leap second (TAI−UTC) data given here and cross-checked against sources including USNO and NASA/GSFC, with a difference of ≤ 0.05 seconds in every case.',
  },
  {
    id: 'nao-rekiyou',
    title: 'Rekiyōkō (Calendar Handbook): dates and times of the twenty-four solar terms（暦要項（二十四節気の日時））',
    publisher:
      'Calendar Calculation Office, National Astronomical Observatory of Japan (NAO)（日本国立天文台（NAO）暦計算室）',
    url: 'https://eco.mtk.nao.ac.jp/koyomi/yoko/',
    note: 'An independent authoritative dataset used to check the solar term algorithm on this page. The moments at which the twenty-four solar terms begin in 2024 and 2025 have been compared one by one (converted from Japan Standard Time, UTC+9, to UTC+8), with a maximum deviation of 1 minute, while the published values themselves are given only to the minute.',
  },
  {
    id: 'threejs-docs',
    title: 'Three.js official documentation (including OrbitControls)',
    publisher: 'three.js',
    url: 'https://threejs.org/docs/',
    note: 'The implementation reference for the 3D scene of the Earth orbiting the sun on this page. OrbitControls is described in the documentation under Addons → Controls, and is used for camera interactions such as dragging to rotate with the mouse and zooming with the scroll wheel.',
  },
  {
    id: 'solar-system-scope-textures',
    title: 'Solar Textures (planetary texture maps)',
    publisher: 'Solar System Scope (INOVE)',
    url: 'https://www.solarsystemscope.com/textures/',
    note: 'Texture maps for planets including the Earth and the sun. The site states that they are released under CC BY 4.0 (Attribution 4.0 International) and that the textures are made from NASA elevation and imagery data; the 3D scene on this page uses its Earth texture and credits it as the licence requires.',
  },
]

export const DATA_NOTE_EN: string =
  'Solar term moments are found by inverting the sun’s apparent geocentric ecliptic longitude: the Earth–sun position comes from a truncated VSOP87 series, corrections for nutation in longitude and annual aberration are applied, and the time at which the longitude is an exact multiple of 15° is solved for. The conversion between dynamical time and civil time uses ΔT — for 1973–2025 by linear interpolation between measured IERS / USNO anchor values (cross-checked across several sources, differences ≤ 0.05 s), for other years with the piecewise polynomials of Espenak & Meeus, smoothly blended at both ends. The result is converted to UTC+8 (Asia/Shanghai); since summer time ended in China in 1991, the whole year is UTC+8. Calendar conversion uses a Julian day algorithm rather than the browser’s Date object, so years BCE are handled correctly too. The supported range is −2000 to +6000, in four grades of accuracy by distance from the present: A (1900–2100, ±1 minute, compared term by term with the National Astronomical Observatory of Japan’s Rekiyōkō), B (±5 minutes), C (±30 minutes) and D (of the order of hours, from ΔT extrapolation). A "solar term interval" is the term currently in effect; "the exact moment the term begins" is the instant it starts.'
