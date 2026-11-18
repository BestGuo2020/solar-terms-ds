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

EdgeOne 项目 `solar-terms-ds` 的 Production 环境跟踪 GitHub 的 `main`，并开启自动部署。
在控制台的「域名管理」中，将 `solar-terms-ds.guoguo-labs.online` 的关联环境设为
`Production`。这样推送 `main` 后，域名会指向 Production 最新的成功部署。
在「构建部署配置」中将根目录设为 `./`，其余构建参数由仓库根目录的 `edgeone.json` 指定。

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

如果 `/_build-info.json` 返回 HTML，或 `gitCommit` 与本次推送不一致，先检查域名关联的环境和该环境的最新部署记录。

### 排障：所有路径都显示新版首页

1. 在「域名管理」确认自定义域名关联到 **Production**。域名关联 Preview 时，访问的是
   Preview 最近一次成功部署。若那次只发布了 1017，其 SPA 兜底就会把 0910 等未命中的路径也返回为 1017 首页。
2. 在「设置 → 环境管理」确认 Production 关联 `main` 且自动部署已开启。
   在「构建部署」确认本次提交的 Production 部署成功，产物中有两个版本目录和 `_build-info.json`。
3. 使用上面的命令检查自定义域名。两版应返回各自的标题，0910 的纹理应返回 `image/jpeg`，
   不存在的路径应返回 404。如果域名刚切换，等域名状态显示「已生效」后再测。

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
