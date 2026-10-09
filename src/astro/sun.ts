/**
 * 太阳地心视位置计算
 *
 * 流程（严格按 Meeus《Astronomical Algorithms》第 2 版）：
 *   1. VSOP87D 截断级数求地球日心黄道坐标 (L, B, R)            —— 第 32 章
 *   2. 换算为太阳地心黄经 Θ = L + 180°，黄纬 β = −B
 *   3. 归算到 FK5 系统（ΔΘ = −0.09033″）                        —— 25.9 式
 *   4. 加黄经章动 Δψ 与周年光行差 −20.4898″/R                    —— 25.10 式
 * 得到 **太阳地心视黄经**（真春分点、黄道of date）。
 *
 * 该量正是二十四节气的定义依据：春分 0°、夏至 90°、秋分 180°、冬至 270°。
 */

import {
  EARTH_B0,
  EARTH_B1,
  EARTH_L0,
  EARTH_L1,
  EARTH_L2,
  EARTH_L3,
  EARTH_L4,
  EARTH_L5,
  EARTH_R0,
  EARTH_R1,
  EARTH_R2,
  EARTH_R3,
  EARTH_R4,
  seriesTotal,
} from './vsop87'

export const DEG = Math.PI / 180
export const ARCSEC = DEG / 3600
export const J2000 = 2451545.0

/** 儒略日 ← Unix 毫秒（UTC） */
export function julianDayFromUnix(ms: number): number {
  return ms / 86400000 + 2440587.5
}

/** Unix 毫秒（UTC） ← 儒略日 */
export function unixFromJulianDay(jd: number): number {
  return (jd - 2440587.5) * 86400000
}

/** 儒略世纪数（自 J2000 起） */
export function julianCenturies(jde: number): number {
  return (jde - J2000) / 36525
}

/** 儒略千年数（自 J2000 起） */
export function julianMillennia(jde: number): number {
  return (jde - J2000) / 365250
}

export function norm360(deg: number): number {
  const r = deg % 360
  return r < 0 ? r + 360 : r
}

export function norm180(deg: number): number {
  let r = norm360(deg)
  if (r > 180) r -= 360
  return r
}

function norm2pi(rad: number): number {
  const t = Math.PI * 2
  const r = rad % t
  return r < 0 ? r + t : r
}

export interface EarthHeliocentric {
  /** 日心黄经（弧度） */
  L: number
  /** 日心黄纬（弧度） */
  B: number
  /** 日心距离（天文单位 AU） */
  R: number
}

/**
 * 地球日心黄道坐标（VSOP87D，平春分点与平黄道 of date）。
 * 精度：1900—2100 年约 1″；外推到 −2000 — +6000 年误差缓慢增长。
 *
 * 注意：Meeus 附录 III 给出的 L、B、R 三组级数**统一以 1e−8 为单位**
 * （L、B 为 1e−8 弧度，R 为 1e−8 天文单位），故三者都要除以 1e8。
 * 例如 L0 的常数项 175347056e−8 = 1.75347 rad = 100.47°，
 * 正是 J2000 时刻地球的日心黄经；L1 常数项 628331966747e−8 rad/千年
 * 折合 0.9856°/日，正是太阳黄经的平均变化率。
 */
export function earthHeliocentric(jde: number): EarthHeliocentric {
  const tau = julianMillennia(jde)
  const L = seriesTotal(tau, EARTH_L0, EARTH_L1, EARTH_L2, EARTH_L3, EARTH_L4, EARTH_L5) / 1e8
  const B = seriesTotal(tau, EARTH_B0, EARTH_B1) / 1e8
  const R = seriesTotal(tau, EARTH_R0, EARTH_R1, EARTH_R2, EARTH_R3, EARTH_R4) / 1e8
  return { L: norm2pi(L), B, R }
}

/**
 * 黄经章动 Δψ（弧度）。Meeus 22.2 式的简化式，精度约 0.5″。
 * 0.5″ 对应的节气时刻误差约 12 秒，远小于页面标注的 ±1 分钟精度。
 */
export function nutationInLongitude(T: number): number {
  const omega = (125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000) * DEG
  const Lsun = (280.4665 + 36000.7698 * T) * DEG
  const Lmoon = (218.3165 + 481267.8813 * T) * DEG
  const dPsiArcsec =
    -17.2 * Math.sin(omega) -
    1.32 * Math.sin(2 * Lsun) -
    0.23 * Math.sin(2 * Lmoon) +
    0.21 * Math.sin(2 * omega)
  return dPsiArcsec * ARCSEC
}

/** 黄赤交角章动 Δε（弧度）。Meeus 22.2 式。 */
export function nutationInObliquity(T: number): number {
  const omega = (125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000) * DEG
  const Lsun = (280.4665 + 36000.7698 * T) * DEG
  const Lmoon = (218.3165 + 481267.8813 * T) * DEG
  const dEpsArcsec =
    9.2 * Math.cos(omega) +
    0.57 * Math.cos(2 * Lsun) +
    0.1 * Math.cos(2 * Lmoon) -
    0.09 * Math.cos(2 * omega)
  return dEpsArcsec * ARCSEC
}

/** 平黄赤交角 ε₀（弧度）。Meeus 22.3 式（Laskar 多项式）。 */
export function meanObliquity(T: number): number {
  const seconds = 21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T
  return (23 + 26 / 60 + seconds / 3600) * DEG
}

/** 真黄赤交角 ε = ε₀ + Δε（弧度） */
export function trueObliquity(T: number): number {
  return meanObliquity(T) + nutationInObliquity(T)
}

/**
 * 太阳地心视黄经（弧度，0..2π），黄道与春分点 of date，含章动与光行差。
 * 这是二十四节气的判定依据。
 */
export function sunApparentLongitude(jde: number): number {
  const T = julianCenturies(jde)
  const { L, B, R } = earthHeliocentric(jde)

  // 太阳地心黄经（平春分点）
  let theta = L + Math.PI
  // β = −B，仅用于 FK5 修正中的 λ′，不影响黄经本身

  // 归算到 FK5（Meeus 25.9）
  const lp = theta - 1.397 * DEG * T - 0.00031 * DEG * T * T
  void B
  const dThetaFk5 = -0.09033 * ARCSEC
  // Δβ = +0.03916″·(cos λ′ − sin λ′) 对黄经无贡献，故略去
  void lp

  theta += dThetaFk5

  // 章动 + 周年光行差
  const dPsi = nutationInLongitude(T)
  const aberration = (-20.4898 * ARCSEC) / R

  return norm2pi(theta + dPsi + aberration)
}

/** 太阳地心视赤经、视赤纬（弧度） */
export function sunApparentRaDec(jde: number): { ra: number; dec: number } {
  const T = julianCenturies(jde)
  const lambda = sunApparentLongitude(jde)
  const eps = trueObliquity(T)
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda))
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda))
  return { ra: norm2pi(ra), dec }
}

/** 格林尼治平恒星时 GMST（度）。Meeus 12.4 式，自变量为 UT 儒略日。 */
export function gmstDegrees(jdUt: number): number {
  const d = jdUt - J2000
  const T = d / 36525
  const theta =
    280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T * T * T) / 38710000
  return norm360(theta)
}

/** 格林尼治真恒星时 GAST（度）= GMST + Δψ·cos ε */
export function gastDegrees(jdUt: number): number {
  const T = julianCenturies(jdUt)
  const dPsi = nutationInLongitude(T)
  const eps = trueObliquity(T)
  return norm360(gmstDegrees(jdUt) + (dPsi * Math.cos(eps)) / DEG)
}

/** 太阳直射点地理坐标（度）：{ lon, lat }。lon 东经为正。 */
export function subsolarPoint(jde: number): { lon: number; lat: number } {
  const { ra, dec } = sunApparentRaDec(jde)
  const gast = gastDegrees(jde)
  const lon = norm180((ra / DEG) - gast)
  return { lon, lat: dec / DEG }
}

/** 均时差（分钟）：真太阳时 − 平太阳时 */
export function equationOfTimeMinutes(jde: number): number {
  const { ra } = sunApparentRaDec(jde)
  const T = julianCenturies(jde)
  const L0 = norm360(280.4664567 + 360007.6982779 * (T / 10) + 0.03032028 * (T / 10) ** 2)
  let e = L0 - 0.0057183 - ra / DEG + nutationInLongitude(T) / DEG
  e = norm180(e)
  return e * 4
}

/** 太阳视黄经（度） */
export function sunLongitudeDegrees(jde: number): number {
  return sunApparentLongitude(jde) / DEG
}
