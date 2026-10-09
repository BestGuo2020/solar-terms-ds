/**
 * 节气数据导出 CLI（开发期工具，也是这套天文核心的「逃生舱」）
 *
 * 为什么单独写一个命令行工具？
 *   网页会死，框架会死，浏览器 API 会死，但**数据与算法不该跟着一起死**。
 *   这个脚本完全不依赖 Vue / Three.js / 浏览器，只用 Node 跑同一套 `src/astro/`
 *   纯计算代码，把任意年份区间的节气时刻导成 CSV / JSON / Markdown。
 *   哪怕将来这个网站不复存在，任何人拿到这个仓库仍然可以：
 *
 *     node node_modules/typescript/bin/tsc -p tsconfig.verify.json
 *     node scripts/export-terms.cjs --from 2000 --to 2030 --format csv > terms.csv
 *
 *   导出的数据自带精度等级与计算口径说明，脱离本页也能被理解与复核。
 *
 * 用法：
 *   node scripts/export-terms.cjs [选项]
 *     --from <年>      起始年份（含），默认 2025
 *     --to   <年>      结束年份（含），默认同 --from
 *     --format <fmt>   csv | json | md，默认 csv
 *     --tz <小时>      时区偏移，默认 8（北京时间）
 *     --help           显示帮助
 */

'use strict'

const path = require('node:path')
const fs = require('node:fs')

const V = path.join(__dirname, '..', '.verify')
if (!fs.existsSync(V)) {
  console.error(
    '未找到 .verify 目录，请先编译天文核心：\n' +
      '  node node_modules/typescript/bin/tsc -p tsconfig.verify.json',
  )
  process.exit(1)
}
fs.writeFileSync(path.join(V, 'package.json'), '{ "type": "commonjs" }\n', 'utf8')

const {
  solarTermsOfYear,
  precisionAt,
  YEAR_MIN,
  YEAR_MAX,
} = require(path.join(V, 'astro/solarTerms.js'))
const { deltaTSeconds } = require(path.join(V, 'astro/deltaT.js'))
const { julianDayFromUnix, sunApparentLongitude, DEG } = require(path.join(V, 'astro/sun.js'))
const { gregorianFromJd } = require(path.join(V, 'astro/julian.js'))

// ───────────────────────── 参数 ─────────────────────────

function parseArgs(argv) {
  const out = { from: 2025, to: null, format: 'csv', tz: 8, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') out.help = true
    else if (a === '--from') out.from = Number(argv[++i])
    else if (a === '--to') out.to = Number(argv[++i])
    else if (a === '--format') out.format = String(argv[++i]).toLowerCase()
    else if (a === '--tz') out.tz = Number(argv[++i])
  }
  if (out.to === null || !Number.isFinite(out.to)) out.to = out.from
  if (!Number.isFinite(out.from)) out.from = 2025
  return out
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log(
    [
      '节气数据导出工具',
      '',
      '  --from <年>     起始年份（含），默认 2025',
      '  --to   <年>     结束年份（含），默认与 --from 相同',
      '  --format <fmt>  csv | json | md，默认 csv',
      '  --tz <小时>     时区偏移，默认 8（北京时间）',
      `  支持的年份范围：${YEAR_MIN} — ${YEAR_MAX}`,
      '',
      '示例：',
      '  node scripts/export-terms.cjs --from 2000 --to 2030 --format csv > terms.csv',
      '  node scripts/export-terms.cjs --from 1900 --to 2100 --format json > terms.json',
    ].join('\n'),
  )
  process.exit(0)
}

const from = Math.max(YEAR_MIN, Math.min(YEAR_MAX, Math.round(args.from)))
const to = Math.max(YEAR_MIN, Math.min(YEAR_MAX, Math.round(args.to)))
if (to < from) {
  console.error(`结束年份 ${to} 早于起始年份 ${from}`)
  process.exit(1)
}

// ───────────────────────── 工具 ─────────────────────────

/** Unix 毫秒 → 指定时区的公历字段（不依赖 JS Date） */
function partsInZone(ms, tzHours) {
  const jd = julianDayFromUnix(ms) + tzHours / 24
  return gregorianFromJd(jd)
}

const pad = (n, w = 2) => String(n).padStart(w, '0')
function isoLike(p) {
  const y = p.year >= 0 && p.year <= 9999 ? String(p.year).padStart(4, '0') : (p.year < 0 ? '-' + String(-p.year).padStart(6, '0') : '+' + String(p.year).padStart(6, '0'))
  return `${y}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

/**
 * 复核：交节瞬间的太阳视黄经与目标黄经之差（度）。
 * 与运行时同口径 —— 把 UT 加回 ΔT 得到力学时再求视黄经。
 * 正常情况下应在 1e−6 度量级，若明显变大说明数据有问题。
 */
function residualDeg(ms, targetLon) {
  const p = partsInZone(ms, 0)
  const jde = julianDayFromUnix(ms) + deltaTSeconds(p.year, p.month) / 86400
  const lam = sunApparentLongitude(jde) / DEG
  return ((lam - targetLon) % 360 + 540) % 360 - 180
}

// ───────────────────────── 生成 ─────────────────────────

const rows = []
for (let y = from; y <= to; y++) {
  const info = precisionAt(y)
  for (const t of solarTermsOfYear(y)) {
    const p = partsInZone(t.ms, args.tz)
    rows.push({
      year: y,
      index: t.index + 1,
      name: t.name,
      season: t.season,
      longitudeDeg: t.longitude,
      major: t.major ? '是' : '',
      datetime: isoLike(p),
      date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
      time: `${pad(p.hour)}:${pad(p.minute)}`,
      precisionLevel: info.level,
      precisionLabel: info.timeLabel,
      deltaTSeconds: Number(deltaTSeconds(y, p.month).toFixed(1)),
      residualDeg: Number(residualDeg(t.ms, t.longitude).toExponential(2)),
    })
  }
}

const header = {
  generator: 'solar-terms-ds scripts/export-terms.cjs',
  definition:
    '节气 = 太阳地心视黄经为 15° 整数倍的瞬间（春分 0°、夏至 90°、秋分 180°、冬至 270°），含黄经章动与周年光行差。',
  method:
    'VSOP87D 截断级数（Meeus 附录 III）求地球日心黄道坐标 → 归算 FK5 → 加章动与光行差 → 牛顿迭代反解；力学时与民用时之间用 ΔT 换算。',
  deltaT:
    '1973—2025 年取 IERS / USNO 实测年度锚点线性插值；其余年份用 Espenak & Meeus 分段多项式并在区间两端平滑过渡。',
  timezone: `UTC${args.tz >= 0 ? '+' : ''}${args.tz}`,
  calendar: '外推格里高利历（proleptic Gregorian）',
  yearRange: `${from} — ${to}`,
  supportedRange: `${YEAR_MIN} — ${YEAR_MAX}`,
  precisionNote:
    'precisionLevel：A ≈ ±1 分钟（1900—2100，已与日本国立天文台《暦要項》逐条比对）；B ≈ ±5 分钟；C ≈ ±30 分钟；D 数小时量级。等级越低，ΔT 外推的不确定度越大。',
  exportedAt: new Date().toISOString(),
}

if (args.format === 'json') {
  process.stdout.write(JSON.stringify({ meta: header, terms: rows }, null, 1) + '\n')
} else if (args.format === 'md') {
  const lines = [
    `# 二十四节气交节时刻（${from} — ${to} 年）`,
    '',
    `- 时区：UTC${args.tz >= 0 ? '+' : ''}${args.tz}`,
    `- 历法：外推格里高利历`,
    `- 定义：${header.definition}`,
    `- 算法：${header.method}`,
    '',
    '| 年 | 节气 | 季节 | 太阳黄经 | 交节时刻 | 精度 | ΔT(秒) | 黄经残差 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const r of rows) {
    lines.push(
      `| ${r.year} | ${r.name} | ${r.season} | ${r.longitudeDeg}° | ${r.datetime.replace('T', ' ')} | ${r.precisionLevel} ${r.precisionLabel} | ${r.deltaTSeconds} | ${r.residualDeg}° |`,
    )
  }
  process.stdout.write(lines.join('\n') + '\n')
} else {
  const cols = Object.keys(rows[0] || {})
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    `# ${header.generator}`,
    `# 定义：${header.definition}`,
    `# 算法：${header.method}`,
    `# ΔT：${header.deltaT}`,
    `# 时区：${header.timezone}；历法：${header.calendar}；年份范围：${header.yearRange}`,
    `# 精度：${header.precisionNote}`,
    cols.join(','),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(',')),
  ]
  process.stdout.write(lines.join('\n') + '\n')
}

if (process.stderr.isTTY) {
  console.error(
    `已导出 ${rows.length} 条（${from} — ${to} 年，共 ${to - from + 1} 年，时区 UTC${args.tz >= 0 ? '+' : ''}${args.tz}）`,
  )
}