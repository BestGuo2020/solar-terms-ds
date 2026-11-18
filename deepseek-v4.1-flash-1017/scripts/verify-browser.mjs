import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { activeTermAt, termInstantInYear } from '../src/astro/solar-terms.ts'
import { fromBeijing } from '../src/astro/beijing-time.ts'
import { SOLAR_TERMS } from '../src/data/term-catalog.ts'
import { TERM_NAMES_EN } from '../src/data/en/term-labels.ts'

const EDGE = process.env.EDGE_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9336
const URL = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5183/'
const profile = path.join(os.tmpdir(), `edge-jieqi-verify-${Date.now()}`)
const outDir = path.resolve('shots')
await fs.mkdir(outDir, { recursive: true })

const browser = spawn(
  EDGE,
  [
    '--headless=new',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,1000',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let ws
let nextId = 1
const pending = new Map()
const consoleErrors = []
let passed = 0
const failures = []

function assert(condition, message) {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${message}`)
    return
  }
  failures.push(message)
  console.error(`  ✗ ${message}`)
}

async function waitForBrowser() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (response.ok) return await response.json()
    } catch {}
    await sleep(200)
  }
  throw new Error('Edge DevTools endpoint did not become ready')
}

function send(method, params = {}) {
  const id = nextId++
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function main() {
  await waitForBrowser()
  const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
  const page = targets.find((target) => target.type === 'page')
  if (!page) throw new Error('No page target')
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const job = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) job?.reject(new Error(JSON.stringify(message.error)))
      else job?.resolve(message.result)
      return
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      const text = (message.params.args ?? []).map((arg) => arg.value ?? arg.description ?? '').join(' ')
      consoleErrors.push(text)
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails
      const description = details?.exception?.description ?? details?.text ?? 'uncaught exception'
      const stack = details?.stackTrace?.callFrames?.map((frame) => `${frame.functionName || '<anonymous>'} @ ${frame.url}:${frame.lineNumber + 1}`).join('\n') ?? ''
      consoleErrors.push(`exception: ${description}${stack ? `\n${stack}` : ''}`)
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      consoleErrors.push(`log: ${message.params.entry.text}`)
    }
  })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url: URL })
  await sleep(4500)

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    })
    if (result.exceptionDetails) {
      console.error('Page evaluation error:', result.exceptionDetails.text)
    }
    return result.result?.value
  }

  async function capture(name) {
    try {
      const shot = await send('Page.captureScreenshot', { format: 'png' })
      await fs.writeFile(path.join(outDir, name), Buffer.from(shot.data, 'base64'))
      console.log(`  · 截图 ${name}`)
    } catch (error) {
      console.warn(`  ⚠ 截图失败 ${name}: ${error.message}`)
    }
  }

  async function stageData() {
    return evaluate(`(() => {
      const el = document.querySelector('.scene-viewport')
      if (!el) return null
      return { ...el.dataset }
    })()`)
  }

  async function click(selector) {
    const clicked = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return false
      el.click()
      return true
    })()`)
    await sleep(260)
    return clicked
  }

  async function clickButtonByText(text) {
    const clicked = await evaluate(`(() => {
      const el = [...document.querySelectorAll('button')].find((button) => button.textContent.trim().includes(${JSON.stringify(text)}))
      if (!el) return false
      el.click()
      return true
    })()`)
    await sleep(260)
    return clicked
  }

  async function scrollTo(selector, offset = -90) {
    const y = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return null
      const target = el.getBoundingClientRect().top + scrollY + ${offset}
      window.scrollTo({ top: target, behavior: 'instant' })
      return target
    })()`)
    await sleep(180)
    return y
  }

  async function setDatetimeAndApply(value) {
    await evaluate(`(() => {
      const input = document.querySelector('.field--datetime input')
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, ${JSON.stringify(value)})
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      return input.value
    })()`)
    await sleep(80)
    await evaluate(`document.querySelector('.jump-button')?.click()`)
    await sleep(450)
  }

  async function selectYear(year) {
    await evaluate(`(() => {
      const select = document.querySelector('select[aria-label="选择演示年份"]')
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
      setter.call(select, ${JSON.stringify(String(year))})
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })()`)
    await sleep(350)
  }

  console.log('\n桌面端：首屏与场景')
  const initialStage = await stageData()
  assert(Boolean(initialStage), '场景节点存在')
  assert(await evaluate(`!!document.querySelector('canvas.scene-canvas')`), 'Three.js canvas 已创建')
  assert(initialStage?.texturesLoaded === 'true', '纹理加载流程已完成')
  assertEqualString(initialStage?.simulationMode, 'live', '初始状态为实时时间')
  assertEqualString(initialStage?.currentTerm, activeTermAt(Date.now()).current.term.name, '当前节气与天文结果一致')
  assert(Math.abs(Number(initialStage?.simMs) - Date.now()) < 15_000, '初始时间约等于现实时间')
  assert(await evaluate(`!!document.querySelector('.scene-hud .status-badge.is-live')`), '实时状态徽标显示')
  assertEqualNumber(await evaluate(`document.querySelectorAll('.orbit-label').length`), 24, '3D 轨道上创建了 24 个节气按钮')
  const visibleLabels = await evaluate(`[...document.querySelectorAll('.orbit-label')].filter((el) => getComputedStyle(el).display !== 'none').length`)
  assertEqualNumber(visibleLabels, 24, '默认视角下 24 个节气名称均可见')
  assertEqualNumber(await evaluate(`document.querySelectorAll('.orbit-label.is-major').length`), 4, '四个分至点有重点样式')
  assertEqualNumber(await evaluate(`document.querySelectorAll('.orbit-label.is-active').length`), 1, '轨道上只有一个当前节气高亮')
  assert(await evaluate(`document.body.innerText.includes('尺寸与距离不按实际比例')`), '明确标注尺寸与距离不按比例')
  assert(await evaluate(`document.body.innerText.includes('太阳直射点')`), '显示太阳直射点纬度')
  assert(await evaluate(`document.body.innerText.includes('λ') && document.body.innerText.includes('φ')`), '区分太阳黄经与轨道方位角')
  assert(await evaluate(`document.querySelectorAll('.term-card').length`) === 24, '岁时谱列出全部 24 个节气')
  assert(await evaluate(`document.querySelectorAll('.history-item').length`) >= 10, '历史时间线完整')
  assert(await evaluate(`document.querySelectorAll('.culture-card').length`) === 6, '文化价值六个侧面完整')
  assert(await evaluate(`document.querySelectorAll('.faq-item').length`) === 6, '科普问答六条完整')
  await capture('verify-desktop.png')

  console.log('\n视角与辅助标识')
  await scrollTo('.observatory-grid', -82)
  await clickButtonByText('地球近景')
  await sleep(1100)
  assertEqualString((await stageData())?.view, 'earth', '“地球近景”视角已激活')
  assertEqualNumber(
    await evaluate(`[...document.querySelectorAll('.orbit-label')].filter((el) => getComputedStyle(el).display !== 'none').length`),
    0,
    '地球近景下让出画面，隐藏轨道标签',
  )
  await capture('verify-earth.png')
  await clickButtonByText('恢复默认视角')
  await sleep(1100)
  assertEqualString((await stageData())?.view, 'default', '“恢复默认视角”已恢复')
  assertEqualNumber(
    await evaluate(`[...document.querySelectorAll('.orbit-label')].filter((el) => getComputedStyle(el).display !== 'none').length`),
    24,
    '恢复视角后轨道标签重新出现',
  )
  await clickButtonByText('轨道总览')
  await sleep(1100)
  assertEqualString((await stageData())?.view, 'overview', '“轨道总览”视角已激活')
  await clickButtonByText('恢复默认视角')
  await sleep(1100)

  const axisBefore = await evaluate(`document.querySelector('[aria-label*="显示或隐藏地轴"]')?.getAttribute('aria-pressed')`)
  await evaluate(`document.querySelector('[aria-label*="显示或隐藏地轴"]')?.click()`)
  await sleep(150)
  const axisAfter = await evaluate(`document.querySelector('[aria-label*="显示或隐藏地轴"]')?.getAttribute('aria-pressed')`)
  assert(axisBefore === 'true' && axisAfter === 'false', '辅助标识“地轴”可以切换')
  await evaluate(`document.querySelector('[aria-label*="显示或隐藏地轴"]')?.click()`)
  await sleep(120)
  await evaluate(`document.querySelector('[aria-label*="二十四节气名称"]')?.click()`)
  await sleep(200)
  assertEqualNumber(
    await evaluate(`[...document.querySelectorAll('.orbit-label')].filter((el) => getComputedStyle(el).display !== 'none').length`),
    0,
    '可以隐藏全部节气名称',
  )
  await evaluate(`document.querySelector('[aria-label*="二十四节气名称"]')?.click()`)
  await sleep(250)
  assertEqualNumber(
    await evaluate(`[...document.querySelectorAll('.orbit-label')].filter((el) => getComputedStyle(el).display !== 'none').length`),
    24,
    '节气名称开关可恢复',
  )

  console.log('\n点击轨道上的节气标记')
  await scrollTo('.observatory-grid', -82)
  const labelYear = Number((await stageData())?.selectedYear)
  const winterSolstice = termInstantInYear(labelYear, 21)
  await click('.orbit-label[data-term-index="21"]')
  await sleep(200)
  const afterOrbitLabel = await stageData()
  assertEqualString(afterOrbitLabel?.currentTerm, '冬至', '点击轨道上的「冬至」标记会跳转节气')
  assertEqualNumber(Number(afterOrbitLabel?.simMs), winterSolstice.ms, '轨道标记跳转到该年冬至交节时刻')
  assert((await evaluate(`document.querySelector('.play-button')?.textContent`)).includes('播放'), '点击轨道标记会暂停自动播放')

  console.log('\n播放、暂停与速度')
  await scrollTo('.time-console', -84)
  const beforePlay = await stageData()
  await clickButtonByText('播放')
  await sleep(1150)
  assert((await evaluate(`document.querySelector('.play-button')?.textContent`)).includes('暂停'), '播放后按钮变为暂停')
  assertEqualString((await stageData())?.simulationMode, 'simulated', '播放后标记为模拟时间')
  assert(Number((await stageData())?.simMs) > Number(beforePlay?.simMs) + 5_000, '播放会推进模拟时间')
  await evaluate(`([...document.querySelectorAll('.speed-button')].find((button) => button.textContent.includes('1 天/秒')))?.click()`)
  await sleep(120)
  const fastBefore = await stageData()
  await sleep(1100)
  const fastAfter = await stageData()
  assert(Number(fastAfter?.simMs) - Number(fastBefore?.simMs) > 15 * 3600 * 1000, '“1 天/秒”档明显加快模拟时间')
  await clickButtonByText('暂停')
  assert((await evaluate(`document.querySelector('.play-button')?.textContent`)).includes('播放'), '暂停后按钮变为播放')
  const pausedAt = Number((await stageData())?.simMs)
  await sleep(800)
  assertEqualNumber(Number((await stageData())?.simMs), pausedAt, '暂停后模拟时间不再推进')

  console.log('\n年度时间轴')
  const beforeDrag = await stageData()
  const rangeRect = await evaluate(`(() => {
    const el = document.querySelector('.timeline-range')
    const rect = el.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })()`)
  const startX = rangeRect.x + rangeRect.width * 0.25
  const endX = rangeRect.x + rangeRect.width * 0.68
  const midY = rangeRect.y + rangeRect.height / 2
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: startX, y: midY, button: 'left', clickCount: 1 })
  for (const ratio of [0.36, 0.48, 0.6, 0.68]) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: rangeRect.x + rangeRect.width * ratio,
      y: midY,
      button: 'left',
      buttons: 1,
    })
    await sleep(30)
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: endX, y: midY, button: 'left', clickCount: 1 })
  await sleep(500)
  const afterDrag = await stageData()
  assert(Number(afterDrag?.simMs) !== Number(beforeDrag?.simMs), '真实鼠标拖动年度时间轴会改变模拟时刻')
  assertEqualString(afterDrag?.simulationMode, 'simulated', '拖动时间轴后进入模拟时间')
  assert((await evaluate(`document.querySelector('.play-button')?.textContent`)).includes('播放'), '拖动时间轴后暂停自动播放')

  console.log('\n日期选择与交节边界')
  await setDatetimeAndApply('2025-03-20T17:00:30')
  const beforeBoundary = await stageData()
  assertEqualString(beforeBoundary?.currentTerm, '惊蛰', '2025-03-20 17:00:30 仍在惊蛰区间')
  assertEqualNumber(Number(beforeBoundary?.simMs), fromBeijing(2025, 3, 20, 17, 0, 30), '日期选择精确到秒')
  await setDatetimeAndApply('2025-03-20T17:02:00')
  const afterBoundary = await stageData()
  assertEqualString(afterBoundary?.currentTerm, '春分', '2025-03-20 17:02:00 已进入春分区间')
  assertEqualString(afterBoundary?.selectedYear, '2025', '年份随日期选择切换为 2025')
  assert((await evaluate(`document.querySelector('.term-panel h2')?.textContent ?? ''`)).includes('春分'), '详情区同步为春分')

  console.log('\n年份范围与回到今天')
  assertEqualNumber(await evaluate(`document.querySelectorAll('select[aria-label="选择演示年份"] option').length`), 201, '年份选择恰有 201 个年份')
  assertEqualString(await evaluate(`document.querySelector('select[aria-label="选择演示年份"] option:first-child')?.textContent.trim()`), '1900 年', '年份选择从 1900 年开始')
  assertEqualString(await evaluate(`document.querySelector('select[aria-label="选择演示年份"] option:last-child')?.textContent.trim()`), '2100 年', '年份选择到 2100 年结束')
  await selectYear(1900)
  assertEqualString((await stageData())?.selectedYear, '1900', '可切换到支持范围下限 1900 年')
  await selectYear(2100)
  assertEqualString((await stageData())?.selectedYear, '2100', '可切换到支持范围上限 2100 年')
  await clickButtonByText('回到今天')
  await sleep(300)
  const afterToday = await stageData()
  assertEqualString(afterToday?.simulationMode, 'live', '“回到今天”恢复实时状态')
  assert(Math.abs(Number(afterToday?.simMs) - Date.now()) < 15_000, '“回到今天”时间回到现实')
  assert((await evaluate(`document.querySelector('.play-button')?.textContent`)).includes('播放'), '回到今天后自动播放处于暂停')

  console.log('\n点击节气与联动')
  await scrollTo('#terms', -80)
  const activeYear = Number((await stageData())?.selectedYear)
  const shuangjiang = termInstantInYear(activeYear, 17)
  await click('.term-card[data-term-name="霜降"]')
  await sleep(200)
  const afterCard = await stageData()
  assertEqualString(afterCard?.currentTerm, '霜降', '点击岁时谱卡片后详情与轨道切换为霜降')
  assertEqualNumber(Number(afterCard?.simMs), shuangjiang.ms, '卡片跳转到所选年份的精确交节时刻')
  assert((await evaluate(`document.querySelector('.term-panel h2')?.textContent ?? ''`)).includes('霜降'), '右侧详情同步为霜降')
  assert((await evaluate(`document.querySelector('.selection-toast')?.textContent ?? ''`)).includes('霜降'), '页面给出定位提示')
  assert((await evaluate(`document.querySelector('.play-button')?.textContent`)).includes('播放'), '点击节气后自动播放被暂停')

  console.log('\n节气歌重复字映射')
  await scrollTo('#song', -80)
  const yearForSong = Number((await stageData())?.selectedYear)
  const lichun = termInstantInYear(yearForSong, 0)
  const chunfen = termInstantInYear(yearForSong, 3)
  await click('.song-line:nth-of-type(1) .song-char[data-char-position="0"]')
  await sleep(200)
  assertEqualString((await stageData())?.currentTerm, '立春', '第一句第 1 字「春」映射立春')
  assertEqualNumber(Number((await stageData())?.simMs), lichun.ms, '点击歌字跳到立春精确交节时刻')
  await click('.song-line:nth-of-type(1) .song-char[data-char-position="3"]')
  await sleep(200)
  assertEqualString((await stageData())?.currentTerm, '春分', '第一句第 4 字「春」映射春分')
  assertEqualNumber(Number((await stageData())?.simMs), chunfen.ms, '第 4 字跳转春分而非重复映射立春')
  assertEqualNumber(await evaluate(`document.querySelectorAll('.song-char[data-term-index]').length`), 24, '节气歌中 24 个可点击字位')
  assertEqualNumber(
    await evaluate(`new Set([...document.querySelectorAll('.song-char[data-term-index]')].map((el) => el.dataset.termIndex)).size`),
    24,
    '节气歌 24 个字位唯一映射 24 节气',
  )
  assertEqualNumber(await evaluate(`document.querySelectorAll('.song-char.is-filler').length`), 4, '节气歌恰好有 4 个衬字')
  const snowIndices = await evaluate(`[...document.querySelectorAll('.song-line:nth-of-type(4) .song-char[data-term-index]')].map((el) => el.dataset.termIndex)`)
  assert(snowIndices[1] === '19' && snowIndices[2] === '20', '两个「雪」按位置分别映射小雪与大雪')

  console.log('\n无障碍与资源')
  const missingButtonNames = await evaluate(`[...document.querySelectorAll('button')].filter((button) => {
    const label = (button.getAttribute('aria-label') || button.innerText || '').trim()
    return !label
  }).length`)
  assertEqualNumber(missingButtonNames, 0, '所有按钮有可见名称或 aria-label')
  const unnamedFields = await evaluate(`[...document.querySelectorAll('input, select')].filter((field) => {
    const aria = field.getAttribute('aria-label')?.trim()
    const wrapped = field.closest('label')
    const explicit = field.id ? document.querySelector('label[for="' + field.id + '"]') : null
    return !aria && !wrapped && !explicit
  }).map((field) => field.outerHTML.slice(0, 160))`)
  assertEqualNumber(unnamedFields.length, 0, '日期、年份等输入有可访问名称')
  if (unnamedFields.length) console.log(unnamedFields)
  assert(await evaluate(`!!document.querySelector('.skip-link')`), '提供跳至主要内容链接')
  const creditsStatus = await evaluate(`fetch('/textures/CREDITS.md').then((response) => response.status)`)
  assertEqualNumber(creditsStatus, 200, '纹理署名文件可访问')

  console.log('\n英语界面')
  const simBeforeLanguage = Number((await stageData())?.simMs)
  await click('.lang-switch button[aria-label="English"]')
  await sleep(500)
  const englishState = await evaluate(`(() => {
    const visible = [...document.querySelectorAll('.orbit-label')]
      .filter((element) => getComputedStyle(element).display !== 'none')
    return {
      lang: document.documentElement.lang,
      title: document.title,
      url: location.search,
      stored: localStorage.getItem('guanxiang.locale'),
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      nav: document.querySelector('.desktop-nav')?.textContent?.trim() ?? '',
      detail: document.querySelector('.term-panel h2')?.textContent?.trim() ?? '',
      detailText: document.querySelector('.term-panel')?.innerText ?? '',
      readout: document.querySelector('.readout-date')?.textContent?.trim() ?? '',
      speed: document.querySelector('.speed-control')?.textContent?.trim() ?? '',
      visibleLabels: visible.map((element) => element.textContent?.trim() ?? ''),
      orbitAria: [...document.querySelectorAll('.orbit-label')]
        .filter((element) => (element.getAttribute('aria-label') ?? '').includes('solar longitude')).length,
      firstCard: document.querySelector('.term-card .term-card__name')?.textContent?.trim() ?? '',
      sourceGroup: document.querySelector('.source-group h3')?.textContent?.trim() ?? '',
      simMs: document.querySelector('.scene-viewport')?.dataset.simMs,
    }
  })()`)
  assertEqualString(englishState.lang, 'en', '语言开关将 html lang 切换为英语')
  assert(englishState.title.includes('Guanxiang · The 24 Solar Terms'), '英语页面标题已本地化')
  assert(englishState.url.includes('lang=en'), '英语状态写入可分享的 URL 参数')
  assertEqualString(englishState.stored, 'en', '英语偏好写入 localStorage')
  assert(englishState.h1.includes('The sun travels 15'), '英语首屏主标题已翻译')
  assert(englishState.nav.includes('Observatory') && englishState.nav.includes('Year Wheel'), '英语导航已翻译')
  assert(englishState.detail.includes('Spring Equinox'), '英语节气详情显示英文节气名')
  assert(englishState.detailText.includes('Name & meaning'), '英语节气详情正文已翻译')
  assert(englishState.readout.includes('March'), '英语时间读数使用英文月份')
  assert(englishState.speed.includes('1 day/s'), '英语时间速度控件已翻译')
  assert(englishState.visibleLabels.includes('Spring Equinox'), '轨道显示英文的分至标签')
  assert(englishState.visibleLabels.length >= 4, '英语轨道保留当前节气与四个分至的可读标签')
  assertEqualNumber(englishState.orbitAria, 24, '全部 24 个轨道标记的无障碍名称切换为英语')
  assertEqualString(englishState.firstCard, 'Beginning of Spring', '岁时谱首张卡片显示英文节气名')
  assertEqualString(englishState.sourceGroup, 'Calendar & astronomy', '英语来源分类已翻译')
  assertEqualNumber(Number(englishState.simMs), simBeforeLanguage, '切换语言不会重置模拟时间')
  await evaluate('scrollTo(0, 0)')
  await sleep(300)
  await capture('verify-en.png')
  await click('.lang-switch button[aria-label="中文"]')
  await sleep(400)
  assertEqualString(await evaluate(`document.documentElement.lang`), 'zh-CN', '语言开关可切回中文')
  assertEqualString(await evaluate(`localStorage.getItem('guanxiang.locale')`), 'zh', '切回中文后同步保存偏好')
  assert(!((await evaluate(`location.search`)) ?? '').includes('lang=en'), '切回中文后移除英语 URL 参数')
  assert((await evaluate(`document.querySelector('.term-panel h2')?.textContent ?? ''`)).includes('春分'), '切回中文后详情恢复中文')

  console.log('\n移动端布局')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await send('Page.reload', { ignoreCache: true })
  await sleep(4200)
  const mobile = await evaluate(`(() => {
    const data = document.querySelector('.scene-viewport')?.dataset ?? {}
    const stage = document.querySelector('.scene-card')?.getBoundingClientRect()
    const panel = document.querySelector('.term-panel')?.getBoundingClientRect()
    const nav = document.querySelector('.desktop-nav')
    const menu = document.querySelector('.menu-toggle')
    return {
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      desktopNav: nav ? getComputedStyle(nav).display : 'missing',
      menuToggle: menu ? getComputedStyle(menu).display : 'missing',
      stageBottom: stage?.bottom,
      panelTop: panel?.top,
      labels: [...document.querySelectorAll('.orbit-label')].filter((el) => getComputedStyle(el).display !== 'none').length,
      textures: data.texturesLoaded,
      timeOverflow: document.querySelector('.time-console')?.scrollWidth > document.querySelector('.time-console')?.clientWidth,
    }
  })()`)
  assertEqualNumber(mobile.width, 390, '移动端 CSS 视口为 390px')
  assertEqualNumber(mobile.scrollWidth, 390, '移动端没有横向溢出')
  assertEqualString(mobile.desktopNav, 'none', '移动端隐藏桌面导航')
  assert(mobile.menuToggle !== 'none', '移动端显示菜单按钮')
  assert(Number(mobile.panelTop) >= Number(mobile.stageBottom) - 1, '移动端详情区排在 3D 场景下方')
  assertEqualString(mobile.textures, 'true', '移动端纹理加载完成')
  assertEqualNumber(mobile.labels, 24, '移动端仍显示 24 个节气标记')
  assert(!mobile.timeOverflow, '移动端时间控制没有横向溢出')
  assert(await evaluate(`document.querySelectorAll('.mobile-nav a').length === 0`), '移动导航默认关闭')
  await click('.menu-toggle')
  await sleep(120)
  assertEqualString(await evaluate(`document.querySelector('.menu-toggle')?.getAttribute('aria-expanded')`), 'true', '菜单按钮展开状态可访问')
  assertEqualNumber(await evaluate(`document.querySelectorAll('.mobile-nav a').length`), 7, '移动导航包含七个章节入口')
  await click('.menu-toggle')
  await sleep(120)
  await scrollTo('.scene-card', -66)
  await sleep(400)
  await capture('verify-mobile.png')
  await scrollTo('.time-console', -66)
  await capture('verify-mobile-time.png')

  console.log('\n英语移动端')
  await click('.lang-switch button[aria-label="English"]')
  await sleep(500)
  const mobileEnglish = await evaluate(`(() => {
    const viewport = document.querySelector('.scene-viewport')
    const activeIndex = Number(viewport?.dataset.activeTermIndex)
    const visibleLabels = [...document.querySelectorAll('.orbit-label')]
      .filter((element) => getComputedStyle(element).display !== 'none')
      .map((element) => element.textContent?.trim() ?? '')
    return {
      lang: document.documentElement.lang,
      activeIndex,
      detail: document.querySelector('.term-panel h2')?.textContent?.trim() ?? '',
      detailText: document.querySelector('.term-panel')?.innerText ?? '',
      visibleLabels,
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      menu: getComputedStyle(document.querySelector('.menu-toggle')).display,
      language: getComputedStyle(document.querySelector('.lang-switch')).display,
      timeText: document.querySelector('.time-console')?.innerText ?? '',
      timeOverflow: document.querySelector('.time-console')?.scrollWidth > document.querySelector('.time-console')?.clientWidth,
      cards: document.querySelectorAll('.term-card').length,
    }
  })()`)
  assertEqualString(mobileEnglish.lang, 'en', '移动端语言开关可切换到英语')
  assertEqualNumber(mobileEnglish.width, 390, '英语移动端 CSS 视口为 390px')
  assertEqualNumber(mobileEnglish.scrollWidth, 390, '英语移动端没有横向溢出')
  const expectedMobileTerm = TERM_NAMES_EN[mobileEnglish.activeIndex] ?? ''
  assertEqualString(mobileEnglish.menu, 'block', '英语移动端保留菜单按钮')
  assertEqualString(mobileEnglish.language, 'flex', '英语移动端显示语言开关')
  assert(mobileEnglish.detail.includes(expectedMobileTerm), '英语移动端详情显示对应的英文节气')
  assert(mobileEnglish.detailText.includes('Name & meaning'), '英语移动端详情正文保持英文')
  assert(mobileEnglish.visibleLabels.includes(expectedMobileTerm), '英语移动端轨道显示当前节气名')
  assert(mobileEnglish.visibleLabels.length >= 4, '英语移动端保留当前节气与分至标签')
  assert(mobileEnglish.timeText.includes('Time controls') && mobileEnglish.timeText.includes('Play'), '英语移动端时间控件已翻译')
  assert(!mobileEnglish.timeOverflow, '英语移动端时间控制没有横向溢出')
  assertEqualNumber(mobileEnglish.cards, 24, '英语移动端岁时谱仍列出 24 个节气')
  await scrollTo('.scene-card', -66)
  await sleep(350)
  await capture('verify-mobile-en.png')
  await click('.lang-switch button[aria-label="中文"]')
  await sleep(400)
  assertEqualString(await evaluate(`document.documentElement.lang`), 'zh-CN', '英语移动端可切回中文')
  assertEqualString(await evaluate(`localStorage.getItem('guanxiang.locale')`), 'zh', '移动端切回中文后保存偏好')

  console.log('\n平板布局')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 768,
    height: 1024,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Page.reload', { ignoreCache: true })
  await sleep(4200)
  const tablet = await evaluate(`(() => {
    const stage = document.querySelector('.scene-card')?.getBoundingClientRect()
    const panel = document.querySelector('.term-panel')?.getBoundingClientRect()
    return {
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      desktopNav: getComputedStyle(document.querySelector('.desktop-nav')).display,
      menu: getComputedStyle(document.querySelector('.menu-toggle')).display,
      language: getComputedStyle(document.querySelector('.lang-switch')).display,
      stageBottom: stage?.bottom,
      panelTop: panel?.top,
    }
  })()`)
  assertEqualNumber(tablet.width, 768, '平板 CSS 视口为 768px')
  assertEqualNumber(tablet.scrollWidth, 768, '平板没有横向溢出')
  assertEqualString(tablet.desktopNav, 'none', '平板隐藏桌面导航')
  assertEqualString(tablet.menu, 'block', '平板显示菜单按钮')
  assertEqualString(tablet.language, 'flex', '平板显示语言开关')
  assert(Number(tablet.panelTop) >= Number(tablet.stageBottom) - 1, '平板详情区排在 3D 场景下方')
  await click('.lang-switch button[aria-label="English"]')
  await sleep(500)
  assertEqualString(await evaluate(`document.documentElement.lang`), 'en', '平板可切换到英语')
  const tabletEnglish = await evaluate(`(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    scrollWidth: document.documentElement.scrollWidth,
    card: document.querySelector('.term-card .term-card__name')?.textContent?.trim() ?? '',
    detail: document.querySelector('.term-panel h2')?.textContent?.trim() ?? '',
  }))()`)
  assert(tabletEnglish.h1.includes('The sun travels 15'), '平板英语首屏标题正确')
  assertEqualNumber(tabletEnglish.scrollWidth, 768, '平板英语界面没有横向溢出')
  assertEqualString(tabletEnglish.card, 'Beginning of Spring', '平板英语岁时谱名称正确')
  assert(tabletEnglish.detail.length > 0, '平板英语详情内容可用')
  await scrollTo('.scene-card', -66)
  await sleep(350)
  await capture('verify-tablet-en.png')
  await click('.lang-switch button[aria-label="中文"]')
  await sleep(400)
  assertEqualString(await evaluate(`document.documentElement.lang`), 'zh-CN', '平板可切回中文')

  console.log('\n控制台错误检查')
  const realErrors = consoleErrors.filter(
    (entry) => !entry.includes('favicon') && !entry.includes('Download the React DevTools'),
  )
  assertEqualNumber(realErrors.length, 0, '浏览器控制台没有未处理错误')
  if (realErrors.length) console.log(realErrors)

  console.log('\n资源失败替代效果')
  await send('Network.enable')
  await send('Network.clearBrowserCache')
  await send('Network.setBlockedURLs', { urls: ['*textures/*'] })
  await send('Page.reload', { ignoreCache: true })
  await sleep(3800)
  const fallbackState = await evaluate(`(() => ({
    textures: document.querySelector('.scene-viewport')?.dataset.texturesLoaded,
    canvas: !!document.querySelector('canvas.scene-canvas'),
    warning: document.querySelector('.scene-loading.is-warning')?.textContent?.trim() ?? '',
    labels: document.querySelectorAll('.orbit-label').length,
    detail: document.querySelector('.term-panel h2')?.textContent?.trim() ?? ''
  }))()`)
  assertEqualString(fallbackState.textures, 'true', '纹理全部失败时加载流程仍能结束')
  assert(fallbackState.canvas, '纹理全部失败时 3D 画布仍存在（使用程序化替代材质）')
  assert(fallbackState.warning.includes('替代材质'), '纹理失败时显示替代材质提示')
  assertEqualNumber(fallbackState.labels, 24, '纹理失败时节气标记仍完整')
  assert(fallbackState.detail.length > 0, '纹理失败时详情内容仍可用')
  await capture('verify-fallback.png')

  console.log(`\n浏览器验收：通过 ${passed} 项断言，失败 ${failures.length} 项。\n`)
  if (failures.length > 0) {
    process.exitCode = 1
  }
  await send('Browser.close').catch(() => {})
  ws.close()
}

function assertEqualString(actual, expected, message) {
  assert(actual === expected, `${message}（实际：${String(actual)}，期望：${String(expected)}）`)
}

function assertEqualNumber(actual, expected, message) {
  assert(actual === expected, `${message}（实际：${String(actual)}，期望：${String(expected)}）`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await sleep(400)
    try {
      browser.kill()
    } catch {}
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {})
  })
