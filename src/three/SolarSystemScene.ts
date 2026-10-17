import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { SEASON_META, SOLAR_TERMS } from '../data/term-catalog.ts'
import type { Season } from '../data/types.ts'
import {
  AXIAL_TILT_RAD,
  DEG_TO_RAD,
  earthScenePosition,
  eclipticDirection,
  equatorialSpinAngle,
  fixedEarthAxis,
  normalizedAngle,
} from '../astro/scene-geometry.ts'
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  cloudFragmentShader,
  cloudVertexShader,
  earthFragmentShader,
  earthVertexShader,
} from './earth-shaders.ts'
import {
  TextureLibrary,
  createOrbitDiscTexture,
  createStarDotTexture,
  createSunGlowTexture,
  type TextureProgress,
} from './texture-library.ts'

const ORBIT_RADIUS = 30
const EARTH_RADIUS = 1.8
const SUN_RADIUS = 4.05
const FIXED_AXIS = fixedEarthAxis()
const TILT_AXIS = new THREE.Vector3(FIXED_AXIS.x, FIXED_AXIS.y, FIXED_AXIS.z)

const SEASON_DIRECTIONS: Record<Season, [number, number]> = {
  春: [315, 45],
  夏: [45, 135],
  秋: [135, 225],
  冬: [225, 315],
}

export type ViewPreset = 'default' | 'overview' | 'earth'

export interface GuideToggles {
  axis: boolean
  equator: boolean
  tropics: boolean
  revolution: boolean
  labels: boolean
}

export interface SceneFrameState {
  /** 太阳地心视黄经（度） */
  sunLongitude: number
  /** 太阳直射点经度，东正西负 */
  subsolarLongitude: number
  /** 当前已进入的节气 index（立春=0） */
  activeTermIndex: number
  /** 当前区间的黄经起点/终点 */
  activeTermLongitude: number
  nextTermLongitude: number
}

export interface SceneAssetState {
  loaded: number
  total: number
  failures: string[]
}

export interface SolarSystemSceneOptions {
  container: HTMLElement
  textureBaseUrl: string
  onFrame: (deltaSeconds: number) => SceneFrameState
  onSelectTerm: (termIndex: number) => void
  onAssetProgress?: (progress: SceneAssetState) => void
  onTexturesSettled?: (failures: string[]) => void
  onContextLost?: () => void
  onContextRestored?: () => void
}

interface QualityProfile {
  low: boolean
  earthSegments: number
  cloudSegments: number
  starCount: number
  antialias: boolean
  pixelRatio: number
}

interface CameraFlight {
  startedAt: number
  duration: number
  fromPosition: THREE.Vector3
  fromTarget: THREE.Vector3
  toPosition: THREE.Vector3
  toTarget: THREE.Vector3
}

function detectQuality(container: HTMLElement): QualityProfile {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const narrow = container.clientWidth < 700
  const cores = navigator.hardwareConcurrency ?? 8
  const low = coarse || narrow || cores <= 4
  return {
    low,
    earthSegments: low ? 72 : 128,
    cloudSegments: low ? 48 : 80,
    starCount: low ? 340 : 760,
    antialias: !low,
    pixelRatio: Math.min(window.devicePixelRatio || 1, low ? 1.4 : 1.8),
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export class SolarSystemScene {
  readonly quality: QualityProfile
  private readonly container: HTMLElement
  private readonly options: SolarSystemSceneOptions
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly controls: OrbitControls
  private readonly textureLibrary: TextureLibrary
  private readonly labelLayer = document.createElement('div')
  private readonly labelElements = new Map<number, HTMLButtonElement>()
  private readonly sunLabel = document.createElement('div')
  private readonly earthLabel = document.createElement('div')
  private readonly markerHits: THREE.Mesh[] = []
  private readonly markerMeshes = new Map<number, THREE.Mesh>()
  private readonly seasonMaterials = new Map<Season, THREE.MeshBasicMaterial>()
  private readonly activeMarkerMaterial = new THREE.MeshBasicMaterial({
    color: 0xf6d494,
    toneMapped: false,
  })
  private activeMarkerHalo!: THREE.Sprite
  private activeMarkerHaloMaterial!: THREE.SpriteMaterial

  private readonly earthOrbitGroup = new THREE.Group()
  private readonly earthTiltGroup = new THREE.Group()
  private readonly earthSpinGroup = new THREE.Group()
  private readonly axisGroup = new THREE.Group()
  private readonly normalGroup = new THREE.Group()
  private readonly equatorGroup = new THREE.Group()
  private readonly tropicsGroup = new THREE.Group()
  private readonly revolutionGroup = new THREE.Group()
  private readonly currentArcGroup = new THREE.Group()
  private readonly starsPoints: THREE.Points
  private readonly starPointsMaterial: THREE.PointsMaterial
  private readonly backgroundMaterial: THREE.MeshBasicMaterial
  private sunMesh!: THREE.Mesh
  private sunMaterial!: THREE.MeshBasicMaterial
  private readonly sunGroup = new THREE.Group()
  private earthUniforms!: Record<string, THREE.IUniform>
  private cloudUniforms!: Record<string, THREE.IUniform>
  private atmosphereUniforms!: Record<string, THREE.IUniform>
  private readonly sunGlowSprites: THREE.Sprite[] = []
  private readonly sharedGeometries: THREE.BufferGeometry[] = []
  private readonly sharedMaterials: THREE.Material[] = []
  private readonly ownedTextures: THREE.Texture[] = []
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointerNdc = new THREE.Vector2()
  private readonly tempVector = new THREE.Vector3()
  private readonly inverseTiltQuaternion = new THREE.Quaternion()
  private readonly sunDirectionLocal = new THREE.Vector3()

  private frameHandle: number | null = null
  private disposed = false
  private visible = true
  private contextLost = false
  private lastFrameTime = 0
  private readonly minFrameInterval: number
  private lastRenderedAt = 0
  private activeTermIndex = -1
  private lastArcKey = ''
  private currentArcMesh: THREE.Mesh | null = null
  private earthPosition = new THREE.Vector3()
  private lastEarthPosition = new THREE.Vector3()
  private lastFollowingPosition = new THREE.Vector3()
  private viewMode: ViewPreset = 'default'
  private flight: CameraFlight | null = null
  private earthCameraOffset = new THREE.Vector3(3.4, 2.0, 4.2)
  private guides: GuideToggles = {
    axis: true,
    equator: true,
    tropics: true,
    revolution: true,
    labels: true,
  }
  private pointerDown: { x: number; y: number; time: number; pointerId: number } | null = null
  private textureProgress: TextureProgress | null = null
  private readonly resizeObserver: ResizeObserver

  constructor(options: SolarSystemSceneOptions) {
    this.options = options
    this.container = options.container
    this.quality = detectQuality(this.container)
    this.minFrameInterval = this.quality.low ? 1000 / 30 : 0

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.quality.antialias,
      powerPreference: 'high-performance',
      alpha: false,
    })
    this.renderer.setClearColor(0x03070c, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.06
    this.renderer.setPixelRatio(this.quality.pixelRatio)
    this.renderer.domElement.className = 'scene-canvas'
    this.renderer.domElement.tabIndex = 0
    this.renderer.domElement.setAttribute('role', 'application')
    this.renderer.domElement.setAttribute(
      'aria-label',
      '三维日地公转场景。鼠标拖动或单指滑动旋转视角，滚轮或双指捏合缩放；聚焦后可用方向键旋转，Home 键恢复默认视角。',
    )
    this.container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 360)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.075
    this.controls.enablePan = false
    this.controls.rotateSpeed = 0.55
    this.controls.zoomSpeed = 0.65
    this.controls.minDistance = 4
    this.controls.maxDistance = 150
    this.controls.minPolarAngle = 0.08
    this.controls.maxPolarAngle = Math.PI / 2 + 0.08

    this.scene.background = new THREE.Color(0x03070c)
    this.textureLibrary = new TextureLibrary(
      options.textureBaseUrl,
      this.renderer.capabilities.getMaxAnisotropy(),
    )

    this.backgroundMaterial = new THREE.MeshBasicMaterial({
      map: this.textureLibrary.textures.stars,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    })
    const backgroundMesh = new THREE.Mesh(
      new THREE.SphereGeometry(210, this.quality.low ? 24 : 48, this.quality.low ? 16 : 32),
      this.backgroundMaterial,
    )
    backgroundMesh.renderOrder = -100
    backgroundMesh.frustumCulled = false
    this.scene.add(backgroundMesh)
    this.sharedGeometries.push(backgroundMesh.geometry)
    this.sharedMaterials.push(this.backgroundMaterial)

    const starDotTexture = createStarDotTexture()
    this.ownedTextures.push(starDotTexture)
    this.starPointsMaterial = new THREE.PointsMaterial({
      map: starDotTexture,
      color: 0xaebed3,
      size: 0.62,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    const starGeometry = this.createStarGeometry(this.quality.starCount)
    this.sharedGeometries.push(starGeometry)
    this.sharedMaterials.push(this.starPointsMaterial)
    this.starsPoints = new THREE.Points(starGeometry, this.starPointsMaterial)
    this.starsPoints.renderOrder = -90
    this.scene.add(this.starsPoints)

    const orbitDiscTexture = createOrbitDiscTexture()
    this.ownedTextures.push(orbitDiscTexture)
    const orbitDiscMaterial = new THREE.MeshBasicMaterial({
      map: orbitDiscTexture,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    })
    const orbitDisc = new THREE.Mesh(new THREE.CircleGeometry(36, 96), orbitDiscMaterial)
    orbitDisc.rotation.x = -Math.PI / 2
    orbitDisc.position.y = -0.035
    orbitDisc.renderOrder = -20
    this.scene.add(orbitDisc)
    this.sharedGeometries.push(orbitDisc.geometry)
    this.sharedMaterials.push(orbitDiscMaterial)

    this.buildOrbit()
    this.buildSun()
    this.buildEarth()
    this.scene.add(this.earthOrbitGroup)
    this.scene.add(this.currentArcGroup)
    this.buildLabels()
    this.setupLabelLayer()
    this.setupInput()
    this.setupContextHandling()

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.container)
    this.resize()
    this.setView('default', true)
    this.applyGuides()
    this.start()
    void this.loadTextures()
  }

  private buildOrbit(): void {
    this.sharedMaterials.push(
      new THREE.LineBasicMaterial({
        color: 0x8bb0aa,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
    )
    const basePoints: THREE.Vector3[] = []
    for (let i = 0; i < 360; i += 1) {
      const direction = eclipticDirection(i)
      basePoints.push(new THREE.Vector3(direction.x * ORBIT_RADIUS, 0, direction.z * ORBIT_RADIUS))
    }
    const baseGeometry = new THREE.BufferGeometry().setFromPoints(basePoints)
    this.sharedGeometries.push(baseGeometry)
    const baseLine = new THREE.LineLoop(baseGeometry, this.sharedMaterials[this.sharedMaterials.length - 1])
    this.scene.add(baseLine)

    // 四季弧线：每季跨度 90°，由立春、立夏、立秋、立冬起算。
    for (const season of Object.keys(SEASON_DIRECTIONS) as Season[]) {
      const [startLongitude, endLongitude] = SEASON_DIRECTIONS[season]
      const points: THREE.Vector3[] = []
      const span = normalizedAngle(endLongitude - startLongitude)
      for (let i = 0; i <= 54; i += 1) {
        const longitude = startLongitude + (span * i) / 54
        const direction = eclipticDirection(longitude + 180)
        points.push(
          new THREE.Vector3(direction.x * (ORBIT_RADIUS + 0.04), 0, direction.z * (ORBIT_RADIUS + 0.04)),
        )
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: SEASON_META[season].color,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
      this.sharedGeometries.push(geometry)
      this.sharedMaterials.push(material)
      this.scene.add(new THREE.Line(geometry, material))
    }

    // 24 个细刻度。
    const tickPositions: number[] = []
    const tickColors: number[] = []
    for (const term of SOLAR_TERMS) {
      const angle = (term.longitude + 180) * DEG_TO_RAD
      const inner = ORBIT_RADIUS - 0.36
      const outer = ORBIT_RADIUS + (term.major ? 0.52 : 0.2)
      tickPositions.push(
        Math.cos(angle) * inner,
        0.01,
        -Math.sin(angle) * inner,
        Math.cos(angle) * outer,
        0.01,
        -Math.sin(angle) * outer,
      )
      const color = new THREE.Color(term.major ? '#e2c27e' : SEASON_META[term.season].color)
      tickColors.push(color.r, color.g, color.b, color.r, color.g, color.b)
    }
    const tickGeometry = new THREE.BufferGeometry()
    tickGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tickPositions, 3))
    tickGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tickColors, 3))
    const tickMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    })
    this.sharedGeometries.push(tickGeometry)
    this.sharedMaterials.push(tickMaterial)
    this.scene.add(new THREE.LineSegments(tickGeometry, tickMaterial))

    // 24 个可点击节气光点。
    this.sharedMaterials.push(
      ...Object.values(SEASON_META).map(
        (meta) =>
          new THREE.MeshBasicMaterial({
            color: meta.color,
            toneMapped: false,
          }),
      ),
    )
    const seasonMaterialList = this.sharedMaterials.slice(-4)
    ;(['春', '夏', '秋', '冬'] as Season[]).forEach((season, index) => {
      this.seasonMaterials.set(season, seasonMaterialList[index] as THREE.MeshBasicMaterial)
    })
    const minorGeometry = new THREE.SphereGeometry(0.09, 10, 8)
    const majorGeometry = new THREE.SphereGeometry(0.135, 12, 10)
    const hitGeometry = new THREE.SphereGeometry(0.66, 8, 6)
    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    this.sharedGeometries.push(minorGeometry, majorGeometry, hitGeometry)
    this.sharedMaterials.push(hitMaterial)

    for (const term of SOLAR_TERMS) {
      const angle = (term.longitude + 180) * DEG_TO_RAD
      const x = Math.cos(angle) * ORBIT_RADIUS
      const z = -Math.sin(angle) * ORBIT_RADIUS
      const marker = new THREE.Mesh(
        term.major ? majorGeometry : minorGeometry,
        this.seasonMaterials.get(term.season)!,
      )
      marker.position.set(x, 0.03, z)
      marker.scale.setScalar(term.major ? 1.1 : 1)
      marker.userData.termIndex = term.index
      marker.userData.termMajor = term.major
      this.markerMeshes.set(term.index, marker)
      this.scene.add(marker)
      this.markerHits.push(marker)

      const hit = new THREE.Mesh(hitGeometry, hitMaterial)
      hit.position.set(x, 0.03, z)
      hit.userData.termIndex = term.index
      this.markerHits.push(hit)
      this.scene.add(hit)
    }

    // 公转方向箭头。
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: 0xcbdcb9,
      transparent: true,
      opacity: 0.6,
      toneMapped: false,
    })
    this.sharedMaterials.push(arrowMaterial)
    const arrowGeometry = new THREE.ConeGeometry(0.13, 0.5, 8)
    this.sharedGeometries.push(arrowGeometry)
    for (const longitude of [30, 120, 210, 300]) {
      const angle = longitude * DEG_TO_RAD
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial)
      arrow.position.set(
        Math.cos(angle) * (ORBIT_RADIUS + 0.85),
        0,
        -Math.sin(angle) * (ORBIT_RADIUS + 0.85),
      )
      const tangent = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle)).normalize()
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
      this.revolutionGroup.add(arrow)
    }
    this.scene.add(this.revolutionGroup)

    const haloMaterial = new THREE.SpriteMaterial({
      map: createSunGlowTexture(),
      color: 0xf4d08b,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    this.activeMarkerHaloMaterial = haloMaterial
    this.activeMarkerHalo = new THREE.Sprite(haloMaterial)
    this.activeMarkerHalo.scale.setScalar(1.6)
    this.scene.add(this.activeMarkerHalo)
    this.ownedTextures.push(haloMaterial.map as THREE.Texture)
    this.sharedMaterials.push(haloMaterial)
  }

  private buildSun(): void {
    this.sunMaterial = new THREE.MeshBasicMaterial({
      map: this.textureLibrary.textures.sun,
      color: 0xfff4de,
      toneMapped: false,
    })
    this.sharedMaterials.push(this.sunMaterial)
    const geometry = new THREE.SphereGeometry(SUN_RADIUS, this.quality.earthSegments, this.quality.earthSegments / 2)
    this.sharedGeometries.push(geometry)
    this.sunMesh = new THREE.Mesh(geometry, this.sunMaterial)
    this.sunGroup.add(this.sunMesh)

    const glow = createSunGlowTexture()
    this.ownedTextures.push(glow)
    const glowMaterial = new THREE.SpriteMaterial({
      map: glow,
      color: 0xffd18b,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    const innerGlow = new THREE.Sprite(glowMaterial)
    innerGlow.scale.setScalar(20)
    this.sharedMaterials.push(glowMaterial)
    this.sunGroup.add(innerGlow)
    this.sunGlowSprites.push(innerGlow)

    const outerMaterial = glowMaterial.clone()
    outerMaterial.opacity = 0.24
    outerMaterial.color.set(0xffb56a)
    const outerGlow = new THREE.Sprite(outerMaterial)
    outerGlow.scale.setScalar(43)
    this.sharedMaterials.push(outerMaterial)
    this.sunGroup.add(outerGlow)
    this.sunGlowSprites.push(outerGlow)

    this.scene.add(this.sunGroup)
  }

  private buildEarth(): void {
    this.earthOrbitGroup.add(this.earthTiltGroup)
    this.earthTiltGroup.add(this.earthSpinGroup)
    this.earthTiltGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), TILT_AXIS)

    this.earthUniforms = {
      uDayMap: { value: this.textureLibrary.textures.earthDay },
      uNightMap: { value: this.textureLibrary.textures.earthNight },
      uNormalMap: { value: this.textureLibrary.textures.earthNormal },
      uSpecularMap: { value: this.textureLibrary.textures.earthSpecular },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uAtmosphereColor: { value: new THREE.Color(0x5e9bc4) },
      uNormalScale: { value: this.quality.low ? 0.55 : 0.8 },
      uNightIntensity: { value: 1.55 },
      uSpecularStrength: { value: 0.75 },
    }
    const earthMaterial = new THREE.ShaderMaterial({
      uniforms: this.earthUniforms,
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
    })
    const earthGeometry = new THREE.SphereGeometry(
      EARTH_RADIUS,
      this.quality.earthSegments,
      this.quality.earthSegments / 2,
    )
    this.sharedGeometries.push(earthGeometry)
    this.sharedMaterials.push(earthMaterial)
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
    this.earthSpinGroup.add(earthMesh)

    this.cloudUniforms = {
      uCloudMap: { value: this.textureLibrary.textures.earthClouds },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uCloudOpacity: { value: 0.82 },
    }
    const cloudMaterial = new THREE.ShaderMaterial({
      uniforms: this.cloudUniforms,
      vertexShader: cloudVertexShader,
      fragmentShader: cloudFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    })
    const cloudGeometry = new THREE.SphereGeometry(
      EARTH_RADIUS * 1.012,
      this.quality.cloudSegments,
      this.quality.cloudSegments / 2,
    )
    this.sharedGeometries.push(cloudGeometry)
    this.sharedMaterials.push(cloudMaterial)
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial)
    cloudMesh.renderOrder = 2
    this.earthSpinGroup.add(cloudMesh)

    this.atmosphereUniforms = {
      uColor: { value: new THREE.Color(0x5a9ecf) },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uIntensity: { value: 0.72 },
    }
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: this.atmosphereUniforms,
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    })
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.07, 64, 32)
    this.sharedGeometries.push(atmosphereGeometry)
    this.sharedMaterials.push(atmosphereMaterial)
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
    atmosphereMesh.renderOrder = 3
    this.earthTiltGroup.add(atmosphereMesh)

    this.buildEarthGuides()
  }

  private buildEarthGuides(): void {
    // 地轴（金色）与轨道法线（蓝灰虚线）
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -EARTH_RADIUS * 1.65, 0),
      new THREE.Vector3(0, EARTH_RADIUS * 1.85, 0),
    ])
    this.sharedGeometries.push(axisGeometry)
    const axisMaterial = new THREE.LineBasicMaterial({
      color: 0xebca8c,
      transparent: true,
      opacity: 0.88,
    })
    this.sharedMaterials.push(axisMaterial)
    const axisLine = new THREE.Line(axisGeometry, axisMaterial)
    this.axisGroup.add(axisLine)

    const axisTipGeometry = new THREE.ConeGeometry(0.065, 0.17, 8)
    const axisTipMaterial = new THREE.MeshBasicMaterial({ color: 0xf3d596, toneMapped: false })
    this.sharedGeometries.push(axisTipGeometry)
    this.sharedMaterials.push(axisTipMaterial)
    const axisTip = new THREE.Mesh(axisTipGeometry, axisTipMaterial)
    axisTip.position.y = EARTH_RADIUS * 1.92
    this.axisGroup.add(axisTip)

    // 轨道法线不随地轴倾斜，必须挂在未倾斜的轨道组上。
    const normalGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -EARTH_RADIUS * 1.55, 0),
      new THREE.Vector3(0, EARTH_RADIUS * 1.55, 0),
    ])
    const normalMaterial = new THREE.LineDashedMaterial({
      color: 0x7696ae,
      dashSize: 0.1,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.55,
    })
    this.sharedGeometries.push(normalGeometry)
    this.sharedMaterials.push(normalMaterial)
    const normalLine = new THREE.Line(normalGeometry, normalMaterial)
    normalLine.computeLineDistances()
    this.normalGroup.add(normalLine)

    const arcPoints: THREE.Vector3[] = []
    for (let i = 0; i <= 18; i += 1) {
      const angle = (AXIAL_TILT_RAD * i) / 18
      const radius = EARTH_RADIUS * 1.43
      arcPoints.push(new THREE.Vector3(0, radius * Math.cos(angle), -radius * Math.sin(angle)))
    }
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints)
    const arcMaterial = new THREE.LineBasicMaterial({
      color: 0xa7bdbb,
      transparent: true,
      opacity: 0.4,
    })
    this.sharedGeometries.push(arcGeometry)
    this.sharedMaterials.push(arcMaterial)
    this.normalGroup.add(new THREE.Line(arcGeometry, arcMaterial))
    this.earthOrbitGroup.add(this.normalGroup)
    this.earthTiltGroup.add(this.axisGroup)

    // 赤道与南北回归线均垂直于地轴，故放在倾斜后的坐标系里。
    const createCircle = (radius: number, y: number, color: number, opacity: number): THREE.LineLoop => {
      const points: THREE.Vector3[] = []
      for (let i = 0; i < 128; i += 1) {
        const angle = (i / 128) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(angle) * radius, y, -Math.sin(angle) * radius))
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
      this.sharedGeometries.push(geometry)
      this.sharedMaterials.push(material)
      return new THREE.LineLoop(geometry, material)
    }

    this.equatorGroup.add(createCircle(EARTH_RADIUS * 1.008, 0, 0xe8c47d, 0.72))
    this.earthTiltGroup.add(this.equatorGroup)

    const tropicOffset = EARTH_RADIUS * Math.sin(AXIAL_TILT_RAD) * 1.008
    const tropicRadius = EARTH_RADIUS * Math.cos(AXIAL_TILT_RAD) * 1.008
    this.tropicsGroup.add(createCircle(tropicRadius, tropicOffset, 0x8ebaa8, 0.48))
    this.tropicsGroup.add(createCircle(tropicRadius, -tropicOffset, 0x8ebaa8, 0.48))
    this.earthTiltGroup.add(this.tropicsGroup)

    // 日地连线，用极淡的一段线段表达光照方向。
    const lightGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ])
    const lightMaterial = new THREE.LineDashedMaterial({
      color: 0xd8b978,
      dashSize: 0.5,
      gapSize: 0.45,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    })
    this.lineToSun = new THREE.Line(lightGeometry, lightMaterial)
    this.lineToSun.computeLineDistances()
    this.scene.add(this.lineToSun)
    this.sharedGeometries.push(lightGeometry)
    this.sharedMaterials.push(lightMaterial)
  }

  private lineToSun!: THREE.Line

  private buildLabels(): void {
    this.labelLayer.className = 'orbit-label-layer'
    this.labelLayer.setAttribute('aria-label', '二十四节气轨道标记')
    for (const term of SOLAR_TERMS) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `orbit-label season-${term.season}${term.major ? ' is-major' : ''}`
      button.dataset.termIndex = String(term.index)
      button.style.setProperty('--season-color', SEASON_META[term.season].color)
      button.title = `${term.name} · 太阳黄经 ${term.longitude}° · 点击前往交节时刻`
      button.setAttribute(
        'aria-label',
        `${term.name}，太阳黄经 ${term.longitude} 度，点击跳转到所选年份的交节时刻`,
      )
      button.style.display = 'none'
      const dot = document.createElement('span')
      dot.className = 'orbit-label__dot'
      dot.setAttribute('aria-hidden', 'true')
      const name = document.createElement('span')
      name.className = 'orbit-label__name'
      name.textContent = term.name
      button.append(dot, name)
      button.addEventListener('click', () => {
        this.options.onSelectTerm(term.index)
      })
      this.labelElements.set(term.index, button)
      this.labelLayer.append(button)
    }

    this.sunLabel.className = 'cosmic-label cosmic-label--sun'
    this.sunLabel.textContent = '太阳'
    this.sunLabel.setAttribute('aria-hidden', 'true')
    this.sunLabel.style.display = 'none'
    this.earthLabel.className = 'cosmic-label cosmic-label--earth'
    this.earthLabel.textContent = '地球 · 此刻'
    this.earthLabel.setAttribute('aria-hidden', 'true')
    this.earthLabel.style.display = 'none'
    this.labelLayer.append(this.sunLabel, this.earthLabel)
  }

  private setupLabelLayer(): void {
    this.container.appendChild(this.labelLayer)
  }

  private createStarGeometry(count: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    let seed = 947
    const random = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0x100000000
    }
    for (let i = 0; i < count; i += 1) {
      const radius = 90 + random() * 95
      const theta = random() * Math.PI * 2
      const phi = Math.acos(2 * random() - 1)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      sizes[i] = 0.3 + random() * 1.2
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geometry
  }

  private setupInput(): void {
    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerleave', this.handlePointerLeave)
    canvas.addEventListener('keydown', this.handleKeyboard)
    window.addEventListener('resize', this.handleWindowResize)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  private handleWindowResize = (): void => {
    this.resize()
  }

  private setupContextHandling(): void {
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost)
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored)
  }

  private handleContextLost = (event: Event): void => {
    event.preventDefault()
    this.contextLost = true
    this.stop()
    this.options.onContextLost?.()
  }

  private handleContextRestored = (): void => {
    this.contextLost = false
    this.start()
    this.options.onContextRestored?.()
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    this.pointerDown = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      pointerId: event.pointerId,
    }
    this.renderer.domElement.style.cursor = 'grabbing'
  }

  private handlePointerUp = (event: PointerEvent): void => {
    const canvas = this.renderer.domElement
    canvas.style.cursor = 'grab'
    const start = this.pointerDown
    this.pointerDown = null
    if (!start || start.pointerId !== event.pointerId) return
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    const elapsed = performance.now() - start.time
    if (distance > 8 || elapsed > 900) return
    const hit = this.pickTerm(event.clientX, event.clientY)
    if (hit !== null) this.options.onSelectTerm(hit)
  }

  private handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || this.pointerDown) return
    const hit = this.pickTerm(event.clientX, event.clientY)
    this.renderer.domElement.style.cursor = hit === null ? 'grab' : 'pointer'
  }

  private handlePointerLeave = (): void => {
    if (!this.pointerDown) this.renderer.domElement.style.cursor = 'grab'
  }

  private pickTerm(clientX: number, clientY: number): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)
    const hits = this.raycaster.intersectObjects(this.markerHits, false)
    const first = hits[0]
    if (!first) return null
    const index = first.object.userData.termIndex
    return typeof index === 'number' ? index : null
  }

  private handleKeyboard = (event: KeyboardEvent): void => {
    const key = event.key
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', 'Home', '0'].includes(key)) {
      return
    }
    event.preventDefault()
    if (key === 'Home' || key === '0') {
      this.setView('default')
      return
    }
    const offset = this.camera.position.clone().sub(this.controls.target)
    const spherical = new THREE.Spherical().setFromVector3(offset)
    const step = 0.1
    if (key === 'ArrowLeft') spherical.theta += step
    if (key === 'ArrowRight') spherical.theta -= step
    if (key === 'ArrowUp') spherical.phi = Math.max(0.1, spherical.phi - step)
    if (key === 'ArrowDown') spherical.phi = Math.min(Math.PI / 2 + 0.05, spherical.phi + step)
    if (key === '+' || key === '=') spherical.radius = Math.max(3.4, spherical.radius * 0.92)
    if (key === '-' || key === '_') spherical.radius = Math.min(150, spherical.radius * 1.08)
    this.camera.position.copy(this.controls.target).add(offset.setFromSpherical(spherical))
    this.controls.update()
  }

  private handleVisibilityChange = (): void => {
    this.visible = document.visibilityState !== 'hidden'
    if (this.visible) this.lastFrameTime = performance.now()
  }

  private setViewportCameraPosition(preset: ViewPreset): { position: THREE.Vector3; target: THREE.Vector3 } {
    const aspect = Math.max(0.45, this.container.clientWidth / Math.max(1, this.container.clientHeight))
    const narrowBoost =
      aspect < 1.25 ? Math.min(1.68, 1 + (1.25 - aspect) * 1.55) : 1
    if (preset === 'overview') {
      const distance = 86 * narrowBoost
      return {
        position: new THREE.Vector3(0.01, distance * 0.93, distance * 0.36),
        target: new THREE.Vector3(0, 0, 0),
      }
    }
    if (preset === 'earth') {
      const target = this.earthPosition.clone()
      return { position: target.clone().add(this.computeEarthCameraOffset()), target }
    }
    const distance = 78 * narrowBoost
    return {
      position: new THREE.Vector3(0, distance * 0.55, distance * 0.84),
      target: new THREE.Vector3(0, 0, 0),
    }
  }

  private computeEarthCameraOffset(): THREE.Vector3 {
    const sunward = this.earthPosition.clone().negate()
    sunward.y = 0
    sunward.normalize()
    const side = new THREE.Vector3(0, 1, 0).cross(sunward).normalize()
    return sunward
      .multiplyScalar(0.28)
      .add(side.multiplyScalar(0.95))
      .add(new THREE.Vector3(0, 0.3, 0))
      .normalize()
      .multiplyScalar(7.35)
  }

  setView(preset: ViewPreset, immediate = false): void {
    this.viewMode = preset
    this.applyGuides()
    const destination = this.setViewportCameraPosition(preset)
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const duration = immediate || reducedMotion ? 0 : 980
    this.flight = {
      startedAt: performance.now(),
      duration,
      fromPosition: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toPosition: destination.position,
      toTarget: destination.target,
    }
    if (preset === 'earth') {
      this.lastFollowingPosition.copy(this.earthPosition)
      this.earthCameraOffset.copy(destination.position).sub(destination.target)
    }
    this.controls.enabled = true
    if (duration === 0) {
      this.camera.position.copy(destination.position)
      this.controls.target.copy(destination.target)
      this.flight = null
      this.controls.update()
    }
  }

  getView(): ViewPreset {
    return this.viewMode
  }

  setGuides(guides: GuideToggles): void {
    this.guides = { ...guides }
    this.applyGuides()
  }

  private applyGuides(): void {
    const earthView = this.viewMode === 'earth'
    this.axisGroup.visible = this.guides.axis
    this.normalGroup.visible = this.guides.axis
    this.equatorGroup.visible = this.guides.equator
    this.tropicsGroup.visible = this.guides.tropics
    this.revolutionGroup.visible = this.guides.revolution && !earthView
    this.currentArcGroup.visible = !earthView
    if (this.lineToSun) this.lineToSun.visible = !earthView
    this.labelLayer.style.display = this.guides.labels ? '' : 'none'
  }

  private async loadTextures(): Promise<void> {
    const progress = await this.textureLibrary.loadAll((assetProgress) => {
      if (this.disposed) return
      this.textureProgress = assetProgress
      this.options.onAssetProgress?.(assetProgress)
    })
    if (this.disposed) return
    this.applyTextures()
    this.options.onTexturesSettled?.(progress.failures)
  }

  private applyTextures(): void {
    const textures = this.textureLibrary.textures
    this.backgroundMaterial.map = textures.stars
    this.backgroundMaterial.needsUpdate = true
    ;(this.earthUniforms.uDayMap as THREE.IUniform).value = textures.earthDay
    ;(this.earthUniforms.uNightMap as THREE.IUniform).value = textures.earthNight
    ;(this.earthUniforms.uNormalMap as THREE.IUniform).value = textures.earthNormal
    ;(this.earthUniforms.uSpecularMap as THREE.IUniform).value = textures.earthSpecular
    ;(this.cloudUniforms.uCloudMap as THREE.IUniform).value = textures.earthClouds
    this.sunMaterial.map = textures.sun
    this.sunMaterial.needsUpdate = true
  }

  private buildCurrentArc(state: SceneFrameState): void {
    const key = `${state.activeTermIndex}:${state.activeTermLongitude}:${state.nextTermLongitude}`
    if (key === this.lastArcKey) return
    this.lastArcKey = key

    if (this.currentArcMesh) {
      this.currentArcGroup.remove(this.currentArcMesh)
      this.currentArcMesh.geometry.dispose()
      ;(this.currentArcMesh.material as THREE.Material).dispose()
      this.currentArcMesh = null
    }
    const start = state.activeTermLongitude
    const span = normalizedAngle(state.nextTermLongitude - start)
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 48; i += 1) {
      const direction = eclipticDirection(start + (span * i) / 48 + 180)
      points.push(
        new THREE.Vector3(
          direction.x * (ORBIT_RADIUS + 0.015),
          0.035,
          direction.z * (ORBIT_RADIUS + 0.015),
        ),
      )
    }
    const curve = new THREE.CatmullRomCurve3(points)
    const geometry = new THREE.TubeGeometry(curve, 96, 0.078, 6, false)
    const material = new THREE.MeshBasicMaterial({
      color: 0xe7c47a,
      transparent: true,
      opacity: 0.92,
      toneMapped: false,
    })
    this.currentArcMesh = new THREE.Mesh(geometry, material)
    this.currentArcMesh.renderOrder = 2
    this.currentArcGroup.add(this.currentArcMesh)
  }

  private updateActiveTerm(index: number): void {
    if (index === this.activeTermIndex) return
    const previous = this.markerMeshes.get(this.activeTermIndex)
    if (previous) {
      previous.scale.setScalar(previous.userData.termMajor ? 1.1 : 1)
      const term = SOLAR_TERMS[this.activeTermIndex]
      if (term) previous.material = this.seasonMaterials.get(term.season) ?? previous.material
    }
    this.activeTermIndex = index
    const marker = this.markerMeshes.get(index)
    if (marker) {
      const term = SOLAR_TERMS[index]
      const isMajor = term?.major ?? false
      marker.scale.setScalar(isMajor ? 1.35 : 1.25)
      marker.material = this.activeMarkerMaterial
      this.activeMarkerHalo.position.copy(marker.position)
      this.activeMarkerHalo.position.y = 0.1
    }
    for (const [termIndex, element] of this.labelElements) {
      const active = termIndex === index
      element.classList.toggle('is-active', active)
      if (active) element.setAttribute('aria-current', 'true')
      else element.removeAttribute('aria-current')
      // 当前标签总会优先显示在叠放层的最上面。
      element.style.zIndex = active ? '4' : ''
    }
  }

  private applyFrameState(state: SceneFrameState): void {
    const position = earthScenePosition(state.sunLongitude, ORBIT_RADIUS)
    this.earthPosition.set(position.x, position.y, position.z)
    this.earthOrbitGroup.position.copy(this.earthPosition)
    this.earthOrbitGroup.updateMatrixWorld()

    this.inverseTiltQuaternion.copy(this.earthTiltGroup.quaternion).invert()
    this.tempVector.set(0, 0, 0).sub(this.earthPosition).normalize()
    this.sunDirectionLocal.copy(this.tempVector).applyQuaternion(this.inverseTiltQuaternion)
    const spin = equatorialSpinAngle(
      this.sunDirectionLocal.x,
      this.sunDirectionLocal.z,
      state.subsolarLongitude,
    )
    this.earthSpinGroup.rotation.y = spin

    if (this.lineToSun) {
      const positions = this.lineToSun.geometry.getAttribute('position') as THREE.BufferAttribute
      positions.setXYZ(0, this.earthPosition.x, this.earthPosition.y, this.earthPosition.z)
      positions.setXYZ(1, 0, 0, 0)
      positions.needsUpdate = true
      this.lineToSun.computeLineDistances()
    }

    this.updateActiveTerm(state.activeTermIndex)
    this.buildCurrentArc(state)
    this.lastEarthPosition.copy(this.earthPosition)
  }

  private updateCamera(deltaSeconds: number): void {
    const now = performance.now()
    if (this.flight) {
      const elapsed = now - this.flight.startedAt
      const rawT = this.flight.duration <= 0 ? 1 : Math.min(1, elapsed / this.flight.duration)
      const t = easeInOutCubic(rawT)
      if (this.viewMode === 'earth') {
        const target = this.earthPosition.clone()
        this.flight.toTarget.copy(target)
        this.flight.toPosition.copy(target).add(this.earthCameraOffset)
      }
      this.camera.position.lerpVectors(this.flight.fromPosition, this.flight.toPosition, t)
      this.controls.target.lerpVectors(this.flight.fromTarget, this.flight.toTarget, t)
      if (rawT >= 1) {
        this.flight = null
        if (this.viewMode === 'earth') {
          this.lastFollowingPosition.copy(this.earthPosition)
          this.lastEarthPosition.copy(this.earthPosition)
        }
      }
      this.controls.update()
      return
    }

    if (this.viewMode === 'earth') {
      const delta = this.earthPosition.clone().sub(this.lastFollowingPosition)
      if (delta.lengthSq() > 0) {
        this.controls.target.copy(this.earthPosition)
        this.camera.position.add(delta)
      }
      this.lastFollowingPosition.copy(this.earthPosition)
    }
    this.controls.update(deltaSeconds)
  }

  private updateSunAndStars(deltaSeconds: number): void {
    this.sunMesh.rotation.y += deltaSeconds * 0.018
    const t = performance.now() / 1000
    this.sunGlowSprites[0].material.opacity = 0.75 + 0.06 * Math.sin(t * 0.55)
    this.sunGlowSprites[1].material.opacity = 0.22 + 0.03 * Math.sin(t * 0.33 + 1.4)
    this.starsPoints.rotation.y += deltaSeconds * 0.0006
    this.starPointsMaterial.opacity = 0.72 + 0.04 * Math.sin(t * 0.5)
    if (this.activeMarkerHaloMaterial) {
      const pulse = 1.35 + 0.18 * Math.sin(t * 1.9)
      this.activeMarkerHalo.scale.setScalar(pulse)
    }
    this.activeMarkerHaloMaterial.opacity = 0.34 + 0.08 * Math.sin(t * 1.9)
  }

  private updateProjectedLabels(): void {
    // renderer.render() 才会自动刷新相机矩阵；标签投影发生在那之前，需手动更新。
    this.camera.updateMatrixWorld()
    const rect = this.renderer.domElement.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    if (width <= 0 || height <= 0) return
    const cameraSpace = new THREE.Vector3()
    const labelPosition = new THREE.Vector3()
    const stageCenterX = width / 2
    const stageCenterY = height / 2

    const orbitLabelsVisible = this.guides.labels && this.viewMode !== 'earth'
    if (orbitLabelsVisible) {
      for (const term of SOLAR_TERMS) {
        const element = this.labelElements.get(term.index)
        if (!element) continue
        const direction = eclipticDirection(term.longitude + 180)
        labelPosition.set(
          direction.x * ORBIT_RADIUS,
          0.08,
          direction.z * ORBIT_RADIUS,
        )
        cameraSpace.copy(labelPosition).applyMatrix4(this.camera.matrixWorldInverse)
        if (cameraSpace.z >= -0.1) {
          element.style.display = 'none'
          continue
        }
        const projected = labelPosition.project(this.camera)
        let x = (projected.x * 0.5 + 0.5) * width
        let y = (-projected.y * 0.5 + 0.5) * height
        if (x < -40 || x > width + 40 || y < -30 || y > height + 30) {
          element.style.display = 'none'
          continue
        }
        const dx = x - stageCenterX
        const dy = y - stageCenterY
        const length = Math.hypot(dx, dy) || 1
        const outward = 18 + (term.index % 2 === 0 ? 2 : 5)
        x += (dx / length) * outward
        y += (dy / length) * outward + (term.index % 2 === 0 ? -1 : 3)
        x = Math.min(width - 26, Math.max(26, x))
        y = Math.min(height - 18, Math.max(18, y))
        element.style.display = ''
        element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
      }
    } else {
      for (const element of this.labelElements.values()) element.style.display = 'none'
    }

    // 近景主要观察地球本身，轨道文字让位于地表细节。
    this.positionCosmicLabel(this.sunLabel, new THREE.Vector3(0, 0, 0), width, height, 0, 52)
    this.earthLabel.style.display = 'none'
  }

  private positionCosmicLabel(
    element: HTMLElement,
    worldPosition: THREE.Vector3,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number,
  ): void {
    const cameraSpace = worldPosition.clone().applyMatrix4(this.camera.matrixWorldInverse)
    if (cameraSpace.z >= -0.05) {
      element.style.display = 'none'
      return
    }
    const projected = worldPosition.clone().project(this.camera)
    const x = (projected.x * 0.5 + 0.5) * width + offsetX
    const y = (-projected.y * 0.5 + 0.5) * height + offsetY
    if (x < -20 || x > width + 20 || y < -20 || y > height + 20) {
      element.style.display = 'none'
      return
    }
    element.style.display = ''
    element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
  }

  private frame = (time: number): void => {
    if (this.disposed) return
    this.frameHandle = requestAnimationFrame(this.frame)
    if (!this.visible || this.contextLost) return
    if (this.minFrameInterval > 0 && time - this.lastRenderedAt < this.minFrameInterval - 1) return
    const delta = this.lastFrameTime > 0 ? Math.min(0.1, (time - this.lastFrameTime) / 1000) : 0
    this.lastFrameTime = time
    this.lastRenderedAt = time

    let state: SceneFrameState | null = null
    try {
      state = this.options.onFrame(delta)
    } catch (error) {
      console.error('Observatory frame update failed', error)
    }
    if (!state) return
    this.applyFrameState(state)
    this.updateCamera(delta)
    this.updateSunAndStars(delta)
    this.updateProjectedLabels()
    this.renderer.render(this.scene, this.camera)
  }

  start(): void {
    if (this.frameHandle !== null || this.disposed) return
    this.lastFrameTime = performance.now()
    this.frameHandle = requestAnimationFrame(this.frame)
  }

  stop(): void {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
  }

  resize(): void {
    if (this.disposed) return
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)
    this.renderer.setPixelRatio(this.quality.pixelRatio)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  getTextureProgress(): TextureProgress | null {
    return this.textureProgress
  }

  getSupportedQuality(): string {
    return this.quality.low ? '自适应 · 流畅' : '自适应 · 精细'
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    window.removeEventListener('resize', this.handleWindowResize)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    const canvas = this.renderer.domElement
    canvas.removeEventListener('pointerdown', this.handlePointerDown)
    canvas.removeEventListener('pointerup', this.handlePointerUp)
    canvas.removeEventListener('pointermove', this.handlePointerMove)
    canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    canvas.removeEventListener('keydown', this.handleKeyboard)
    canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.labelLayer.remove()
    this.textureLibrary.dispose()
    for (const texture of this.ownedTextures) texture.dispose()
    for (const geometry of this.sharedGeometries) geometry.dispose()
    for (const material of this.sharedMaterials) material.dispose()
    this.activeMarkerMaterial.dispose()
    this.activeMarkerHaloMaterial.dispose()
    this.currentArcMesh?.geometry.dispose()
    ;(this.currentArcMesh?.material as THREE.Material | undefined)?.dispose()
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
