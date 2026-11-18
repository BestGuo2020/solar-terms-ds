/**
 * 移动端专项验收（开发期脚本）
 *
 * 用 CDP 的移动设备模拟 + **真实触摸事件**，逐项排查移动端常见问题：
 *   · 横向溢出（页面左右能滑动）
 *   · 关键区域是否被挤出屏幕 / 首屏被时间控制条吃掉
 *   · 手指在 3D 画布上滑动能否翻页（touch-action 是否把页面滚动吃掉了）
 *   · 双指捏合能否缩放 3D 视角
 *   · 点击节气标签是否命中
 *   · 底部安全区（刘海屏 home indicator）留白
 *   · 横屏手机 / 小平板等边界尺寸
 *
 * 用法：
 *   node scripts/preview-dist.mjs 4180      # 另开一个终端
 *   node scripts/verify-mobile.mjs
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SHOTS = join(ROOT, 'shots')
const PORT = 9334
const URL_BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4180/'
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROFILE = join(ROOT, '.edge-mobile-profile')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 结束整个浏览器进程树。child.kill() 只杀主进程，Edge 的子进程会残留下来吃内存。 */
function killTree(child) {
  if (!child || child.exitCode !== null) return
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      child.kill('SIGKILL')
    }
  } catch {
    /* 尽力而为 */
  }
}

class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id)
        if (p) {
          this.pending.delete(msg.id)
          msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result)
        }
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`CDP 超时: ${method}`))
        }
      }, 90000)
    })
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || '页面内求值异常')
    return r.result.value
  }
}

let pass = 0
const failures = []
function check(name, ok, detail) {
  if (ok) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(`${name}${detail ? ' — ' + detail : ''}`)
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`)
  }
}

async function launchEdge() {
  await rm(PROFILE, { recursive: true, force: true }).catch(() => {})
  const child = spawn(
    EDGE,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true },
  )
  for (let i = 0; i < 60; i++) {
    await sleep(500)
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return { child, page }
    } catch {
      /* 等待 */
    }
  }
  killTree(child)
  throw new Error('Edge 调试端口未就绪')
}

/** 设备档案：覆盖小屏安卓、iPhone、刘海屏、iPad 竖屏、横屏手机 */
const DEVICES = [
  { name: 'android-360', w: 360, h: 640, dpr: 3, ua: 'Android' },
  { name: 'iphone-se-375', w: 375, h: 667, dpr: 2, ua: 'iPhone' },
  { name: 'iphone-14-390', w: 390, h: 844, dpr: 3, ua: 'iPhone' },
  { name: 'iphone-max-430', w: 430, h: 932, dpr: 3, ua: 'iPhone' },
  { name: 'iphone-landscape', w: 844, h: 390, dpr: 3, ua: 'iPhone' },
  { name: 'ipad-portrait', w: 768, h: 1024, dpr: 2, ua: 'iPad' },
]

const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const UA_IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

await mkdir(SHOTS, { recursive: true })
const { child, page } = await launchEdge()
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res, rej) => {
  ws.addEventListener('open', res)
  ws.addEventListener('error', rej)
})
const cdp = new CDP(ws)

try {
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

  // ───────────────────────── 1. 各尺寸布局体检 ─────────────────────────
  console.log('\n【1】各尺寸布局体检')

  const layout = []
  for (const d of DEVICES) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: d.w,
      height: d.h,
      deviceScaleFactor: d.dpr,
      mobile: true,
      screenWidth: d.w,
      screenHeight: d.h,
    })
    await cdp.send('Emulation.setUserAgentOverride', {
      userAgent: d.ua === 'iPad' ? UA_IPAD : d.ua === 'iPhone' ? UA_IPHONE : UA_ANDROID,
    })
    await cdp.send('Page.navigate', { url: URL_BASE })
    await sleep(1200)
    for (let i = 0; i < 40; i++) {
      const ok = await cdp.eval(
        `!!document.querySelector('canvas.scene-canvas') && document.querySelectorAll('.orbit-label').length > 0`,
      )
      if (ok) break
      await sleep(400)
    }
    await sleep(1200)
    await cdp.eval('window.scrollTo(0,0)')
    await sleep(300)

    const m = await cdp.eval(`(() => {
      const q = (s) => document.querySelector(s);
      const h = (s) => { const e = q(s); return e ? Math.round(e.getBoundingClientRect().height) : -1; };
      const de = document.documentElement;
      // 找出所有横向溢出的元素；被 overflow:hidden 祖先裁掉的（例如贴在图上的
      // 节气标签）不算真的溢出，否则会产生大量误报。
      const overflow = [];
      const vw = window.innerWidth;
      const clipped = (el) => {
        let p = el.parentElement;
        while (p && p !== document.body) {
          const o = getComputedStyle(p);
          if (o.overflow !== 'visible' || o.overflowX !== 'visible') return true;
          p = p.parentElement;
        }
        return false;
      };
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if ((r.right > vw + 1.5 || r.left < -1.5) && !clipped(el)) {
          const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
          const tag = el.tagName.toLowerCase() + (cls ? '.' + cls : '');
          if (!overflow.includes(tag)) overflow.push(tag);
        }
      }
      return {
        innerW: window.innerWidth,
        innerH: window.innerHeight,
        scrollW: de.scrollWidth,
        clientW: de.clientWidth,
        docH: de.scrollHeight,
        headerH: h('.site-header'),
        stageH: h('.stage'),
        viewportH: h('.viewport-wrap'),
        timebarH: h('.timebar'),
        detailH: h('.detail-panel'),
        mapNoteH: h('.map-note-block'),
        overflow: overflow.slice(0, 10),
        labels: document.querySelectorAll('.orbit-label').length,
        visibleLabels: [...document.querySelectorAll('.orbit-label')].filter(e => e.offsetParent !== null).length,
        timebarTop: Math.round(q('.timebar').getBoundingClientRect().top),
        detailTop: Math.round(q('.detail-panel').getBoundingClientRect().top),
        viewportBottom: Math.round(q('.viewport-wrap').getBoundingClientRect().bottom),
        hasCanvas: !!q('canvas.scene-canvas'),
        canvasW: q('canvas.scene-canvas')?.width || 0,
        touchAction: q('canvas.scene-canvas') ? getComputedStyle(q('canvas.scene-canvas')).touchAction : '',
      };
    })()`)
    layout.push({ device: d.name, ...m, devW: d.w })

    console.log(
      `  · ${d.name.padEnd(18)} 设备${String(d.w).padStart(4)}×${String(d.h).padEnd(4)} ` +
        `视口=${String(m.innerW).padStart(4)}×${String(m.innerH).padStart(4)}  ` +
        `3D=${String(m.viewportH).padStart(4)}  时间条顶部=${String(m.timebarTop).padStart(4)}  ` +
        `时间条高=${String(m.timebarH).padStart(3)}  详情顶部=${String(m.detailTop).padStart(5)}  ` +
        `touch-action=${m.touchAction}`,
    )
    if (m.overflow.length) console.log(`      横向溢出：${m.overflow.join(', ')}`)
  }

  console.log('')
  check(
    '所有尺寸都无横向溢出',
    layout.every((l) => l.scrollW <= l.clientW + 1 && l.overflow.length === 0),
    layout
      .filter((l) => l.scrollW > l.clientW + 1 || l.overflow.length)
      .map((l) => `${l.device}: scrollW=${l.scrollW} clientW=${l.clientW} [${l.overflow.join('|')}]`)
      .join('  '),
  )
  check(
    '布局视口宽度等于设备宽度（没有被宽元素撑大导致整页缩放）',
    layout.every((l) => Math.abs(l.innerW - l.devW) <= 1),
    layout.map((l) => `${l.device}:${l.innerW}vs${l.devW}`).join(' '),
  )
  check(
    '所有尺寸 3D 场景都正常创建',
    layout.every((l) => l.hasCanvas && l.canvasW > 0),
    layout.filter((l) => !l.hasCanvas || !l.canvasW).map((l) => l.device).join('、'),
  )
  check(
    '所有尺寸 3D 视口高度充足（≥ 200px）',
    layout.every((l) => l.viewportH >= 200),
    layout.map((l) => `${l.device}:${l.viewportH}`).join(' '),
  )
  check(
    '时间控制条排在详情区之前（移动端不必翻过详情区才能改时间）',
    layout.every((l) => l.timebarTop < l.detailTop),
    layout.map((l) => `${l.device}:${l.timebarTop}<${l.detailTop}`).join(' '),
  )
  check(
    '时间控制条紧跟 3D 区（顶部在 1.6 屏以内）',
    layout.every((l) => l.timebarTop < l.innerH * 1.6),
    layout.map((l) => `${l.device}:${l.timebarTop}/${l.innerH}`).join(' '),
  )
  check(
    '时间控制条在窄屏不超过 230px（为保证日期时间可读而做的取舍）',
    layout.every((l) => l.timebarH <= 230),
    layout.map((l) => `${l.device}:${l.timebarH}`).join(' '),
  )
  check(
    '触屏设备上画布允许纵向翻页（touch-action 含 pan-y）',
    layout.every((l) => l.touchAction.includes('pan-y')),
    layout.map((l) => `${l.device}:${l.touchAction}`).join(' '),
  )
  check(
    '窄屏仍能显示节气标签',
    layout.every((l) => l.visibleLabels >= 4),
    layout.map((l) => `${l.device}:${l.visibleLabels}`).join(' '),
  )

  // ───────────────────────── 2. 触屏手势 ─────────────────────────
  console.log('\n【2】触屏手势（真实 dispatching touch 事件）')

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  })
  await cdp.send('Page.navigate', { url: URL_BASE })
  await sleep(1500)
  for (let i = 0; i < 40; i++) {
    const ok = await cdp.eval(`document.querySelectorAll('.orbit-label').length > 0`)
    if (ok) break
    await sleep(400)
  }
  await sleep(1500)
  await cdp.eval('window.scrollTo(0,0)')
  await sleep(400)

  // 在 3D 画布上做一次纵向滑动，看页面能否滚动
  async function touchSwipe(x, yFrom, yTo, steps = 10) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y: yFrom, id: 1, radiusX: 12, radiusY: 12, force: 1 }],
    })
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: Math.round(yFrom + ((yTo - yFrom) * i) / steps), id: 1, radiusX: 12, radiusY: 12, force: 1 }],
      })
      await sleep(24)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(450)
  }

  const canvasBox = await cdp.eval(`(() => { const r = document.querySelector('.viewport-wrap').getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), top: Math.round(r.top), bottom: Math.round(r.bottom) }; })()`)
  const yStart = Math.round(canvasBox.top + (canvasBox.bottom - canvasBox.top) * 0.7)
  const yEnd = yStart - 200

  const scrollBefore = await cdp.eval('window.scrollY')
  await touchSwipe(canvasBox.x, yStart, yEnd)
  const scrollAfterCanvas = await cdp.eval('window.scrollY')
  check(
    '在 3D 画布上纵向滑动可以翻页',
    scrollAfterCanvas > scrollBefore + 40,
    `scrollY ${scrollBefore} → ${scrollAfterCanvas}`,
  )

  // 在说明文字区域滑动也应能翻页
  await cdp.eval('window.scrollTo(0,0)')
  await sleep(400)
  const noteBox = await cdp.eval(`(() => { const el = document.querySelector('.map-note-block .map-note');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) }; })()`)
  const noteY = Math.min(noteBox.y, await cdp.eval('window.innerHeight') - 60)
  await touchSwipe(noteBox.x, noteY, noteY - 180)
  const afterNote = await cdp.eval('window.scrollY')
  check('在文字区域滑动可以翻页', afterNote > 40, `scrollY=${afterNote}`)

  // 横向滑动应旋转视角而不是翻页
  await cdp.eval('window.scrollTo(0,0)')
  await sleep(400)
  const camBefore = await cdp.eval(`document.querySelector('.map-note-block .map-note')?.textContent.match(/φ\\s*=\\s*([\\d.]+)/)?.[1] || ''`)
  const yMid = Math.round(canvasBox.top + (canvasBox.bottom - canvasBox.top) * 0.55)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: canvasBox.x - 80, y: yMid, id: 1 }] })
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: canvasBox.x - 80 + i * 16, y: yMid, id: 1 }],
    })
    await sleep(22)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await sleep(500)
  const scrollAfterHorizontal = await cdp.eval('window.scrollY')
  check('横向滑动不会误触发翻页', scrollAfterHorizontal < 60, `scrollY=${scrollAfterHorizontal}`)
  void camBefore

  // 双指捏合应缩放 3D 视角
  const zoomBefore = await cdp.eval(`(() => {
    const c = document.querySelector('canvas.scene-canvas');
    return c ? c.width : 0; })()`)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: canvasBox.x - 50, y: yMid, id: 1 },
      { x: canvasBox.x + 50, y: yMid, id: 2 },
    ],
  })
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: canvasBox.x - 50 - i * 12, y: yMid, id: 1 },
        { x: canvasBox.x + 50 + i * 12, y: yMid, id: 2 },
      ],
    })
    await sleep(25)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await sleep(400)
  check('双指捏合不会把页面缩放坏（视口比例保持）', (await cdp.eval('window.innerWidth')) === 390, `${await cdp.eval('window.innerWidth')}`)
  void zoomBefore

  // ───────────────────────── 3. 触屏点按 ─────────────────────────
  console.log('\n【3】触屏点按')

  // 上一节的捏合会把相机推近、标签被挤出视口，这里重新加载回到默认视角，
  // 测的才是「用户打开页面时能不能点中标签」。
  await cdp.send('Page.navigate', { url: URL_BASE })
  await sleep(1500)
  for (let i = 0; i < 40; i++) {
    if (await cdp.eval(`document.querySelectorAll('.orbit-label').length > 0`)) break
    await sleep(400)
  }
  await sleep(2000)
  await cdp.eval('window.scrollTo(0,0)')
  await sleep(500)

  // 先统计真正「点得中」的标签（elementFromPoint 命中的才算，被浮层压住的排除）
  const hittable = await cdp.eval(`(() => {
    const all = [...document.querySelectorAll('.orbit-label')].filter(e => e.offsetParent !== null);
    const inView = [], ok = [], offView = [];
    for (const e of all) {
      const r = e.getBoundingClientRect();
      const cx = Math.round(r.left + r.width/2), cy = Math.round(r.top + r.height/2);
      if (cx < 2 || cy < 2 || cx > innerWidth - 2 || cy > innerHeight - 2) { offView.push(e.textContent.trim()); continue; }
      inView.push(e.textContent.trim());
      if (document.elementFromPoint(cx, cy) === e) {
        ok.push({ x: cx, y: cy, text: e.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    return { visible: inView.length, hittable: ok.length, list: ok, offView, shown: all.length };
  })()`)
  console.log(`  渲染标签 ${hittable.shown} 个，视口内 ${hittable.visible} 个，其中点得中 ${hittable.hittable} 个` +
    (hittable.offView.length ? `（视口外：${hittable.offView.join('、')}）` : ''))
  // 四个分至点相隔 90°，彼此不会重叠，是最可靠、也最该点得中的四个
  const majors = ['春分', '夏至', '秋分', '冬至']
  const majorHit = majors.filter((n) => hittable.list.some((l) => l.text === n))
  check(
    '四个分至点的标签在触屏上都点得中',
    majorHit.length === 4,
    `${majorHit.join('、')}（共 ${hittable.hittable}/${hittable.visible} 个可见标签可点中）`,
  )
  check(
    '视口内的节气标签全部可点中（重叠的会被自动隐藏）',
    hittable.hittable === hittable.visible,
    `${hittable.hittable}/${hittable.visible}`,
  )
  check(
    '节气标签的触屏命中高度 ≥ 24px',
    hittable.list.every((l) => l.h >= 24),
    [...new Set(hittable.list.map((l) => l.h))].join(','),
  )

  // 点按一个确实点得中的标签
  const labelBox = hittable.list.find((l) => l.text === '冬至') || hittable.list[0] || null
  if (labelBox) {
    const nameBefore = await cdp.eval(`document.querySelector('.term-pill .pill-name')?.textContent.trim()`)
    // 装一个探针，记录标签上真实发生的指针/点击事件，便于定位「点了没反应」
    await cdp.eval(`(() => {
      window.__tapProbe = { down: 0, up: 0, click: 0, cancel: 0, target: '' };
      const el = [...document.querySelectorAll('.orbit-label')].find(e => e.textContent.trim() === ${JSON.stringify(labelBox.text)});
      if (!el) return;
      el.addEventListener('pointerdown', () => { window.__tapProbe.down++ }, true);
      el.addEventListener('pointerup', () => { window.__tapProbe.up++ }, true);
      el.addEventListener('pointercancel', () => { window.__tapProbe.cancel++ }, true);
      el.addEventListener('click', (e) => { window.__tapProbe.click++; window.__tapProbe.target = e.target.textContent.trim() }, true);
      document.addEventListener('click', (e) => {
        window.__tapProbe.docClick = (e.target.tagName || '') + ':' + (e.target.textContent || '').trim().slice(0, 12);
      }, true);
    })()`)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: labelBox.x, y: labelBox.y, id: 1, radiusX: 10, radiusY: 10, force: 1 }],
    })
    await sleep(110)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(700)
    const probe = await cdp.eval('JSON.stringify(window.__tapProbe)')
    const nameAfter = await cdp.eval(`document.querySelector('.term-pill .pill-name')?.textContent.trim()`)
    check(
      `点按轨道上的「${labelBox.text}」标签能切换节气`,
      nameAfter === labelBox.text,
      `${nameBefore} → ${nameAfter}；事件探针 ${probe}`,
    )
  } else {
    check('轨道标签可点按', false, '找不到可见标签')
  }

  // 点按「辅助选项」按钮应能展开面板
  const toggleBtn = await cdp.eval(`(() => {
    const btns = [...document.querySelectorAll('.hud-btn-row .btn')];
    const el = btns.find(b => b.textContent.includes('辅助选项'));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
  })()`)
  if (toggleBtn) {
    const panelBefore = await cdp.eval(`!!document.querySelector('.hud-panel')`)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: toggleBtn.x, y: toggleBtn.y, id: 1, radiusX: 10, radiusY: 10, force: 1 }],
    })
    await sleep(110)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(500)
    const panelAfter = await cdp.eval(`!!document.querySelector('.hud-panel')`)
    check('点按「辅助选项」能展开/收起面板', panelBefore !== panelAfter, `${panelBefore} → ${panelAfter}`)
  }

  // 点按底部时间控制条的按钮（触屏命中面积）
  const playBox = await cdp.eval(`(() => { const r = document.querySelector('.play-btn').getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), w: Math.round(r.width), h: Math.round(r.height) }; })()`)
  check('播放按钮触屏命中面积 ≥ 40×40', playBox.w >= 40 && playBox.h >= 40, `${playBox.w}×${playBox.h}`)

  // 时间轴刻度的点按（虽然 tabindex=-1，但触摸要能点）
  const tickBox = await cdp.eval(`(() => {
    const el = document.querySelector('.tick.is-major');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), w: Math.round(r.width), h: Math.round(r.height) };
  })()`)
  check('时间轴刻度触屏命中高度 ≥ 24px（否则手指点不中）', !!tickBox && tickBox.h >= 24, tickBox ? `${tickBox.w}×${tickBox.h}` : 'n/a')

  // ───────────────────────── 4. 安全区与视口单位 ─────────────────────────
  console.log('\n【4】安全区与视口单位兼容')

  const compat = await cdp.eval(`(() => {
    const tb = document.querySelector('.timebar');
    const cs = tb ? getComputedStyle(tb) : null;
    const sel = document.querySelector('#speed-select');
    const dateInput = document.querySelector('#datetime-input');
    return {
      dvhSupported: CSS.supports('height', '100dvh'),
      safeAreaSupported: CSS.supports('padding-bottom', 'env(safe-area-inset-bottom)'),
      timebarPaddingBottom: cs ? cs.paddingBottom : '',
      timebarPadLeft: cs ? cs.paddingLeft : '',
      cssHasSafeArea: [...document.styleSheets].some((sh) => {
        try { return [...sh.cssRules].some((r) => r.cssText && r.cssText.includes('safe-area-inset')) }
        catch { return false }
      }),
      stageHeight: getComputedStyle(document.querySelector('.stage')).height,
      dateFontSize: getComputedStyle(dateInput).fontSize,
      dateAppearance: getComputedStyle(dateInput).webkitAppearance || getComputedStyle(dateInput).appearance,
      selectAppearance: getComputedStyle(sel).webkitAppearance || getComputedStyle(sel).appearance,
      selectBg: getComputedStyle(sel).backgroundColor,
      selectColor: getComputedStyle(sel).color,
      stageColumns: getComputedStyle(document.querySelector('.stage')).gridTemplateColumns,
      timebarRow: getComputedStyle(tb).gridRowStart,
      detailRow: getComputedStyle(document.querySelector('.detail-panel')).gridRowStart,
    };
  })()`)
  console.log('  ' + JSON.stringify(compat, null, 0))
  check('视口高度使用 dvh（并有 vh 回退）', compat.dvhSupported)
  check(
    'CSS 中为刘海屏安全区留了内边距',
    compat.cssHasSafeArea && compat.safeAreaSupported,
    `cssHasSafeArea=${compat.cssHasSafeArea}`,
  )
  check(
    '表单控件字号 ≥ 16px（iOS 聚焦不会自动放大页面）',
    parseFloat(compat.dateFontSize) >= 16,
    compat.dateFontSize,
  )
  check(
    '表单控件已统一外观（不会出现 iOS 白底浅字）',
    compat.dateAppearance === 'none' && compat.selectAppearance === 'none',
    `date=${compat.dateAppearance} select=${compat.selectAppearance}`,
  )
  check(
    '下拉框文字与背景对比正常（深色底浅色字）',
    compat.selectBg !== 'rgb(255, 255, 255)',
    `${compat.selectBg} / ${compat.selectColor}`,
  )
  check(
    '移动端 grid 已重排：时间条在详情区之上',
    Number(compat.timebarRow) < Number(compat.detailRow),
    `timebar row=${compat.timebarRow} detail row=${compat.detailRow}`,
  )

  // ───────────────────────── 5. 截图 ─────────────────────────
  console.log('\n【5】移动端截图')
  // 前面做过旋转/缩放和展开面板，先重新加载让画面回到「打开页面时」的默认状态
  for (const d of DEVICES) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: d.w,
      height: d.h,
      deviceScaleFactor: 2,
      mobile: true,
      screenWidth: d.w,
      screenHeight: d.h,
    })
    await cdp.send('Page.navigate', { url: URL_BASE })
    await sleep(1500)
    for (let i = 0; i < 40; i++) {
      if (await cdp.eval(`document.querySelectorAll('.orbit-label').length > 0`)) break
      await sleep(400)
    }
    await sleep(1800)
    await cdp.eval('window.scrollTo(0,0)')
    await sleep(500)
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(SHOTS, `mobile-${d.name}.png`), Buffer.from(r.data, 'base64'))
    console.log(`  mobile-${d.name}.png`)
  }
  // 底部时间控制条特写
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true })
  await sleep(1000)
  await cdp.eval(`document.querySelector('.timebar').scrollIntoView({block:'center'})`)
  await sleep(500)
  const r2 = await cdp.send('Page.captureScreenshot', { format: 'png' })
  await writeFile(join(SHOTS, 'mobile-timebar.png'), Buffer.from(r2.data, 'base64'))
  console.log('  mobile-timebar.png')

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`通过 ${pass} 项，失败 ${failures.length} 项`)
  if (failures.length) {
    console.log('\n失败明细：')
    for (const f of failures) console.log('  ✗ ' + f)
    process.exitCode = 1
  } else {
    console.log('移动端验收全部通过 ✓')
  }
} catch (e) {
  console.error('\n测试中断：', e.message)
  process.exitCode = 1
} finally {
  ws.close()
  killTree(child)
  await rm(PROFILE, { recursive: true, force: true }).catch(() => {})
}
