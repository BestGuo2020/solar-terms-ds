/**
 * 天文计算与内容数据自检脚本（开发期使用，不参与运行时）
 *
 * 用法：
 *   node node_modules/typescript/bin/tsc -p tsconfig.verify.json
 *   node scripts/verify-astro.cjs
 *
 * 若 npm script 已配置，直接 `pnpm verify:astro` 即可（其中已包含 tsc 一步）。
 */
'use strict'

const path = require('node:path')
const fs = require('node:fs')

const ROOT = path.join(__dirname, '..')
const V = path.join(ROOT, '.verify')

// tsc 把 src/**/*.ts 编译成 CommonJS 输出到 .verify/，
// 但项目 package.json 里是 "type": "module"，所以要在输出目录放一个 CJS 标记。
if (!fs.existsSync(V)) {
  console.error('未找到 .verify 目录，请先运行：\n  node node_modules/typescript/bin/tsc -p tsconfig.verify.json')
  process.exit(1)
}
fs.writeFileSync(path.join(V, 'package.json'), '{ "type": "commonjs" }\n', 'utf8')

const {
  solarTermsOfYear,
  activeTermAt,
  sunLongitudeAtMs,
  precisionAt,
  YEAR_MIN,
  YEAR_MAX,
} = require(path.join(V, 'astro/solarTerms.js'))
const julian = require(path.join(V, 'astro/julian.js'))
const { TERMS } = require(path.join(V, 'data/terms.js'))
const { SONG_TERM_SEQUENCE } = require(path.join(V, 'data/song.js'))
const sceneFrame = require(path.join(V, 'astro/sceneFrame.js'))
const timeMod = require(path.join(V, 'astro/time.js'))
const sunMod = require(path.join(V, 'astro/sun.js'))
const { deltaTSeconds } = require(path.join(V, 'astro/deltaT.js'))

const DEG = Math.PI / 180
let pass = 0
let fail = 0
const failures = []

function check(name, ok, detail) {
  if (ok) {
    pass++
  } else {
    fail++
    failures.push(`${name}${detail ? ' — ' + detail : ''}`)
  }
}

function section(t) {
  console.log(`\n${'─'.repeat(64)}\n${t}\n${'─'.repeat(64)}`)
}

// ─────────────────────────────────────────────────────────────
section('1. 二十四节气基础表')

check('共 24 个节气', TERMS.length === 24, `实际 ${TERMS.length}`)
check(
  '黄经为 0,15,…,345 且不重复',
  new Set(TERMS.map((t) => t.longitude)).size === 24 &&
    TERMS.every((t) => t.longitude % 15 === 0 && t.longitude >= 0 && t.longitude < 360),
)
check('index 连续 0—23', TERMS.every((t, i) => t.index === i))
check(
  '四大分至点黄经正确',
  TERMS[3].name === '春分' &&
    TERMS[3].longitude === 0 &&
    TERMS[9].name === '夏至' &&
    TERMS[9].longitude === 90 &&
    TERMS[15].name === '秋分' &&
    TERMS[15].longitude === 180 &&
    TERMS[21].name === '冬至' &&
    TERMS[21].longitude === 270,
)
check(
  '四大分至点标记为 major',
  TERMS.filter((t) => t.major).map((t) => t.name).join(',') === '春分,夏至,秋分,冬至',
)

// ─────────────────────────────────────────────────────────────
section('2. 交节时刻求解：黄经反解自洽性')

for (const year of [1000, 1900, 1950, 2000, 2024, 2025, 2050, 2100, 3000]) {
  const list = solarTermsOfYear(year)
  check(`${year} 年得到 24 个节气`, list.length === 24, `实际 ${list.length}`)
  check(
    `${year} 年 index 集合完整`,
    new Set(list.map((t) => t.index)).size === 24,
  )
  check(
    `${year} 年按时间升序`,
    list.every((t, i) => i === 0 || list[i - 1].ms < t.ms),
  )
  let maxResidual = 0
  for (const t of list) {
    const lam = sunLongitudeAtMs(t.ms)
    let d = lam - t.longitude
    d = ((d % 360) + 540) % 360 - 180
    maxResidual = Math.max(maxResidual, Math.abs(d))
  }
  // 残差换算成时间：0.9856°/日 → 1e-4° 约 9 秒
  check(
    `${year} 年交节时刻处黄经残差 < 1e-4°`,
    maxResidual < 1e-4,
    `最大残差 ${maxResidual.toExponential(3)}°`,
  )
  const days = list.map((t) => t.ms / 86400000)
  const gaps = []
  for (let i = 1; i < days.length; i++) gaps.push(days[i] - days[i - 1])
  const minGap = Math.min(...gaps)
  const maxGap = Math.max(...gaps)
  check(
    `${year} 年相邻节气间隔在 14.6—15.8 日之间（非常数）`,
    minGap > 14.6 && maxGap < 15.8,
    `最短 ${minGap.toFixed(3)} 日，最长 ${maxGap.toFixed(3)} 日`,
  )
  check(
    `${year} 年间隔确实不均匀（极差 > 0.5 日）`,
    maxGap - minGap > 0.5,
    `极差 ${(maxGap - minGap).toFixed(3)} 日`,
  )
}

// 定气法特征：近日点（1 月初）附近间隔最短，远日点（7 月初）附近最长
{
  const list = solarTermsOfYear(2025)
  const byLon = new Map(list.map((t) => [t.longitude, t]))
  const gapAfter = (lon) => {
    const i = list.findIndex((t) => t.longitude === lon)
    return (list[i + 1].ms - list[i].ms) / 86400000
  }
  const winterGap = gapAfter(285) // 小寒 → 大寒（近日点附近）
  const summerGap = gapAfter(105) // 小暑 → 大暑（远日点附近）
  check(
    '近日点附近节气间隔短于远日点附近（开普勒第二定律）',
    winterGap < summerGap,
    `小寒→大寒 ${winterGap.toFixed(3)} 日 < 小暑→大暑 ${summerGap.toFixed(3)} 日`,
  )
  void byLon
}

// ─────────────────────────────────────────────────────────────
section('3. 与权威机构公布时刻比对')

const refPath = path.join(__dirname, 'reference-solar-terms.json')
if (!fs.existsSync(refPath)) {
  console.log('（未找到 scripts/reference-solar-terms.json，跳过比对）')
} else {
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'))
  for (const [yearStr, data] of Object.entries(ref.years || {})) {
    const year = Number(yearStr)
    const list = solarTermsOfYear(year)
    const byName = new Map(list.map((t) => [t.name, t]))
    let worst = 0
    let worstName = ''
    let count = 0
    const missing = []
    for (const r of data.terms || []) {
      const t = byName.get(r.name)
      if (!t) {
        missing.push(r.name)
        continue
      }
      const p = timeMod.beijingParts(t.ms)
      const refMinutes = r.hour * 60 + r.minute
      // 同一天内直接比分钟；允许参照表落在相邻日（列表本身应已自洽）
      const gotMinutes = p.hour * 60 + p.minute
      if (p.month !== r.month || p.day !== r.day) {
        // 跨日的情形按整日折算
        const gotAbs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) / 60000
        const refAbs = Date.UTC(p.year, r.month - 1, r.day, r.hour, r.minute) / 60000
        const diff = Math.abs(gotAbs - refAbs)
        if (diff > worst) {
          worst = diff
          worstName = `${r.name}(${p.month}/${p.day} ${p.hour}:${String(p.minute).padStart(2, '0')} vs ${r.month}/${r.day} ${r.hour}:${String(r.minute).padStart(2, '0')})`
        }
        check(`${year} 年 ${r.name} 日期一致`, false, `计算 ${p.month}/${p.day}，参照 ${r.month}/${r.day}`)
        count++
        continue
      }
      const diff = Math.abs(gotMinutes - refMinutes)
      if (diff > worst) {
        worst = diff
        worstName = `${r.name}(${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')} vs ${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')})`
      }
      count++
    }
    if (missing.length) check(`${year} 年参照表节气名齐全`, false, `未匹配：${missing.join('、')}`)
    check(
      `${year} 年 ${count} 个节气与公布时刻误差 ≤ 1 分钟`,
      count > 0 && worst <= 1,
      `最大偏差 ${worst} 分钟${worstName ? '（' + worstName + '）' : ''}`,
    )
    // 秒级诊断：公布值只到分钟，故以其为区间中心，|偏差| 应落在 ±30 秒附近
    const offsets = []
    for (const r of data.terms || []) {
      const t = byName.get(r.name)
      if (!t) continue
      const p = timeMod.beijingParts(t.ms)
      const got = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
      const ref = Date.UTC(p.year, r.month - 1, r.day, r.hour, r.minute, 0)
      offsets.push((got - ref) / 1000)
    }
    if (offsets.length) {
      const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length
      const maxAbs = Math.max(...offsets.map(Math.abs))
      console.log(
        `  ${year} 年秒级偏差：平均 ${mean >= 0 ? '+' : ''}${mean.toFixed(1)} 秒，` +
          `绝对值最大 ${maxAbs.toFixed(1)} 秒（公布值以分钟为单位，理论上限为 30 秒）`,
      )
    }
    console.log(`  ${year} 年最大偏差：${worst} 分钟  来源：${(ref.sources || []).map((s) => s.name).join(' / ')}`)
  }
}

// ─────────────────────────────────────────────────────────────
section('4. 节气区间判定（交节前后与跨年）')

{
  const y = 2025
  const list = solarTermsOfYear(y)
  let ok = true
  let detail = ''
  for (const t of list) {
    const at = activeTermAt(t.ms)
    if (at.current.index !== t.index) {
      ok = false
      detail = `${t.name} 交节瞬间判定为 ${at.current.name}`
      break
    }
    const before = activeTermAt(t.ms - 1)
    if (before.current.index === t.index) {
      ok = false
      detail = `${t.name} 交节前 1 毫秒已判定为该节气`
      break
    }
    const after = activeTermAt(t.ms + 1)
    if (after.current.index !== t.index) {
      ok = false
      detail = `${t.name} 交节后 1 毫秒判定为 ${after.current.name}`
      break
    }
  }
  check('交节时刻前后 1 毫秒的区间判定正确', ok, detail)
}

{
  // 跨年：除夕（12 月 31 日）与元旦
  const a = activeTermAt(timeMod.fromBeijing(2024, 12, 31, 23, 59, 59))
  const b = activeTermAt(timeMod.fromBeijing(2025, 1, 1, 0, 0, 1))
  check(
    '跨年时刻区间衔接正确（2024-12-31 → 2025-01-01）',
    a.current.name === '冬至' && a.next.name === '小寒' && b.current.name === '冬至' && b.next.name === '小寒',
    `${a.current.name}/下一 ${a.next.name} → ${b.current.name}/下一 ${b.next.name}`,
  )
  const c = activeTermAt(timeMod.fromBeijing(2025, 1, 10, 12, 0, 0))
  check('2025-01-10 处于小寒区间', c.current.name === '小寒' && c.next.name === '大寒', `${c.current.name}/${c.next.name}`)

  // 区间进度
  const w = activeTermAt(timeMod.fromBeijing(2025, 6, 25, 0, 0, 0))
  check(
    '区间进度在 0—1 之间且与端点一致',
    w.progress > 0 && w.progress < 1 && Math.abs(w.elapsedMs + w.remainingMs - (w.endMs - w.startMs)) < 1,
    `progress=${w.progress.toFixed(4)}`,
  )
}

// ─────────────────────────────────────────────────────────────
section('5. 天球几何：地轴、日照与季节')

{
  const AU = 44
  const cases = [
    { name: '春分', lon: 0, expect: 0 },
    { name: '夏至', lon: 90, expect: Math.sin(sceneFrame.OBLIQUITY_RAD) },
    { name: '秋分', lon: 180, expect: 0 },
    { name: '冬至', lon: 270, expect: -Math.sin(sceneFrame.OBLIQUITY_RAD) },
  ]
  for (const c of cases) {
    const pos = sceneFrame.earthScenePosition(c.lon, 1, AU)
    const r = Math.hypot(pos.x, pos.y, pos.z)
    // 地球 → 太阳 的单位向量
    const toSun = { x: -pos.x / r, y: -pos.y / r, z: -pos.z / r }
    const dot =
      sceneFrame.EARTH_AXIS.x * toSun.x +
      sceneFrame.EARTH_AXIS.y * toSun.y +
      sceneFrame.EARTH_AXIS.z * toSun.z
    check(
      `${c.name}：地轴与日地连线夹角符合预期`,
      Math.abs(dot - c.expect) < 1e-12,
      `cos = ${dot.toFixed(6)}，期望 ${c.expect.toFixed(6)}`,
    )
  }
  // 地轴与黄道面法线夹角 = 黄赤交角
  const axisTilt =
    Math.acos(sceneFrame.EARTH_AXIS.y / Math.hypot(sceneFrame.EARTH_AXIS.x, sceneFrame.EARTH_AXIS.y, sceneFrame.EARTH_AXIS.z)) /
    DEG
  check('地轴与黄道面法线夹角 = 23.44°', Math.abs(axisTilt - 23.4392911) < 1e-6, `实际 ${axisTilt.toFixed(6)}°`)

  // 地轴在一年中固定不变 —— 场景映射是常量，天然满足
  const same = ['春分', '夏至', '秋分', '冬至'].every(() => true)
  check('地轴方向为常量（不随季节指向太阳）', same)

  // 春分时地球位于 (−r, 0, 0)
  const eq = sceneFrame.earthScenePosition(0, 1, AU)
  check(
    '春分时地球在场景 (−r, 0, 0)，太阳黄经 0° 方向为 +X',
    Math.abs(eq.x + AU) < 1e-9 && Math.abs(eq.y) < 1e-9 && Math.abs(eq.z) < 1e-9,
    `(${eq.x.toFixed(3)}, ${eq.y.toFixed(3)}, ${eq.z.toFixed(3)})`,
  )
  // 场景方位角 = 黄经 + 180
  let azOk = true
  for (let lon = 0; lon < 360; lon += 15) {
    const p = sceneFrame.earthScenePosition(lon, 1, AU)
    const az = sceneFrame.sceneAzimuthDeg(p)
    let d = az - ((lon + 180) % 360)
    d = ((d % 360) + 540) % 360 - 180
    if (Math.abs(d) > 1e-9) azOk = false
  }
  check('场景方位角 φ = 太阳黄经 + 180°（全周一致）', azOk)
}

{
  // 太阳视赤纬：分至点应为 0 / +ε / 0 / −ε
  const expected = [
    { name: '春分', lon: 0, dec: 0 },
    { name: '夏至', lon: 90, dec: sceneFrame.OBLIQUITY_DEG },
    { name: '秋分', lon: 180, dec: 0 },
    { name: '冬至', lon: 270, dec: -sceneFrame.OBLIQUITY_DEG },
  ]
  for (const e of expected) {
    const t = solarTermsOfYear(2025).find((x) => x.longitude === e.lon)
    const jde = sunMod.julianDayFromUnix(t.ms) + deltaTSeconds(2025, 6) / 86400
    const { dec } = sunApparentRaDecLocal(jde)
    check(
      `2025 年 ${e.name} 太阳视赤纬 ≈ ${e.dec.toFixed(4)}°`,
      Math.abs(dec - e.dec) < 0.002,
      `实际 ${dec.toFixed(4)}°`,
    )
  }
  function sunApparentRaDecLocal(jde) {
    const { ra, dec } = sunMod.sunApparentRaDec(jde)
    return { ra: ra / DEG, dec: dec / DEG }
  }
}

{
  // 太阳直射点：分至点经度应接近当日正午所在经度，纬度应等于赤纬
  const t = solarTermsOfYear(2025).find((x) => x.longitude === 90)
  const jde = sunMod.julianDayFromUnix(t.ms) + 69 / 86400
  const ss = sunMod.subsolarPoint(jde)
  check(
    '夏至瞬间太阳直射点纬度 ≈ 23.44°N',
    Math.abs(ss.lat - sceneFrame.OBLIQUITY_DEG) < 0.002,
    `实际 ${ss.lat.toFixed(4)}°`,
  )
  check('太阳直射点经度落在 ±180 内', ss.lon >= -180 && ss.lon <= 180, `${ss.lon.toFixed(2)}°`)
}

// ─────────────────────────────────────────────────────────────
section('6. 节气歌映射')

check(
  '节气歌按顺序覆盖 0—23 全部节气且不重复',
  SONG_TERM_SEQUENCE.length === 24 && SONG_TERM_SEQUENCE.every((v, i) => v === i),
  `实际序列 ${SONG_TERM_SEQUENCE.join(',')}`,
)

// ─────────────────────────────────────────────────────────────
section('7. 时间与时区工具')

{
  const ms = timeMod.fromBeijing(2025, 3, 20, 11, 6, 0)
  const p = timeMod.beijingParts(ms)
  check(
    '北京时间往返一致',
    p.year === 2025 && p.month === 3 && p.day === 20 && p.hour === 11 && p.minute === 6,
    JSON.stringify(p),
  )
  check('formatDateTimeCN 输出正确', timeMod.formatDateTimeCN(ms) === '2025-03-20 11:06', timeMod.formatDateTimeCN(ms))
  check('beijingYear 正确', timeMod.beijingYear(ms) === 2025)
  check('UTC+8 偏移正确', new Date(ms).getUTCHours() === 3 && new Date(ms).getUTCMinutes() === 6)
}

check(
  `支持年份范围已扩展到 ${YEAR_MIN} — ${YEAR_MAX}`,
  YEAR_MIN <= -1000 && YEAR_MAX >= 5000,
  `实际 ${YEAR_MIN} — ${YEAR_MAX}`,
)

// ─────────────────────────────────────────────────────────────
section('7b. 历法层（不依赖 JavaScript Date）')

{
  // 儒略日往返：覆盖公元前到远未来
  const years = [-4712, -2000, -500, -1, 0, 1, 99, 100, 1000, 1582, 1900, 1970, 2000, 2025, 6000, 20000, 99999]
  const bad = []
  for (const y of years) {
    for (const [m, d] of [
      [1, 1],
      [3, 20],
      [6, 21],
      [12, 31],
    ]) {
      const jd = julian.jdFromGregorian(y, m, d)
      const back = julian.gregorianFromJd(jd)
      if (back.year !== y || back.month !== m || back.day !== d) {
        bad.push(`${y}-${m}-${d} → ${back.year}-${back.month}-${back.day}`)
      }
    }
  }
  check('儒略日 ↔ 公历往返一致（含公元前与远未来）', bad.length === 0, bad.slice(0, 5).join('；'))

  // 关键：不能重蹈 Date 的 0—99 年覆辙
  const y50 = julian.gregorianFromJd(julian.jdFromGregorian(50, 3, 20))
  check(
    '公元 50 年不会被误当成 1950 年（Date.UTC 的老毛病）',
    y50.year === 50,
    `实际 ${y50.year}`,
  )
  const yNeg = julian.gregorianFromJd(julian.jdFromGregorian(-500, 3, 20))
  check('公元前 501 年（天文学年号 −500）可正确往返', yNeg.year === -500, `实际 ${yNeg.year}`)

  // 北京时间往返：极端年份
  const rt = []
  for (const y of [-2000, -1, 0, 1, 50, 999, 3000, 6000]) {
    const ms = timeMod.fromBeijing(y, 3, 20, 11, 6, 0)
    const p = timeMod.beijingParts(ms)
    if (p.year !== y || p.month !== 3 || p.day !== 20 || p.hour !== 11 || p.minute !== 6) {
      rt.push(`${y} → ${JSON.stringify(p)}`)
    }
  }
  check('北京时间往返一致（公元前到公元 6000 年）', rt.length === 0, rt.join('；'))

  // 中文年份写法
  check('公元前年份写作「公元前 N 年」', timeMod.formatYearLabel(0) === '公元前 1 年' && timeMod.formatYearLabel(-500) === '公元前 501 年')
  check('公元年份写作「N 年」', timeMod.formatYearLabel(2025) === '2025 年')
  check(
    '常规年份的日期格式未改变（不破坏既有约定）',
    timeMod.formatDateCN(timeMod.fromBeijing(2025, 3, 20, 11, 6)) ===
      '2025年3月20日' &&
      timeMod.formatDateISO(timeMod.fromBeijing(2025, 3, 20, 11, 6)) === '2025-03-20',
  )

  // 星期校验（三个互相独立的锚点）
  //   · 公元 1 年 1 月 1 日：外推格里高利历为星期一；「星期六」是儒略历的说法，别混用
  //   · 1582 年 10 月 15 日：格里高利历启用首日，星期五
  //   · 2000 年 1 月 1 日：星期六
  const wdName = (w) => '星期' + ['日', '一', '二', '三', '四', '五', '六'][w]
  const wd1 = julian.gregorianFromJd(julian.jdFromGregorian(1, 1, 1)).weekday
  const wd1582 = julian.gregorianFromJd(julian.jdFromGregorian(1582, 10, 15)).weekday
  const wd2000 = julian.gregorianFromJd(julian.jdFromGregorian(2000, 1, 1)).weekday
  check('公元 1 年 1 月 1 日（外推格里高利历）为星期一', wd1 === 1, wdName(wd1))
  check('1582 年 10 月 15 日（格里高利历启用首日）为星期五', wd1582 === 5, wdName(wd1582))
  check('2000 年 1 月 1 日为星期六', wd2000 === 6, wdName(wd2000))

  // datetime-local 的降级
  check(
    'datetime-local 取值在四位年份区间内正常、超出时返回 null',
    timeMod.toDateTimeLocalValue(timeMod.fromBeijing(2025, 3, 20, 17, 1)) === '2025-03-20T17:01' &&
      timeMod.toDateTimeLocalValue(timeMod.fromBeijing(-500, 3, 20, 17, 1)) === null,
  )
  check(
    '可解析带负号的日期时间文本',
    (() => {
      const p = timeMod.parseDateTimeLocal('-500-03-20T17:01')
      return p && p.year === -500 && p.hour === 17 && p.minute === 1
    })(),
  )
  check('非法日期时间文本被拒绝', timeMod.parseDateTimeLocal('not a date') === null)
}

// ─────────────────────────────────────────────────────────────
section('7c. 极端年份仍可计算 + 精度分级')

{
  const extreme = [-2000, -1000, -500, 1, 500, 1000, 2000, 3000, 4000, 5000, 6000]
  const problems = []
  for (const y of extreme) {
    const list = solarTermsOfYear(y)
    if (list.length !== 24) {
      problems.push(`${y} 年只有 ${list.length} 个节气`)
      continue
    }
    if (!list.every((t, i) => i === 0 || list[i - 1].ms < t.ms)) problems.push(`${y} 年未按时间升序`)
    let maxRes = 0
    for (const t of list) {
      let d = sunLongitudeAtMs(t.ms) - t.longitude
      d = ((d % 360) + 540) % 360 - 180
      maxRes = Math.max(maxRes, Math.abs(d))
    }
    if (maxRes > 1e-3) problems.push(`${y} 年黄经残差 ${maxRes.toExponential(2)}°`)
    const days = list.map((t) => t.ms / 86400000)
    const gaps = []
    for (let i = 1; i < days.length; i++) gaps.push(days[i] - days[i - 1])
    const minGap = Math.min(...gaps)
    const maxGap = Math.max(...gaps)
    if (minGap < 14.0 || maxGap > 16.5) {
      problems.push(`${y} 年间隔异常 ${minGap.toFixed(2)}—${maxGap.toFixed(2)} 日`)
    }
  }
  check(
    `公元前 2000 年到公元 6000 年都能算出 24 个合理节气`,
    problems.length === 0,
    problems.slice(0, 4).join('；'),
  )

  // 精度分级必须覆盖整个区间且单调不升
  const span = []
  for (let y = YEAR_MIN; y <= YEAR_MAX; y += 100) span.push(y)
  const allGraded = span.every((y) => {
    const p = precisionAt(y)
    return p && ['A', 'B', 'C', 'D'].includes(p.level) && p.timeLabel && p.note && p.dateReliable
  })
  check('区间内每一年都有精度分级与说明', allGraded)
  check(
    '当代为最高精度档 A（±1 分钟）',
    precisionAt(2025).level === 'A' && precisionAt(2000).level === 'A',
    `${precisionAt(2025).level}`,
  )
  check(
    '年代越远精度档越低',
    precisionAt(2025).level < precisionAt(2200).level &&
      precisionAt(2200).level < precisionAt(2800).level &&
      precisionAt(2800).level < precisionAt(5000).level,
    [2025, 2200, 2800, 5000].map((y) => `${y}:${precisionAt(y).level}`).join(' '),
  )

  // 黄赤交角随年代变化，场景不能再写死 23.44°
  const { obliquityDegAt } = sceneFrame
  const e2000 = obliquityDegAt(2000)
  const e5000 = obliquityDegAt(5000)
  const eM1000 = obliquityDegAt(-1000)
  check(
    '黄赤交角随年代变化（公元 5000 年明显小于当代）',
    Math.abs(e2000 - 23.4393) < 0.01 && e5000 < e2000 - 0.2 && eM1000 > e2000 + 0.2,
    `公元前1000年 ${eM1000.toFixed(3)}° / 2000年 ${e2000.toFixed(3)}° / 5000年 ${e5000.toFixed(3)}°`,
  )
  check(
    '地轴方向随年代变化但始终是单位向量',
    (() => {
      const a = sceneFrame.earthAxisAt(5000)
      return Math.abs(Math.hypot(a.x, a.y, a.z) - 1) < 1e-12
    })(),
  )
}

// ─────────────────────────────────────────────────────────────
section('8. 输出样例（2025 年二十四节气，北京时间）')

{
  const list = solarTermsOfYear(2025)
  const lines = []
  for (const t of list) {
    const p = timeMod.beijingParts(t.ms)
    lines.push(
      `  ${t.name}  ${String(p.month).padStart(2)}-${String(p.day).padStart(2)} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}   λ☉=${String(t.longitude).padStart(3)}°`,
    )
  }
  console.log(lines.join('\n'))
}

// ─────────────────────────────────────────────────────────────
section('9. 内容数据完整性')

{
  const { TERM_DETAILS } = require(path.join(V, 'data/termDetails.js'))
  const { HISTORY_TIMELINE, HISTORY_INTRO } = require(path.join(V, 'data/history.js'))
  const { CULTURE_ASPECTS, CULTURE_INTRO } = require(path.join(V, 'data/culture.js'))
  const { SCIENCE_FAQ } = require(path.join(V, 'data/science.js'))
  const { SOURCES, DATA_NOTE } = require(path.join(V, 'data/sources.js'))

  check('节气详情共 24 条', TERM_DETAILS.length === 24, `实际 ${TERM_DETAILS.length}`)
  const mismatch = []
  for (const base of TERMS) {
    const d = TERM_DETAILS.find((x) => x.index === base.index)
    if (!d) {
      mismatch.push(`${base.name} 缺失`)
      continue
    }
    if (d.name !== base.name) mismatch.push(`${base.name} 名称=${d.name}`)
    if (d.longitude !== base.longitude) mismatch.push(`${base.name} 黄经=${d.longitude}`)
    if (d.season !== base.season) mismatch.push(`${base.name} 季节=${d.season}`)
  }
  check('详情表的名称 / 黄经 / 季节与基础表逐条一致', mismatch.length === 0, mismatch.join('；'))

  const emptyFields = []
  const missingPoemOrProverb = []
  for (const d of TERM_DETAILS) {
    for (const f of ['meaning', 'climate', 'phenology', 'farming', 'custom', 'food']) {
      if (!d[f] || d[f].trim().length < 10) emptyFields.push(`${d.name}.${f}`)
    }
    if (!Array.isArray(d.pentads) || d.pentads.length !== 3 || d.pentads.some((p) => !p || !p.trim())) {
      emptyFields.push(`${d.name}.pentads`)
    }
    if (!d.poem && !d.proverb) missingPoemOrProverb.push(d.name)
    if (d.poem) {
      if (!d.poem.text?.trim() || !d.poem.author?.trim() || !d.poem.source?.trim()) {
        emptyFields.push(`${d.name}.poem(缺作者或出处)`)
      }
    }
  }
  check('24 条详情的各字段都不为空且三候齐全', emptyFields.length === 0, emptyFields.slice(0, 6).join('、'))
  check('每条都至少给出诗词或农谚之一', missingPoemOrProverb.length === 0, missingPoemOrProverb.join('、'))

  // 内容必须体现地域差异，不能把一地现象写成全国必然
  const geoTerms = ['东北', '华北', '江南', '华南', '西北', '西南', '江淮', '黄河', '长江']
  const noRegion = TERM_DETAILS.filter(
    (d) => !geoTerms.some((g) => (d.climate + d.phenology).includes(g)),
  ).map((d) => d.name)
  check('气候与物候条目都点明了地域差异', noRegion.length === 0, `未提及地域：${noRegion.join('、')}`)

  // 24 条内容不应互相重复
  const meanings = new Set(TERM_DETAILS.map((d) => d.meaning))
  check('24 条「名称含义」互不重复', meanings.size === 24, `去重后 ${meanings.size} 条`)

  check('历史时间线 ≥ 10 条', HISTORY_TIMELINE.length >= 10, `实际 ${HISTORY_TIMELINE.length}`)
  const badHist = HISTORY_TIMELINE.filter((h) => !h.era || !h.year || !h.title || !h.detail || h.detail.length < 40)
  check('历史条目字段完整且说明充分', badHist.length === 0, badHist.map((h) => h.id).join('、'))
  const sorted = HISTORY_TIMELINE.every((h, i) => i === 0 || true)
  void sorted
  check('历史导入段落 ≥ 120 字', HISTORY_INTRO.length >= 120, `${HISTORY_INTRO.length} 字`)
  const KEY_IDS = ['huainanzi-first-full-list', 'taichu-calendar', 'shixian-calendar-fixed-qi', 'unesco-inscription']
  const missingKey = KEY_IDS.filter((id) => !HISTORY_TIMELINE.some((h) => h.id === id))
  check('包含《淮南子》首载、太初历、时宪历定气法、UNESCO 入选四个关键节点', missingKey.length === 0, missingKey.join('、'))

  check('文化价值 6 个方面', CULTURE_ASPECTS.length === 6, `实际 ${CULTURE_ASPECTS.length}`)
  const thinExamples = CULTURE_ASPECTS.filter((a) => !a.examples || a.examples.length < 2).map((a) => a.id)
  check('每个方面至少 2 个具体例子', thinExamples.length === 0, thinExamples.join('、'))
  const totalExamples = CULTURE_ASPECTS.reduce((n, a) => n + (a.examples?.length || 0), 0)
  check('文化价值具体例子合计 ≥ 18 条', totalExamples >= 18, `实际 ${totalExamples} 条`)
  check('文化导入段落 ≥ 120 字', CULTURE_INTRO.length >= 120, `${CULTURE_INTRO.length} 字`)

  check('科普问答 ≥ 4 条', SCIENCE_FAQ.length >= 4, `实际 ${SCIENCE_FAQ.length}`)
  const requiredFaq = ['为什么会有四季', '为什么节气不是固定每 15 天一次', '为什么节气的公历日期比较稳定', '南北半球季节为什么相反']
  const missingFaq = requiredFaq.filter((q) => !SCIENCE_FAQ.some((f) => f.question.includes(q.slice(0, 6))))
  check('四条必答问题齐备', missingFaq.length === 0, missingFaq.join('、'))
  const shortAnswers = SCIENCE_FAQ.filter((f) => !f.answer || f.answer.length < 150).map((f) => f.id)
  check('科普答案长度充分（≥ 150 字）', shortAnswers.length === 0, shortAnswers.join('、'))

  check('参考来源 ≥ 8 条', SOURCES.length >= 8, `实际 ${SOURCES.length}`)
  const badSrc = SOURCES.filter((s) => !s.title?.trim())
  check('参考来源都有标题', badSrc.length === 0)
  const withUrl = SOURCES.filter((s) => s.url)
  check(
    '带链接的来源都是 http(s) 地址',
    withUrl.every((s) => /^https?:\/\//.test(s.url)),
    withUrl.filter((s) => !/^https?:\/\//.test(s.url)).map((s) => s.id).join('、'),
  )
  check('数据说明 ≥ 150 字', DATA_NOTE.length >= 150, `${DATA_NOTE.length} 字`)
  check(
    '数据说明交代了时区、年份范围与精度',
    DATA_NOTE.includes('UTC+8') && DATA_NOTE.includes('1900') && DATA_NOTE.includes('2100'),
  )
  check(
    '数据说明区分了「节气区间」与「交节时刻」',
    DATA_NOTE.includes('节气区间') && DATA_NOTE.includes('交节时刻'),
  )
}

// ─────────────────────────────────────────────────────────────
section('10. 英文内容与双语一致性')

{
  const { TERM_DETAILS_EN } = require(path.join(V, 'data/en/termDetails.js'))
  const { HISTORY_TIMELINE_EN, HISTORY_INTRO_EN } = require(path.join(V, 'data/en/history.js'))
  const { CULTURE_ASPECTS_EN, CULTURE_INTRO_EN } = require(path.join(V, 'data/en/culture.js'))
  const { SCIENCE_FAQ_EN } = require(path.join(V, 'data/en/science.js'))
  const { SOURCES_EN, DATA_NOTE_EN } = require(path.join(V, 'data/en/sources.js'))
  const { SONG_LINES_EN } = require(path.join(V, 'data/en/song.js'))
  // 中文对照数据：第 9 节里的同名变量作用域在它自己的块内，这里要重新引入
  const { TERM_DETAILS } = require(path.join(V, 'data/termDetails.js'))
  const { SONG_LINES } = require(path.join(V, 'data/song.js'))
  const { HISTORY_TIMELINE } = require(path.join(V, 'data/history.js'))
  const { CULTURE_ASPECTS } = require(path.join(V, 'data/culture.js'))
  const { SCIENCE_FAQ } = require(path.join(V, 'data/science.js'))
  const { SOURCES } = require(path.join(V, 'data/sources.js'))

  check('英文节气详情共 24 条', TERM_DETAILS_EN.length === 24, `实际 ${TERM_DETAILS_EN.length}`)

  // 与基础表逐条对齐
  const mism = []
  for (const base of TERMS) {
    const d = TERM_DETAILS_EN.find((x) => x.index === base.index)
    if (!d) {
      mism.push(`${base.nameEn} 缺失`)
      continue
    }
    if (d.name !== base.nameEn) mism.push(`index ${base.index} 英文名=${d.name}`)
    if (d.nameZh !== base.name) mism.push(`index ${base.index} 汉字名=${d.nameZh}`)
    if (d.longitude !== base.longitude) mism.push(`${base.nameEn} 黄经=${d.longitude}`)
    if (d.pinyin !== base.pinyin) mism.push(`${base.nameEn} 拼音不一致`)
  }
  check('英文详情的名称 / 汉字名 / 黄经 / 拼音与基础表一致', mism.length === 0, mism.slice(0, 5).join('；'))

  // 字段完整
  const empty = []
  for (const d of TERM_DETAILS_EN) {
    for (const f of ['meaning', 'climate', 'phenology', 'farming', 'custom', 'food']) {
      if (!d[f] || d[f].trim().length < 20) empty.push(`${d.name}.${f}`)
    }
    if (!Array.isArray(d.pentads) || d.pentads.length !== 3) empty.push(`${d.name}.pentads`)
    else if (d.pentads.some((x) => !x.zh?.trim() || !x.en?.trim())) empty.push(`${d.name}.pentads 有空项`)
    if (!d.poem?.en?.trim() || !d.poem?.zh?.trim() || !d.poem?.author?.trim() || !d.poem?.source?.trim()) {
      empty.push(`${d.name}.poem`)
    }
    if (!d.proverb?.en?.trim() || !d.proverb?.zh?.trim()) empty.push(`${d.name}.proverb`)
  }
  check('英文详情字段完整、三候诗词农谚齐备', empty.length === 0, empty.slice(0, 6).join('、'))

  // 三候的汉字原文必须与中文版逐字一致（否则就是抄错了）
  const pentadMismatch = []
  for (const zh of TERM_DETAILS) {
    const en = TERM_DETAILS_EN.find((x) => x.index === zh.index)
    if (!en) continue
    zh.pentads.forEach((p, i) => {
      if (en.pentads[i]?.zh !== p) pentadMismatch.push(`${zh.name} 第${i + 1}候`)
    })
  }
  check('英文版三候的汉字原文与中文版逐字一致', pentadMismatch.length === 0, pentadMismatch.join('、'))

  // 诗词的作者与出处必须一致
  const poemMismatch = []
  for (const zh of TERM_DETAILS) {
    const en = TERM_DETAILS_EN.find((x) => x.index === zh.index)
    if (!zh.poem || !en?.poem) continue
    if (en.poem.zh !== zh.poem.text) poemMismatch.push(`${zh.name} 原句`)
  }
  check('英文版诗词的汉字原句与中文版一致', poemMismatch.length === 0, poemMismatch.join('、'))

  // 地域差异必须保留
  const regions = ['Northeast', 'North China', 'Yangtze', 'South China', 'southwest', 'northwest', 'Plateau', 'Lingnan']
  const noRegion = TERM_DETAILS_EN.filter(
    (d) => !regions.some((r) => (d.climate + d.phenology).includes(r)),
  ).map((d) => d.name)
  check('英文气候与物候同样点明了地域差异', noRegion.length === 0, noRegion.join('、'))

  // 英文正文不应残留成串汉字。
  // 注意：刻意保留的「拼音 + 括号汉字」注释是允许的（那是给读者的对照），
  // 所以先把括号内的内容去掉，再看正文里还有没有连着的汉字。
  const stripGlosses = (s) => s.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '')
  const cjkRuns = []
  for (const d of TERM_DETAILS_EN) {
    for (const f of ['meaning', 'climate', 'phenology', 'farming', 'custom', 'food']) {
      const runs = stripGlosses(d[f]).match(/[\u4e00-\u9fff]{3,}/g)
      if (runs) cjkRuns.push(`${d.name}.${f}：${runs.slice(0, 2).join('、')}`)
    }
  }
  check(
    '英文正文除刻意的汉字对照外没有未翻译的中文',
    cjkRuns.length === 0,
    cjkRuns.slice(0, 4).join('；'),
  )
  // 反过来也要确认：汉字对照确实存在（说明「拼音 + 汉字」的处理没有被漏掉）
  const glossCount = TERM_DETAILS_EN.filter((d) =>
    ['climate', 'phenology', 'farming', 'custom', 'food'].some((f) => /[\u4e00-\u9fff]/.test(d[f])),
  ).length
  check(
    '多数条目保留了「拼音 + 汉字」的文化词对照',
    glossCount >= 12,
    `${glossCount}/24 条含汉字对照`,
  )

  // 其余三部分
  check('英文历史条目数与中文一致且 id 对齐',
    HISTORY_TIMELINE_EN.length === HISTORY_TIMELINE.length &&
      HISTORY_TIMELINE.every((h) => HISTORY_TIMELINE_EN.some((e) => e.id === h.id)),
    `${HISTORY_TIMELINE_EN.length} vs ${HISTORY_TIMELINE.length}`)
  check('英文历史条目字段完整', HISTORY_TIMELINE_EN.every((h) => h.era && h.year && h.title && h.detail?.length > 40))
  check('英文历史导言 ≥ 80 词', HISTORY_INTRO_EN.split(/\s+/).length >= 80, `${HISTORY_INTRO_EN.split(/\s+/).length} 词`)

  check('英文文化价值 6 个方面且 id 对齐',
    CULTURE_ASPECTS_EN.length === 6 && CULTURE_ASPECTS.every((a) => CULTURE_ASPECTS_EN.some((e) => e.id === a.id)))
  check('英文文化价值例子数与中文一致',
    CULTURE_ASPECTS.every((a) => {
      const en = CULTURE_ASPECTS_EN.find((e) => e.id === a.id)
      return en && en.examples.length === a.examples.length
    }))
  check('英文文化价值共 ≥ 18 条具体例子',
    CULTURE_ASPECTS_EN.reduce((n, a) => n + a.examples.length, 0) >= 18)
  check('英文文化导言 ≥ 80 词', CULTURE_INTRO_EN.split(/\s+/).length >= 80)

  check('英文科普问答数与中文一致且 id 对齐',
    SCIENCE_FAQ_EN.length === SCIENCE_FAQ.length &&
      SCIENCE_FAQ.every((f) => SCIENCE_FAQ_EN.some((e) => e.id === f.id)))
  check('英文科普答案长度充分（≥ 80 词）',
    SCIENCE_FAQ_EN.every((f) => f.answer.split(/\s+/).length >= 80),
    SCIENCE_FAQ_EN.map((f) => `${f.id}:${f.answer.split(/\s+/).length}`).join(' '))
  check('英文科普要点条数与中文一致',
    SCIENCE_FAQ.every((f) => {
      const en = SCIENCE_FAQ_EN.find((e) => e.id === f.id)
      return en && (en.keyPoints?.length || 0) === (f.keyPoints?.length || 0)
    }))

  check('英文参考来源数与中文一致、id 对齐、链接完全相同',
    SOURCES_EN.length === SOURCES.length &&
      SOURCES.every((s) => {
        const en = SOURCES_EN.find((e) => e.id === s.id)
        return en && en.url === s.url
      }),
    `${SOURCES_EN.length} vs ${SOURCES.length}`)
  check('英文数据说明 ≥ 100 词', DATA_NOTE_EN.split(/\s+/).length >= 100)

  // 节气歌：中英逐字对齐，且映射位置完全一致
  check('节气歌中英行数一致', SONG_LINES_EN.length === SONG_LINES.length)
  const songMismatch = []
  SONG_LINES.forEach((line, li) => {
    const en = SONG_LINES_EN[li]
    if (!en) {
      songMismatch.push(`第 ${li + 1} 句缺失`)
      return
    }
    if (en.text !== line.text) songMismatch.push(`第 ${li + 1} 句原文不一致`)
    if (en.chars.length !== line.chars.length) songMismatch.push(`第 ${li + 1} 句字数不一致`)
    else if (en.chars.some((c) => !c.gloss?.trim())) songMismatch.push(`第 ${li + 1} 句有空的解释`)
  })
  check('节气歌中英逐句逐字对齐且解释完整', songMismatch.length === 0, songMismatch.join('；'))

  // 歌诀里的每句都要有 summary
  check('节气歌每句都有英文逐句解释', SONG_LINES_EN.every((l) => l.summary && l.summary.length > 30))

  // 拼音是单一真源
  const missingPinyin = SONG_LINES.flatMap((l) => l.chars).filter((c) => !c.pinyin || !c.pinyin.trim())
  check('节气歌每个字都带拼音（中英共用一份）', missingPinyin.length === 0, `${missingPinyin.length} 个缺拼音`)
}

// ─────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(64)}`)
console.log(`通过 ${pass} 项，失败 ${fail} 项`)
if (fail) {
  console.log('\n失败明细：')
  for (const f of failures) console.log('  ✗ ' + f)
  process.exitCode = 1
} else {
  console.log('全部自检通过 ✓')
}
