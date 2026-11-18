/**
 * 天文坐标 → Three.js 场景坐标的映射约定
 *
 * ─────────────────────────────────────────────────────────────
 * 场景坐标系（右手系，Three.js 默认）
 *   · XZ 平面   = 黄道面
 *   · +Y 轴     = 黄道北极方向
 *   · +X 轴     = 春分点方向（黄经 0° 的方向）
 *   · 黄经 λ 增大 = 从 +Y 俯视时的**逆时针**方向
 *
 * 于是黄经 λ、黄纬 β、距离 r 的点映射为
 *       x = r·cosβ·cosλ
 *       y = r·sinβ
 *       z = −r·cosβ·sinλ
 * （z 取负号是为了让 λ 增大对应俯视逆时针：+X → −Z。）
 * ─────────────────────────────────────────────────────────────
 * 关键对应关系（容易搞错的地方）
 *
 *   太阳视黄经 λ☉ = 从**地球**看太阳在黄道上的方向。
 *   地球日心黄经 L⊕ = λ☉ + 180°   —— 地球永远在太阳的相反方向。
 *
 *   所以在场景中：
 *       地球位置角 φ = λ☉ + 180°
 *       地球场景坐标 = eclipticToScene(λ☉ + 180°, 0, r)
 *
 *   例：春分 λ☉ = 0° 时，地球在 φ = 180° 处，即场景 (−r, 0, 0)：
 *       此时从地球看去，太阳在 +X 方向（黄经 0°），太阳直射赤道。
 *       夏至 λ☉ = 90° 时，地球在 (0, 0, +r)，太阳方向为 (0, 0, −1)，
 *       而此时地轴正好朝 (0, 0, −1) 一侧倾斜 —— 北半球倾向太阳。
 * ─────────────────────────────────────────────────────────────
 */

export interface Vec3 {
  x: number
  y: number
  z: number
}

export const DEG = Math.PI / 180

/**
 * J2000.0 时刻的黄赤交角 ε（约 23.4393°）。作为参照基准。
 *
 * ⚠️ 黄赤交角**不是常数**：它在约 4.1 万年的周期里于 22.0°—24.5° 之间摆动，
 * 现在正处在下降段。场景里若永远写死 23.44°，年代一远就不成立了
 * （公元 5000 年约 23.06°，公元前 1000 年约 23.82°）。
 * 因此地轴倾角按年代计算，见 `obliquityDegAt`。
 */
export const OBLIQUITY_DEG = obliquityDegAt(2000)
export const OBLIQUITY_RAD = OBLIQUITY_DEG * DEG

/**
 * 给定年代的平黄赤交角 ε₀（度）。
 *
 * 采用 IAU 岁差公式中的黄赤交角多项式（Laskar 形式）：
 *   ε₀ = 23°26′21.448″ − 46.8150″·T − 0.00059″·T² + 0.001813″·T³
 * 其中 T 为自 J2000 起的儒略世纪数。
 *
 * 适用范围：这是一个泰勒展开，在本页支持的 −2000 — +6000 年区间内
 * 与米兰科维奇理论给出的曲线吻合到约 0.01°；更远的年代外推会迅速失真，
 * 故不做更长外推。
 */
export function obliquityDegAt(year: number): number {
  const T = (year - 2000) / 100
  const arcsec = 21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T
  return 23 + 26 / 60 + arcsec / 3600
}

/**
 * 给定年代地球自转轴在场景中的方向（单位向量）。
 *
 * 地轴与黄道面法线（+Y）的夹角即为该年代的黄赤交角，
 * 并朝黄经 90° 的方向倾斜。地轴在**惯性空间中固定**，
 * 一年之内指向不变 —— 这正是四季的成因。
 */
export function earthAxisAt(year: number): Vec3 {
  const eps = obliquityDegAt(year) * DEG
  return { x: 0, y: Math.cos(eps), z: -Math.sin(eps) }
}

/** 黄道坐标 → 场景直角坐标 */
export function eclipticToScene(lonDeg: number, latDeg: number, radius: number): Vec3 {
  const l = lonDeg * DEG
  const b = latDeg * DEG
  const cb = Math.cos(b)
  return {
    x: radius * cb * Math.cos(l),
    y: radius * Math.sin(b),
    z: -radius * cb * Math.sin(l),
  }
}

/**
 * 地球在场景中的位置。
 * @param sunLonDeg 该时刻的太阳地心视黄经（度）
 * @param distanceAU 日地距离（天文单位）
 * @param auScale 1 AU 对应的场景长度
 */
export function earthScenePosition(sunLonDeg: number, distanceAU: number, auScale: number): Vec3 {
  return eclipticToScene(sunLonDeg + 180, 0, distanceAU * auScale)
}

/** J2000 时刻的地轴方向（场景坐标，单位向量），供不关心年代的场合引用 */
export const EARTH_AXIS: Vec3 = earthAxisAt(2000)

/** 场景坐标 → 俯视逆时针方位角（度，0—360，与黄经同一度量方式） */
export function sceneAzimuthDeg(v: Vec3): number {
  const a = Math.atan2(-v.z, v.x) / DEG
  return ((a % 360) + 360) % 360
}

/** 把黄经差归一到 (−180, 180] */
export function wrap180(deg: number): number {
  let d = ((deg % 360) + 360) % 360
  if (d > 180) d -= 360
  return d
}
