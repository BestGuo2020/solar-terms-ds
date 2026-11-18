/**
 * 二十四节气 · 参考来源与数据说明
 *
 * 说明：SOURCES 中的 url 均经过实际访问核实（HTTP 200），无法确认真实可访问地址的条目
 * 一律省略 url 字段，只保留书目信息。古籍类条目为原始文献，无官方在线地址，故不提供链接。
 */

export interface SourceRef {
  id: string
  title: string // 资料名称
  publisher?: string // 机构/作者
  url?: string // 官方或可访问链接
  note?: string // 一句话说明本条用于支撑页面哪部分内容
}

export const SOURCES: SourceRef[] = [
  {
    id: 'unesco-element',
    title:
      "The Twenty-Four Solar Terms, knowledge in China of time and practices developed through observation of the sun's annual motion",
    publisher: '联合国教科文组织（UNESCO）非物质文化遗产',
    url: 'https://ich.unesco.org/en/RL/the-twenty-four-solar-terms-knowledge-in-china-of-time-and-practices-developed-through-the-observation-of-the-sun-s-annual-motion-00647',
    note: '二十四节气列入人类非物质文化遗产代表作名录的官方条目页（决议编号 11.COM 10.B.6），用于支撑「历史渊源」中 2016 年申遗成功的记述。',
  },
  {
    id: 'ihchina-solar-terms',
    title: '二十四节气专题（节气总说、节气详解、节气名录、节气文化）',
    publisher: '中国非物质文化遗产网 · 中国非物质文化遗产数字博物馆（主管：中华人民共和国文化和旅游部）',
    url: 'https://www.ihchina.cn/solar_terms.html',
    note: '提供节气总说、二十四番花信风、节气歌，以及九华立春祭、班春劝农、石阡说春、三门祭冬、壮族霜降节、苗族赶秋、安仁赶分社、半山立夏习俗、送大暑船、梅源芒种开犁节、内乡打春牛习俗等国家级项目的官方介绍，用于支撑「文化价值」中的地方习俗与非遗传承部分。',
  },
  {
    id: 'mct-announcement',
    title: '“二十四节气”正式列入联合国教科文组织人类非物质文化遗产代表作名录',
    publisher: '中华人民共和国文化和旅游部（原文化部外联局）',
    url: 'https://www.mct.gov.cn/whzx/bnsj/dwwhllj/201612/t20161214_773196.html',
    note: '2016 年 11 月 30 日发布的官方公告，含申遗经过、国家级名录与两次扩展名录的时间、二十四节气保护工作组与《二十四节气五年保护计划（2017—2021）》，用于支撑「历史渊源」与「文化价值」中的传承内容。',
  },
  {
    id: 'pmo-cas',
    title: '中国科学院紫金山天文台（官方网站）',
    publisher: '中国科学院紫金山天文台（PMO）',
    url: 'https://pmo.cas.cn/',
    note: '我国农历与二十四节气时刻的编算发布机构，《中国天文年历》由其编纂出版；现代节气时刻以该台发布的年历为准，用于支撑「科普问答」与数据说明中关于节气时刻发布来源的表述。',
  },
  {
    id: 'weather-cn-division',
    title: '二十四节气划分与计算',
    publisher: '中国天气网（中国气象局公共气象服务中心）',
    url: 'https://www.weather.com.cn/jiangxi/qxxw/11/2620066.shtml',
    note: '说明平气法与定气法的区别、1645 年清《时宪历》开始采用定气法、二十四节气与公历日期基本对应的原因，用于支撑「科普问答」中节气间隔与公历日期稳定性的解释。',
  },
  {
    id: 'chen-guangzhong-order',
    title: '陈广忠：二十四节气的排序问题',
    publisher: '中国非物质文化遗产网（作者：安徽大学文学院 陈广忠）',
    url: 'https://www.ihchina.cn/luntan_details/22611.html',
    note: '梳理《淮南子·天文训》所载二十四节气的名称、顺序与文献依据，并辨析「启蛰」改称「惊蛰」等问题，用于支撑「历史渊源」中《淮南子》条目以及七十二候相关表述。',
  },
  {
    id: 'yueling-qihou',
    title: '《月令七十二候集解》',
    publisher: '元·吴澄 撰',
    note: '分节气逐条解释七十二候物候名称的元代古籍，用于支撑「文化价值」文学艺术部分与「科普问答」中七十二候的说明。古籍原文无官方在线地址，故不提供链接。',
  },
  {
    id: 'huainanzi-tianwen',
    title: '《淮南子·天文训》',
    publisher: '西汉·刘安 等 撰',
    note: '首次完整记载二十四节气名称的文献（约公元前 139 年），用于支撑「历史渊源」中「二十四节气名称首次完整出现」一条。古籍原文无官方在线地址，故不提供链接。',
  },
  {
    id: 'meeus-astronomical-algorithms',
    title: 'Astronomical Algorithms（第 2 版）',
    publisher: 'Jean Meeus',
    note: '太阳视黄经与儒略日计算的标准参考书。页面节气时刻的太阳地心视黄经反解、章动与光行差修正方法依据此书；该书为正式出版物，无官方免费在线地址，故不提供链接。',
  },
  {
    id: 'nasa-delta-t',
    title: 'Delta T (ΔT) — Five Millennium Canon of Solar Eclipses',
    publisher: 'NASA 戈达德太空飞行中心（Fred Espenak & Jean Meeus）；ΔT 多项式见同站 deltatpoly 页面。天文常数亦可参考美国海军天文台（USNO）天文应用部（aa.usno.navy.mil，本站网络环境下无法访问验证，故不提供链接）',
    url: 'https://eclipse.gsfc.nasa.gov/SEcat5/deltat.html',
    note: '提供 ΔT 的历史数值、现代观测数据与外推趋势，以及由 Espenak & Meeus 导出的分段多项式；本页在实测锚点覆盖区间之外使用该多项式。',
  },
  {
    id: 'iers-earth-rotation',
    title: 'IERS EOP 产品与公报（Bulletin A / B / C，EOP 14 C04）',
    publisher: '国际地球自转与参考系统服务（IERS）',
    url: 'https://datacenter.iers.org/',
    note: 'ΔT = TT − UT1 的官方实测来源。本页 1973—2025 年的 ΔT 年度锚点值由此处的 UT1−UTC 与闰秒（TAI−UTC）数据换算得到，并与 USNO、NASA/GSFC 等来源交叉核对，逐条差异 ≤ 0.05 秒。',
  },
  {
    id: 'nao-rekiyou',
    title: '暦要項（二十四節気の日時）',
    publisher: '日本国立天文台（NAO）暦計算室',
    url: 'https://eco.mtk.nao.ac.jp/koyomi/yoko/',
    note: '用于校验本页节气算法的独立权威数据。已逐条比对 2024、2025 年二十四节气交节时刻（由日本标准时 UTC+9 换算为 UTC+8），最大偏差 1 分钟，而公布值本身只精确到分钟。',
  },
  {
    id: 'threejs-docs',
    title: 'Three.js 官方文档（含 OrbitControls）',
    publisher: 'three.js',
    url: 'https://threejs.org/docs/',
    note: '本页日地公转 3D 场景的实现参考。OrbitControls 见文档 Addons → Controls 一节，用于鼠标拖拽旋转、滚轮缩放等相机交互。',
  },
  {
    id: 'solar-system-scope-textures',
    title: 'Solar Textures（行星纹理贴图）',
    publisher: 'Solar System Scope（INOVE）',
    url: 'https://www.solarsystemscope.com/textures/',
    note: '地球、太阳等行星纹理贴图。页面声明以 CC BY 4.0（署名 4.0 国际）授权发布，贴图基于 NASA 高程与影像数据制作；本页 3D 场景使用其地球纹理并按许可要求署名。',
  },
]

export const DATA_NOTE: string =
  '节气时刻由太阳地心视黄经反解：以 VSOP87 截断级数算日地位置，加黄经章动与周年光行差修正，解出黄经为 15° 整数倍之时。力学时与民用时之间以 ΔT 换算 —— 1973—2025 年取 IERS / USNO 实测锚点值线性插值（多来源交叉核对差异 ≤ 0.05 秒），其余年份用 Espenak & Meeus 分段多项式并在两端平滑过渡；再换算为 UTC+8（Asia/Shanghai），中国 1991 年夏令时结束后全年 UTC+8。历法换算走儒略日算法而非浏览器的 Date 对象，因此公元前的年份也能正确处理。支持 −2000 — +6000 年，并按年份远近分为四档精度：A（1900—2100，±1 分钟，已与日本国立天文台《暦要項》逐条比对）、B（±5 分钟）、C（±30 分钟）、D（数小时量级，ΔT 外推所致）。「节气区间」指当前已进入的节气，「交节时刻」指它开始的确切瞬间。'
