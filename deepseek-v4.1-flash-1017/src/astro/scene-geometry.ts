/**
 * 天文坐标 → Three.js 场景坐标。
 *
 * 约定：
 *   XZ 平面 = 黄道面，+Y = 黄道北极；
 *   黄经 0° 指向 +X；从 +Y 俯视，黄经增大为逆时针，即 +X → −Z。
 *
 * 太阳的黄经 λ☉ 是从地球看太阳的方向。地球在太阳的相反方向，
 * 因此地球的轨道方位角 φ⊕ = λ☉ + 180°。
 * 只要场景中的地球位置和 24 个节气标记都走这一条函数，就永远不会错位。
 */
export const DEG_TO_RAD = Math.PI / 180
export const AXIAL_TILT_DEG = 23.44
export const AXIAL_TILT_RAD = AXIAL_TILT_DEG * DEG_TO_RAD

export interface ScenePoint {
  x: number
  y: number
  z: number
}

/** 太阳黄经（度）→ 地球轨道方位角（度，0—360）。 */
export function earthOrbitAngle(sunLongitude: number): number {
  return ((sunLongitude + 180) % 360 + 360) % 360
}

/** 地心视黄经 → 黄道面中的单位方向（场景坐标）。 */
export function eclipticDirection(longitude: number): ScenePoint {
  const angle = longitude * DEG_TO_RAD
  return {
    x: Math.cos(angle),
    y: 0,
    z: -Math.sin(angle),
  }
}

/** 某一太阳黄经对应的地球场景位置。 */
export function earthScenePosition(sunLongitude: number, radius: number): ScenePoint {
  const direction = eclipticDirection(earthOrbitAngle(sunLongitude))
  return {
    x: direction.x * radius,
    y: 0,
    z: direction.z * radius,
  }
}

/**
 * 地球自转轴在一年内保持同一空间方向；与黄道面法线 +Y 的夹角约 23.44°，
 * 并朝黄经 90°（北半球夏至时太阳所在的方向）倾斜。
 */
export function fixedEarthAxis(): ScenePoint {
  return {
    x: 0,
    y: Math.cos(AXIAL_TILT_RAD),
    z: -Math.sin(AXIAL_TILT_RAD),
  }
}

/** 场景方位角（度），用于显示“轨道坐标角”。 */
export function sceneAzimuthDegrees(point: ScenePoint): number {
  const angle = Math.atan2(-point.z, point.x) / DEG_TO_RAD
  return ((angle % 360) + 360) % 360
}

/** 把角度差归一到 [0, 360)。 */
export function normalizedAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}

/**
 * 地轴与地球→太阳方向的夹角。用来检查分至点的受光关系：
 * 夏至时北半球向太阳倾斜，冬至时相反。
 */
export function axisSunAngle(earthPosition: ScenePoint): {
  endpointTilt: number
  northPoleTowardSun: number
} {
  const sunDirection = {
    x: -earthPosition.x,
    y: -earthPosition.y,
    z: -earthPosition.z,
  }
  const length = Math.hypot(sunDirection.x, sunDirection.y, sunDirection.z) || 1
  const axis = fixedEarthAxis()
  const cosine =
    (axis.x * sunDirection.x + axis.y * sunDirection.y + axis.z * sunDirection.z) / length
  return {
    endpointTilt: AXIAL_TILT_DEG,
    northPoleTowardSun: cosine,
  }
}

/**
 * 地轴在空间中固定。渲染地球时，先按 axis 方向建立“地轴坐标系”，
 * 再绕地轴旋转，使当地正午经线朝向太阳。
 */
export function equatorialSpinAngle(sunLocalX: number, sunLocalZ: number, subsolarLongitude: number): number {
  const alpha = Math.atan2(-sunLocalZ, sunLocalX)
  return alpha - subsolarLongitude * DEG_TO_RAD
}
