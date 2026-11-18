/**
 * ΔT = TT − UT1 的实测年度锚点值
 *
 * 数据由 `scripts/reference-delta-t.json` 生成（开发期数据，勿手改）。
 * 口径：每年 1 月 1 日 0h UTC 的 ΔT，单位秒，保留 1 位小数。
 * 完整来源清单（含链接）见该 JSON 的 `sources` 字段。主要来源：
 *   · IERS EOP 14 C04 / Bulletin A / Bulletin B（官方地球自转数据与闰秒公告）
 *   · IANA time-zones `leap-seconds.list`（源自 IERS Bulletin C）
 *   · USNO `deltat.data`（经 NREL NSRDB 源码内置表转引，1990—2020 逐年值）
 *   · NASA/GSFC（Espenak & Meeus）Recent Values of ΔT from Direct Observations
 *   · Paul Schlyter《Time Scales: UT1, UTC, TAI, ET, TT, GPS time》年度表
 *
 * 多条独立来源交叉核对，逐条差异 ≤ 0.05 秒：1973—2020 年吻合度优于 0.1 秒；
 * 2021—2025 年实测值（2025-01-01 为 69.1 秒）与 IERS 官方数据反算值一致。
 *
 * 该区间之外仍使用 Espenak & Meeus 分段多项式（见 deltaT.ts），
 * 并在区间两端做平滑过渡，避免出现时间跳变。
 */

/** [年份, ΔT 秒]，按年份升序 */
export const DELTA_T_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [1973, 43.4],
  [1974, 44.5],
  [1975, 45.5],
  [1976, 46.5],
  [1977, 47.5],
  [1978, 48.5],
  [1979, 49.6],
  [1980, 50.5],
  [1981, 51.4],
  [1982, 52.2],
  [1983, 53.0],
  [1984, 53.8],
  [1985, 54.3],
  [1986, 54.9],
  [1987, 55.3],
  [1988, 55.8],
  [1989, 56.3],
  [1990, 56.9],
  [1991, 57.6],
  [1992, 58.3],
  [1993, 59.1],
  [1994, 60.0],
  [1995, 60.8],
  [1996, 61.6],
  [1997, 62.3],
  [1998, 63.0],
  [1999, 63.5],
  [2000, 63.8],
  [2001, 64.1],
  [2002, 64.3],
  [2003, 64.5],
  [2004, 64.6],
  [2005, 64.7],
  [2006, 64.9],
  [2007, 65.2],
  [2008, 65.5],
  [2009, 65.8],
  [2010, 66.1],
  [2011, 66.3],
  [2012, 66.6],
  [2013, 66.9],
  [2014, 67.3],
  [2015, 67.6],
  [2016, 68.1],
  [2017, 68.6],
  [2018, 69.0],
  [2019, 69.2],
  [2020, 69.4],
  [2021, 69.4],
  [2022, 69.3],
  [2023, 69.2],
  [2024, 69.2],
  [2025, 69.1],
]

export const DELTA_T_ANCHOR_FIRST = 1973
export const DELTA_T_ANCHOR_LAST = 2025

/** 锚点覆盖区间内的线性插值（超出范围返回 null） */
export function interpolateDeltaT(y: number): number | null {
  const n = DELTA_T_ANCHORS.length
  if (y < DELTA_T_ANCHORS[0][0] || y > DELTA_T_ANCHORS[n - 1][0]) return null
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (DELTA_T_ANCHORS[mid][0] <= y) lo = mid
    else hi = mid
  }
  const [y0, v0] = DELTA_T_ANCHORS[lo]
  const [y1, v1] = DELTA_T_ANCHORS[hi]
  if (y1 === y0) return v0
  return v0 + ((y - y0) / (y1 - y0)) * (v1 - v0)
}
