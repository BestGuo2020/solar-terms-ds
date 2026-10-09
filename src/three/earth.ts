/**
 * 地球对象：海陆纹理 + 云层 + 大气辉光 + 昼夜明暗
 *
 * 层级结构（自外向内）：
 *   group         —— 平移到公转轨道上的位置
 *     tiltGroup   —— 绕 X 轴固定旋转 −ε，使地轴与黄道面法线成 23.44°
 *       spinGroup —— 绕自身 Y 轴自转（由格林尼治真恒星时驱动）
 *         globe / clouds
 *
 * **地轴方向只由 tiltGroup 的固定旋转决定，与地球在轨道上的位置无关**，
 * 因此一年之内地轴在空间中指向不变，不会「始终朝向太阳」。
 */

import * as THREE from 'three'
import { DEG, OBLIQUITY_DEG, OBLIQUITY_RAD } from '@/astro/sceneFrame'
import { PALETTE, SCENE } from './config'
import type { TextureBundle } from './textures'

export interface EarthGuideToggles {
  axis: boolean
  equator: boolean
  tropics: boolean
}

export class EarthObject {
  readonly group = new THREE.Group()
  readonly tiltGroup = new THREE.Group()
  readonly spinGroup = new THREE.Group()

  readonly globe: THREE.Mesh
  readonly clouds: THREE.Mesh
  readonly atmosphere: THREE.Mesh

  private globeMat: THREE.MeshPhongMaterial
  private cloudMat: THREE.MeshPhongMaterial
  private atmoMat: THREE.ShaderMaterial

  private shaderRef: { uniforms: Record<string, THREE.IUniform> } | null = null

  /** 地轴在场景（世界）坐标中的单位方向。一年之内固定，但会随年代缓慢进动 */
  readonly axisWorld = new THREE.Vector3(0, 1, 0)
  /** 地轴在 tiltGroup 局部坐标中始终是 +Y */
  readonly axisLocal = new THREE.Vector3(0, 1, 0)
  /** 当前采用的黄赤交角（度） */
  private obliquityDeg = OBLIQUITY_DEG
  /** 回归线圆环的基准半径 */
  private readonly baseRadius = SCENE.earthRadius * 1.004

  private axisGroup = new THREE.Group()
  private equatorRing: THREE.Mesh
  private tropicNorth: THREE.Mesh
  private tropicSouth: THREE.Mesh
  private axisLine: THREE.Mesh
  private axisCap: THREE.Mesh

  constructor(textures: TextureBundle, quality: { sphereSegments: number; clouds: boolean; atmosphere: boolean }) {
    const R = SCENE.earthRadius
    const seg = quality.sphereSegments

    // 地轴倾斜：绕 X 轴旋转 −ε，使局部 +Y 指向 (0, cosε, −sinε)
    this.tiltGroup.rotation.x = -OBLIQUITY_RAD
    this.group.add(this.tiltGroup)
    this.tiltGroup.add(this.spinGroup)

    // ── 地球表面 ──
    this.globeMat = new THREE.MeshPhongMaterial({
      map: textures.earthDay,
      normalMap: textures.earthNormal ?? undefined,
      normalScale: new THREE.Vector2(0.75, 0.75),
      specularMap: textures.earthSpecular ?? undefined,
      specular: new THREE.Color(0x2a3a4a),
      shininess: 22,
    })
    this.globeMat.onBeforeCompile = (shader) => this.injectNightSide(shader, textures)
    this.globe = new THREE.Mesh(new THREE.SphereGeometry(R, seg, seg / 2), this.globeMat)
    this.spinGroup.add(this.globe)

    // ── 云层 ──
    this.cloudMat = new THREE.MeshPhongMaterial({
      map: textures.earthClouds,
      alphaMap: textures.earthClouds,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      color: new THREE.Color(0xffffff),
      specular: new THREE.Color(0x111111),
      shininess: 4,
    })
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(R * SCENE.cloudScale, Math.max(32, seg / 2), Math.max(24, seg / 4)),
      this.cloudMat,
    )
    this.clouds.visible = quality.clouds
    this.spinGroup.add(this.clouds)

    // ── 大气辉光 ──
    this.atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirWorld: { value: new THREE.Vector3(1, 0, 0) },
        uColor: { value: new THREE.Color(0x6fa8ff) },
        uIntensity: { value: 0.85 },
        uPower: { value: 2.8 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunDirWorld;
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uPower;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 n = normalize(vWorldNormal);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float rim = 1.0 - abs(dot(n, viewDir));
          float glow = pow(clamp(rim, 0.0, 1.0), uPower);
          float lit = smoothstep(-0.45, 0.35, dot(n, uSunDirWorld));
          float a = glow * (0.10 + 0.90 * lit) * uIntensity;
          gl_FragColor = vec4(uColor * a, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    })
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(R * SCENE.atmosphereScale, Math.max(32, seg / 2), Math.max(24, seg / 4)),
      this.atmoMat,
    )
    this.atmosphere.visible = quality.atmosphere
    this.group.add(this.atmosphere)

    // ── 地球辅助线（挂在 tiltGroup 上，故不随自转旋转）──
    this.tiltGroup.add(this.axisGroup)

    const ringGeo = (radius: number) =>
      new THREE.TorusGeometry(radius, 0.0075, 4, 96)

    // 赤道
    this.equatorRing = new THREE.Mesh(
      ringGeo(R * 1.004),
      new THREE.MeshBasicMaterial({ color: PALETTE.vermilion, transparent: true, opacity: 0.9 }),
    )
    this.equatorRing.rotation.x = Math.PI / 2
    this.axisGroup.add(this.equatorRing)

    // 南北回归线（纬度 ±23.44°）
    const tropicR = this.baseRadius * Math.cos(OBLIQUITY_RAD)
    const tropicY = this.baseRadius * Math.sin(OBLIQUITY_RAD)
    const tropicMat = new THREE.MeshBasicMaterial({
      color: PALETTE.jade,
      transparent: true,
      opacity: 0.85,
    })
    this.tropicNorth = new THREE.Mesh(ringGeo(tropicR), tropicMat)
    this.tropicNorth.rotation.x = Math.PI / 2
    this.tropicNorth.position.y = tropicY
    this.axisGroup.add(this.tropicNorth)

    this.tropicSouth = new THREE.Mesh(ringGeo(tropicR), tropicMat)
    this.tropicSouth.rotation.x = Math.PI / 2
    this.tropicSouth.position.y = -tropicY
    this.axisGroup.add(this.tropicSouth)

    // 地轴：一段细圆柱 + 北极方向的锥形箭头
    const axisLen = R * 3.1
    const axisMat = new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.92 })
    this.axisLine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, axisLen, 6), axisMat)
    this.axisGroup.add(this.axisLine)

    this.axisCap = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 12), axisMat)
    this.axisCap.position.y = axisLen / 2
    this.axisGroup.add(this.axisCap)

    this.setGuides({ axis: true, equator: true, tropics: true })
    this.setObliquity(OBLIQUITY_DEG)
  }

  /**
   * 按年代更新地轴倾角与南北回归线的纬度。
   *
   * 黄赤交角在 4.1 万年周期内于 22.0°—24.5° 之间摆动，
   * 所以「南北回归线」的位置本身也是随年代变的：
   * 公元 5000 年在 ±23.06°，公元前 1000 年在 ±23.82°。
   */
  setObliquity(deg: number) {
    if (Math.abs(deg - this.obliquityDeg) < 1e-6) return
    this.obliquityDeg = deg
    const rad = deg * DEG
    this.tiltGroup.rotation.x = -rad
    this.axisWorld.set(0, Math.cos(rad), -Math.sin(rad))

    // 回归线：纬度 ±ε，圆环半径 R·cosε，高度 ±R·sinε
    const r = this.baseRadius * Math.cos(rad)
    const y = this.baseRadius * Math.sin(rad)
    this.tropicNorth.geometry.dispose()
    this.tropicNorth.geometry = new THREE.TorusGeometry(r, 0.0075, 4, 96)
    this.tropicNorth.position.y = y
    this.tropicSouth.geometry.dispose()
    this.tropicSouth.geometry = new THREE.TorusGeometry(r, 0.0075, 4, 96)
    this.tropicSouth.position.y = -y
  }

  /** 当前的黄赤交角（度），供界面显示 */
  get currentObliquityDeg(): number {
    return this.obliquityDeg
  }

  /** 在 Phong 着色器里注入夜面灯光与晨昏线暖色散射 */
  private injectNightSide(shader: THREE.WebGLProgramParametersWithUniforms, textures: TextureBundle) {
    shader.uniforms.uNightMap = { value: textures.earthNight }
    shader.uniforms.uSunDirView = { value: new THREE.Vector3(0, 0, 1) }
    shader.uniforms.uTwilightColor = { value: new THREE.Color(0xff8a4a) }
    shader.uniforms.uNightIntensity = { value: 1.25 }

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform sampler2D uNightMap;
        uniform vec3 uSunDirView;
        uniform vec3 uTwilightColor;
        uniform float uNightIntensity;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        {
          vec3 nrm = normalize(vNormal);
          float sd = dot(nrm, uSunDirView);
          // 夜面：城市灯光
          float nightAmt = smoothstep(0.10, -0.20, sd);
          vec3 nightCol = texture2D(uNightMap, vMapUv).rgb;
          totalEmissiveRadiance += nightCol * nightAmt * uNightIntensity;
          // 晨昏线：大气散射造成的暖色薄边
          float twilight = exp(-pow(sd * 7.0, 2.0));
          totalEmissiveRadiance += uTwilightColor * twilight * 0.085;
        }`,
      )

    this.shaderRef = shader
  }

  /** 每帧更新：自转角、太阳方向、着色器 uniform */
  update(sunDirectionWorld: THREE.Vector3, gastRadians: number, camera: THREE.Camera, cloudDrift: number) {
    this.spinGroup.rotation.y = gastRadians
    this.clouds.rotation.y = cloudDrift

    // 大气：世界坐标太阳方向
    ;(this.atmoMat.uniforms.uSunDirWorld.value as THREE.Vector3).copy(sunDirectionWorld)

    // 地球表面：着色器中的 vNormal 处于视图空间，故太阳方向也要转到视图空间
    if (this.shaderRef) {
      const u = this.shaderRef.uniforms.uSunDirView?.value as THREE.Vector3 | undefined
      if (u) {
        u.copy(sunDirectionWorld).transformDirection(camera.matrixWorldInverse)
      }
    }
  }

  setGuides(t: EarthGuideToggles) {
    this.axisLine.visible = t.axis
    this.axisCap.visible = t.axis
    this.equatorRing.visible = t.equator
    this.tropicNorth.visible = t.tropics
    this.tropicSouth.visible = t.tropics
  }

  setCloudsVisible(v: boolean) {
    this.clouds.visible = v
  }

  setAtmosphereVisible(v: boolean) {
    this.atmosphere.visible = v
  }

  setQuality(sphereSegments: number) {
    // 分段数变化需要重建几何体；仅在切换档位时调用
    const R = SCENE.earthRadius
    this.globe.geometry.dispose()
    this.globe.geometry = new THREE.SphereGeometry(R, sphereSegments, sphereSegments / 2)
  }

  /** 地球在场景中的世界坐标 */
  get worldPosition(): THREE.Vector3 {
    return this.group.position
  }

  dispose() {
    this.globe.geometry.dispose()
    this.clouds.geometry.dispose()
    this.atmosphere.geometry.dispose()
    this.globeMat.dispose()
    this.cloudMat.dispose()
    this.atmoMat.dispose()
    this.equatorRing.geometry.dispose()
    this.tropicNorth.geometry.dispose()
    this.tropicSouth.geometry.dispose()
    this.axisLine.geometry.dispose()
    this.axisCap.geometry.dispose()
  }
}

/** J2000 时刻的回归线纬度（度）。实际纬度随年代变化，见 EarthObject.setObliquity */
export const TROPIC_LATITUDE_DEG = OBLIQUITY_DEG
