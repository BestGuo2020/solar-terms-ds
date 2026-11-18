/**
 * 公转轨道、24 个节气标记与当前节气区间高亮
 *
 * 轨道线由真实星历采样得到：把一年中每个时刻的地球位置连起来，
 * 因此它**保留了地球轨道接近圆形的真实特征**（偏心率约 0.0167，
 * 近日点 0.983 AU、远日点 1.017 AU，视觉上几乎就是一个正圆）。
 * 若为了「好看」把椭圆画得很扁，反而是失真的。
 *
 * 每个节气标记落在「该节气交节瞬间地球所在的位置」上，
 * 所以标记的方位角与太阳黄经严格对应，**不是把一年平分成 24 份**。
 *
 * 标签用 CSS2DRenderer 渲染成真正的 HTML 按钮：文字清晰、可点、可聚焦、
 * 触屏命中面积大。注意 CSS2DRenderer 每帧会覆写外层元素的 transform，
 * 因此缩放等视觉调整都作用在内层按钮上。
 */

import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { earthStateAt } from '@/astro/bodyPosition'
import { fromBeijing } from '@/astro/time'
import { earthScenePosition } from '@/astro/sceneFrame'
import type { TermMoment } from '@/astro/solarTerms'
import { PALETTE, SCENE, SEASON_COLORS } from './config'

export interface OrbitMarker {
  index: number
  name: string
  longitude: number
  major: boolean
  season: string
  /** 该节气交节瞬间地球所在位置 */
  position: THREE.Vector3
  /** 该节气当年的交节时刻 */
  moment: TermMoment
  button: HTMLButtonElement
  label: CSS2DObject
  /** 标签的实际像素尺寸（用于重叠剔除）。英文节气名比中文长得多，不能用固定估值 */
  labelW: number
  labelH: number
}

/** 采样一个回归年的轨道点（用于绘制轨道线） */
function sampleOrbit(startMs: number, samples = 512): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const span = 365.2422 * 86400000
  for (let i = 0; i <= samples; i++) {
    const ms = startMs + (span * i) / samples
    const st = earthStateAt(ms)
    const p = earthScenePosition(st.sunLongitude, st.distanceAU, SCENE.auScale)
    pts.push(new THREE.Vector3(p.x, p.y, p.z))
  }
  return pts
}

export class OrbitRing {
  readonly group = new THREE.Group()

  private orbitLine: THREE.Line | null = null
  private markers: OrbitMarker[] = []
  private byIndex = new Map<number, OrbitMarker>()
  private highlight: THREE.Mesh | null = null
  private readonly locator: THREE.Mesh
  private readonly arrow: THREE.Group
  private readonly arrowDirection = new THREE.Vector3()
  private readonly onSelect: (index: number) => void

  /** 节气序号的本地化名称解析器，切语言时由外部替换 */
  private nameOf: (index: number) => string = (i) => String(i)
  private labelsVisible = true
  private minorLabelsVisible = true
  private activeStart = Number.NaN
  private activeEnd = Number.NaN
  private emphasized = -1

  constructor(onSelect: (index: number) => void, nameOf?: (index: number) => string) {
    this.onSelect = onSelect
    if (nameOf) this.nameOf = nameOf

    // ── 「你在这里」定位环：贴在地球位置上，便于一眼找到地球 ──
    this.locator = new THREE.Mesh(
      new THREE.TorusGeometry(SCENE.earthRadius * 1.95, 0.022, 4, 64),
      new THREE.MeshBasicMaterial({
        color: PALETTE.gold,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    )
    this.locator.rotation.x = Math.PI / 2
    this.group.add(this.locator)

    // ── 公转方向箭头 ──
    this.arrow = this.buildRevolutionArrow()
    this.group.add(this.arrow)
  }

  /** 公转方向：地球自西向东绕日运行，从黄道北极俯视为逆时针 */
  private buildRevolutionArrow(): THREE.Group {
    const a = (SCENE.revolutionArrowAt * Math.PI) / 180
    const r = SCENE.auScale
    const pos = new THREE.Vector3(r * Math.cos(a), 0, -r * Math.sin(a))

    // 黄经增大方向的轨道切线
    const tangent = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a)).normalize()
    this.arrowDirection.copy(tangent)

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.6, 16),
      new THREE.MeshBasicMaterial({ color: PALETTE.azure, transparent: true, opacity: 0.92, toneMapped: false }),
    )
    cone.position.copy(pos)
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)

    const tail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.7, 8),
      new THREE.MeshBasicMaterial({ color: PALETTE.azure, transparent: true, opacity: 0.55, toneMapped: false }),
    )
    tail.position.copy(pos).addScaledVector(tangent, -1.6)
    tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)

    const holder = new THREE.Group()
    holder.add(cone, tail)
    return holder
  }

  /** 依据某年的节气表重建轨道线与标记 */
  buildForYear(year: number, terms: TermMoment[]) {
    this.disposeOrbitLine()
    this.disposeMarkers()
    // 标记被重建后，缓存的高亮区间与强调状态都失效了
    this.activeStart = Number.NaN
    this.activeEnd = Number.NaN
    this.emphasized = -1

    const startMs = terms.length ? terms[0].ms : fromBeijing(year, 1, 1)
    const pts = sampleOrbit(startMs)
    this.orbitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: PALETTE.orbit, transparent: true, opacity: 0.85 }),
    )
    this.group.add(this.orbitLine)

    for (const term of terms) {
      const m = this.buildMarker(term)
      this.markers.push(m)
      this.byIndex.set(m.index, m)
    }
  }

  private buildMarker(term: TermMoment): OrbitMarker {
    const st = earthStateAt(term.ms)
    const p = earthScenePosition(st.sunLongitude, st.distanceAU, SCENE.auScale)
    const position = new THREE.Vector3(p.x, p.y, p.z)

    const holder = new THREE.Group()
    holder.position.copy(position)
    // 让局部 +Z 指向背离太阳（向外）的方向
    holder.rotation.y = Math.atan2(position.x, position.z)
    this.group.add(holder)

    const color = term.major ? PALETTE.gold : SEASON_COLORS[term.season] ?? PALETTE.goldSoft
    const dotR = term.major ? 0.34 : 0.18

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(dotR, term.major ? 16 : 10, term.major ? 12 : 8),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: term.major ? 1 : 0.85,
        toneMapped: false,
      }),
    )
    holder.add(dot)

    if (term.major) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.64, 0.028, 4, 40),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, toneMapped: false }),
      )
      ring.rotation.x = Math.PI / 2
      holder.add(ring)
    }

    const tickLen = term.major ? 1.6 : 1.05
    const tick = new THREE.Mesh(
      new THREE.CylinderGeometry(term.major ? 0.028 : 0.016, term.major ? 0.028 : 0.016, tickLen, 5),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: term.major ? 0.7 : 0.32,
        toneMapped: false,
      }),
    )
    // 圆柱默认沿 +Y，转到局部 +Z（向外）
    tick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1))
    tick.position.set(0, 0, tickLen / 2 + dotR * 0.9)
    holder.add(tick)

    // ── HTML 标签 ──
    const wrap = document.createElement('div')
    wrap.className = 'orbit-label-wrap'
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `orbit-label${term.major ? ' is-major' : ''} season-${term.season}`
    const label = this.nameOf(term.index)
    button.textContent = label
    button.dataset.termIndex = String(term.index)
    button.title = `${label} · ${term.longitude}°`
    button.setAttribute('aria-label', label)
    button.tabIndex = -1
    button.addEventListener('pointerdown', (ev) => ev.stopPropagation())
    button.addEventListener('click', (ev) => {
      ev.stopPropagation()
      this.onSelect(term.index)
    })
    wrap.appendChild(button)

    const cssLabel = new CSS2DObject(wrap)
    cssLabel.position.set(0, 0.2, tickLen + dotR * 0.9 + 0.34)
    holder.add(cssLabel)

    return {
      index: term.index,
      name: label,
      longitude: term.longitude,
      major: term.major,
      season: term.season,
      position,
      moment: term,
      button,
      label: cssLabel,
      // 真实尺寸要等第一次渲染后才量得到，见 updateLabels
      labelW: 0,
      labelH: 0,
    }
  }

  /** 高亮当前所处的节气区间（从本节气交节到下一节气交节的那段轨道） */
  setActiveRange(startMs: number, endMs: number) {
    // 每帧都会被调用：区间没变就直接返回，避免重复重建几何体
    if (this.activeStart === startMs && this.activeEnd === endMs) return
    this.activeStart = startMs
    this.activeEnd = endMs

    if (this.highlight) {
      this.highlight.removeFromParent()
      this.highlight.geometry.dispose()
      ;(this.highlight.material as THREE.Material).dispose()
      this.highlight = null
    }
    if (!(endMs > startMs)) return

    const segments = 48
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const ms = startMs + ((endMs - startMs) * i) / segments
      const st = earthStateAt(ms)
      const p = earthScenePosition(st.sunLongitude, st.distanceAU, SCENE.auScale)
      pts.push(new THREE.Vector3(p.x, p.y, p.z))
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segments, 0.075, 6, false)
    this.highlight = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: PALETTE.arcActive,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    this.group.add(this.highlight)
  }

  updateLocator(earthPos: THREE.Vector3) {
    this.locator.position.copy(earthPos)
  }

  /** 当前选中/所在的节气标记稍微放大，便于辨认 */
  setEmphasis(index: number) {
    if (index === this.emphasized) return
    this.emphasized = index
    for (const m of this.markers) {
      m.button.classList.toggle('is-active', m.index === index)
      m.button.setAttribute('aria-current', m.index === index ? 'true' : 'false')
    }
  }

  /**
   * 每帧更新标签：按距离淡出，并做一次屏幕空间的重叠剔除。
   *
   * 24 个标签在窄屏上必然互相压住（例如地球正处在秋分与寒露之间时，
   * 这两个标签和「地球」会挤在同一处）。这里按优先级
   * （分至点 > 当前节气 > 次要节气）贪心保留，把明显重叠的低优先级标签藏起来，
   * 保证「看得见的标签都点得中」。
   */
  updateLabels(camera: THREE.Camera, viewW: number, viewH: number) {
    if (this.markers.length === 0) return
    const w = viewW > 0 ? viewW : 1
    const h = viewH > 0 ? viewH : 1

    interface Cand {
      m: OrbitMarker
      x: number
      y: number
      halfW: number
      halfH: number
      priority: number
      dist: number
    }
    const candidates: Cand[] = []

    for (const m of this.markers) {
      // 量一次标签的自然尺寸。用 offsetWidth/offsetHeight 而不是 getBoundingClientRect：
      // 前者不受 CSS transform 缩放影响，正好是我们要的「未缩放尺寸」。
      // 元素被 CSS2DRenderer 隐藏时（display:none）量到的是 0，跳过等下一帧。
      if (m.labelW === 0) {
        const w = m.button.offsetWidth
        const h = m.button.offsetHeight
        if (w > 0 && h > 0) {
          m.labelW = w
          m.labelH = h
        }
      }

      const want =
        this.labelsVisible && (this.minorLabelsVisible || m.major || m.index === this.emphasized)
      if (!want) {
        m.label.visible = false
        continue
      }
      m.label.getWorldPosition(_tmpV)
      _proj.copy(_tmpV).project(camera)
      // z > 1 表示在相机背后
      if (_proj.z > 1) {
        m.label.visible = false
        continue
      }
      const dist = _tmpV.distanceTo(camera.position)
      const t = THREE.MathUtils.clamp((dist - 55) / 160, 0, 1)
      const scale = m.major ? 1 - t * 0.12 : 1 - t * 0.16
      m.button.style.opacity = Math.max(0.08, m.major ? 1 - t * 0.5 : 0.9 - t * 0.68).toFixed(3)
      m.button.style.transform = `scale(${Math.max(0.82, scale).toFixed(3)})`

      candidates.push({
        m,
        x: (_proj.x * 0.5 + 0.5) * w,
        y: (-_proj.y * 0.5 + 0.5) * h,
        // 用建标签时量到的真实尺寸；没有测到就退回一个保守估值
        halfW: ((m.labelW || (m.major ? 90 : 70)) * Math.max(0.82, scale)) / 2,
        halfH: ((m.labelH || (m.major ? 30 : 26)) * Math.max(0.82, scale)) / 2,
        priority: m.major ? 0 : m.index === this.emphasized ? 1 : 2,
        dist,
      })
    }

    // 优先级相同时近的优先；用索引兜底保证顺序稳定，避免逐帧闪烁
    candidates.sort(
      (a, b) => a.priority - b.priority || a.dist - b.dist || a.m.index - b.m.index,
    )

    const kept: Cand[] = []
    for (const c of candidates) {
      // 两条判定，都直接对准「看得清、点得中」：
      //  ① 中心点被已保留的标签盖住 → 一定点不中；
      //  ② 两个框在两个方向上都有实质重叠 → 会互相啃掉字。
      // 阈值取「较小标签尺寸的比例」而不是绝对像素：
      // 英文节气名（Awakening of Insects）比中文（惊蛰）宽四五倍，
      // 用固定像素会让英文版几乎不触发剔除。
      let clash = false
      for (const k of kept) {
        const coversCenter =
          Math.abs(c.x - k.x) < k.halfW + 2 && Math.abs(c.y - k.y) < k.halfH + 2
        if (coversCenter) {
          clash = true
          break
        }
        const ox = Math.min(c.x + c.halfW, k.x + k.halfW) - Math.max(c.x - c.halfW, k.x - k.halfW)
        const oy = Math.min(c.y + c.halfH, k.y + k.halfH) - Math.max(c.y - c.halfH, k.y - k.halfH)
        if (ox <= 0 || oy <= 0) continue
        const limX = Math.min(c.halfW, k.halfW) * 0.45
        const limY = Math.min(c.halfH, k.halfH) * 0.45
        if (ox > limX && oy > limY) {
          clash = true
          break
        }
      }
      if (clash) {
        c.m.label.visible = false
      } else {
        c.m.label.visible = true
        kept.push(c)
      }
    }
  }

  setLabelsVisible(v: boolean) {
    this.labelsVisible = v
  }

  setMinorLabelsVisible(v: boolean) {
    this.minorLabelsVisible = v
  }

  setArrowVisible(v: boolean) {
    this.arrow.visible = v
  }

  setOrbitVisible(v: boolean) {
    if (this.orbitLine) this.orbitLine.visible = v
    this.locator.visible = v
  }

  get markerList(): readonly OrbitMarker[] {
    return this.markers
  }

  markerOf(index: number): OrbitMarker | undefined {
    return this.byIndex.get(index)
  }

  get revolutionDirection(): THREE.Vector3 {
    return this.arrowDirection
  }

  private disposeOrbitLine() {
    if (!this.orbitLine) return
    this.orbitLine.removeFromParent()
    this.orbitLine.geometry.dispose()
    ;(this.orbitLine.material as THREE.Material).dispose()
    this.orbitLine = null
  }

  private disposeMarkers() {
    for (const m of this.markers) {
      const holder = m.button.closest('.orbit-label-wrap')?.parentElement
      m.label.removeFromParent()
      m.button.closest('.orbit-label-wrap')?.remove()
      void holder
    }
    // 上面已把 CSS2D 容器移除，这里再清掉挂载在 group 上的 3D 部件
    for (const child of [...this.group.children]) {
      if (child === this.locator || child === this.arrow || child === this.orbitLine) continue
      if ((child as THREE.Mesh).isMesh || child.type === 'Group') {
        child.traverse((o) => {
          const mesh = o as THREE.Mesh
          if (mesh.geometry) mesh.geometry.dispose()
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
          else mat?.dispose()
        })
        if (child.parent === this.group) this.group.remove(child)
      }
    }
    this.markers = []
    this.byIndex.clear()
  }

  dispose() {
    this.disposeOrbitLine()
    this.disposeMarkers()
    if (this.highlight) {
      this.highlight.geometry.dispose()
      ;(this.highlight.material as THREE.Material).dispose()
      this.highlight = null
    }
    this.locator.geometry.dispose()
    ;(this.locator.material as THREE.Material).dispose()
    this.arrow.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) (mesh.material as THREE.Material).dispose()
    })
  }
}

const _tmpV = new THREE.Vector3()
const _proj = new THREE.Vector3()
