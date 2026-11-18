/** 地球、云层与大气边缘的自定义着色器。全部以世界坐标计算受光，和太阳位置严格一致。 */

export const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldTangent;
  varying vec3 vWorldBitangent;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec3 localN = normalize(position);
    vec3 localT = cross(vec3(0.0, 1.0, 0.0), localN);
    if (length(localT) < 0.001) localT = vec3(1.0, 0.0, 0.0);
    localT = normalize(localT);
    vec3 localB = normalize(cross(localN, localT));
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldTangent = normalize(mat3(modelMatrix) * localT);
    vWorldBitangent = normalize(mat3(modelMatrix) * localB);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

export const earthFragmentShader = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uNormalMap;
  uniform sampler2D uSpecularMap;
  uniform vec3 uSunPosition;
  uniform vec3 uAtmosphereColor;
  uniform float uNormalScale;
  uniform float uNightIntensity;
  uniform float uSpecularStrength;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldTangent;
  varying vec3 vWorldBitangent;
  varying vec3 vWorldPosition;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(uSunPosition - vWorldPosition);

    // 切线基在顶点着色器中由局部球面方向构造并变换到世界空间。
    vec3 mapped = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
    vec3 Ndetail = normalize(
      N + (normalize(vWorldTangent) * mapped.x + normalize(vWorldBitangent) * mapped.y) * uNormalScale
    );

    float nDotL = dot(Ndetail, L);
    float dayAmount = smoothstep(-0.09, 0.22, nDotL);
    float softLight = clamp(nDotL, 0.0, 1.0);

    vec3 dayColor = texture2D(uDayMap, vUv).rgb;
    vec3 nightColor = texture2D(uNightMap, vUv).rgb;
    float oceanMask = texture2D(uSpecularMap, vUv).r;

    // 海面高光，只出现在受光一侧。
    vec3 H = normalize(L + V);
    float specular = pow(max(dot(Ndetail, H), 0.0), 72.0) * oceanMask * uSpecularStrength;
    vec3 specularColor = vec3(1.0, 0.82, 0.58) * specular;

    // 晨昏线附近的暖色散射，让昼夜过渡不显得像硬切。
    float twilight = exp(-pow((nDotL - 0.02) * 13.0, 2.0));
    vec3 warmTwilight = vec3(0.95, 0.48, 0.22) * twilight * 0.12;

    float nightAmount = 1.0 - smoothstep(-0.16, 0.16, nDotL);
    vec3 cityLights = nightColor * nightAmount * uNightIntensity;
    cityLights *= vec3(1.0, 0.75, 0.46);

    // 夜面的极弱环境光保留地球轮廓，避免完全消失。
    vec3 ambient = dayColor * vec3(0.02, 0.03, 0.045);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.2);
    float sunlitRim = smoothstep(-0.32, 0.4, nDotL);
    vec3 atmosphere = uAtmosphereColor * rim * (0.18 + 0.82 * sunlitRim) * 0.7;

    vec3 color = dayColor * (softLight * 1.08 + 0.015) * mix(0.72, 1.0, dayAmount);
    color += ambient;
    color += cityLights;
    color += specularColor * dayAmount;
    color += warmTwilight;
    color += atmosphere;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const cloudVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

export const cloudFragmentShader = /* glsl */ `
  uniform sampler2D uCloudMap;
  uniform vec3 uSunPosition;
  uniform float uCloudOpacity;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    float density = texture2D(uCloudMap, vUv).r;
    float cloud = smoothstep(0.035, 0.42, density);
    if (cloud < 0.01) discard;

    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(uSunPosition - vWorldPosition);
    float lit = smoothstep(-0.16, 0.32, dot(N, L));
    vec3 nightColor = vec3(0.11, 0.16, 0.22);
    vec3 dayColor = vec3(0.97, 0.96, 0.92);
    vec3 color = mix(nightColor, dayColor, lit);
    float alpha = cloud * mix(0.16, 0.7, lit) * uCloudOpacity;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

export const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunPosition;
  uniform float uIntensity;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(uSunPosition - vWorldPosition);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.5);
    float lit = smoothstep(-0.45, 0.45, dot(N, L));
    float alpha = rim * uIntensity * (0.2 + 0.8 * lit);
    gl_FragColor = vec4(uColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
