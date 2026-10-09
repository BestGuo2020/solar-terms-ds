/**
 * 场景总控：渲染器、相机、光照、天体、辅助标识与视角预设
 *
 * 设计要点
 *  · 对外只暴露「状态进、画面出」：每帧由外部传入统一的模拟时间状态，
 *    场景内部不做任何时间推算，避免时间轴、动画与详情各算各的。
 *  · 页面不可见时停掉 requestAnimationFrame；销毁时释放几何体、材质、纹理与渲染器。
 *  · 画质档位（球体分段、星空点数、像素比、抗锯齿）由 config.detectQuality 决定。
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { earthScenePosition } from '@/astro/sceneFrame'
import type { TermMoment } from '@/astro/solarTerms'
import { detectQuality, PALETTE, SCENE, type QualitySettings } from './config'
import { t, type Locale } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import { TERMS } from '@/data/terms'
import { EarthObject } from './earth'
import { OrbitRing } from './orbit'
import { SunObject } from './sun'
import { disposeTextures, loadTextures, type LoadProgress, type TextureBundle } from './textures'

const DEG = Math.PI / 180

export type ViewPreset = 'default' | 'overview' | 'earth'

export interface SceneState {
  /** 统一模拟时间（Unix 毫秒，UTC） */
  ms: number
  /** 太阳地心视黄经（度） */
  sunLongitude: number
  /** 日地距离（AU） */
  distanceAU: number
  /** 格林尼治真恒星时（度）—— 决定地球自转相位 */
  gast: number
  /** 该年代的黄赤交角（度）—— 决定地轴倾角与南北回归线的位置 */
  obliquityDeg: number
  /** 当前所处节气 */
  activeTerm: TermMoment
  /** 下一个节气 */
  nextTerm: TermMoment
  /** 当前显示年份的 24 个节气（按时间先后） */
  terms: TermMoment[]
  displayYear: number
}

export interface GuideToggles {
  axis: boolean
  equator: boolean
  tropics: boolean
  revolution: boolean
  ecliptic: boolean
  labels: boolean
  minorLabels: boolean
  stars: boolean
}

export interface SceneManagerOptions {
  onSelectTerm: (index: number) => void
  onProgress?: (p: LoadProgress) => void
  onContextLost?: () => void
  /**
   * 每帧回调：外部在这里推进统一的模拟时间并返回当前状态。
   * 场景只负责「按状态作画」，不自己推算时间。
   */
  onFrame?: (dtSeconds: number) => SceneState | null
}

export class SceneManager {
  private container: HTMLElement
  private opts: SceneManagerOptions
  private quality: QualitySettings

  private renderer: THREE.WebGLRenderer | null = null
  private labelRenderer: CSS2DRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private controls: OrbitControls | null = null

  private sun: SunObject | null = null
  private earth: EarthObject | null = null
  private orbit: OrbitRing | null = null
  private starSphere: THREE.Mesh | null = null
  private starPoints: THREE.Points | null = null
  private eclipticDisc: THREE.Mesh | null = null
  private sunLabel: CSS2DObject | null = null
  private earthLabel: CSS2DObject | null = null
  private textures: TextureBundle | null = null

  private rafId = 0
  private running = false
  private disposed = false
  private readonly clock = new THREE.Clock()
  private state: SceneState | null = null
  private lastYear = Number.NaN

  private followEarth = false
  private userAdjusted = false
  private camTween: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null
  private targetTween: { from: THREE.Vector3; to: THREE.Vector3 } | null = null
  private labelsEnabled = true
  private minorLabelsWanted = true
  private locale: Locale = 'zh'
  private viewW = 1
  private viewH = 1

  ready = false

  constructor(container: HTMLElement, opts: SceneManagerOptions) {
    this.container = container
    this.opts = opts
    this.quality = detectQuality()
  }

  // ────────────────────────────── 初始化 ──────────────────────────────

  async init(): Promise<void> {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)

    // 纹理先加载：失败会自动回退为程序化纹理
    this.textures = await loadTextures(this.opts.onProgress)
    if (this.disposed) return

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.quality.antialias,
      powerPreference: 'high-performance',
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio))
    this.renderer.setSize(w, h, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.06
    this.renderer.domElement.classList.add('scene-canvas')
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    this.container.appendChild(this.renderer.domElement)
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost, false)

    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.setSize(w, h)
    const le = this.labelRenderer.domElement
    le.classList.add('scene-labels')
    le.style.position = 'absolute'
    le.style.inset = '0'
    le.style.pointerEvents = 'none'
    this.container.appendChild(le)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(PALETTE.ink)

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 4000)
    this.camera.position.copy(DEFAULT_DIR).multiplyScalar(this.frameOrbitDistance())

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.075
    this.controls.rotateSpeed = 0.85
    this.controls.zoomSpeed = 0.9
    this.controls.panSpeed = 0.7
    this.controls.minDistance = 4
    this.controls.maxDistance = 340
    this.controls.enablePan = true
    this.controls.screenSpacePanning = true
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
    this.controls.addEventListener('start', () => {
      this.camTween = null
      this.targetTween = null
      this.followEarth = false
      this.userAdjusted = true
    })
    this.controls.update()

    // ⚠️ OrbitControls 会把画布的 touch-action 写成行内样式 "none"。
    // 在触屏设备上那意味着手指一落到 3D 区域，页面就再也划不动了 ——
    // 而 3D 区往往占去半个屏幕，用户会以为页面卡死。
    // 这里改为 pan-y：上下滑动 = 翻页，左右滑动 = 旋转视角，双指捏合 = 缩放。
    const coarsePointer =
      typeof matchMedia !== 'undefined' && matchMedia('(hover: none) and (pointer: coarse)').matches
    this.renderer.domElement.style.touchAction = coarsePointer ? 'pan-y' : 'none'

    // 环境光压得很低：夜面主要靠城市灯光贴图，不让暗面被「提亮」得失真
    this.scene.add(new THREE.AmbientLight(0x223046, 0.16))

    this.buildStarfield()
    this.buildEclipticDisc()

    this.sun = new SunObject(this.textures, this.quality.sphereSegments)
    this.scene.add(this.sun.group)

    this.earth = new EarthObject(this.textures, this.quality)
    this.scene.add(this.earth.group)

    this.orbit = new OrbitRing(
      (index) => this.opts.onSelectTerm(index),
      (index) => this.termLabel(index),
    )
    this.scene.add(this.orbit.group)

    this.buildBodyLabels()

    this.ready = true
    this.resize()
    this.startLoop()
  }

  private buildStarfield() {
    if (!this.scene || !this.textures) return
    this.starSphere = new THREE.Mesh(
      new THREE.SphereGeometry(SCENE.skyRadius, 32, 24),
      new THREE.MeshBasicMaterial({
        map: this.textures.stars,
        color: 0x93a2c8,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    this.starSphere.renderOrder = -10
    this.scene.add(this.starSphere)

    const n = this.quality.starCount
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const r = SCENE.skyRadius * 0.94
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      pos[i * 3] = r * s * Math.cos(th)
      pos[i * 3 + 1] = r * u
      pos[i * 3 + 2] = r * s * Math.sin(th)
      const warm = Math.random()
      const b = 0.5 + Math.random() * 0.5
      col[i * 3] = b * (0.82 + warm * 0.18)
      col[i * 3 + 1] = b * (0.86 + warm * 0.1)
      col[i * 3 + 2] = b
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    this.starPoints = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        size: 1.7,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    )
    this.starPoints.renderOrder = -9
    this.scene.add(this.starPoints)
  }

  private buildEclipticDisc() {
    if (!this.scene) return
    this.eclipticDisc = new THREE.Mesh(
      new THREE.CircleGeometry(SCENE.auScale * 1.34, 96),
      new THREE.MeshBasicMaterial({
        color: PALETTE.azure,
        transparent: true,
        opacity: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    this.eclipticDisc.rotation.x = -Math.PI / 2
    this.eclipticDisc.renderOrder = -3
    this.eclipticDisc.visible = false
    this.scene.add(this.eclipticDisc)
  }

  /** 太阳与地球的文字标签 */
  /** 节气序号 → 当前语言下的名称 */
  private termLabel(index: number): string {
    const base = TERMS[index]
    if (!base) return String(index)
    return this.locale === 'en' ? base.nameEn : base.name
  }

  private buildBodyLabels() {
    if (!this.scene || !this.sun || !this.earth) return

    const mk = (text: string, cls: string) => {
      const d = document.createElement('div')
      d.className = `body-label ${cls}`
      d.textContent = text
      return new CSS2DObject(d)
    }

    this.sunLabel = mk(t('body.sun'), 'is-sun')
    this.sunLabel.position.set(0, SCENE.sunRadius * 1.45, 0)
    this.sun.group.add(this.sunLabel)

    this.earthLabel = mk(t('body.earth'), 'is-earth')
    this.earthLabel.position.set(0, SCENE.earthRadius * 1.9, 0)
    this.earth.tiltGroup.add(this.earthLabel)
  }

  // ────────────────────────────── 每帧 ──────────────────────────────

  /** 由外部统一时间状态驱动画面 */
  setState(s: SceneState) {
    this.state = s
    this.applyState(s)
  }

  private applyState(s: SceneState) {
    if (!this.ready || !this.orbit) return

    if (Number.isNaN(this.lastYear) || s.displayYear !== this.lastYear) {
      this.lastYear = s.displayYear
      this.orbit.buildForYear(s.displayYear, s.terms)
      // 重建标记后要把用户当前的标签偏好重新应用一次
      this.orbit.setMinorLabelsVisible(this.minorLabelsWanted)
    }
    this.orbit.setActiveRange(s.activeTerm.ms, s.nextTerm.ms)
    this.orbit.setEmphasis(s.activeTerm.index)
  }

  private startLoop() {
    if (this.running || this.disposed) return
    this.running = true
    this.clock.getDelta() // 丢弃暂停期间累积的时间
    const tick = () => {
      if (!this.running || this.disposed) return
      this.rafId = requestAnimationFrame(tick)
      this.frame()
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopLoop() {
    this.running = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1)
    const elapsed = this.clock.elapsedTime
    if (!this.renderer || !this.camera || !this.controls) return
    if (!this.earth || !this.sun || !this.orbit) return

    // 统一时间由外部推进；场景只按返回的状态作画
    const s = this.opts.onFrame ? this.opts.onFrame(dt) : this.state
    if (!s) return
    this.state = s
    this.applyState(s)

    // ── 地球位置：严格由太阳视黄经与日地距离决定 ──
    const p = earthScenePosition(s.sunLongitude, s.distanceAU, SCENE.auScale)
    this.earth.group.position.set(p.x, p.y, p.z)

    // ── 地球 → 太阳 单位方向（受光方向的唯一依据）──
    const sunDir = _sunDir.set(-p.x, -p.y, -p.z)
    const dist = sunDir.length()
    if (dist > 0) sunDir.divideScalar(dist)

    // ── 相机 ──
    if (this.camTween) {
      this.camTween.t = Math.min(1, this.camTween.t + dt / 0.8)
      const e = easeInOut(this.camTween.t)
      this.camera.position.lerpVectors(this.camTween.from, this.camTween.to, e)
      if (this.targetTween) {
        this.controls.target.lerpVectors(this.targetTween.from, this.targetTween.to, e)
      }
      if (this.camTween.t >= 1) {
        this.camTween = null
        this.targetTween = null
      }
    } else if (this.followEarth) {
      this.controls.target.copy(this.earth.group.position)
    }
    this.controls.update()
    this.camera.updateMatrixWorld()
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert()

    // ── 天体更新（此时相机矩阵已是当前帧的）──
    this.earth.setObliquity(s.obliquityDeg)
    this.earth.update(sunDir, s.gast * DEG, this.camera, elapsed * 0.0045)
    this.sun.update(elapsed, this.camera.position.length())
    if (this.earthLabel) this.earthLabel.visible = this.labelsEnabled
    if (this.sunLabel) this.sunLabel.visible = this.labelsEnabled

    this.orbit.updateLocator(this.earth.group.position)
    this.orbit.updateLabels(this.camera, this.viewW, this.viewH)

    this.renderer.render(this.scene!, this.camera)
    this.labelRenderer!.render(this.scene!, this.camera)
  }

  // ────────────────────────────── 视角 ──────────────────────────────

  setView(preset: ViewPreset) {
    if (!this.ready || !this.earth || !this.camera || !this.controls) return
    const earthPos = this.earth.group.position.clone()

    if (preset === 'overview') {
      this.followEarth = false
      const d = this.frameOrbitDistance()
      this.tweenCamera(_v.set(0, d * 0.83, d * 0.56), _v2.set(0, 0, 0))
      return
    }
    if (preset === 'earth') {
      // 从侧上方看地球：同时看到昼半球、晨昏线与地轴倾斜
      const toSun = earthPos.clone().negate().normalize()
      const side = new THREE.Vector3().crossVectors(toSun, UP).normalize()
      if (side.lengthSq() < 0.1) side.set(0, 0, 1)
      const dir = toSun
        .clone()
        .multiplyScalar(0.55)
        .addScaledVector(side, 0.78)
        .addScaledVector(UP, 0.32)
        .normalize()
      this.tweenCamera(earthPos.clone().addScaledVector(dir, SCENE.earthRadius * 5.4), earthPos)
      this.followEarth = true
      return
    }
    this.followEarth = false
    this.tweenCamera(this.defaultCameraPosition(), _v2.set(0, 0, 0))
  }

  private tweenCamera(to: THREE.Vector3, target: THREE.Vector3) {
    if (!this.camera || !this.controls) return
    this.camTween = { from: this.camera.position.clone(), to: to.clone(), t: 0 }
    this.targetTween = { from: this.controls.target.clone(), to: target.clone() }
  }

  /**
   * 让整条轨道在当前画面比例下都能装进视野所需的最小相机距离。
   * 竖屏（手机）时水平视野窄，需要退得更远，否则轨道会被裁掉。
   */
  private frameOrbitDistance(): number {
    const aspect = this.camera?.aspect ?? 1.6
    const vFov = ((this.camera?.fov ?? 45) * Math.PI) / 180
    const halfExtent = SCENE.auScale * 1.14 // 轨道半径 + 一点边距
    const vNeed = halfExtent / Math.tan(vFov / 2)
    const hNeed = vNeed / Math.max(aspect, 0.45)
    return Math.max(96, Math.min(220, hNeed))
  }

  /** 恢复默认视角时的朝向（斜俯视） */
  private defaultCameraPosition(): THREE.Vector3 {
    return DEFAULT_DIR.clone().multiplyScalar(this.frameOrbitDistance())
  }

  // ────────────────────────────── 开关 ──────────────────────────────

  setGuides(g: GuideToggles) {
    this.minorLabelsWanted = g.minorLabels
    this.earth?.setGuides({ axis: g.axis, equator: g.equator, tropics: g.tropics })
    this.orbit?.setArrowVisible(g.revolution)
    if (this.eclipticDisc) this.eclipticDisc.visible = g.ecliptic
    this.labelsEnabled = g.labels
    this.orbit?.setLabelsVisible(g.labels)
    this.orbit?.setMinorLabelsVisible(g.minorLabels)
    if (this.starSphere) this.starSphere.visible = g.stars
    if (this.starPoints) this.starPoints.visible = g.stars
  }

  /**
   * 切换界面语言：重建轨道上的节气标签与天体标签。
   * 3D 场景里的文字不经过 Vue 模板，必须显式刷新。
   */
  setLocale(locale: Locale) {
    this.locale = locale
    if (this.sunLabel) this.sunLabel.element.textContent = t('body.sun')
    if (this.earthLabel) this.earthLabel.element.textContent = t('body.earth')
    this.refreshLabels()
  }

  /** 强制按当前语言重建轨道与节气标签 */
  refreshLabels() {
    const s = this.state
    if (!this.ready || !this.orbit || !s) return
    this.lastYear = Number.NaN
    this.applyState(s)
  }

  /** 按画质档位给出「次要节气名称」的默认开关（用户之后可自行更改） */
  get defaultMinorLabels(): boolean {
    return this.quality.minorLabels
  }

  // ────────────────────────────── 尺寸与生命周期 ──────────────────────────────

  resize() {
    if (!this.renderer || !this.labelRenderer || !this.camera) return
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.viewW = w
    this.viewH = h
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio))
    this.renderer.setSize(w, h, false)
    this.labelRenderer.setSize(w, h)

    // 屏幕方向 / 窗口比例变化后，若用户还没自己转过视角，就重新框住整条轨道
    if (!this.userAdjusted && !this.camTween) {
      this.camera.position.copy(this.defaultCameraPosition())
      this.controls?.target.set(0, 0, 0)
      this.controls?.update()
    }
  }

  private handleContextLost = (ev: Event) => {
    ev.preventDefault()
    this.stopLoop()
    this.opts.onContextLost?.()
  }

  private onVisibilityChange = () => {
    if (document.hidden) this.stopLoop()
    else if (!this.disposed) this.startLoop()
  }

  /** 由组件在 init 之后调用：页面不可见时暂停渲染 */
  attachVisibilityHandling() {
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  get qualityTier() {
    return this.quality.tier
  }

  get fallbackTextures(): MessageKey[] {
    return this.textures?.fallbacks ?? []
  }

  dispose() {
    this.disposed = true
    this.stopLoop()
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.renderer?.domElement.removeEventListener('webglcontextlost', this.handleContextLost)
    this.controls?.dispose()

    const disposeTree = (root: THREE.Object3D | null) => {
      root?.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      })
    }

    this.earth?.dispose()
    this.sun?.dispose()
    this.orbit?.dispose()
    this.earthLabel?.element.remove()
    this.sunLabel?.element.remove()
    disposeTree(this.starSphere)
    disposeTree(this.starPoints)
    disposeTree(this.eclipticDisc)

    disposeTextures(this.textures)
    this.textures = null
    this.scene?.clear()
    this.renderer?.dispose()
    this.renderer?.domElement.remove()
    this.labelRenderer?.domElement.remove()
    this.renderer = null
    this.labelRenderer = null
    this.scene = null
    this.camera = null
    this.controls = null
  }
}

const UP = new THREE.Vector3(0, 1, 0)
/** 默认视角朝向（斜俯视），实际距离由 frameOrbitDistance 依画面比例决定 */
const DEFAULT_DIR = new THREE.Vector3(58, 44, 74).normalize()
const _sunDir = new THREE.Vector3()
const _v = new THREE.Vector3()
const _v2 = new THREE.Vector3()

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}
