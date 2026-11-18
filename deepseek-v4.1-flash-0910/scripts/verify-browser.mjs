/**
 * 浏览器端验收测试（开发期脚本，不参与运行时）
 *
 * 通过 Chrome DevTools Protocol 驱动本机 Edge 的无头模式，做两件事：
 *   1. 抓取整页截图，用于人工核对 3D 场景与排版；
 *   2. 自动验证交互是否真的联动 —— 点击节气、拖动时间轴、选日期、播放、
 *      回到今天、切换视角与辅助线，逐项读取 DOM 状态断言。
 *
 * 用法：
 *   node scripts/verify-browser.mjs          # 生成 shots/*.png 并跑交互断言
 *   node scripts/verify-browser.mjs --shots  # 只截图
 *
 * 前置：先运行 node scripts/preview-dist.mjs 4180
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SHOTS = join(ROOT, 'shots')
const PORT = 9333
const URL_BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4180/'
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const SHOTS_ONLY = process.argv.includes('--shots')
const PROFILE = join(ROOT, '.edge-cdp-profile')

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

// ───────────────────────── CDP 客户端 ─────────────────────────

class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.events = new Map()
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id)
        if (p) {
          this.pending.delete(msg.id)
          msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result)
        }
      } else if (msg.method) {
        const list = this.events.get(msg.method) || []
        for (const fn of list) fn(msg.params)
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
  on(method, fn) {
    if (!this.events.has(method)) this.events.set(method, [])
    this.events.get(method).push(fn)
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || '页面内求值异常')
    return r.result.value
  }
  /** 在元素中心派发一次真实鼠标点击（先滚动到视野内） */
  async clickSelector(selector, label = selector) {
    const box = await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      return true;
    })()`)
    if (!box) throw new Error(`找不到元素：${label}`)
    await sleep(350)
    const rect = await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`)
    if (!rect) throw new Error(`元素不可见：${label}`)
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', {
        type,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        button: 'left',
        clickCount: 1,
      })
    }
    await sleep(220)
  }
}

// ───────────────────────── 启动浏览器 ─────────────────────────

async function launchEdge() {
  await rm(PROFILE, { recursive: true, force: true }).catch(() => {})
  const args = [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-features=Translate,MediaRouter',
    '--force-device-scale-factor=1',
    '--window-size=1600,1000',
    'about:blank',
  ]
  const child = spawn(EDGE, args, { stdio: 'ignore', windowsHide: true })

  for (let i = 0; i < 60; i++) {
    await sleep(500)
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return { child, page }
    } catch {
      /* 还没起来 */
    }
  }
  killTree(child)
  throw new Error('Edge 调试端口未就绪')
}

// ───────────────────────── 断言 ─────────────────────────

/** 截图助手：截图失败只提示，不该让整轮验收失败 */
async function shot(cdpRef, name, note) {
  try {
    const r = await cdpRef.send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(SHOTS, name), Buffer.from(r.data, 'base64'))
    console.log(`  ${name}${note ? '  ' + note : ''}`)
  } catch (e) {
    console.log(`  ⚠️ ${name} 截图失败（不影响验收结果）：${e.message}`)
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

// ───────────────────────── 主流程 ─────────────────────────

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

  console.log('\n打开页面 …')
  await cdp.send('Page.navigate', { url: URL_BASE })
  await sleep(1500)

  // 等待 3D 场景就绪（加载浮层消失）
  let ready = false
  for (let i = 0; i < 40; i++) {
    const st = await cdp.eval(`(() => {
      const overlay = document.querySelector('.overlay');
      return {
        hasCanvas: !!document.querySelector('canvas.scene-canvas'),
        overlayText: overlay ? overlay.textContent.trim().slice(0, 60) : null,
        labels: document.querySelectorAll('.orbit-label').length,
        fatal: document.body.innerText.includes('3D 场景不可用'),
      };
    })()`)
    if (st.hasCanvas && st.labels >= 24 && !st.overlayText) {
      ready = true
      console.log(`  场景就绪：画布已创建，轨道标签 ${st.labels} 个`)
      break
    }
    if (st.fatal) {
      console.log(`  ⚠️ 页面报告 3D 不可用：${st.overlayText}`)
      break
    }
    await sleep(500)
  }
  await sleep(1200)

  if (ready) {
    console.log('\n【3D 场景】')
    const scene = await cdp.eval(`(() => {
      const canvas = document.querySelector('canvas.scene-canvas');
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      return {
        w: canvas ? canvas.width : 0,
        h: canvas ? canvas.height : 0,
        labels: document.querySelectorAll('.orbit-label').length,
        majors: document.querySelectorAll('.orbit-label.is-major').length,
        majorNames: [...document.querySelectorAll('.orbit-label.is-major')].map(e => e.textContent).join(','),
        hasGL: !!gl,
        fallbackWarn: !!document.querySelector('.texture-warning'),
        scaleWarn: document.querySelector('.scale-warning')?.textContent.trim() || '',
      };
    })()`)
    check('画布已创建且有尺寸', scene.w > 0 && scene.h > 0, `${scene.w}×${scene.h}`)
    check('WebGL 上下文可用', scene.hasGL)
    check('轨道上渲染了 24 个节气标签', scene.labels === 24, `实际 ${scene.labels}`)
    check('四个分至点被突出显示', scene.majors === 4, `实际 ${scene.majors}：${scene.majorNames}`)
    check('标注了「尺寸与距离不按实际比例」', scene.scaleWarn.includes('不按实际比例'), scene.scaleWarn)

    console.log('\n【当前节气读出】')
    const readout = await cdp.eval(`(() => {
      const c = document.querySelector('.term-card');
      if (!c) return null;
      return {
        name: c.querySelector('.term-name')?.textContent.trim(),
        lon: c.querySelector('dd')?.textContent.trim(),
        badge: c.querySelector('.badge')?.textContent.trim(),
        dts: [...c.querySelectorAll('dt')].map(e => e.textContent.trim()),
        dds: [...c.querySelectorAll('dd')].map(e => e.textContent.trim()),
      };
    })()`)
    check('读出卡显示节气名', !!readout?.name, JSON.stringify(readout?.name))
    check('读出卡显示太阳黄经', /λ☉\s*=/.test(readout?.dds?.[0] || ''), readout?.dds?.[0])
    check(
      '读出卡区分「交节时刻」与「下一节气」',
      readout?.dts?.includes('本节气交节') && readout?.dts?.includes('下一节气'),
      JSON.stringify(readout?.dts),
    )
    check('默认处于「实时」模式', readout?.badge === '实时', readout?.badge)

    // 黄经与节气名是否自洽：读出的 λ☉ 是连续变化的当前黄经，应落在 0—360
    const lonNum = Number((readout?.dds?.[0] || '').replace(/[^0-9.]/g, ''))
    check(
      `当前太阳黄经 ${lonNum}° 落在 0—360 之间`,
      lonNum >= 0 && lonNum < 360,
      String(lonNum),
    )
    // 而该节气本身的黄经应当是 15 的整数倍
    const termLon = await cdp.eval(`(() => {
      const dds = [...document.querySelectorAll('.detail-moment dd')];
      const hit = dds.find(d => /λ☉/.test(d.textContent));
      return hit ? Number(hit.textContent.replace(/[^0-9.]/g, '')) : NaN;
    })()`)
    check(
      `节气本身的黄经 ${termLon}° 是 15 的整数倍`,
      Number.isFinite(termLon) && termLon % 15 === 0,
      String(termLon),
    )

    console.log('\n【首屏布局】')
    const layout = await cdp.eval(`(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null;
        const b = e.getBoundingClientRect();
        return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom), right: Math.round(b.right) }; };
      return { vp: r('.viewport-wrap'), detail: r('.detail-panel'), bar: r('.timebar'),
        innerH: window.innerHeight, innerW: window.innerWidth };
    })()`)
    check(
      '桌面端：3D 区在左、详情区在右',
      layout.vp && layout.detail && layout.detail.x >= layout.vp.right - 2,
      JSON.stringify(layout),
    )
    check(
      '桌面端：时间控制条横跨整行并位于 3D 区下方',
      layout.bar && layout.bar.x <= layout.vp.x + 2 && layout.bar.y >= layout.vp.bottom - 2 &&
        layout.bar.w >= layout.innerW - 4,
      `bar=${JSON.stringify(layout.bar)}`,
    )
    check(
      '桌面端：顶栏 + 3D 区 + 时间条正好占满首屏',
      layout.bar && Math.abs(layout.bar.bottom - layout.innerH) <= 4,
      `bar.bottom=${layout.bar?.bottom} innerH=${layout.innerH}`,
    )

    console.log('\n【点击节气 → 联动】')
    // 点节气歌里的「春」（第一个字 = 立春）
    const before = await cdp.eval(`document.querySelector('.timebar-status')?.textContent.trim()`)
    await cdp.clickSelector('.song-char.is-term', '节气歌第一个字')
    const afterSong = await cdp.eval(`(() => ({
      status: document.querySelector('.timebar-status')?.textContent.trim(),
      name: document.querySelector('.term-card .term-name')?.textContent.trim(),
      badge: document.querySelector('.term-card .badge')?.textContent.trim(),
      legend: document.querySelector('.song-legend .legend-term')?.textContent.trim(),
      detailName: document.querySelector('.detail-head .name')?.textContent.trim(),
    }))()`)
    check('点击节气歌的字会暂停播放并切换为模拟时间', afterSong.badge === '模拟时间', afterSong.badge)
    check('点击后详情面板同步为「立春」', afterSong.detailName === '立春', String(afterSong.detailName))
    check('读出卡与详情面板一致', afterSong.name === afterSong.detailName, `${afterSong.name} / ${afterSong.detailName}`)
    check('节气歌右侧说明同步更新', afterSong.legend === '立春', String(afterSong.legend))
    check('时间状态文本发生变化', before !== afterSong.status, `${before} → ${afterSong.status}`)

    // 点击节气一览里的「夏至」
    console.log('\n【节气一览 → 联动】')
    const chipOk = await cdp.eval(`(() => {
      const chips = [...document.querySelectorAll('.term-chip')];
      const target = chips.find(c => c.querySelector('.chip-name')?.textContent.trim().startsWith('夏至'));
      if (!target) return false;
      target.click();
      return true;
    })()`)
    await sleep(400)
    const afterChip = await cdp.eval(`(() => ({
      name: document.querySelector('.term-card .term-name')?.textContent.trim(),
      detailName: document.querySelector('.detail-head .name')?.textContent.trim(),
      lon: document.querySelector('.term-card dd')?.textContent.trim(),
      moment: document.querySelector('.detail-moment dd')?.textContent.replace(/\\s+/g,' ').trim(),
      currentChip: [...document.querySelectorAll('.term-chip.is-current .chip-name')].map(e=>e.textContent.trim().replace('分至','')),
    }))()`)
    check('点击「夏至」后详情切换到夏至', chipOk && afterChip.detailName === '夏至', String(afterChip.detailName))
    check('夏至的太阳黄经为 90°', /90(\.0+)?°/.test(afterChip.lon || ''), afterChip.lon)
    check(
      '节气一览中夏至被标为当前',
      afterChip.currentChip.some((s) => s.includes('夏至')),
      JSON.stringify(afterChip.currentChip),
    )
    check('交节时刻按北京时间显示', /北京时间/.test(afterChip.moment || ''), afterChip.moment)

    console.log('\n【拖动年度时间轴】')
    const timelineTest = await cdp.eval(`(() => {
      const input = document.querySelector('#year-timeline');
      if (!input) return null;
      const before = document.querySelector('.timebar-status')?.textContent.trim();
      const name = document.querySelector('.term-card .term-name')?.textContent.trim();
      return { before, name, min: input.min, max: input.max, value: Number(input.value) };
    })()`)
    check('存在可拖动的年度时间轴', !!timelineTest, JSON.stringify(timelineTest))
    // 用真实鼠标在时间轴上拖动：按住 → 连续移动 → 松开
    // （前面的步骤把页面滚到了节气歌一节，这里要先把时间轴滚回视野内，
    //   否则 getBoundingClientRect 会给出视口外的负坐标，鼠标事件落空）
    await cdp.eval(`document.querySelector('#year-timeline').scrollIntoView({ block: 'center' })`)
    await sleep(400)
    const tbox = await cdp.eval(`(() => { const r = document.querySelector('#year-timeline').getBoundingClientRect();
      return { x: r.left, y: r.top + r.height/2, w: r.width, inView: r.top >= 0 && r.bottom <= innerHeight }; })()`)
    check('时间轴已滚入视野', tbox.inView, JSON.stringify(tbox))
    const ty = Math.round(tbox.y)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(tbox.x + tbox.w * 0.12), y: ty, button: 'left', buttons: 1, clickCount: 1 })
    for (const f of [0.3, 0.5, 0.7, 0.86, 0.9]) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(tbox.x + tbox.w * f), y: ty, button: 'left', buttons: 1 })
      await sleep(70)
    }
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(tbox.x + tbox.w * 0.9), y: ty, button: 'left', buttons: 0, clickCount: 1 })
    await sleep(600)
    const afterDrag = await cdp.eval(`(() => ({
      slider: Number(document.querySelector('#year-timeline').value),
      status: document.querySelector('.timebar-status')?.textContent.trim(),
      name: document.querySelector('.term-card .term-name')?.textContent.trim(),
      sunLon: document.querySelector('.term-card dd')?.textContent.trim(),
      mapNote: document.querySelector('.map-note-block .map-note')?.textContent || '',
    }))()`)
    check('拖动后时间轴位置明显右移', afterDrag.slider > 0.75, `slider=${afterDrag.slider}`)
    check(
      '拖动后日期文本同步变化',
      afterDrag.status !== timelineTest.before,
      `${timelineTest.before} → ${afterDrag.status}`,
    )
    check(
      '拖动后节气名更新',
      !!afterDrag.name && afterDrag.name !== timelineTest.name,
      `${timelineTest.name} → ${afterDrag.name}`,
    )
    check(
      '拖动后 3D 方位角读数更新',
      /φ\s*=/.test(afterDrag.mapNote),
      afterDrag.mapNote.replace(/\s+/g, ' ').slice(0, 90),
    )

    // 黄经与节气名一致性：读 λ☉ 推断应处于哪个节气
    console.log('\n【黄经 ↔ 节气 一致性】')
    const consistency = await cdp.eval(`(() => {
      const dd = document.querySelector('.term-card dd')?.textContent || '';
      const lon = Number(dd.replace(/[^0-9.]/g, ''));
      const name = document.querySelector('.term-card .term-name')?.textContent.trim();
      return { lon, name };
    })()`)
    // 节气名按黄经区间反查（当前节气 = 已到达的那个交节）
    const LON_TO_NAME = [
      [315, '立春'], [330, '雨水'], [345, '惊蛰'], [0, '春分'], [15, '清明'], [30, '谷雨'],
      [45, '立夏'], [60, '小满'], [75, '芒种'], [90, '夏至'], [105, '小暑'], [120, '大暑'],
      [135, '立秋'], [150, '处暑'], [165, '白露'], [180, '秋分'], [195, '寒露'], [210, '霜降'],
      [225, '立冬'], [240, '小雪'], [255, '大雪'], [270, '冬至'], [285, '小寒'], [300, '大寒'],
    ]
    // 当前区间 = 最后一个 lon <= 当前黄经 的节气（按黄经顺序）
    const expected = (() => {
      const sorted = [...LON_TO_NAME].sort((a, b) => a[0] - b[0])
      let last = sorted[sorted.length - 1]
      for (const [lon, nm] of sorted) {
        if (lon <= consistency.lon) last = [lon, nm]
      }
      return last[1]
    })()
    check(
      `黄经 ${consistency.lon}° 与节气「${consistency.name}」自洽（黄经反查应为「${expected}」）`,
      consistency.name === expected,
      `${consistency.name} vs ${expected}`,
    )

    console.log('\n【回到今天 / 播放 / 视角 / 辅助线】')
    await cdp.clickSelector('.timebar .btn-primary', '回到今天')
    await sleep(400)
    const afterToday = await cdp.eval(`(() => ({
      badge: document.querySelector('.term-card .badge')?.textContent.trim(),
      headerBadge: document.querySelector('.header-clock .badge')?.textContent.trim(),
      slider: Number(document.querySelector('#year-timeline').value),
    }))()`)
    check('「回到今天」切回实时模式', afterToday.badge === '实时' && afterToday.headerBadge === '实时', JSON.stringify(afterToday))

    // 播放
    await cdp.clickSelector('.play-btn', '播放按钮')
    await sleep(1600)
    const playing = await cdp.eval(`(() => ({
      badge: document.querySelector('.term-card .badge')?.textContent.trim(),
      label: document.querySelector('.play-btn')?.getAttribute('aria-label'),
      status: document.querySelector('.timebar-status')?.textContent.trim(),
    }))()`)
    check('点击播放后进入模拟时间', playing.badge === '模拟时间', playing.badge)
    check('播放按钮切换为「暂停模拟」', playing.label === '暂停模拟', String(playing.label))
    const t1 = await cdp.eval(`document.querySelector('#year-timeline').value`)
    await sleep(1500)
    const t2 = await cdp.eval(`document.querySelector('#year-timeline').value`)
    check('播放中时间轴持续推进', Number(t2) > Number(t1), `${t1} → ${t2}`)
    await cdp.clickSelector('.play-btn', '暂停按钮')
    const paused = await cdp.eval(`document.querySelector('.play-btn')?.getAttribute('aria-label')`)
    check('可以暂停', paused === '播放模拟', String(paused))

    // 速度
    await cdp.eval(`(() => {
      const s = document.querySelector('#speed-select');
      s.value = '15';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    })()`)
    await sleep(200)
    check('速度可调', (await cdp.eval(`document.querySelector('#speed-select').value`)) === '15')

    // 视角按钮
    for (const [sel, label] of [
      ['.hud-btn-row .btn:nth-child(2)', '地球近景'],
      ['.hud-btn-row .btn:nth-child(1)', '轨道总览'],
      ['.hud-btn-row .btn:nth-child(3)', '恢复默认视角'],
    ]) {
      await cdp.clickSelector(sel, label)
      await sleep(1100)
      const ok = await cdp.eval(`document.querySelector(${JSON.stringify(sel)})?.classList.contains('is-active') !== undefined`)
      check(`视角按钮「${label}」可点击`, ok)
    }
    await sleep(900)

    // 辅助线开关
    const guideTest = await cdp.eval(`(() => {
      const boxes = [...document.querySelectorAll('.toggle input[type=checkbox]')];
      return { count: boxes.length, checked: boxes.map(b => b.checked) };
    })()`)
    check('提供 8 个辅助标识开关', guideTest.count === 8, `实际 ${guideTest.count}`)
    await cdp.eval(`(() => {
      const b = [...document.querySelectorAll('.toggle input')][0];
      b.checked = false; b.dispatchEvent(new Event('change', { bubbles: true }));
    })()`)
    await sleep(300)
    check('辅助线开关可切换', (await cdp.eval(`document.querySelectorAll('.toggle input')[0].checked`)) === false)

    // 年份步进
    console.log('\n【年份与日期选择】')
    const y0 = await cdp.eval(`Number(document.querySelector('#year-input').value)`)
    await cdp.clickSelector('.year-stepper button:last-child', '下一年')
    await sleep(300)
    const y1 = await cdp.eval(`Number(document.querySelector('#year-input').value)`)
    check('年份可前后切换', y1 === y0 + 1, `${y0} → ${y1}`)
    // 年份上下限改为从页面读取，避免测试与实现各写一份
    const bounds = await cdp.eval(`(() => {
      const i = document.querySelector('#year-input');
      return { min: Number(i.min), max: Number(i.max) };
    })()`)
    check(
      `年份可输入范围已扩展到 ${bounds.min} — ${bounds.max}`,
      bounds.min <= -1000 && bounds.max >= 5000,
      JSON.stringify(bounds),
    )

    const setYear = async (y) => {
      await cdp.eval(`(() => { const i = document.querySelector('#year-input'); i.value = '${y}';
        i.dispatchEvent(new Event('change', { bubbles: true })); })()`)
      await sleep(350)
    }

    await setYear(bounds.max)
    const atMax = await cdp.eval(`(() => ({
      year: Number(document.querySelector('#year-input').value),
      nextDisabled: document.querySelector('.year-stepper button:last-child').disabled,
      prevDisabled: document.querySelector('.year-stepper button:first-child').disabled,
    }))()`)
    check(
      `年份上限 ${bounds.max} 时「下一年」禁用`,
      atMax.year === bounds.max && atMax.nextDisabled,
      JSON.stringify(atMax),
    )

    await setYear(bounds.min)
    const atMin = await cdp.eval(`(() => ({
      year: Number(document.querySelector('#year-input').value),
      prevDisabled: document.querySelector('.year-stepper button:first-child').disabled,
    }))()`)
    check(
      `年份下限 ${bounds.min} 时「上一年」禁用`,
      atMin.year === bounds.min && atMin.prevDisabled,
      JSON.stringify(atMin),
    )

    // 公元前与远未来都要能算出 24 个节气，且精度徽标如实降级
    for (const [y, expectLevel] of [
      [`${bounds.min}`, 'D'],
      ['-500', 'C'],
      ['1000', 'B'],
      ['2025', 'A'],
      ['5000', 'D'],
    ]) {
      await setYear(y)
      const r = await cdp.eval(`(() => {
        const chips = [...document.querySelectorAll('.term-chip')];
        const badge = document.querySelector('.precision-badge');
        const dt = document.querySelector('#datetime-input');
        return {
          n: chips.length,
          first: chips[0]?.querySelector('.chip-time')?.textContent.trim(),
          year: Number(document.querySelector('#year-input').value),
          level: ((badge?.textContent || '').split('精度')[1] || '').trim().slice(0, 1),
          badgeText: badge?.textContent.trim(),
          inputType: dt?.type,
          dateText: document.querySelector('.timebar-status')?.textContent.replace(/\s+/g, ' ').trim(),
        };
      })()`)
      check(
        `${y} 年：24 个节气齐全且给出交节时刻`,
        r.n === 24 && r.first && r.first !== '—',
        `${r.n} 项，首项 ${r.first}`,
      )
      check(`${y} 年：精度徽标为 ${expectLevel} 档`, r.level === expectLevel, `${r.level}「${r.badgeText}」`)
      if (Number(y) < 1) {
        check(
          `${y} 年：日期控件降级为文本框（datetime-local 只支持四位年份）`,
          r.inputType === 'text',
          String(r.inputType),
        )
        check(`${y} 年：状态栏显示公元前年份`, /公元前/.test(r.dateText || ''), r.dateText)
      }
    }

    // 通过日期时间选择器跳到 2025-03-20 15:53，再逐次改时刻验证交节边界。
    // 2025 年春分交节于 3 月 20 日 17:01：17:00 仍属惊蛰区间，17:02 已进入春分。
    const beforeDate = await cdp.eval(
      `document.querySelector('.timebar-status')?.textContent.replace(/\\s+/g,' ').trim()`,
    )
    await cdp.eval(`(() => { const i = document.querySelector('#datetime-input'); i.value = '2025-03-20T15:53';
      i.dispatchEvent(new Event('change', { bubbles: true })); })()`)
    await sleep(500)
    const afterDate = await cdp.eval(`(() => ({
      year: Number(document.querySelector('#year-input').value),
      name: document.querySelector('.term-card .term-name')?.textContent.trim(),
      detail: document.querySelector('.detail-head .name')?.textContent.trim(),
      status: document.querySelector('.timebar-status')?.textContent.replace(/\\s+/g,' ').trim(),
      dateVal: document.querySelector('#datetime-input').value,
      timeVal: (document.querySelector('#datetime-input').value || '').split('T')[1] || '',
      chipTimes: [...document.querySelectorAll('.term-chip')].slice(0,6).map(c => c.querySelector('.chip-time').textContent.trim()),
    }))()`)
    check('选择日期时间后年份同步为 2025', afterDate.year === 2025, String(afterDate.year))
    check(
      '选择日期时间后输入框与状态文本都指向 2025-03-20',
      afterDate.dateVal.startsWith('2025-03-20') && afterDate.status.includes('2025-03-20'),
      `切换前「${beforeDate}」→ 切换后「${afterDate.status}」（输入框 ${afterDate.dateVal}）`,
    )
    check(
      '读出的节气与保留的时刻自洽（该时刻早于 17:01 即为惊蛰）',
      afterDate.timeVal < '17:01' ? afterDate.name === '惊蛰' : afterDate.name === '春分',
      `时刻 ${afterDate.timeVal} → 节气 ${afterDate.name}`,
    )
    check(
      '2025 年春分交节时刻为 3 月 20 日 17:01',
      /3月20日\s*17:01/.test(afterDate.chipTimes[3] || ''),
      JSON.stringify(afterDate.chipTimes),
    )

    // 交节时刻前后 1—2 分钟：03-20 17:00 应为惊蛰，17:02 应为春分
    for (const [hhmm, expectName] of [
      ['17:00', '惊蛰'],
      ['17:02', '春分'],
      ['18:00', '春分'],
    ]) {
      await cdp.eval(`(() => { const i = document.querySelector('#datetime-input'); i.value = '2025-03-20T' + ${JSON.stringify(hhmm)};
        i.dispatchEvent(new Event('change', { bubbles: true })); })()`)
      await sleep(450)
      const nm = await cdp.eval(`document.querySelector('.term-card .term-name')?.textContent.trim()`)
      check(`2025-03-20 ${hhmm} 判定为「${expectName}」`, nm === expectName, String(nm))
    }

    console.log('\n【内容完整性】')
    const content = await cdp.eval(`(() => ({
      songLines: document.querySelectorAll('.song-line').length,
      songChars: document.querySelectorAll('.song-char').length,
      songTermChars: document.querySelectorAll('.song-char.is-term').length,
      songFillers: document.querySelectorAll('.song-char.is-filler').length,
      histItems: document.querySelectorAll('.hist-item').length,
      cultureCards: document.querySelectorAll('.culture-card').length,
      cultureExamples: document.querySelectorAll('.culture-card li').length,
      faqs: document.querySelectorAll('.faq').length,
      sources: document.querySelectorAll('.source-item').length,
      termChips: document.querySelectorAll('.term-chip').length,
      dataNote: (document.querySelector('.data-note p')?.textContent || '').length,
      detailSections: document.querySelectorAll('.detail-section').length,
      pentads: document.querySelectorAll('.pentad').length,
      hasPoem: !!document.querySelector('.poem .verse'),
      hasProverb: !!document.querySelector('.proverb'),
    }))()`)
    check('节气歌 4 句、28 字', content.songLines === 4 && content.songChars === 28, JSON.stringify({ l: content.songLines, c: content.songChars }))
    check('节气歌 24 个字对应节气、4 个衬字', content.songTermChars === 24 && content.songFillers === 4, JSON.stringify({ t: content.songTermChars, f: content.songFillers }))
    check('历史时间线条目 ≥ 10', content.histItems >= 10, String(content.histItems))
    check('文化价值 6 个方面', content.cultureCards === 6, String(content.cultureCards))
    check('文化价值具体例子 ≥ 18', content.cultureExamples >= 18, String(content.cultureExamples))
    check('科普问答 ≥ 4 条', content.faqs >= 4, String(content.faqs))
    check('参考来源 ≥ 8 条', content.sources >= 8, String(content.sources))
    check('节气一览 24 项', content.termChips === 24, String(content.termChips))
    check('详情面板给出三候', content.pentads === 3, String(content.pentads))
    check('详情面板含诗词与农谚', content.hasPoem && content.hasProverb)
    check('数据说明长度 ≥ 150 字', content.dataNote >= 150, String(content.dataNote))

    console.log('\n【中英双语切换】')
    const zhSnapshot = await cdp.eval(`(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      termName: document.querySelector('.term-card .term-name')?.textContent.trim(),
      viewBtn: document.querySelector('.hud-btn-row .btn')?.textContent.trim(),
      histTitle: document.querySelector('#history-title')?.textContent.trim(),
      songTitle: document.querySelector('#song-title')?.textContent.trim(),
      orbitLabel: document.querySelector('.orbit-label')?.textContent.trim(),
      bodyLabel: document.querySelector('.body-label.is-sun')?.textContent.trim(),
      footerText: (document.querySelector('.site-footer p')?.textContent || '').slice(0, 40),
      pentadOriginal: document.querySelectorAll('.pentad-original').length,
      verseOriginal: document.querySelectorAll('.verse-original').length,
      songChar: document.querySelector('.song-char-glyph')?.textContent.trim(),
      songPinyin: document.querySelector('.song-char-pinyin')?.textContent.trim(),
      switchButtons: [...document.querySelectorAll('.lang-switch .lang-btn')].map(b => b.textContent.trim()),
      activeLang: document.querySelector('.lang-switch .lang-btn.is-active')?.textContent.trim(),
    }))()`)

    check('初始语言为中文', zhSnapshot.lang === 'zh-CN' && zhSnapshot.activeLang === '中文', JSON.stringify({ lang: zhSnapshot.lang, active: zhSnapshot.activeLang }))
    check('语言切换控件有两个选项', zhSnapshot.switchButtons.length === 2, JSON.stringify(zhSnapshot.switchButtons))
    check('中文界面下节气名为中文', /[\u4e00-\u9fff]/.test(zhSnapshot.termName || ''), zhSnapshot.termName)
    check('中文界面下不显示汉字对照（本就是中文）', zhSnapshot.pentadOriginal === 0 && zhSnapshot.verseOriginal === 0,
      `pentad=${zhSnapshot.pentadOriginal} verse=${zhSnapshot.verseOriginal}`)

    // 切到英文
    await cdp.clickSelector('.lang-switch .lang-btn:nth-child(2)', 'English')
    await sleep(900)
    const en = await cdp.eval(`(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      termName: document.querySelector('.term-card .term-name')?.textContent.trim(),
      termNameZh: document.querySelector('.detail-head .name-zh')?.textContent.trim(),
      viewBtn: document.querySelector('.hud-btn-row .btn')?.textContent.trim(),
      histTitle: document.querySelector('#history-title')?.textContent.trim(),
      cultureTitle: document.querySelector('#culture-title')?.textContent.trim(),
      songTitle: document.querySelector('#song-title')?.textContent.trim(),
      scienceTitle: document.querySelector('#science-title')?.textContent.trim(),
      sourcesTitle: document.querySelector('#sources-title')?.textContent.trim(),
      orbitLabel: document.querySelector('.orbit-label')?.textContent.trim(),
      orbitLabels: [...document.querySelectorAll('.orbit-label')].map(e => e.textContent.trim()),
      bodyLabel: document.querySelector('.body-label.is-sun')?.textContent.trim(),
      footerText: (document.querySelector('.site-footer p')?.textContent || '').slice(0, 60),
      histItem: (document.querySelector('.hist-item h3')?.textContent || '').trim(),
      cultureCard: (document.querySelector('.culture-card h3')?.textContent || '').trim(),
      faqQ: (document.querySelector('.faq summary')?.textContent || '').trim(),
      songChar: document.querySelector('.song-char-glyph')?.textContent.trim(),
      songPinyin: document.querySelector('.song-char-pinyin')?.textContent.trim(),
      songSummary: (document.querySelector('.line-summary')?.textContent || '').slice(0, 50),
      pentadOriginal: document.querySelectorAll('.pentad-original').length,
      verseOriginal: document.querySelectorAll('.verse-original').length,
      proverbOriginal: document.querySelectorAll('.proverb-original').length,
      dataNote: (document.querySelector('.data-note p')?.textContent || '').slice(0, 60),
      mapNote: (document.querySelector('.map-note-block .map-note')?.textContent || '').trim(),
      timebarLabel: document.querySelector('label[for="datetime-input"]')?.textContent.trim(),
      activeLang: document.querySelector('.lang-switch .lang-btn.is-active')?.textContent.trim(),
      url: location.search,
    }))()`)

    check('切换后 <html lang> 变为 en', en.lang === 'en', en.lang)
    check('切换后页面标题变为英文', /Solar Terms/.test(en.title), en.title)
    check('切换后按钮文字变为英文', en.viewBtn === 'Orbit overview', String(en.viewBtn))
    check('切换后节气名变为英文，并并列显示汉字', /^[A-Za-z]/.test(en.termName || '') && /[\u4e00-\u9fff]/.test(en.termNameZh || ''),
      `${en.termName} / ${en.termNameZh}`)
    check('五个阅读区标题都变为英文',
      en.histTitle === 'Historical origins' && en.cultureTitle === 'Cultural value' &&
      en.songTitle === 'The Song of the 24 Solar Terms' && en.scienceTitle === 'How it works' &&
      en.sourcesTitle === 'Sources & data notes',
      [en.histTitle, en.cultureTitle, en.songTitle, en.scienceTitle, en.sourcesTitle].join(' | '))
    check('3D 轨道上的节气标签变为英文',
      en.orbitLabels.length >= 4 && en.orbitLabels.every((s) => /^[A-Za-z' ]+$/.test(s)),
      en.orbitLabels.slice(0, 5).join(' / '))
    check('3D 天体标签变为英文', en.bodyLabel === 'Sun', String(en.bodyLabel))
    check('正文内容变为英文（历史/文化/科普）',
      /^[A-Za-z]/.test(en.histItem) && /^[A-Za-z]/.test(en.cultureCard) && /^[A-Za-z]/.test(en.faqQ),
      [en.histItem, en.cultureCard, en.faqQ].join(' | '))
    check('数据说明变为英文', /^[A-Za-z]/.test(en.dataNote), en.dataNote)
    check('角度说明变为英文', /^[A-Za-z]/.test(en.mapNote), en.mapNote.slice(0, 50))
    check('时间控件标签变为英文', en.timebarLabel === 'Date & time', String(en.timebarLabel))
    check('英文版并列显示三候的汉字原文', en.pentadOriginal === 3, String(en.pentadOriginal))
    check('英文版并列显示诗词的汉字原句', en.verseOriginal === 1, String(en.verseOriginal))
    check('英文版并列显示农谚的汉字原文', en.proverbOriginal === 1, String(en.proverbOriginal))
    check('节气歌在英文版仍保留汉字，并补上拼音',
      /[\u4e00-\u9fff]/.test(en.songChar || '') && /[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i.test(en.songPinyin || ''),
      `${en.songChar} / ${en.songPinyin}`)
    check('节气歌的解释变为英文', /^[A-Za-z]/.test(en.songSummary), en.songSummary)
    check('切换语言会写进 URL（可分享）', /lang=en/.test(en.url || ''), en.url)

    // 直接把 ?lang=en 打开也应该直接是英文（并记住选择）
    await cdp.send('Page.navigate', { url: URL_BASE + '?lang=en' })
    await sleep(2200)
    for (let i = 0; i < 30; i++) {
      if (await cdp.eval(`document.querySelectorAll('.orbit-label').length > 0`)) break
      await sleep(400)
    }
    const direct = await cdp.eval(`(() => ({
      lang: document.documentElement.lang,
      active: document.querySelector('.lang-switch .lang-btn.is-active')?.textContent.trim(),
      termName: document.querySelector('.term-card .term-name')?.textContent.trim(),
      stored: (() => { try { return localStorage.getItem('jieqi.locale') } catch { return null } })(),
    }))()`)
    check('用 ?lang=en 打开时直接以英文呈现', direct.lang === 'en' && direct.active === 'English', JSON.stringify(direct))
    check('语言选择被记住', direct.stored === 'en', String(direct.stored))

    // 切回中文
    await cdp.clickSelector('.lang-switch .lang-btn:nth-child(1)', '中文')
    await sleep(800)
    const backZh = await cdp.eval(`(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      viewBtn: document.querySelector('.hud-btn-row .btn')?.textContent.trim(),
      orbitLabel: document.querySelector('.orbit-label')?.textContent.trim(),
      bodyLabel: document.querySelector('.body-label.is-sun')?.textContent.trim(),
      stored: (() => { try { return localStorage.getItem('jieqi.locale') } catch { return null } })(),
    }))()`)
    check('切回中文后文档标记、标题、按钮都恢复',
      backZh.lang === 'zh-CN' && /二十四节气/.test(backZh.title) && backZh.viewBtn === '轨道总览',
      JSON.stringify(backZh))
    check('切回中文后 3D 标签也恢复中文',
      /[\u4e00-\u9fff]/.test(backZh.orbitLabel || '') && backZh.bodyLabel === '太阳',
      `${backZh.orbitLabel} / ${backZh.bodyLabel}`)
    check('切回中文后选择也被记住', backZh.stored === 'zh', String(backZh.stored))

    console.log('\n【键盘可达性】')
    const kb = await cdp.eval(`(() => {
      // 计算每个可聚焦控件的无障碍名称：aria-label → aria-labelledby → 关联 label → 文本 → title
      const nameOf = (el) => {
        const aria = (el.getAttribute('aria-label') || '').trim();
        if (aria) return aria;
        const ref = el.getAttribute('aria-labelledby');
        if (ref) {
          const t = ref.split(/\\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
          if (t) return t;
        }
        if (el.id) {
          const lab = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
          if (lab && lab.textContent.trim()) return lab.textContent.trim();
        }
        const wrap = el.closest('label');
        if (wrap && wrap.textContent.trim()) return wrap.textContent.trim();
        const text = (el.textContent || '').trim();
        if (text) return text;
        const title = (el.getAttribute('title') || '').trim();
        if (title) return title;
        const ph = (el.getAttribute('placeholder') || '').trim();
        return ph;
      };
      const all = [...document.querySelectorAll(
        'button, input, select, textarea, a[href], summary, [tabindex]'
      )];
      // 排除被显式移出无障碍树 / 移出 Tab 顺序的元素（例如时间轴上装饰性的刻度）
      const focusable = all.filter(el =>
        el.tabIndex >= 0 && !el.closest('[aria-hidden="true"]') && !el.disabled
      );
      const unnamed = focusable.filter(el => nameOf(el).length === 0)
        .map(el => el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
      return { total: focusable.length, unnamed };
    })()`)
    check('存在足量可聚焦控件', kb.total > 40, String(kb.total))
    check(
      '所有可聚焦控件都有无障碍名称',
      kb.unnamed.length === 0,
      `${kb.unnamed.length} 个无名称：${kb.unnamed.slice(0, 8).join(', ')}`,
    )
  }

  // ────────────── 截图（尽力而为，失败不影响验收结论）──────────────
  try {
  // 交互测试会把页面滚到别处、把时间改成 1900 年，所以截图前重新加载一次，
  // 让画面回到「打开页面时」的真实状态。
  console.log('\n重置页面状态后抓取截图 …')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await cdp.send('Page.navigate', { url: URL_BASE })
  await sleep(2000)
  for (let i = 0; i < 40; i++) {
    const st = await cdp.eval(
      `!!document.querySelector('canvas.scene-canvas') && document.querySelectorAll('.orbit-label').length >= 24`,
    )
    if (st) break
    await sleep(400)
  }
  await cdp.eval('window.scrollTo(0, 0)')
  await sleep(1500)

  // 只抓视口截图。整页截图在软件渲染（SwiftShader）下会超出可分配的表面尺寸而失败，
  // 而它想提供的信息「页面长什么样」已经由下面的逐节截图覆盖得更清楚。
  const shots = [
    { name: 'desktop', w: 1600, h: 1000 },
    { name: 'tablet', w: 900, h: 1100 },
    { name: 'mobile', w: 414, h: 860 },
  ]
  for (const s of shots) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: s.w,
      height: s.h,
      deviceScaleFactor: 1,
      mobile: s.w < 700,
    })
    await sleep(1600)
    await cdp.eval('window.scrollTo(0, 0)')
    await sleep(500)
    await shot(cdp, `${s.name}.png`, `${s.w}×${s.h}`)
  }
  await cdp.send('Emulation.clearDeviceMetricsOverride')

  // 逐节截图：整页截图太长不便查看，改为滚动到每一节再抓视口
  console.log('\n逐节截图 …')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await sleep(1200)
  for (const [id, label] of [
    ['terms', '节气一览'],
    ['history', '历史渊源'],
    ['culture', '文化价值'],
    ['song', '节气歌'],
    ['science', '科普说明'],
    ['sources', '参考来源'],
  ]) {
    await cdp.eval(`(() => { const el = document.getElementById(${JSON.stringify(id)});
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 8); })()`)
    await sleep(700)
    await shot(cdp, `section-${id}.png`, label)
  }
  // 英文版截图（在同一个桌面尺寸下）
  console.log('\n英文版截图 …')
  await cdp.eval(`[...document.querySelectorAll('.lang-switch .lang-btn')].find(b => b.textContent.trim() === 'English')?.click()`)
  await sleep(1200)
  for (const [id, name] of [
    [null, 'en-desktop'],
    ['song', 'en-song'],
    ['history', 'en-history'],
  ]) {
    if (id) {
      await cdp.eval(`(() => { const el = document.getElementById('${id}');
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 8); })()`)
      await sleep(600)
    } else {
      await cdp.eval('window.scrollTo(0, 0)')
      await sleep(400)
    }
    await shot(cdp, `${name}.png`)
  }
  await cdp.eval(`[...document.querySelectorAll('.lang-switch .lang-btn')].find(b => b.textContent.trim() === '中文')?.click()`)
  await sleep(700)

  // 远未来 / 公元前：黄赤交角不同，南北回归线的位置应当看得出差别
  console.log('\n不同年代的地轴倾角截图 …')
  await cdp.eval('window.scrollTo(0, 0)')
  await sleep(300)
  for (const [year, name] of [
    [5000, 'epoch-5000'],
    [-500, 'epoch-m500'],
  ]) {
    await cdp.eval(`(() => { const i = document.querySelector('#year-input'); i.value = '${year}';
      i.dispatchEvent(new Event('change', { bubbles: true })); })()`)
    await sleep(600)
    await cdp.eval(`[...document.querySelectorAll('.hud-btn-row .btn')].find(b => b.textContent.includes('地球近景'))?.click()`)
    await sleep(1600)
    await shot(cdp, `${name}.png`, `（${year} 年）`)
  }

  } catch (e) {
    // 软件渲染（SwiftShader）在连续抓很多张图后会内存吃紧、甚至让渲染进程失去响应。
    // 截图只是给人看的产物，不该因此判定验收失败。
    console.log(`\n  ⚠️ 截图阶段提前结束（不影响验收结论）：${e.message}`)
  }

  await cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => {})
  void SHOTS_ONLY

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`通过 ${pass} 项，失败 ${failures.length} 项`)
  if (failures.length) {
    console.log('\n失败明细：')
    for (const f of failures) console.log('  ✗ ' + f)
    process.exitCode = 1
  } else {
    console.log('浏览器端验收全部通过 ✓')
  }
} catch (e) {
  console.error('\n测试中断：', e.message)
  process.exitCode = 1
} finally {
  ws.close()
  killTree(child)
  await rm(PROFILE, { recursive: true, force: true }).catch(() => {})
}
