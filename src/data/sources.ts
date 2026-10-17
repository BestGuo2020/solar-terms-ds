import type { SourceRef } from './types.ts'

/**
 * 只列页面确实用到的可靠来源。网页链接优先给官方机构、原始文献条目或算法文档；
 * 古籍没有权威在线版本时，不给二手转引链接。
 */
export const SOURCES: SourceRef[] = [
  {
    id: 'unesco-element',
    group: '历史与非遗',
    title:
      'The Twenty-Four Solar Terms, knowledge in China of time and practices developed through observation of the sun’s annual motion',
    publisher: '联合国教科文组织（UNESCO）· 人类非物质文化遗产代表作名录',
    url: 'https://ich.unesco.org/en/RL/the-twenty-four-solar-terms-knowledge-in-china-of-time-and-practices-developed-through-the-observation-of-the-sun-s-annual-motion-00647',
    note: '二十四节气列入人类非遗代表作名录的官方条目（00647）。用于“源流”中的申遗记录。',
  },
  {
    id: 'unesco-decision',
    group: '历史与非遗',
    title: 'Decision 11.COM 10.B.6',
    publisher: '联合国教科文组织保护非物质文化遗产政府间委员会',
    url: 'https://ich.unesco.org/en/decisions/11.COM/10.B.6',
    note: '2016 年第十一届常会的列入决议，确认“二十四节气”的申报名称与列入结果。',
  },
  {
    id: 'ihchina',
    group: '历史与非遗',
    title: '“二十四节气”正式列入联合国教科文组织人类非物质文化遗产代表作名录',
    publisher: '中国非物质文化遗产网 · 中国非物质文化遗产数字博物馆',
    url: 'https://www.ihchina.cn/art/detail/id/16319.html',
    note: '提供 2006 年国家级名录、2011 与 2014 年扩展项目、2016 年 11 月 30 日申遗成功，以及保护工作组等信息。',
  },
  {
    id: 'ich-solar-terms',
    group: '历史与非遗',
    title: '二十四节气专题',
    publisher: '中国非物质文化遗产网 · 中国非物质文化遗产数字博物馆',
    url: 'https://www.ihchina.cn/solar_terms.html',
    note: '节气概述、节气歌，以及九华立春祭、班春劝农、石阡说春、三门祭冬、壮族霜降节、苗族赶秋、安仁赶分社等地方实践的官方介绍。',
  },
  {
    id: 'weather-calculation',
    group: '历法与天文',
    title: '二十四节气划分与计算',
    publisher: '中国天气网（中国气象局公共气象服务中心）',
    url: 'https://www.weather.com.cn/jiangxi/qxxw/11/2620066.shtml',
    note: '平气法与定气法的区别，以及节气的公历日期为何相对稳定。',
  },
  {
    id: 'nao-rekiyou',
    group: '历法与天文',
    title: '暦要項 · 二十四節気の日時',
    publisher: '日本国立天文台（NAO）暦計算室',
    url: 'https://eco.mtk.nao.ac.jp/koyomi/yoko/',
    note: '用于交叉校验 2024、2025 年各 24 个交节时刻。日本标准时 UTC+9 换算为北京时间 UTC+8 后逐项对照：全部落在公布分钟前后 1 分钟内，与分钟起点最大相差 43.2 秒；官方值只公布到分钟，因此不把它当作秒级外部真值。',
  },
  {
    id: 'pmo',
    group: '历法与天文',
    title: '中国科学院紫金山天文台',
    publisher: '中国科学院紫金山天文台（PMO）',
    url: 'https://pmo.cas.cn/',
    note: '中国天文年历与节气时刻的编算机构。页面中的北京时间约定与中国天文年历的发布口径一致。',
  },
  {
    id: 'astronomy-engine',
    group: '历法与天文',
    title: 'Astronomy Engine（MIT License）',
    publisher: 'Don Cross / cosinekitty',
    url: 'https://github.com/cosinekitty/astronomy',
    note: '本项目用其 SearchSunLongitude() 求解太阳地心视黄经达到 15° 整数倍的时刻；它提供包含章动、光行差与 ΔT 修正的视黄经及太阳视位置。ΔT 使用 Espenak & Meeus 的分段多项式。',
  },
  {
    id: 'meeus',
    group: '历法与天文',
    title: 'Astronomical Algorithms（2nd Edition）',
    publisher: 'Jean Meeus · Willmann-Bell，1998',
    note: '太阳视黄经、视黄赤交角、时角与恒星时等天文量的经典参考书，也是 Astronomy Engine 底层坐标约定的依据。',
  },
  {
    id: 'nasa-deltat',
    group: '历法与天文',
    title: 'ΔT 分段多项式（Espenak & Meeus）',
    publisher: 'NASA GSFC · Five Millennium Canon of Solar Eclipses',
    url: 'https://eclipse.gsfc.nasa.gov/SEcat5/deltat.html',
    note: 'ΔT = TT − UT 的历史估计与未来外推来源。未来的 ΔT 不能精确预知，因此越远未来交节时刻的可靠性越低。',
  },
  {
    id: 'classics',
    group: '历史与非遗',
    title: '《周礼》《尚书·尧典》《春秋左传》《吕氏春秋》《太初历》《授时历》《时宪历》',
    publisher: '先秦至清代典籍与国家历法',
    note: '历史时间线中测影、分至启闭、八节、节令入历、授时与定气等叙述的原始依据。古籍没有权威公开在线定本，因此不提供单一链接。',
  },
  {
    id: 'huainanzi',
    group: '历史与非遗',
    title: '《淮南子·天文训》',
    publisher: '西汉 · 刘安等撰',
    note: '通常认为现存文献中二十四节气名称的完整记载最早见于《淮南子·天文训》。古籍原文无权威在线版本，故不提供链接。',
  },
  {
    id: 'yueling',
    group: '历史与非遗',
    title: '《月令七十二候集解》',
    publisher: '元 · 吴澄撰',
    note: '逐条解释七十二候的古代文献，是页面“三候”内容的传统依据。',
  },
  {
    id: 'threejs',
    group: '技术与图像',
    title: 'Three.js 文档 · OrbitControls',
    publisher: 'three.js',
    url: 'https://threejs.org/docs/#examples/en/controls/OrbitControls',
    note: '三维场景与鼠标/触屏相机控制的使用参考。',
  },
  {
    id: 'solar-system-scope',
    group: '技术与图像',
    title: 'Solar Textures',
    publisher: 'Solar System Scope（INOVE）',
    url: 'https://www.solarsystemscope.com/textures/',
    note: '地球昼面、夜面、云层、太阳表面与银河背景纹理，采用 CC BY 4.0 许可。页面与 public/textures/CREDITS.md 均保留署名。',
  },
  {
    id: 'three-planet-textures',
    group: '技术与图像',
    title: 'three.js planet textures',
    publisher: 'three.js（MIT）；底图源自 NASA 公开影像',
    url: 'https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets',
    note: '地球法线与海陆高光遮罩。',
  },
]

export const METHOD_NOTES = {
  supportedYears: '1900 — 2100 年',
  timezone: '北京时间（Asia/Shanghai，固定 UTC+8）',
  algorithm:
    '以太阳地心视黄经定义节气：春分 0°、夏至 90°、秋分 180°、冬至 270°，每 15° 一个节气。页面调用 Astronomy Engine 的 SearchSunLongitude() 反解每个目标黄经的交节时刻，不使用固定的日期表。',
  precision:
    '2024、2025 年共 48 个交节时刻与日本国立天文台《暦要項》公布的分钟值逐项核对：全部落在公布分钟前后 1 分钟内，与分钟起点最大相差 43.2 秒。由于官方只公布到分钟，该对照不提供秒级外部真值。2026 年以后依赖 ΔT 外推，误差会随年代远离而增大，未来年份宜作为趋势与科普参考。',
  scene:
    '3D 场景把黄道面放在 XZ 平面，+Y 指向黄道北极；春分点沿 +X，黄经增大方向从 +Y 俯视逆时针。地球位置角 φ⊕ = λ☉ + 180°，因此轨道标签与太阳黄经不会错位。太阳、地球尺寸和日地距离均为观感尺寸，不按实际比例。',
} as const
