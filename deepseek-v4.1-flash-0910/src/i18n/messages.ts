/**
 * 界面文案字典
 *
 * 约定：
 *  · 中文（zh）是**唯一的真源**，先用 `as const` 定义；
 *  · 英文（en）的类型是 `Record<keyof typeof zh, string>`，
 *    因此**漏翻一个键就会编译报错**，不会出现「切到英文蹦出中文」的情况；
 *  · 需要在句子里插值的地方写成 `{name}`，由 t() 的第二个参数替换。
 *
 * 内容数据（24 节气详情、历史、文化、科普、来源）不走这里，
 * 它们是结构化的长文，放在 src/data/zh 与 src/data/en 下并行维护。
 */

export const zh = {
  // ── 通用 ──
  'common.beijingTime': '北京时间',
  'common.live': '实时',
  'common.simulated': '模拟时间',
  'common.season.spring': '春季',
  'common.season.summer': '夏季',
  'common.season.autumn': '秋季',
  'common.season.winter': '冬季',
  'common.season.springShort': '春',
  'common.season.summerShort': '夏',
  'common.season.autumnShort': '秋',
  'common.season.winterShort': '冬',
  'common.north': '北纬',
  'common.south': '南纬',
  'common.day': '天',
  'common.hour': '小时',
  'common.minute': '分钟',
  'duration.in': '（{d}后）',
  'duration.ago': '（已过 {d}）',
  'common.now': '现在',
  'common.reload': '刷新页面',

  // ── 顶栏 ──
  'app.title': '二十四节气',
  'app.subtitle': '日地公转 · 互动科普',
  'app.docTitle': '二十四节气 · 日地公转互动科普',
  'app.langSwitch': '切换语言',
  'app.langZh': '中文',
  'app.langEn': 'English',

  // ── 页脚 ──
  'footer.current': '当前显示：{year} · 已进入{term}（太阳黄经 {lon}°）',
  'footer.method':
    '节气时刻由太阳地心视黄经反解得到（VSOP87 截断级数 + 章动 + 光行差），时区为北京时间 UTC+8；历法换算走儒略日算法，因此公元前的年份同样正确。',
  'footer.range':
    '支持 {min} — {max} 年，精度按年代分四档：A ±1 分钟、B ±5 分钟、C ±30 分钟、D 数小时量级（越远离当代，ΔT 外推的不确定度越大，页面右下角会实时标出当前档次）。',
  'footer.credits':
    '行星纹理来自 Solar System Scope（CC BY 4.0）与 three.js 官方示例（MIT 仓库，底图源自 NASA 公开影像）；3D 交互基于 Three.js OrbitControls。',
  'footer.scaleNote':
    '⚠️ 场景中天体的大小与相互距离不按实际比例，但方向、角度、黄经位置与光照关系均按真实天文计算。',

  // ── 3D 场景：无障碍与提示 ──
  'scene.aria':
    '太阳系 3D 场景：当前为{term}，太阳黄经 {lon} 度，模拟时间 {time}。可用鼠标拖动旋转视角、滚轮缩放。',
  'scene.help':
    '场景操作：鼠标左键拖动或单指拖动可旋转视角，滚轮或双指捏合可缩放，右键拖动或双指拖动可平移。轨道上的节气名称可以点击，点击后会暂停播放并跳到该节气的交节时刻。',
  'scene.loadingTitle': '正在点亮星空',
  'scene.loadingText': '正在准备星空与地球纹理…',
  'scene.loadingItem': '正在加载：{label}',
  'scene.fatalTitle': '3D 场景不可用',
  'scene.fatalText':
    '3D 场景初始化失败（浏览器可能未启用 WebGL，或显卡资源不足）。你仍可以阅读下方的节气详情、历史渊源、文化价值与科普内容。',
  'scene.ctxLostTitle': '3D 画面已中断',
  'scene.ctxLostText':
    '浏览器丢失了 WebGL 上下文（常见于显存紧张或切换显卡时）。请刷新页面重试，下方文字内容不受影响。',
  'scene.textureFallback':
    '{list} 未能加载，已改用程序化生成的替代纹理，观感与真实影像会有差别。',
  'scene.notToScale': '尺寸与距离不按实际比例',

  // ── 3D 场景：读出卡 ──
  'hud.solarLongitude': '太阳黄经',
  'hud.termBegins': '本节气交节',
  'hud.nextTerm': '下一节气',
  'hud.subsolarPoint': '太阳直射点',
  'hud.elapsed': '已过 {d}',
  'hud.remaining': '还有 {d}',
  'hud.aboutToBegin': '即将交节',
  'hud.offsetSame': '与真实时间基本一致',
  'hud.offsetAhead': '超前 {d}',
  'hud.offsetBehind': '落后 {d}',
  'hud.pillPhiTitle': '地球在场景中的方位角，恒等于太阳黄经 + 180°',

  // ── 3D 场景：视角与辅助线 ──
  'view.overview': '轨道总览',
  'view.earth': '地球近景',
  'view.reset': '恢复默认视角',
  'view.guides': '辅助选项',
  'view.guidesHide': '收起辅助选项',
  'guide.axis': '地轴',
  'guide.equator': '赤道',
  'guide.tropics': '南北回归线',
  'guide.revolution': '公转方向',
  'guide.ecliptic': '黄道面',
  'guide.stars': '星空背景',
  'guide.labels': '节气名称',
  'guide.minorLabels': '次要节气名',
  'guide.minorLabelsLowTier': '当前为省电档，默认只显示四个分至点，可自行打开',

  // ── 3D 场景：角度对应说明 ──
  'mapNote.compact': '地球方位角 φ = λ☉ + 180°',
  'mapNote.toggle': '黄经与场景角度',
  'mapNote.body':
    '太阳黄经 λ☉ 是从地球看太阳在黄道上的方向：春分 0°、夏至 90°、秋分 180°、冬至 270°，相邻节气相差 15°。场景以黄道面为 XZ 平面、+Y 指向黄道北极、+X 指向春分点。地球在太阳的相反方向，故地球的场景方位角 φ = λ☉ + 180°，当前 φ = {phi}°。地轴与黄道面法线成 {eps}°（{year}的黄赤交角，它随年代在 22.0°—24.5° 之间缓慢摆动），一年中在空间里指向不变 —— 这正是四季的成因。',

  // ── 详情面板 ──
  'detail.aria': '节气详情',
  'detail.position': '第 {n} 个节气 · {season}',
  'detail.pivotal': ' · 四分至点',
  'detail.exactMoment': '交节时刻',
  'detail.today': '就是今天',
  'detail.nextTerm': '下一节气',
  'detail.intervalOf': '{term} 区间',
  'detail.simNotice':
    '当前显示的是模拟时间（{time}），不是真实此刻。点击「回到今天」可返回真实时间。',
  'detail.precision': '精度 {level} · {label}',
  'detail.momentZone': '{moment}（{zone}）',
  'precision.A.time': '±1 分钟',
  'precision.A.note': 'ΔT 使用 1973—2025 年实测锚点，并与日本国立天文台《暦要項》逐条比对。',
  'precision.B.time': '约 ±5 分钟',
  'precision.B.note': 'ΔT 由分段多项式给出，量级在几分钟；VSOP87 截断级数在此区间表现良好。',
  'precision.C.time': '约 ±30 分钟',
  'precision.C.note': 'ΔT 的外推开始占主导（公元 3000 年已达约 74 分钟），时刻误差相应放大，日期仍可靠。',
  'precision.D.time': '数小时量级',
  'precision.D.note':
    'ΔT 外推值达数小时（公元 6000 年约 5 小时），交节时刻只能作趋势参考；公历日期仍然正确。',
  'detail.meaning': '名称含义',
  'detail.climate': '典型气候',
  'detail.phenology': '物候现象',
  'detail.pentadSource': '三候出自元·吴澄《月令七十二候集解》通行本。',
  'detail.farming': '农事活动',
  'detail.custom': '传统习俗',
  'detail.customNote': '习俗属于民间传统，各地做法差异很大，不是科学结论。',
  'detail.poemAttribution': '—— {author}，{source}',
  'detail.food': '代表性饮食',
  'detail.poetry': '诗词',
  'detail.proverb': '农谚',
  'detail.inSong': '在节气歌中',
  'detail.inSongBody': '「{char}」出自「{line}」。',
  'detail.historyHint': '历史脉络',
  'detail.jumpNext': '跳到下一节气「{term}」',
  'detail.gotoMoment': '回到本节气交节瞬间',

  // ── 时间控制 ──
  'time.aria': '时间控制',
  'time.play': '播放模拟',
  'time.pause': '暂停模拟',
  'time.playShort': '播放',
  'time.pauseShort': '暂停',
  'time.speed': '速度',
  'time.datetime': '日期时间',
  'time.datetimeTitle': '按北京时间选择模拟时刻',
  'time.datetimeFallback': '超出四位年份的范围，请按「年-月-日T时:分」输入，例如 -500-03-20T17:01',
  'time.year': '年份',
  'time.yearTitle': '可输入 {min} — {max} 之间的任意年份',
  'time.prevYear': '上一年',
  'time.nextYear': '下一年',
  'time.today': '回到今天',
  'time.timelineLabel': '{year}年度时间轴，可拖动以改变模拟时间',
  'time.timelineValue': '{year}{time}',
  'time.realNow': '真实北京时间 {time}',
  'time.monthAxis': '1月,4月,7月,10月,12月',
  'time.tickTitle': '{term}　{date} {time}　太阳黄经 {lon}°',

  // ── 节气一览 ──
  'overview.num': '壹',
  'overview.title': '二十四节气一览（{year}）',
  'overview.intro':
    '下表的交节时刻由太阳地心视黄经反解得到，均为北京时间（UTC+8），精确到分钟。注意相邻节气的间隔并不相等：约 14.7 天到 15.7 天不等 —— 因为地球公转轨道是椭圆，冬半年走得快、夏半年走得慢。点击任意一项，上方 3D 场景会跳到该节气。',
  'overview.seasonBand': '{season} · {first}起',
  'overview.longitudeRange': '太阳黄经 {from}° — {to}°',
  'overview.current': '◀ 当前所在',
  'overview.pivotal': '分至',
  'overview.chipTitle': '跳到 {year} 年 {term} 的交节时刻（{moment}）',

  // ── 历史 ──
  'history.num': '贰',
  'history.title': '历史渊源',

  // ── 文化 ──
  'culture.num': '叁',
  'culture.title': '文化价值',

  // ── 节气歌 ──
  'song.num': '肆',
  'song.title': '二十四节气歌',
  'song.intro':
    '为了好记，人们把二十四个节气编成了这首四句歌诀。歌诀为了押韵和字数整齐用了衬字，而且同一个字在不同位置代表不同节气：第 1 字与第 4 字都是「春」，但分别指立春与春分；两句里的「夏」分别指立夏与夏至；两个「雪」分别指小雪与大雪。点击任意一个字，上方 3D 场景会跳到对应的节气。',
  'song.lineAria': '第 {n} 句：{text}',
  'song.charAriaTerm': '「{char}」对应{term}，点击跳到该节气',
  'song.charAriaFiller': '「{char}」是衬字，不对应节气',
  'song.fillerTitle': '衬字，不对应节气',
  'song.hint':
    '提示：点击某个字，右侧会显示它对应的节气，同时上方 3D 场景会跳到该节气的交节时刻。灰显的字是衬字，不对应节气。',
  'song.legendFrom': '出自「{line}」',
  'song.legendFiller': '这个字只是为了让歌诀顺口，不对应任何节气。',
  'song.legendEmpty': '点击左侧歌诀中的任意一个字，这里会显示它对应的节气。',
  'song.jumpButton': '跳到 {year} 年 {term} 的交节时刻',
  'song.pinyinLabel': '拼音',

  // ── 科普 ──
  'science.num': '伍',
  'science.title': '科普说明',
  'science.intro':
    '下面几条回答了关于节气最常见的几个疑问。核心只有一句话：四季与节气都源于地轴那 23.4° 的倾斜，以及地球沿椭圆轨道绕日公转。展开阅读可看到完整解释与要点。',

  // ── 来源 ──
  'sources.num': '陆',
  'sources.title': '参考来源与数据说明',
  'sources.dataNoteTitle': '历法数据来源、时区与精度',

  // ── 纹理缺失提示中的资源名 ──
  'tex.earthDay': '地球昼面',
  'tex.earthNight': '地球夜面',
  'tex.clouds': '云层',
  'tex.normal': '地形法线',
  'tex.specular': '海陆高光',
  'tex.sun': '太阳表面',
  'tex.stars': '银河星空',

  // ── 3D 场景中的天体标签 ──
  'body.sun': '太阳',
  'body.earth': '地球',
} as const

export type MessageKey = keyof typeof zh

export const en: Record<MessageKey, string> = {
  // ── Common ──
  'common.beijingTime': 'Beijing time',
  'common.live': 'Live',
  'common.simulated': 'Simulated',
  'common.season.spring': 'Spring',
  'common.season.summer': 'Summer',
  'common.season.autumn': 'Autumn',
  'common.season.winter': 'Winter',
  'common.season.springShort': 'Spring',
  'common.season.summerShort': 'Summer',
  'common.season.autumnShort': 'Autumn',
  'common.season.winterShort': 'Winter',
  'common.north': 'N',
  'common.south': 'S',
  'common.day': 'd',
  'common.hour': 'h',
  'common.minute': 'min',
  'duration.in': 'in {d}',
  'duration.ago': '{d} ago',
  'common.now': 'Now',
  'common.reload': 'Reload page',

  // ── Header ──
  'app.title': 'The 24 Solar Terms',
  'app.subtitle': "EARTH'S ORBIT · AN INTERACTIVE GUIDE",
  'app.docTitle': 'The 24 Solar Terms · An Interactive Guide to the Sun–Earth Orbit',
  'app.langSwitch': 'Switch language',
  'app.langZh': '中文',
  'app.langEn': 'English',

  // ── Footer ──
  'footer.current': 'Showing {year} · currently in {term} (solar longitude {lon}°)',
  'footer.method':
    'Each term begins at the moment the Sun’s apparent geocentric ecliptic longitude reaches a multiple of 15°, solved from a truncated VSOP87 series with nutation and aberration applied. Times are given in Beijing time (UTC+8); calendar conversion uses a Julian Day algorithm rather than JavaScript’s Date, so years BCE are handled correctly too.',
  'footer.range':
    'Supported range: {min} to {max}, with four precision tiers by epoch — A ±1 min, B ±5 min, C ±30 min, D several hours. The further from the present, the less certain ΔT becomes; the current tier is shown in the bottom-right corner.',
  'footer.credits':
    'Planetary textures from Solar System Scope (CC BY 4.0) and the three.js repository (MIT; base imagery from NASA public-domain data). 3D interaction built on Three.js OrbitControls.',
  'footer.scaleNote':
    '⚠️ Body sizes and distances in the scene are not to scale — but directions, angles, ecliptic longitudes and illumination are all computed from real astronomy.',

  // ── 3D scene: a11y & notices ──
  'scene.aria':
    'Interactive 3D scene of the Sun–Earth system. Currently {term}; solar longitude {lon}°; simulated time {time}. Drag to rotate the view, scroll to zoom.',
  'scene.help':
    'Controls: drag with the left mouse button or one finger to rotate, scroll or pinch to zoom, drag with the right button or two fingers to pan. The solar-term labels around the orbit are clickable — clicking one pauses playback and jumps to the exact moment that term begins.',
  'scene.loadingTitle': 'Lighting up the sky',
  'scene.loadingText': 'Preparing the starfield and Earth textures…',
  'scene.loadingItem': 'Loading: {label}',
  'scene.fatalTitle': '3D scene unavailable',
  'scene.fatalText':
    'The 3D scene could not start — your browser may have WebGL disabled, or graphics resources are insufficient. You can still read the term details, history, culture and science notes below.',
  'scene.ctxLostTitle': '3D rendering was interrupted',
  'scene.ctxLostText':
    'The browser lost its WebGL context, which usually happens under memory pressure or when switching graphics cards. Reload the page to try again; the text content below is unaffected.',
  'scene.textureFallback':
    '{list} could not be loaded, so procedurally generated stand-ins are being used. They will look different from real imagery.',
  'scene.notToScale': 'Sizes and distances not to scale',

  // ── 3D scene: readout ──
  'hud.solarLongitude': 'Solar longitude',
  'hud.termBegins': 'Term begins',
  'hud.nextTerm': 'Next term',
  'hud.subsolarPoint': 'Subsolar point',
  'hud.elapsed': '{d} in',
  'hud.remaining': '{d} to go',
  'hud.aboutToBegin': 'about to begin',
  'hud.offsetSame': 'essentially the same as real time',
  'hud.offsetAhead': '{d} ahead of real time',
  'hud.offsetBehind': '{d} behind real time',
  'hud.pillPhiTitle': "Earth's azimuth in the scene; always solar longitude + 180°",

  // ── 3D scene: view & guides ──
  'view.overview': 'Orbit overview',
  'view.earth': 'Earth close-up',
  'view.reset': 'Reset view',
  'view.guides': 'Guides',
  'view.guidesHide': 'Hide guides',
  'guide.axis': 'Axis',
  'guide.equator': 'Equator',
  'guide.tropics': 'Tropics',
  'guide.revolution': 'Orbit direction',
  'guide.ecliptic': 'Ecliptic plane',
  'guide.stars': 'Starfield',
  'guide.labels': 'Term labels',
  'guide.minorLabels': 'Minor labels',
  'guide.minorLabelsLowTier':
    'Battery-saver tier: only the four pivotal terms are shown by default — you can turn the rest on.',

  // ── 3D scene: angle explainer ──
  'mapNote.compact': "Earth's azimuth φ = λ☉ + 180°",
  'mapNote.toggle': 'Longitude & scene angle',
  'mapNote.body':
    'The solar longitude λ☉ is the direction of the Sun along the ecliptic as seen from Earth: 0° at the spring equinox, 90° at the summer solstice, 180° at the autumn equinox, 270° at the winter solstice — consecutive terms are 15° apart. The scene puts the ecliptic in the XZ plane, +Y toward the ecliptic north pole and +X toward the vernal equinox. Earth always sits opposite the Sun, so its scene azimuth is φ = λ☉ + 180°; right now φ = {phi}°. The axis makes an angle of {eps}° with the ecliptic pole (the obliquity of the ecliptic for {year}, which drifts slowly between 22.0° and 24.5°), and its direction in space stays fixed through the year — that is what causes the seasons.',

  // ── Detail panel ──
  'detail.aria': 'Solar term details',
  'detail.position': 'Term {n} of 24 · {season}',
  'detail.pivotal': ' · one of the four pivotal points',
  'detail.exactMoment': 'Term begins',
  'detail.today': 'today',
  'detail.nextTerm': 'Next term',
  'detail.intervalOf': 'Current interval: {term}',
  'detail.simNotice':
    'This is simulated time ({time}), not the real present moment. Choose “Back to today” to return to real time.',
  'detail.precision': 'Precision {level} · {label}',
  'detail.momentZone': '{moment} ({zone})',
  'precision.A.time': '±1 minute',
  'precision.A.note':
    'ΔT comes from observed IERS/USNO anchor values, cross-checked term by term against the NAOJ calendar.',
  'precision.B.time': 'about ±5 minutes',
  'precision.B.note':
    'ΔT comes from the piecewise polynomial, on the order of minutes; the truncated VSOP87 series still performs well here.',
  'precision.C.time': 'about ±30 minutes',
  'precision.C.note':
    'Extrapolated ΔT now dominates (about 74 minutes by 3000 CE), so the moment is correspondingly less certain — though the calendar date remains correct.',
  'precision.D.time': 'several hours',
  'precision.D.note':
    'Extrapolated ΔT reaches several hours (about 5 hours by 6000 CE), so the moment is indicative only; the calendar date is still correct.',
  'detail.meaning': 'Meaning of the name',
  'detail.climate': 'Typical climate',
  'detail.phenology': 'Phenology',
  'detail.pentadSource':
    'The three pentads follow the standard text of Wu Cheng’s *Seventy-two Pentads of the Monthly Ordinances* (Yueling Qishi’erhou Jijie, Yuan dynasty).',
  'detail.farming': 'Farm work',
  'detail.custom': 'Traditional customs',
  'detail.customNote':
    'These are folk traditions, and practice varies widely from place to place. They are not scientific claims.',
  'detail.poemAttribution': '— {author}, {source}',
  'detail.food': 'Characteristic foods',
  'detail.poetry': 'Poetry',
  'detail.proverb': 'Farming proverb',
  'detail.inSong': 'In the solar-term song',
  'detail.inSongBody': '“{char}” comes from the line “{line}”.',
  'detail.historyHint': 'Historical context',
  'detail.jumpNext': 'Jump to the next term, {term}',
  'detail.gotoMoment': 'Go to this term’s exact moment',

  // ── Time controls ──
  'time.aria': 'Time controls',
  'time.play': 'Play simulation',
  'time.pause': 'Pause simulation',
  'time.playShort': 'Play',
  'time.pauseShort': 'Pause',
  'time.speed': 'Speed',
  'time.datetime': 'Date & time',
  'time.datetimeTitle': 'Pick a simulated moment in Beijing time',
  'time.datetimeFallback':
    'Outside the four-digit year range. Enter as year-month-dayThour:minute, e.g. -500-03-20T17:01',
  'time.year': 'Year',
  'time.yearTitle': 'Any year from {min} to {max}',
  'time.prevYear': 'Previous year',
  'time.nextYear': 'Next year',
  'time.today': 'Back to today',
  'time.timelineLabel': 'Timeline for {year} — drag to change the simulated time',
  'time.timelineValue': '{year}{time}',
  'time.realNow': 'Real Beijing time {time}',
  'time.monthAxis': 'Jan,Mar,May,Jul,Sep,Nov',
  'time.tickTitle': '{term}　{date} {time}　solar longitude {lon}°',

  // ── Term overview ──
  'overview.num': 'I',
  'overview.title': 'The 24 Solar Terms in {year}',
  'overview.intro':
    'Every moment below is solved from the Sun’s apparent geocentric ecliptic longitude and given in Beijing time (UTC+8) to the minute. Notice that the gaps are not equal: they range from about 14.7 to 15.7 days, because Earth’s orbit is an ellipse and the planet moves faster during the northern winter half-year. Click any entry to jump the 3D scene to that term.',
  'overview.seasonBand': '{season} · from {first}',
  'overview.longitudeRange': 'solar longitude {from}° — {to}°',
  'overview.current': '◀ current',
  'overview.pivotal': 'pivotal',
  'overview.chipTitle': 'Jump to {term} in {year} (begins {moment})',

  // ── History ──
  'history.num': 'II',
  'history.title': 'Historical origins',

  // ── Culture ──
  'culture.num': 'III',
  'culture.title': 'Cultural value',

  // ── Song ──
  'song.num': 'IV',
  'song.title': 'The Song of the 24 Solar Terms',
  'song.intro':
    'To make the 24 terms easy to remember, people strung them into this four-line verse. For the sake of rhyme and rhythm it uses filler characters, and the same character can stand for different terms depending on where it appears: the first and fourth characters are both 春 (“spring”), but they mean Beginning of Spring and Spring Equinox respectively; the two 夏 (“summer”) mean Beginning of Summer and Summer Solstice; the two 雪 (“snow”) mean Minor Snow and Major Snow. Click any character to jump the 3D scene to the term it stands for.',
  'song.lineAria': 'Line {n}: {text}',
  'song.charAriaTerm': '“{char}” stands for {term} — click to jump there',
  'song.charAriaFiller': '“{char}” is a filler character and does not stand for a term',
  'song.fillerTitle': 'Filler character — not a solar term',
  'song.hint':
    'Click a character to see what it stands for on the right; the 3D scene above jumps to that term’s exact moment. Greyed-out characters are fillers and name no term.',
  'song.legendFrom': 'from the line “{line}”',
  'song.legendFiller': 'This character is only there to make the verse scan; it names no solar term.',
  'song.legendEmpty': 'Click any character in the verse to see which term it stands for.',
  'song.jumpButton': 'Jump to {term} in {year}',
  'song.pinyinLabel': 'Pinyin',

  // ── Science ──
  'science.num': 'V',
  'science.title': 'How it works',
  'science.intro':
    'These answers cover the questions people ask most about the solar terms. The whole story comes down to one sentence: the seasons — and the solar terms — exist because Earth’s axis is tilted about 23.4°, and Earth travels around the Sun on an elliptical orbit. Expand any question for the full explanation and key points.',

  // ── Sources ──
  'sources.num': 'VI',
  'sources.title': 'Sources & data notes',
  'sources.dataNoteTitle': 'Calendar data: sources, time zone and precision',

  // ── Texture names ──
  'tex.earthDay': 'Earth day map',
  'tex.earthNight': 'Earth night lights',
  'tex.clouds': 'Cloud layer',
  'tex.normal': 'Terrain normal map',
  'tex.specular': 'Land/ocean specular',
  'tex.sun': 'Sun surface',
  'tex.stars': 'Milky Way',

  // ── Body labels ──
  'body.sun': 'Sun',
  'body.earth': 'Earth',
}

export const MESSAGES = { zh, en } as const
