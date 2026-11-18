/**
 * 长期演化报告（开发期工具，不参与运行时）
 *
 * 用当前的天文核心算出不同年代下的节气行为，用来回答
 * 「这套计算到底能撑到哪一年、误差会怎么长大」：
 *   · ΔT 的量级与它对交节时刻（民用时）的影响
 *   · 回归年长度的长期变化（检验模型有没有抓住长期项）
 *   · 二分二至之间季节长度的翻转（岁差把近日点搬到夏天）
 *   · 黄赤交角随年代的变化（南北回归线的位置）
 *   · JavaScript Date 的可用边界
 *
 * 用法：
 *   node node_modules/typescript/bin/tsc -p tsconfig.verify.json
 *   node scripts/longterm-report.cjs
 */
'use strict'

const path = require('node:path')
const V = path.join(__dirname, '..', '.verify')
const { solarTermsOfYear, sunLongitudeAtMs } = require(path.join(V, 'astro/solarTerms.js'))
const { deltaTSeconds } = require(path.join(V, 'astro/deltaT.js'))
const sunMod = require(path.join(V, 'astro/sun.js'))
const sf = require(path.join(V, 'astro/sceneFrame.js'))
const { TERMS } = require(path.join(V, 'data/terms.js'))

const DAY = 86400000
const pct = (v, d = 2) => (v >= 0 ? '+' : '') + v.toFixed(d)

function termOf(year, lon) {
  const list = solarTermsOfYear(year)
  return list.find((t) => t.longitude === lon)
}

console.log('═'.repeat(72))
console.log('长期演化报告：当前天文核心在不同年代的表现')
console.log('═'.repeat(72))

// ── 1. ΔT 与民用时刻的不确定性 ──
console.log('\n【1】ΔT 的量级 —— 它决定「交节时刻」能标到多准')
console.log('    年    ΔT(秒)      ΔT        影响民用时刻')
const YEARS = [2000, 2025, 2100, 2200, 2500, 3000, 5000, 8000, 10000, 20000, 50000, 100000]
for (const y of YEARS) {
  const dt = deltaTSeconds(y, 6)
  let human
  const abs = Math.abs(dt)
  if (abs < 90) human = `${abs.toFixed(0)} 秒`
  else if (abs < 5400) human = `${(abs / 60).toFixed(1)} 分钟`
  else if (abs < 172800) human = `${(abs / 3600).toFixed(1)} 小时`
  else human = `${(abs / 86400).toFixed(1)} 天`
  console.log(
    `  ${String(y).padStart(6)}  ${pct(dt, 0).padStart(9)}   ${human.padStart(10)}   ${abs < 60 ? '日期与时刻都可靠' : abs < 3600 ? '时刻偏几分钟，日期可靠' : abs < 86400 ? '日期可靠、时刻不可靠' : '连日期都不可靠'}`,
  )
}

// ── 2. 回归年长度 ──
console.log('\n【2】回归年长度（春分到春分）—— 检验模型是否抓住长期项')
console.log('    理论值：每世纪约缩短 0.53 秒（≈ 6.15e-6 日/世纪）')
const eqYears = [2000, 3000, 5000, 10000, 20000]
let prev = null
for (const y of eqYears) {
  const a = termOf(y, 0)
  const b = termOf(y + 1, 0)
  if (!a || !b) continue
  const len = (b.ms - a.ms) / DAY
  const rate = prev ? ((len - prev.len) / (y - prev.y)) * 100 : null
  console.log(
    `  ${String(y).padStart(6)} 年：${len.toFixed(6)} 日` +
      (rate === null ? '' : `   每世纪变化 ${(rate * 86400).toFixed(3)} 秒`),
  )
  prev = { y, len }
}

// ── 3. 季节长度翻转 ──
console.log('\n【3】北半球夏半年（春分→秋分）与冬半年（秋分→春分）的长度')
console.log('    当前近日点在 1 月初，落在冬半年内 → 冬半年短、夏半年长')
console.log('    岁差会把近日点搬到夏天，届时长短关系翻转')
for (const y of [2000, 4000, 6000, 8000, 10500, 13000, 16000, 20000]) {
  const sp = termOf(y, 0)
  const au = termOf(y, 180)
  const nextSp = termOf(y + 1, 0)
  if (!sp || !au || !nextSp) continue
  const summer = (au.ms - sp.ms) / DAY
  const winter = (nextSp.ms - sp.ms) / DAY - summer
  const longer = summer > winter ? '夏半年长' : '冬半年长'
  console.log(
    `  ${String(y).padStart(6)} 年：夏半年 ${summer.toFixed(3)} 日，冬半年 ${winter.toFixed(3)} 日  差值 ${pct(summer - winter, 3)} 日  → ${longer}`,
  )
}

// ── 4. 黄赤交角（南北回归线） ──
console.log('\n【4】黄赤交角 ε —— 决定南北回归线的纬度与地轴倾角')
console.log('    场景当前用的是固定常量 23.4393°（J2000），年代一远就不成立')
for (const y of [2000, 5000, 10000, 15000, 20000, 30000, 50000]) {
  const T = (y - 2000) / 100
  // IAU 2006 岁差给出的 ε₀ 多项式（本质是泰勒展开，几千年后已明显外推）
  const iau =
    (84381.406 - 46.836769 * T - 0.0001831 * T ** 2 + 0.0020034 * T ** 3) / 3600
  console.log(`  ${String(y).padStart(6)} 年：ε ≈ ${iau.toFixed(4)}°（回归线在 ±${iau.toFixed(3)}°）`)
}

// ── 5. 实际算一个远古/远未来年份 ──
console.log('\n【5】直接算几个「离谱」的年份，看现在的代码行不行')
for (const y of [1000, 3000, 8000, 20000, 100000]) {
  try {
    const list = solarTermsOfYear(y)
    const sp = list.find((t) => t.longitude === 0)
    const p = new Date(sp.ms)
    const residual = (() => {
      let d = sunLongitudeAtMs(sp.ms) - 0
      d = ((d % 360) + 540) % 360 - 180
      return Math.abs(d)
    })()
    console.log(
      `  ${String(y).padStart(6)} 年：春分 UTC ${p.toISOString().slice(0, 16)}  黄经残差 ${residual.toExponential(1)}°  ΔT=${deltaTSeconds(y, 3).toFixed(0)}s`,
    )
  } catch (e) {
    console.log(`  ${String(y).padStart(6)} 年：**失败** ${e.message}`)
  }
}

// ── 6. JavaScript Date 的边界 ──
console.log('\n【6】JavaScript Date 自身的边界（当前 time.ts 依赖它）')
const jdTests = [50, 99, 100, 1899, 1900, -500, 275760, 275761, 300000]
for (const y of jdTests) {
  const viaDate = Date.UTC(y, 0, 1)
  const d = new Date(viaDate)
  const realYear = Number.isFinite(viaDate) ? d.getUTCFullYear() : NaN
  const ok = Number.isFinite(viaDate) && realYear === y
  console.log(
    `  请求年 ${String(y).padStart(7)} → Date.UTC 得到 ${Number.isFinite(viaDate) ? String(realYear).padStart(7) : '  NaN  '}  ${ok ? '✓' : '✗ ' + (Number.isFinite(viaDate) ? `（被映射到 ${realYear} 年：0—99 会被当成 19xx）` : '（超出 Date 范围）')}`,
  )
}

// ── 7. 场景坐标常量 ──
console.log('\n【7】场景里写死的常量')
console.log(`  OBLIQUITY_DEG = ${sf.OBLIQUITY_DEG}（固定，不会随年代变化）`)
console.log(`  EARTH_AXIS    = (${sf.EARTH_AXIS.x.toFixed(4)}, ${sf.EARTH_AXIS.y.toFixed(4)}, ${sf.EARTH_AXIS.z.toFixed(4)})`)
console.log(`  节气数量      = ${TERMS.length}（15° 等分的约定，本身与年代无关）`)

// ── 8. 节气定义的健壮性 ──
console.log('\n【8】节气定义本身是否「永生」')
const t2000 = solarTermsOfYear(2000).find((t) => t.longitude === 0)
const t20000 = solarTermsOfYear(20000).find((t) => t.longitude === 0)
console.log('  定义：太阳地心视黄经 = 15° 的整数倍（含章动与光行差）。')
console.log('  这是纯几何约定，与年代无关，可无限外推 —— 只要还承认黄道与春分点的定义。')
console.log(
  `  2000 年春分黄经残差 ${Math.abs(sunLongitudeAtMs(t2000.ms)).toExponential(1)}°，` +
    `20000 年春分黄经残差 ${Math.abs(sunLongitudeAtMs(t20000.ms)).toExponential(1)}°`,
)
console.log('  残差始终极小 = 求解器一直收敛；但「解出来的时刻是否等于真实天象」是另一回事，')
console.log('  取决于级数截断误差与 ΔT 外推 —— 那才是精度的真正上限。')
console.log('')
