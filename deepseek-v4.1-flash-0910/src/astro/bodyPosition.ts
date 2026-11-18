/**
 * 天体位置计算：把纯天文量整理成 3D 场景需要的状态
 */

import { deltaTSeconds } from './deltaT'
import { obliquityDegAt } from './sceneFrame'
import { DEG, earthHeliocentric, gastDegrees, julianDayFromUnix, subsolarPoint, sunApparentLongitude } from './sun'
import { beijingParts } from './time'

export interface EarthState {
  /** 输入时刻（Unix 毫秒，UTC） */
  ms: number
  /** 太阳地心视黄经（度，0—360） */
  sunLongitude: number
  /** 日地距离（天文单位） */
  distanceAU: number
  /** 太阳视赤纬（度） */
  declination: number
  /** 太阳直射点经度（度，东经为正） */
  subsolarLon: number
  /** 太阳直射点纬度（度） */
  subsolarLat: number
  /** 格林尼治真恒星时（度）—— 用来定地球自转相位 */
  gast: number
  /** 力学时儒略日 */
  jde: number
  /** 该年代的黄赤交角（度）—— 随年代缓慢变化，不是常数 */
  obliquityDeg: number
}

/** 求某一时刻地球与太阳的相对状态 */
export function earthStateAt(ms: number): EarthState {
  const p = beijingParts(ms)
  const jde = julianDayFromUnix(ms) + deltaTSeconds(p.year, p.month) / 86400
  const { R } = earthHeliocentric(jde)
  const lambda = sunApparentLongitude(jde) / DEG
  const ss = subsolarPoint(jde)
  return {
    ms,
    sunLongitude: ((lambda % 360) + 360) % 360,
    distanceAU: R,
    declination: ss.lat,
    subsolarLon: ss.lon,
    subsolarLat: ss.lat,
    gast: gastDegrees(julianDayFromUnix(ms)),
    jde,
    obliquityDeg: obliquityDegAt(p.year),
  }
}
