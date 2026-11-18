# 二十四节气 · 多版本站点

同一个域名下同时发布两个版本的「日地公转 · 二十四节气」互动站点，推一次 `main` 就能一起上线：

| 线上路径 | 内容 |
| --- | --- |
| `/` | 新版首页（复用 1017 版构建产物） |
| `/deepseek-v4.1-flash-1017/` | 1017 版（新版）整站 |
| `/deepseek-v4.1-flash-0910/` | 0910 版整站 |

## 目录结构

```
.
├─ deepseek-v4.1-flash-0910/   0910 版（独立的 Vite + Vue 项目，自带 package.json / 锁文件）
├─ deepseek-v4.1-flash-1017/   1017 版（独立项目，新版）
├─ scripts/
│  ├─ build-pages.mjs          合并构建：两个子项目 → 一个 dist/
│  └─ serve-dist.mjs           本地预览 dist/（模拟子路径访问）
├─ edgeone.json                EdgeOne Pages 的构建与路由设置
└─ package.json                根目录脚本入口
```

两个子项目互不引用、各自安装依赖，可以独立升级依赖或单独构建。

## 本地开发

```bash
pnpm install --dir deepseek-v4.1-flash-1017   # 首次
pnpm dev --dir deepseek-v4.1-flash-1017       # 或根目录 npm run dev:1017

pnpm install --dir deepseek-v4.1-flash-0910
pnpm dev --dir deepseek-v4.1-flash-0910       # 或根目录 npm run dev:0910
```

单独构建某一版（产物仍进自己的 `dist/`）：

```bash
pnpm build --dir deepseek-v4.1-flash-1017
```

## 合并构建（部署用的就是这一条）

```bash
npm run build        # 等价于 node scripts/build-pages.mjs
```

生成的发布目录：

```
dist/
├─ index.html                     根目录首页（1017 版构建产物的拷贝）
├─ deepseek-v4.1-flash-0910/
│  ├─ index.html
│  ├─ assets/…
│  └─ textures/…
└─ deepseek-v4.1-flash-1017/
   ├─ index.html
   ├─ assets/…
   └─ textures/…
```

构建脚本会为每个子项目注入两个环境变量，`vite.config.ts` 读取后生效：

- `VITE_BASE=/<站点目录>/`：站点挂载路径，保证 `/deepseek-v4.1-flash-1017`（不带结尾斜杠）也不会把资源解析到上一级
- `VITE_OUT_DIR=../dist/<站点目录>`：把产物直接输出到统一的 `dist/`，不用再搬文件

根目录首页由脚本把 `dist/deepseek-v4.1-flash-1017/index.html` 复制到 `dist/index.html`，
只有一份新版构建产物，资源不会重复下载。页面内所有引用都是绝对路径
（`/deepseek-v4.1-flash-1017/assets/…`），所以放在根目录访问也正常。

只想重建其中一版时，产物不会覆盖另一版：

```bash
npm run build:1017
npm run build:0910
```

## 本地预览

```bash
npm run preview      # http://127.0.0.1:4318
```

预览服务器按 EdgeOne 的静态托管行为处理：目录自动补 `index.html`，
`/deepseek-v4.1-flash-0910` 这种不带斜杠的地址也能打开。

## 部署到 EdgeOne Pages

推送到 GitHub 的 `main` 即触发部署，仓库根目录的 `edgeone.json` 已经写好全部设置：

| 配置项 | 值 |
| --- | --- |
| 根目录 | `./` |
| 安装命令 | `node scripts/install-deps.mjs`（对两个子项目跑 `npm ci`） |
| 构建命令 | `node scripts/build-pages.mjs` |
| 输出目录 | `dist` |
| Node 版本 | `22.11.0` |

此外还有：

- `redirects`：`/deepseek-v4.1-flash-0910`、`/deepseek-v4.1-flash-1017` 补结尾斜杠（301）
- `rewrites`：两个版本目录的结尾斜杠地址显式映射到各自的 `index.html`，
  不依赖平台对「目录 + index.html」的默认解析
- `headers`：两版的 `assets/*`（文件名带 hash）设为一年强缓存
- 构建脚本还会生成 `dist/404.html`：不存在的路径返回 404 页面，而不是静默回退到首页
- 构建脚本还会生成 `dist/_build-info.json`：记录构建时间与 git commit，用来确认线上到底是哪次构建

### 部署后自检

```bash
# 线上是哪一次构建（builtAt / gitCommit 应是本次提交）
curl -s https://<域名>/_build-info.json

# 应当返回各自的标题（不是同一个页面）
curl -s https://<域名>/deepseek-v4.1-flash-0910/ | grep -o '<title>.*</title>'
curl -s https://<域名>/deepseek-v4.1-flash-1017/ | grep -o '<title>.*</title>'

# 0910 的纹理应该是真文件（image/jpeg），而不是回退的 HTML
curl -sI https://<域名>/deepseek-v4.1-flash-0910/textures/sun.jpg | grep -i content-type

# 不存在的路径应该 404
curl -s -o /dev/null -w '%{http_code}\n' https://<域名>/no-such-path
```

如果 `/_build-info.json` 返回的还是 HTML（或 `gitCommit` 是旧的），说明**部署根本没有跑到最新提交**，
先按下面的排障步骤查控制台，而不是改代码。

### 排障：所有路径都显示新版首页

按下面顺序查（都是控制台/构建侧，不是代码问题）：

1. **EdgeOne 项目连的分支是不是 `main`**。如果项目还连在 `v4.1-flash-1017` 上，
   推 `main` 不会触发部署，站点会一直停留在上一次成功部署的产物
   （`Last-Modified` 会一直是那次部署的时间）。
   可用 `edgeone makers link -n <项目名>` 确认项目存在，但 CLI **不能**给 GitHub 类型的
   项目直接上传产物（会报 `Provider 'Github' ... does not support direct folder or zip file deployment`），
   所以分支只能在控制台里改，或者改用「Upload」类型的新项目。
2. **最近一次部署的时间**是否为本次推送之后，构建日志里是否出现
   `[deepseek-v4.1-flash-0910] 构建 …`、`[deepseek-v4.1-flash-1017] 构建 …`、
   `发布目录 dist/ 已就绪:`。
3. 产物里没有 `deepseek-v4.1-flash-*` 目录时，平台会走 SPA 兜底：
   **任何找不到的路径都返回根 `/index.html`（200）**，于是两个版本路径看起来都是新版，
   不存在的路径也不会 404。用 `curl -sI /deepseek-v4.1-flash-0910/textures/sun.jpg`
   看返回的是 `image/jpeg`（新产物）还是 `text/html`（兜底到首页）即可判断。
4. 部署成功后如果仍是旧页面，去 EdgeOne 控制台刷新一下缓存（`index.html` 是
   `max-age=0, must-revalidate`，正常情况下会自动回源校验）。

### 关于包管理器

- 仓库里保留的是两个子项目的 `pnpm-lock.yaml`，本地按 pnpm 工作流走。
- 部署安装用 `npm`：EdgeOne 的构建环境一定带 npm，不依赖 pnpm 的具体版本。
  两个子项目的 `package-lock.json` **都提交进了仓库**，部署时用 `npm ci` 按锁文件安装，
  保证线上的依赖版本和本地验证过的一致（避免新发布的 vue-tsc / typescript 让构建突然失败）。
  本地开发继续用 pnpm，`pnpm-lock.yaml` 也保留着；升级依赖时记得两边都更新一下。

## 新增一个版本时的做法

1. 把新项目放到 `deepseek-v4.1-flash-XXXX/`，确保它的 `vite.config.ts` 支持
   `VITE_BASE` / `VITE_OUT_DIR`（参照现有两个项目）。
2. 在 `scripts/build-pages.mjs` 的 `SITES` 数组里加一项（子路径即目录名）。
3. 在 `edgeone.json` 里补一条 `rewrites`（结尾斜杠地址 → 该版 `index.html`）和一条
   `redirects`（不带斜杠 → 带斜杠），补 `headers` 缓存规则同理。

## 许可

MIT，见 [LICENSE](./LICENSE)。
