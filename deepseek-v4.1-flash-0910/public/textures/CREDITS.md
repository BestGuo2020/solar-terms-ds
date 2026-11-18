# 纹理资源来源与授权

本目录下的行星纹理由 `scripts/fetch-textures.mjs` 在开发期一次性下载，**不参与运行时构建**。
若某个文件缺失或被拦截，页面会自动改用程序化生成的替代纹理（见 `src/three/textures.ts`），
并在 3D 场景左侧给出提示，不会白屏。

| 文件 | 内容 | 来源 | 授权 |
| --- | --- | --- | --- |
| `earth_day.jpg` | 地球昼面（海陆影像） | [Solar System Scope](https://www.solarsystemscope.com/textures/) `2k_earth_daymap.jpg` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `earth_night.jpg` | 地球夜面（城市灯光） | [Solar System Scope](https://www.solarsystemscope.com/textures/) `2k_earth_nightmap.jpg` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `earth_clouds.jpg` | 云层 | [Solar System Scope](https://www.solarsystemscope.com/textures/) `2k_earth_clouds.jpg` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `sun.jpg` | 太阳表面 | [Solar System Scope](https://www.solarsystemscope.com/textures/) `2k_sun.jpg` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `stars_milkyway.jpg` | 银河星空背景 | [Solar System Scope](https://www.solarsystemscope.com/textures/) `2k_stars_milky_way.jpg` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `earth_normal.jpg` | 地形法线 | [three.js 官方仓库](https://github.com/mrdoob/three.js) `examples/textures/planets/` | three.js 仓库为 MIT；底图源自 NASA 公开影像 |
| `earth_specular.jpg` | 海陆高光（海洋反光遮罩） | [three.js 官方仓库](https://github.com/mrdoob/three.js) `examples/textures/planets/` | 同上 |

## 署名要求

Solar System Scope 的纹理以 CC BY 4.0 授权发布，使用时须保留署名。
页面页脚已经标注来源与授权；若你要二次分发本项目，请一并保留 `public/textures/CREDITS.md`
与页脚中的署名信息。

## 重新下载

```bash
node scripts/fetch-textures.mjs          # 缺失时补齐
node scripts/fetch-textures.mjs --force  # 强制重新下载全部
```

脚本会访问：

- `https://www.solarsystemscope.com/textures/download/…`
- `https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/…`

若网络不可达，脚本会报告失败项并提示将使用程序化替代纹理。
