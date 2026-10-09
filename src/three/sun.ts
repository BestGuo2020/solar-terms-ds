/**
 * 太阳：表面纹理 + 自发光 + 光晕 + 场景主光源
 *
 * 光源就位于坐标原点，地球在轨道上任意位置都能自动得到正确的受光方向，
 * 因此「光照方向与地球受光面一致」是由几何本身保证的，而不是手工调整的。
 */

import * as THREE from 'three'
import { SCENE } from './config'
import { makeGlowTexture, type TextureBundle } from './textures'

export class SunObject {
  readonly group = new THREE.Group()
  readonly core: THREE.Mesh
  readonly corona: THREE.Mesh
  readonly glow: THREE.Sprite
  readonly light: THREE.PointLight

  private coreMat: THREE.MeshBasicMaterial
  private coronaMat: THREE.ShaderMaterial

  constructor(textures: TextureBundle, segments = 64) {
    const R = SCENE.sunRadius

    // ── 光球层：自发光贴图 ──
    this.coreMat = new THREE.MeshBasicMaterial({
      map: textures.sun,
      color: 0xffffff,
      toneMapped: false,
    })
    this.core = new THREE.Mesh(new THREE.SphereGeometry(R, segments, segments / 2), this.coreMat)
    this.group.add(this.core)

    // ── 色球/日冕：加色混合的边缘辉光 ──
    this.coronaMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffb347) },
        uIntensity: { value: 1.15 },
        uPower: { value: 3.2 },
        uTime: { value: 0 },
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
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uPower;
        uniform float uTime;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 n = normalize(vWorldNormal);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float rim = 1.0 - abs(dot(n, viewDir));
          float puls = 0.94 + 0.06 * sin(uTime * 0.7 + n.y * 4.0);
          float glow = pow(clamp(rim, 0.0, 1.0), uPower) * puls;
          gl_FragColor = vec4(uColor * glow * uIntensity, glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    })
    this.corona = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.28, Math.max(32, segments / 2), Math.max(24, segments / 4)),
      this.coronaMat,
    )
    this.group.add(this.corona)

    // ── 面向相机的大范围柔和光晕 ──
    const glowTex = makeGlowTexture()
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        // 保留深度测试：地球运行到太阳与相机之间时，光晕会被地球正确遮挡
        depthTest: true,
        opacity: 0.9,
        toneMapped: false,
      }),
    )
    this.glow.scale.setScalar(R * 8.5)
    this.glow.renderOrder = -1
    this.group.add(this.glow)

    // ── 主光源 ──
    // decay = 0：日地距离在一年中只变化 ±1.7%，用无衰减点光源既符合视觉预期，
    // 也避免了近/远日点时地球亮度出现不必要的波动。
    this.light = new THREE.PointLight(0xfff4e0, 3.1, 0, 0)
    this.light.position.set(0, 0, 0)
    this.group.add(this.light)
  }

  update(elapsed: number, cameraDistance: number) {
    this.core.rotation.y = elapsed * 0.012
    this.core.rotation.x = Math.sin(elapsed * 0.03) * 0.03
    this.coronaMat.uniforms.uTime.value = elapsed

    // 光晕随视距略微调整，避免近景时糊满屏幕
    const s = SCENE.sunRadius * 8.5 * THREE.MathUtils.clamp(cameraDistance / 120, 0.62, 1.5)
    this.glow.scale.setScalar(s)
  }

  setGlowVisible(v: boolean) {
    this.glow.visible = v
    this.corona.visible = v
  }

  dispose() {
    this.core.geometry.dispose()
    this.corona.geometry.dispose()
    this.coreMat.dispose()
    this.coronaMat.dispose()
    this.glow.material.map?.dispose()
    this.glow.material.dispose()
  }
}
