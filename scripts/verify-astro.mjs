import { readFileSync } from 'node:fs'
import {
  activeTermAt,
  solarStateAt,
  solarTermsOfYear,
  termInstantInYear,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
} from '../src/astro/solar-terms.ts'
import {
  formatDateTimeCN,
  beijingParts,
  fromBeijing,
} from '../src/astro/beijing-time.ts'
import { SOLAR_TERMS, SEASON_META } from '../src/data/term-catalog.ts'
import { SONG_LINES, SONG_TERM_SEQUENCE } from '../src/data/song.ts'
import { HISTORY_TIMELINE } from '../src/data/history.ts'
import { CULTURE_ASPECTS } from '../src/data/culture.ts'
import { SCIENCE_FAQ } from '../src/data/science.ts'
import { SOURCES, METHOD_NOTES } from '../src/data/sources.ts'
import {
  AXIAL_TILT_DEG,
  axisSunAngle,
  earthOrbitAngle,
  earthScenePosition,
  fixedEarthAxis,
} from '../src/astro/scene-geometry.ts'

let passed = 0
const failures = []

function assert(condition, message) {
  if (condition) {
    passed += 1
    return
  }
  failures.push(message)
  console.error(`✗ ${message}`)
}

function assertEqual(actual, expected, message) {
  assert(
    Object.is(actual, expected),
    `${message} (actual: ${String(actual)}, expected: ${String(expected)})`,
  )
}

function assertClose(actual, expected, epsilon, message) {
  assert(
    Number.isFinite(actual) && Math.abs(actual - expected) <= epsilon,
    `${message} (actual: ${actual}, expected: ${expected} ± ${epsilon})`,
  )
}

function angleDifference(a, b) {
  let difference = ((a - b) % 360 + 360) % 360
  if (difference > 180) difference -= 360
  return difference
}

const EXPECTED_LONGITUDES = [
  315, 330, 345, 0, 15, 30, 45, 60, 75, 90, 105, 120,
  135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300,
]

console.log('\n二十四节气 · 内容与天文自检\n')

// 1. 基础表
assertEqual(SOLAR_TERMS.length, 24, '基础表包含 24 个节气')
assertEqual(new Set(SOLAR_TERMS.map((term) => term.name)).size, 24, '节气名称唯一')
assertEqual(new Set(SOLAR_TERMS.map((term) => term.longitude)).size, 24, '节气黄经唯一')
assertEqual(SOLAR_TERMS.filter((term) => term.major).length, 4, '恰好有四个分至点')
for (const [index, term] of SOLAR_TERMS.entries()) {
  assertEqual(term.index, index, `${term.name} 传统序号连续`)
  assertEqual(term.longitude, EXPECTED_LONGITUDES[index], `${term.name} 黄经正确`)
  assert(term.name.length === 2, `${term.name} 名称长度为两字`)
  assert(Boolean(SEASON_META[term.season]), `${term.name} 季节合法`)
  assert(term.meaning.length >= 20, `${term.name} 有名称释义`)
  assert(term.climate.length >= 50, `${term.name} 有气候内容`)
  assert(term.phenology.length >= 50, `${term.name} 有物候内容`)
  assertEqual(term.pentads.length, 3, `${term.name} 三候齐备`)
  assert(term.pentads.every((pentad) => pentad.length >= 2), `${term.name} 三候非空`)
  assert(term.farming.length >= 30, `${term.name} 有农事内容`)
  assert(term.custom.length >= 30, `${term.name} 有习俗内容`)
  assert(term.food.length >= 20, `${term.name} 有饮食内容`)
  assert(term.poem.text.length >= 8, `${term.name} 有诗词`)
  assert(term.poem.author.length >= 1, `${term.name} 诗词作者存在`)
  assert(term.poem.source.length >= 2, `${term.name} 诗词出处存在`)
  assert(term.proverb.length >= 5, `${term.name} 有农谚`)
}
assertEqual(SOLAR_TERMS[0].name, '立春', '传统顺序以立春为首')
assertEqual(SOLAR_TERMS[23].name, '大寒', '传统顺序以大寒收束')
assertEqual(SOLAR_TERMS[3].name, '春分', '春分黄经为 0°')
assertEqual(SOLAR_TERMS[9].name, '夏至', '夏至黄经为 90°')
assertEqual(SOLAR_TERMS[15].name, '秋分', '秋分黄经为 180°')
assertEqual(SOLAR_TERMS[21].name, '冬至', '冬至黄经为 270°')

// 2. 24 节气时刻与已核对的天文年历
const reference = JSON.parse(
  readFileSync(new URL('./reference-nao.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''),
)
const byName = new Map(SOLAR_TERMS.map((term) => [term.name, term]))
let referenceCount = 0
let maxReferenceDifference = 0
for (const year of [2024, 2025]) {
  const referenceTerms = reference.years[String(year)].terms
  assertEqual(referenceTerms.length, 24, `${year} 年参考数据包含 24 个节气`)
  for (const entry of referenceTerms) {
    const base = byName.get(entry.name)
    assert(Boolean(base), `参考数据中的 ${entry.name} 可在基础表中找到`)
    if (!base) continue
    const computed = termInstantInYear(year, base.index)
    const expectedMs = fromBeijing(year, entry.month, entry.day, entry.hour, entry.minute)
    const difference = Math.abs(computed.ms - expectedMs)
    maxReferenceDifference = Math.max(maxReferenceDifference, difference)
    assert(
      difference < 120_000,
      `${year} 年 ${entry.name} 与 NAO 公布分钟起点的差小于 2 分钟`,
    )
    const parts = beijingParts(computed.ms)
    assertEqual(parts.year, year, `${year} 年 ${entry.name} 落在目标公历年`)
    referenceCount += 1
  }
}
assertEqual(referenceCount, 48, '2024、2025 年共校验 48 个交节时刻')
assert(
  maxReferenceDifference < 60_000,
  `与 NAO 公布分钟起点的最大差小于 1 分钟（实际 ${(maxReferenceDifference / 1000).toFixed(1)} 秒；官方精度为 1 分钟）`,
)

// 3. 每个节气时刻处的黄经反解残差、顺序、间隔
let maxLongitudeResidual = 0
const intervals = []
for (const year of [1900, 1950, 2024, 2025, 2026, 2100]) {
  const terms = solarTermsOfYear(year)
  assertEqual(terms.length, 24, `${year} 年有 24 个节气`)
  assertEqual(new Set(terms.map((item) => item.term.index)).size, 24, `${year} 年节气不重复`)
  for (let index = 0; index < terms.length; index += 1) {
    const occurrence = terms[index]
    assertEqual(beijingParts(occurrence.ms).year, year, `${year} 年 ${occurrence.term.name} 在目标年份`)
    if (index > 0) {
      assert(occurrence.ms > terms[index - 1].ms, `${year} 年节气按时间升序`)
      if (year === 2024) intervals.push(occurrence.ms - terms[index - 1].ms)
    }
    const residual = Math.abs(angleDifference(solarStateAt(occurrence.ms).sunLongitude, occurrence.term.longitude))
    maxLongitudeResidual = Math.max(maxLongitudeResidual, residual)
  }
  assertEqual(terms[0].term.name, '小寒', `${year} 年历表以 1 月的小寒开始`)
  assertEqual(terms[terms.length - 1].term.name, '冬至', `${year} 年历表以 12 月的冬至结束`)
}
assert(
  maxLongitudeResidual < 0.0001,
  `交节时刻太阳视黄经残差 < 0.0001°（实际 ${maxLongitudeResidual.toExponential(2)}°）`,
)
const intervalDays = intervals.map((value) => value / 86_400_000)
const shortest = Math.min(...intervalDays)
const longest = Math.max(...intervalDays)
assert(shortest > 14.6 && shortest < 15.0, `最短节气间隔约 14.7 天（实际 ${shortest.toFixed(3)} 天）`)
assert(longest > 15.4 && longest < 15.9, `最长节气间隔约 15.7 天（实际 ${longest.toFixed(3)} 天）`)
assert(longest - shortest > 0.6, '一年内节气间隔并非等分，存在明显快慢差异')
assertEqual(SUPPORTED_YEAR_MIN, 1900, '支持范围下限为 1900 年')
assertEqual(SUPPORTED_YEAR_MAX, 2100, '支持范围上限为 2100 年')

// 4. 交节边界与跨年
const chunfen2025 = termInstantInYear(2025, byName.get('春分').index)
const jingzhe2025 = termInstantInYear(2025, byName.get('惊蛰').index)
assertEqual(activeTermAt(jingzhe2025.ms + 1).current.term.name, '惊蛰', '惊蛰交节后进入惊蛰区间')
assertEqual(activeTermAt(chunfen2025.ms - 1).current.term.name, '惊蛰', '春分交节前仍在惊蛰区间')
assertEqual(activeTermAt(chunfen2025.ms).current.term.name, '春分', '春分交节瞬间切换为春分')
const newYear2025 = activeTermAt(fromBeijing(2025, 1, 1, 0, 0, 0))
assertEqual(newYear2025.current.term.name, '冬至', '1 月 1 日仍属于上一年冬至区间')
assertEqual(newYear2025.next.term.name, '小寒', '1 月 1 日的下一节气是当年小寒')
const xiaohan2025 = termInstantInYear(2025, byName.get('小寒').index)
assertEqual(activeTermAt(xiaohan2025.ms + 500).current.term.name, '小寒', '跨年后正确进入小寒')
assertEqual(activeTermAt(fromBeijing(2024, 12, 31, 23, 59, 59)).current.term.name, '冬至', '跨年前一夜仍是冬至')
assertEqual(activeTermAt(fromBeijing(2025, 12, 31, 23, 59, 59)).next.term.name, '小寒', '年末下一节气跨入下一年')
assertEqual(activeTermAt(termInstantInYear(2024, 0).ms + 1).current.term.name, '立春', '精确落入立春区间')
const boundaryStart = activeTermAt(fromBeijing(SUPPORTED_YEAR_MIN, 1, 1, 0, 0, 0))
assertEqual(boundaryStart.current.term.name, '冬至', '1900 年 1 月 1 日正确沿用了 1899 年冬至区间')
assertEqual(beijingParts(boundaryStart.current.ms).year, 1899, '支持范围边界的当前区间起点可追溯到上一年')
assertEqual(boundaryStart.next.term.name, '小寒', '1900 年年初的下一节气正确')
const boundaryEnd = activeTermAt(fromBeijing(SUPPORTED_YEAR_MAX, 12, 31, 23, 59, 59))
assertEqual(boundaryEnd.current.term.name, '冬至', '2100 年 12 月 31 日仍处于冬至区间')
assertEqual(boundaryEnd.next.term.name, '小寒', '2100 年年末的下一节气跨入 2101 年小寒')
assertEqual(beijingParts(boundaryEnd.next.ms).year, 2101, '支持范围上界之后的下一节气可计算')

// 5. 场景坐标、地轴与四季
assertEqual(earthOrbitAngle(0), 180, '太阳黄经 0° 时地球轨道方位为 180°')
assertEqual(earthOrbitAngle(90), 270, '太阳黄经 90° 时地球轨道方位为 270°')
assertEqual(earthOrbitAngle(195), 15, '太阳黄经 195° 时地球轨道方位为 15°')
const axis = fixedEarthAxis()
const axisAngle = (Math.acos(axis.y) * 180) / Math.PI
assertClose(axisAngle, AXIAL_TILT_DEG, 0.001, '地轴与黄道面法线夹角为 23.44°')
assertClose(AXIAL_TILT_DEG, 23.44, 0.001, '页面标注的 23.4° 与场景倾角一致')
const equinox = axisSunAngle(earthScenePosition(0, 1))
assertClose(equinox.northPoleTowardSun, 0, 0.000001, '春分时地轴不偏向或背离太阳')
const summer = axisSunAngle(earthScenePosition(90, 1))
assertClose(summer.northPoleTowardSun, Math.sin((AXIAL_TILT_DEG * Math.PI) / 180), 0.000001, '夏至时北半球依次倾向太阳')
const winter = axisSunAngle(earthScenePosition(270, 1))
assertClose(winter.northPoleTowardSun, -Math.sin((AXIAL_TILT_DEG * Math.PI) / 180), 0.000001, '冬至时北半球背向太阳')
const autumnEquinox = axisSunAngle(earthScenePosition(180, 1))
assertClose(autumnEquinox.northPoleTowardSun, 0, 0.000001, '秋分时地轴不偏向或背离太阳')

// 6. 节气歌位置映射
assertEqual(SONG_TERM_SEQUENCE.length, 24, '节气歌恰好映射 24 个节气')
assertEqual(new Set(SONG_TERM_SEQUENCE).size, 24, '节气歌映射不重复')
assertEqual([...SONG_TERM_SEQUENCE].sort((a, b) => a - b).join(','), Array.from({ length: 24 }, (_, i) => i).join(','), '节气歌覆盖全部 0—23')
const line1 = SONG_LINES[0].chars
assertEqual(line1[0].termIndex, 0, '第一句第 1 字「春」映射立春')
assertEqual(line1[3].termIndex, 3, '第一句第 4 字「春」映射春分')
const line2 = SONG_LINES[1].chars
assertEqual(line2[0].termIndex, 6, '第二句第 1 字「夏」映射立夏')
assertEqual(line2[3].termIndex, 9, '第二句第 4 字「夏」映射夏至')
assertEqual(line2[6].termIndex, 11, '「暑相连」末位映射大暑')
const line4 = SONG_LINES[3].chars
assertEqual(line4[1].termIndex, 19, '第一个「雪」映射小雪')
assertEqual(line4[2].termIndex, 20, '第二个「雪」映射大雪')
assertEqual(line4[0].termIndex, 18, '第一个「冬」映射立冬')
assertEqual(line4[3].termIndex, 21, '第二个「冬」映射冬至')
assertEqual(
  SONG_LINES.flatMap((line) => line.chars).filter((cell) => cell.termIndex === null).length,
  4,
  '节气歌中恰好有 4 个衬字',
)
assertEqual(SONG_LINES.reduce((total, line) => total + line.chars.length, 0), 28, '四句歌诀共 28 个字')

// 7. 历史、文化、科普与来源内容
assert(HISTORY_TIMELINE.length >= 10, '历史时间线条目完整')
for (const event of HISTORY_TIMELINE) {
  assert(Boolean(event.era && event.year && event.title && event.detail && event.source), `历史条目 ${event.id} 字段完整`)
}
const allHistory = HISTORY_TIMELINE.map((event) => `${event.year} ${event.title} ${event.detail}`).join(' ')
for (const keyword of ['公元前 104 年', '1645 年', '2016 年', '《淮南子', '《太初历', '《授时历', '《时宪历']) {
  assert(allHistory.includes(keyword), `历史时间线包含关键线索：${keyword}`)
}
assertEqual(CULTURE_ASPECTS.length, 6, '文化价值包含六个侧面')
assert(CULTURE_ASPECTS.every((aspect) => aspect.examples.length >= 2 && aspect.summary.length >= 20), '文化价值均有具体例子')
for (const id of ['why-seasons', 'uneven-intervals', 'stable-gregorian-dates', 'opposite-hemispheres']) {
  assert(SCIENCE_FAQ.some((faq) => faq.id === id), `科普问答包含必答问题：${id}`)
}
assert(SCIENCE_FAQ.length >= 4, '科普问答条目完整')
assert(SOURCES.length >= 12, '参考来源不少于 12 条')
assertEqual(new Set(SOURCES.map((source) => source.id)).size, SOURCES.length, '参考来源 id 唯一')
for (const source of SOURCES) {
  assert(Boolean(source.title && source.group), `来源 ${source.id} 有标题与分类`)
  if (source.url) {
    assert(/^https?:\/\//.test(source.url), `来源 ${source.id} 的 URL 合法`)
  }
}
assert(METHOD_NOTES.algorithm.includes('15°'), '方法说明包含黄经 15° 的定义')
assert(METHOD_NOTES.precision.includes('1 分钟'), '方法说明写明已校验的精度')
assert(METHOD_NOTES.timezone.includes('UTC+8'), '方法说明写明北京时间时区')

// 8. 北京时间
const sample = fromBeijing(2025, 3, 20, 17, 1, 26)
const parts = beijingParts(sample)
assertEqual(`${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`, '2025-3-20 17:1:26', '北京时间往返转换正确')
assert(formatDateTimeCN(sample, true).includes('2025年3月20日 17:01:26'), '交节时刻格式化到秒')

// 输出
console.log(`\n通过 ${passed} 项断言。`)
console.log(`参考年历：${referenceCount} 个时刻，与公布分钟起点最大差 ${(maxReferenceDifference / 1000).toFixed(1)} 秒（官方精度 1 分钟）。`)
console.log(`太阳视黄经最大反解残差：${maxLongitudeResidual.toExponential(2)}°。`)
console.log(`2024 年节气间隔：${shortest.toFixed(3)} — ${longest.toFixed(3)} 天。`)
console.log(
  `当前内容：${SOLAR_TERMS.length} 个节气 · ${HISTORY_TIMELINE.length} 条历史 · ${CULTURE_ASPECTS.length} 个文化侧面 · ${SCIENCE_FAQ.length} 个问答 · ${SOURCES.length} 条来源。`,
)
console.log(`支持年份：${SUPPORTED_YEAR_MIN}—${SUPPORTED_YEAR_MAX}，时区 ${METHOD_NOTES.timezone}。\n`)

if (failures.length > 0) {
  console.error(`失败 ${failures.length} 项：`)
  for (const failure of failures) console.error(` - ${failure}`)
  process.exitCode = 1
}
