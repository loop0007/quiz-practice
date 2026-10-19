#!/usr/bin/env node
/**
 * T3/T4 浏览器验收：核心流程、刷新恢复、数据一致性、移动端与深色布局。
 *
 * 依赖：playwright-core（不下载浏览器，使用本机 Edge/Chrome 可执行文件）。
 * 运行：npm run build && node scripts/e2e-browser.mjs
 * 可选环境变量：
 *   EDGE_PATH       指定浏览器可执行文件
 *   E2E_BASE_URL    复用已运行的预览地址（默认自动启动 vite preview）
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'
const SHOTS = path.join(ROOT, 'docs', 'screenshots', 'phase3')
const WALLPAPER_FIXTURE = path.join(os.tmpdir(), 'quiz-practice-e5-wallpaper.png')
const WALLPAPER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const failures = []
let checks = 0

function check(label, condition, detail = '') {
  checks += 1
  if (condition) {
    console.log(`  ✓ ${label}`)
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function equal(label, actual, expected) {
  check(label, Object.is(actual, expected), `期望 ${expected}，实际 ${actual}`)
}

function normalize(text) {
  return (text ?? '').replace(/\s+/g, '').trim()
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function findBrowser() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/microsoft-edge',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)

  return candidates.find((candidate) => fs.existsSync(candidate))
}

async function startPreview() {
  if (process.env.E2E_BASE_URL) return null

  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(
    process.execPath,
    [viteBin, 'preview', '--port', '4173', '--strictPort', '--host', '127.0.0.1'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk
  })
  child.stderr.on('data', (chunk) => {
    output += chunk
  })

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/`)
      if (response.ok) return child
    } catch {
      // 等待服务器就绪
    }
    await sleep(200)
  }

  child.kill()
  throw new Error(`预览服务器启动失败：\n${output}`)
}

async function openPage(browser, options = {}) {
  const context = await browser.newContext({ locale: 'zh-CN', ...options })
  const page = await context.newPage()
  const errors = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console.error: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`HTTP ${response.status()}: ${response.url()}`)
    }
  })

  return { context, page, errors }
}

async function noOverflow(page, label) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  check(
    `${label} 无横向溢出`,
    scrollWidth <= innerWidth + 1,
    `scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`,
  )
}

async function errorSummary(page, errors, label) {
  const consoleErrors = [...new Set(errors)]
  check(
    `${label} 控制台无报错`,
    consoleErrors.length === 0,
    consoleErrors.join(' | '),
  )
  check(
    `${label} 页面地址保持 Hash 路由`,
    page.url().includes('/#/'),
    page.url(),
  )
}

async function goHome(page) {
  await page.goto(`${BASE}/#/`, { waitUntil: 'load' })
  await page
    .getByRole('heading', { name: '把刷题，变成每天的小进步' })
    .waitFor({ timeout: 15000 })
}

async function goBanks(page) {
  await page.goto(`${BASE}/#/banks`, { waitUntil: 'load' })
  await page.getByRole('heading', { name: '题库', exact: true }).waitFor({
    timeout: 15000,
  })
}

async function openBank(page, bankName) {
  await goBanks(page)
  await page.getByRole('link', { name: `进入${bankName}` }).click()
  await page
    .getByRole('heading', { name: bankName, exact: true })
    .waitFor({ timeout: 15000 })
}

async function startBank(page, bankName) {
  if (!page.url().includes('/#/banks/')) {
    await openBank(page, bankName)
  }
  await page.getByRole('button', { name: '开始练习' }).click()
  await page.waitForURL(/#\/practice\//, { timeout: 15000 })
  await page.getByText(/第 1 \/ 118 题/).first().waitFor({ timeout: 15000 })
}

async function openHeaderMenu(page) {
  await page.getByRole('button', { name: '打开菜单' }).click()
  await page
    .getByRole('navigation', { name: '菜单' })
    .waitFor({ timeout: 5000 })
}

async function selectOption(page, key) {
  // sr-only 输入框只有 1x1，直接 check 偶发点不到；改为点击可见 label 并确认勾选。
  const article = page.locator('article').first()
  const input = article.locator(`input[value="${key}"]`)
  const label = article.locator(`label:has(input[value="${key}"])`)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await label.click({ force: true })
    if (await input.isChecked()) return
    await sleep(100)
    if (await input.isChecked()) return
  }
  await input.check({ force: true })
}

async function submitDesktop(page) {
  await page.getByRole('button', { name: '提交答案' }).first().click()
}

async function submitMobile(page) {
  await page
    .locator('nav[aria-label="答题操作"]')
    .getByRole('button', { name: '提交答案' })
    .click()
}

async function stemText(page) {
  const text = await page
    .locator('article')
    .first()
    .locator(':scope > h2 + div')
    .textContent()
  return normalize(text)
}

async function indexedDbCount(page, store) {
  return page.evaluate(
    (storeName) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('quiz-practice')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(storeName, 'readonly')
          const countRequest = transaction.objectStore(storeName).count()
          countRequest.onsuccess = () => resolve(countRequest.result)
          countRequest.onerror = () => reject(countRequest.error)
        }
      }),
    store,
  )
}

async function submitFeedback(page, { typeLabel, note }) {
  const dialog = page.locator('dialog[open]')
  await dialog.waitFor({ timeout: 5000 })
  if (typeLabel) {
    await dialog.locator('label').filter({ hasText: typeLabel }).click()
  }
  await dialog.locator('textarea').fill(note)
  await dialog.getByRole('button', { name: '提交反馈' }).click()
  await dialog.getByText('反馈已保存').waitFor({ timeout: 5000 })
  await dialog.getByRole('button', { name: '关闭' }).last().click()
  await dialog.waitFor({ state: 'hidden', timeout: 5000 })
}

async function readResultStats(page) {
  return page
    .locator('dl[aria-label="本次成绩统计"] > div')
    .evaluateAll((nodes) =>
      Object.fromEntries(
        nodes.map((node) => [
          node.querySelector('dt')?.textContent?.trim() ?? '',
          node.querySelector('dd')?.textContent?.trim() ?? '',
        ]),
      ),
    )
}

async function runDesktopFlow(browser, data) {
  console.log('\n[T3] 桌面端核心流程')
  const web = data.questions
    ? Object.values(data.questions).filter((question) => question.bankId === 'web')
    : []
  web.sort((a, b) => a.number - b.number)
  const q1 = web[0]
  const q2 = web[1]
  const wrongKey = q1.options.find((option) => !q1.answer.includes(option.key)).key
  const correctKey = q2.answer[0]

  const { context, page, errors } = await openPage(browser, {
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
  })
  const dialogs = []
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message())
    await dialog.accept()
  })

  await goHome(page)
  // 等首屏淡入上移动画结束再截图，避免截到半透明的中间帧。
  await sleep(950)
  await page.screenshot({ path: path.join(SHOTS, 't3-01-home-desktop.png') })

  const introMotion = await page.evaluate(() => {
    const heading = document.querySelector('main h1')
    const cta = [...document.querySelectorAll('main a')]
      .find((link) => link.textContent?.includes('去题库开始'))
      ?.parentElement
    return {
      heading: heading ? getComputedStyle(heading).animationName : '',
      headingDelay: heading ? getComputedStyle(heading).animationDelay : '',
      cta: cta ? getComputedStyle(cta).animationName : '',
      ctaDelay: cta ? getComputedStyle(cta).animationDelay : '',
    }
  })
  check('首屏标题使用淡入上移动画', introMotion.heading === 'fade-in-up')
  check(
    '行动按钮以更晚的延迟淡入上移',
    introMotion.cta === 'fade-in-up' &&
      parseFloat(introMotion.ctaDelay) > parseFloat(introMotion.headingDelay),
    `${introMotion.headingDelay} → ${introMotion.ctaDelay}`,
  )

  const openingMotion = await page.evaluate(() => {
    const shell = document.querySelector('#root > div')
    return shell ? getComputedStyle(shell).animationName : ''
  })
  check('首次进入使用模糊开场动画', openingMotion === 'blur-in', openingMotion)

  const homeText = normalize(await page.locator('main').innerText())
  check('首页显示总有效题 336', homeText.includes('有效题336'))
  check('首页说明数据仅保存在本机', homeText.includes('数据只保存在本机浏览器'))
  check(
    '首页提供去题库入口',
    await page.getByRole('link', { name: /去题库开始/ }).isVisible(),
  )
  await noOverflow(page, '首页（1280）')

  console.log('  · 题库列表与题库内侧')
  await goBanks(page)
  equal('题库页题库数量', await page.locator('article').count(), 2)
  equal(
    '题库卡片不再提供开始练习按钮',
    await page.getByRole('button', { name: '开始练习' }).count(),
    0,
  )
  check(
    '页面切换使用淡入上移动画',
    (
      (await page.locator('main > div').getAttribute('class')) ?? ''
    ).includes('animate-page-in'),
  )

  const bankCard = page.locator('article').first()
  const restingShadow = await bankCard.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  )
  await bankCard.hover()
  await sleep(320)
  const liftedCard = await bankCard.evaluate((element) => ({
    transform: getComputedStyle(element).transform,
    shadow: getComputedStyle(element).boxShadow,
  }))
  check('悬停题库卡片向上浮动', liftedCard.transform !== 'none')
  check('悬停时阴影增强', liftedCard.shadow !== restingShadow)
  await page.screenshot({ path: path.join(SHOTS, 't3-12-hover-lift.png') })
  await page.mouse.move(2, 2)
  await sleep(320)
  check(
    '移开后卡片平滑回落',
    (await bankCard.evaluate((element) => getComputedStyle(element).transform)) ===
      'none',
  )

  await page.getByRole('link', { name: '进入Web前端题库' }).click()
  await page
    .getByRole('heading', { name: 'Web前端题库', exact: true })
    .waitFor({ timeout: 15000 })
  check('点击题库卡片进入题库内侧', page.url().includes('/#/banks/web'))
  const startButton = page.getByRole('button', { name: '开始练习' })
  await startButton.waitFor({ timeout: 5000 })
  check('开始练习按钮位于题库内侧', await startButton.isVisible())
  await goHome(page)

  console.log('  · 通用反馈')
  await openHeaderMenu(page)
  await page.getByRole('button', { name: '反馈', exact: true }).click()
  await submitFeedback(page, { typeLabel: '建议', note: 'T3 通用反馈' })
  equal('通用反馈已写入 feedback 表', await indexedDbCount(page, 'feedback'), 1)

  console.log('  · 使用说明')
  await openHeaderMenu(page)
  await page.getByRole('button', { name: '使用说明', exact: true }).click()
  const helpDialog = page.locator('dialog[open]')
  await helpDialog.waitFor({ timeout: 5000 })
  check(
    '使用说明弹窗包含练习步骤',
    (await helpDialog.innerText()).includes('提交答案'),
  )
  await helpDialog.getByRole('button', { name: '知道了' }).click()
  await helpDialog.waitFor({ state: 'hidden', timeout: 5000 })

  console.log('  · 下载为应用')
  await openHeaderMenu(page)
  await page.getByRole('button', { name: '下载为应用', exact: true }).click()
  const installDialog = page.locator('dialog[open]')
  await installDialog.waitFor({ timeout: 5000 })
  check(
    '“三”菜单提供下载为应用入口',
    await installDialog
      .getByRole('heading', { name: '下载为应用', exact: true })
      .isVisible(),
  )
  check(
    '安装弹窗提供手动添加说明',
    (await installDialog.innerText()).includes('添加到主屏幕'),
  )
  await page.screenshot({ path: path.join(SHOTS, 't3-13-install-dialog.png') })
  await installDialog.getByRole('button', { name: '关闭' }).last().click()
  await installDialog.waitFor({ state: 'hidden', timeout: 5000 })

  console.log('  · 开始 Web 题库练习')
  await startBank(page, 'Web前端题库')
  check(
    '答题页切换仅淡入以保护固定底栏',
    (
      (await page.locator('main > div').getAttribute('class')) ?? ''
    ).includes('animate-page-fade'),
  )
  const practiceStem = await stemText(page)
  equal('首题题干与题库数据一致', practiceStem, normalize(q1.stem))

  console.log('  · 题目反馈')
  await page
    .locator('article')
    .first()
    .getByRole('button', { name: '反馈', exact: true })
    .click()
  await submitFeedback(page, { typeLabel: '其他', note: 'T3 题目反馈' })
  equal('题目反馈已写入 feedback 表', await indexedDbCount(page, 'feedback'), 2)

  console.log('  · E4 收藏')
  await page.getByRole('button', { name: '收藏', exact: true }).click()
  await page.getByRole('button', { name: '已收藏' }).waitFor({ timeout: 5000 })
  equal('收藏写入 favorites 表', await indexedDbCount(page, 'favorites'), 1)
  await page.reload({ waitUntil: 'load' })
  await page.getByText(/第 1 \/ 118 题/).first().waitFor({ timeout: 15000 })
  check(
    '刷新后收藏状态保持',
    await page.getByRole('button', { name: '已收藏' }).isVisible(),
  )

  console.log('  · 故意答错并锁定')
  await selectOption(page, wrongKey)
  await submitDesktop(page)
  const article = page.locator('article').first()
  await article.getByText('回答错误').waitFor({ timeout: 5000 })
  const feedback = await article.locator('[role="status"]').innerText()
  check(
    '答错后显示正确答案',
    feedback.includes(`正确答案：${q1.answer.join('、')}`),
    feedback,
  )
  check(
    '答错后显示你的答案',
    feedback.includes(`你的答案：${wrongKey}`),
    feedback,
  )
  check(
    '提交后选项锁定',
    await article.locator(`input[value="${q1.answer[0]}"]`).isDisabled(),
  )
  check(
    '提交后按钮显示已提交',
    (await page.getByRole('button', { name: '已提交' }).first().isDisabled()),
  )

  const statsAfterWrong = await page.locator('main').innerText()
  check('答错后已答 1', statsAfterWrong.includes('已答 1'))
  check('答错后答对 0', statsAfterWrong.includes('答对 0'))
  const practiceText = await article.innerText()
  for (const option of q1.options) {
    check(
      `练习页显示选项内容 ${option.key}`,
      practiceText.includes(option.text.trim()),
    )
  }
  const practiceExplanation = normalize(
    await article.locator('[role="status"] > div').last().textContent(),
  )
  await page.screenshot({
    path: path.join(SHOTS, 't3-02-practice-wrong-desktop.png'),
  })

  console.log('  · 翻题并答对')
  await page.getByRole('button', { name: '下一题' }).first().click()
  await page.getByText(/第 2 \/ 118 题/).first().waitFor()
  equal('第二题题干与题库数据一致', await stemText(page), normalize(q2.stem))
  await selectOption(page, correctKey)
  await submitDesktop(page)
  await article.getByText('回答正确').waitFor({ timeout: 5000 })

  console.log('  · 刷新恢复与锁定保持')
  await page.reload({ waitUntil: 'load' })
  await page.getByText(/第 2 \/ 118 题/).first().waitFor({ timeout: 15000 })
  const reloadedArticle = page.locator('article').first()
  await reloadedArticle.getByText('回答正确').waitFor({ timeout: 5000 })
  check(
    '刷新后已提交题仍锁定',
    await reloadedArticle.locator(`input[value="${correctKey}"]`).isDisabled(),
  )
  const afterReload = await page.locator('main').innerText()
  check('刷新后进度恢复为已答 2', afterReload.includes('已答 2'))
  check('刷新后答对数恢复为 1', afterReload.includes('答对 1'))

  await page.getByRole('button', { name: '上一题' }).first().click()
  await page.getByText(/第 1 \/ 118 题/).first().waitFor()
  const firstAgain = page.locator('article').first()
  await firstAgain.getByText('回答错误').waitFor({ timeout: 5000 })
  check(
    '刷新后返回上一题仍保持错误记录',
    await firstAgain.locator(`input[value="${wrongKey}"]`).isDisabled(),
  )
  await page.getByRole('button', { name: '下一题' }).first().click()
  await page.getByText(/第 2 \/ 118 题/).first().waitFor()

  console.log('  · 交卷')
  await page.getByRole('button', { name: '交卷' }).first().click()
  await page.waitForURL(/#\/result\//, { timeout: 15000 })
  await page.getByText('本次成绩').waitFor({ timeout: 15000 })
  equal('交卷前出现两次确认', dialogs.length, 2)
  check(
    '交卷确认提示未提交数量',
    dialogs[0]?.includes('116') ?? false,
    dialogs[0],
  )

  const stats = await readResultStats(page)
  equal('结果页总题数', stats['总题数'], '118')
  equal('结果页已答', stats['已答'], '2')
  equal('结果页答对', stats['答对'], '1')
  equal('结果页本次答错', stats['本次答错'], '1')
  equal('结果页本次未答', stats['本次未答'], '116')
  equal('结果页正确率（未答计入分母）', stats['正确率'], '1%')
  equal('结果页题库异常数', stats['题库异常题'], '2')

  const resultText = await page.locator('main').innerText()
  check(
    '本次错题与累计分开命名',
    resultText.includes('本次错题') && resultText.includes('错题本累计'),
  )
  check('错题本累计显示 1 题', resultText.includes('全部题库共 1 题'))
  check(
    '结果页默认只显示本次错题题数',
    resultText.includes('本次错题') && !resultText.includes('第 1 题'),
  )
  await page.screenshot({ path: path.join(SHOTS, 't3-03-result-desktop.png') })

  await page.getByRole('button', { name: '查看题号' }).first().click()
  const numbersDialog = page.locator('dialog[open]')
  await numbersDialog.waitFor({ timeout: 5000 })
  check(
    '本次错题题号弹窗显示第 1 题',
    normalize(await numbersDialog.innerText()).includes('第1题'),
  )
  await numbersDialog.getByRole('button', { name: '关闭' }).click()
  await numbersDialog.waitFor({ state: 'hidden', timeout: 5000 })

  console.log('  · 错题本对照')
  await page.getByRole('link', { name: '查看错题本' }).click()
  await page.getByRole('heading', { name: '错题本', exact: true }).waitFor()
  const wrongGroupToggle = page.locator('main button[aria-expanded]').first()
  await wrongGroupToggle.waitFor({ timeout: 5000 })
  check(
    '错题本分组默认收起',
    (await wrongGroupToggle.getAttribute('aria-expanded')) === 'false',
  )
  equal('收起时错题卡片不渲染', await page.locator('article').count(), 0)
  await wrongGroupToggle.click()
  check(
    '点击分组后展开错题卡片',
    (await wrongGroupToggle.getAttribute('aria-expanded')) === 'true',
  )
  const wrongArticle = page.locator('article').first()
  await wrongArticle.waitFor({ timeout: 5000 })
  equal('错题本条目数', await page.locator('article').count(), 1)

  await page.getByRole('button', { name: '批量管理' }).click()
  await wrongArticle.getByRole('checkbox').first().check()
  check(
    '错题本批量勾选后显示已选 1 题',
    await page.getByText('已选 1 题').isVisible(),
  )
  await page.getByRole('button', { name: '完成' }).click()

  const wrongStem = normalize(
    await wrongArticle.locator(':scope > header + div').textContent(),
  )
  equal('同一题在练习与错题本中题干一致', wrongStem, practiceStem)
  const wrongText = await wrongArticle.innerText()
  const wrongOption = q1.options.find((option) => option.key === wrongKey)
  check('错题本显示你的答案', wrongText.includes(wrongKey))
  check('错题本显示你的选项内容', wrongText.includes(wrongOption.text.trim()))
  for (const key of q1.answer) {
    const option = q1.options.find((item) => item.key === key)
    check(`错题本显示正确答案 ${key}`, wrongText.includes(key))
    check(`错题本显示正确选项内容 ${key}`, wrongText.includes(option.text.trim()))
  }
  check('错题本显示首次答错时间', wrongText.includes('首次答错：'))
  const wrongExplanation = normalize(
    await wrongArticle.locator(':scope > div').last().textContent(),
  )
  equal('同一题在练习与错题本中解析一致', wrongExplanation, practiceExplanation)
  await sleep(300)
  await page.screenshot({ path: path.join(SHOTS, 't3-04-wrongbook-desktop.png') })

  console.log('  · 深链接与 404')
  await page.goto(`${BASE}/#/wrongbook`, { waitUntil: 'load' })
  await page.getByRole('heading', { name: '错题本', exact: true }).waitFor({
    timeout: 15000,
  })
  check('刷新后深链接 #/wrongbook 正常渲染', true)
  await page.goto(`${BASE}/#/not-a-page`, { waitUntil: 'load' })
  await page.getByRole('heading', { name: '页面不存在' }).waitFor({
    timeout: 15000,
  })
  check('未知路由显示 404 页面', true)
  await goHome(page)

  console.log('  · E2 历史成绩')
  await page.getByRole('link', { name: '历史成绩', exact: true }).click()
  await page.getByRole('heading', { name: '历史成绩' }).waitFor({ timeout: 15000 })
  const historyText = normalize(await page.locator('main').innerText())
  check(
    '历史成绩显示 1 次已完成练习',
    historyText.includes('已完成练习1次'),
    historyText.slice(0, 120),
  )
  check(
    '历史成绩显示累计答对 1 / 118 题',
    historyText.includes('累计答对1/118'),
    historyText.slice(0, 120),
  )
  check(
    '历史成绩显示平均正确率 1%',
    historyText.includes('平均正确率1%'),
    historyText.slice(0, 120),
  )
  await page.getByRole('link', { name: '查看结果' }).first().click()
  await page.getByText('本次成绩').waitFor({ timeout: 15000 })
  check('历史成绩可打开对应结果页', page.url().includes('/#/result/'))

  console.log('  · 错题重练')
  const originalResultUrl = page.url()
  const originalSessionId = originalResultUrl.split('/result/')[1]
  await page.getByRole('button', { name: /错题重练/ }).click()
  await page.waitForURL(/#\/practice\//, { timeout: 15000 })
  await page.getByText(/第 1 \/ 117 题/).first().waitFor({ timeout: 15000 })
  const redoSessionId = page.url().split('/practice/')[1]
  check('错题重练创建新的独立 session', redoSessionId !== originalSessionId)
  equal(
    '错题重练首题为本次答错的题',
    await stemText(page),
    normalize(q1.stem),
  )
  check(
    '错题重练从零开始计分',
    (await page.locator('main').innerText()).includes('已答 0'),
  )

  await page.getByRole('button', { name: '交卷' }).first().click()
  await page.waitForURL(/#\/result\//, { timeout: 15000 })
  await page.getByText('本次成绩').waitFor({ timeout: 15000 })
  const redoStats = await readResultStats(page)
  equal('错题重练总题数（错题 + 未答）', redoStats['总题数'], '117')
  equal('错题重练本次未答', redoStats['本次未答'], '117')
  equal('错题重练正确率', redoStats['正确率'], '0%')
  check('错题重练成绩为独立记录', page.url().includes(redoSessionId))
  equal('sessions 表新增独立记录', await indexedDbCount(page, 'sessions'), 2)
  await page.screenshot({ path: path.join(SHOTS, 't3-05-redo-result.png') })

  await page.goto(originalResultUrl, { waitUntil: 'load' })
  await page.getByText('本次成绩').waitFor({ timeout: 15000 })
  equal('原练习结果不受重练影响', (await readResultStats(page))['总题数'], '118')

  console.log('  · E3 错题组卷')
  await page.goto(`${BASE}/#/wrongbook`, { waitUntil: 'load' })
  await page.getByRole('heading', { name: '错题本', exact: true }).waitFor({
    timeout: 15000,
  })
  const assembleButton = page.getByRole('button', { name: /^重练/ })
  await assembleButton.waitFor({ timeout: 5000 })
  equal('错题本按题库显示重练入口', await assembleButton.count(), 1)
  equal(
    '重练按钮不显示题数',
    (await assembleButton.innerText()).trim(),
    '重练',
  )
  await assembleButton.click()
  await page.waitForURL(/#\/practice\//, { timeout: 15000 })
  await page.getByText(/第 1 \/ 1 题/).first().waitFor({ timeout: 15000 })
  const assembleSessionId = page.url().split('/practice/')[1]
  check(
    '错题组卷创建新的独立 session',
    ![originalSessionId, redoSessionId].includes(assembleSessionId),
  )
  equal('错题组卷首题与错题本一致', await stemText(page), normalize(q1.stem))
  check(
    '错题组卷从零开始计分',
    (await page.locator('main').innerText()).includes('已答 0'),
  )

  for (const key of q1.answer) {
    await selectOption(page, key)
  }
  await submitDesktop(page)
  await page.locator('article').first().getByText('回答正确').waitFor({
    timeout: 5000,
  })
  await page.getByRole('button', { name: '交卷' }).first().click()
  await page.waitForURL(/#\/result\//, { timeout: 15000 })
  await page.getByText('本次成绩').waitFor({ timeout: 15000 })
  const assembleStats = await readResultStats(page)
  equal('错题组卷总题数', assembleStats['总题数'], '1')
  equal('错题组卷答对', assembleStats['答对'], '1')
  equal('错题组卷正确率', assembleStats['正确率'], '100%')
  check('错题组卷成绩为独立记录', page.url().includes(assembleSessionId))
  equal('sessions 表存在 3 条独立记录', await indexedDbCount(page, 'sessions'), 3)
  await page.screenshot({ path: path.join(SHOTS, 't3-06-wrongbook-result.png') })

  await page.goto(`${BASE}/#/wrongbook`, { waitUntil: 'load' })
  await page.getByRole('heading', { name: '错题本', exact: true }).waitFor({
    timeout: 15000,
  })
  await page.locator('main button[aria-expanded]').first().click()
  await page.locator('article').first().waitFor({ timeout: 5000 })
  equal('答对组卷题后错题本仍保留记录', await page.locator('article').count(), 1)

  console.log('  · E4 收藏夹页面')
  await page.goto(`${BASE}/#/favorites`, { waitUntil: 'load' })
  await page.getByRole('heading', { name: '收藏夹', exact: true }).waitFor({ timeout: 15000 })
  const favoriteGroupToggle = page.locator('main button[aria-expanded]').first()
  await favoriteGroupToggle.waitFor({ timeout: 5000 })
  check(
    '收藏夹分组默认收起',
    (await favoriteGroupToggle.getAttribute('aria-expanded')) === 'false',
  )
  equal('收起时收藏卡片不渲染', await page.locator('article').count(), 0)
  await favoriteGroupToggle.click()
  check(
    '点击分组后展开收藏卡片',
    (await favoriteGroupToggle.getAttribute('aria-expanded')) === 'true',
  )
  const favoriteArticle = page.locator('article').first()
  await favoriteArticle.waitFor({ timeout: 5000 })
  equal('收藏夹条目数', await page.locator('article').count(), 1)
  equal(
    '收藏夹题干与练习一致',
    normalize(
      await favoriteArticle.locator(':scope > header + div').textContent(),
    ),
    normalize(q1.stem),
  )
  check(
    '收藏夹显示收藏时间',
    (await favoriteArticle.innerText()).includes('收藏于：'),
  )
  check(
    '收藏夹显示取消收藏入口',
    await favoriteArticle.getByRole('button', { name: '取消收藏' }).isVisible(),
  )
  await sleep(300)
  await page.screenshot({ path: path.join(SHOTS, 't3-07-favorites-desktop.png') })

  await favoriteGroupToggle.click()
  equal('再次点击分组可收起收藏卡片', await page.locator('article').count(), 0)
  await favoriteGroupToggle.click()
  await favoriteArticle.waitFor({ timeout: 5000 })

  await page.getByRole('button', { name: '批量管理' }).click()
  await favoriteArticle.getByRole('checkbox').first().check()
  check(
    '收藏夹批量勾选后显示已选 1 题',
    await page.getByText('已选 1 题').isVisible(),
  )
  check(
    '收藏夹全选后提供取消全选',
    await page.getByRole('button', { name: '取消全选' }).isVisible(),
  )
  await page.getByRole('button', { name: '完成' }).click()

  await favoriteArticle.getByRole('button', { name: '取消收藏' }).click()
  await page.getByText('收藏夹是空的').waitFor({ timeout: 5000 })
  equal('取消收藏后 favorites 表为空', await indexedDbCount(page, 'favorites'), 0)
  await goHome(page)

  console.log('  · E5 壁纸')
  await openHeaderMenu(page)
  await page.getByRole('button', { name: '外观', exact: true }).click()
  const appearance = page.locator('dialog[open]')
  await appearance.waitFor({ timeout: 5000 })
  equal(
    '外观弹窗提供 4 套内置壁纸',
    await appearance
      .getByRole('button', { name: /^(云霞|晨曦|暮色|青野)$/ })
      .count(),
    4,
  )
  await appearance.getByRole('button', { name: '晨曦', exact: true }).click()
  check(
    '选择内置壁纸后应用 has-wallpaper',
    await page.evaluate(() =>
      document.documentElement.classList.contains('has-wallpaper'),
    ),
  )
  const presetCss = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue('--wallpaper-image'),
  )
  check('内置壁纸写入 CSS 变量', presetCss.includes('linear-gradient'), presetCss)
  equal(
    '壁纸选择写入 localStorage',
    await page.evaluate(() => localStorage.getItem('wallpaper')),
    'aurora',
  )
  await appearance.getByRole('button', { name: '完成' }).click()
  await noOverflow(page, '壁纸首页（1280）')
  await page.screenshot({ path: path.join(SHOTS, 't3-08-wallpaper-desktop.png') })

  await goHome(page)
  await page.waitForFunction(
    () => document.documentElement.classList.contains('has-wallpaper'),
    null,
    { timeout: 5000 },
  )
  check('刷新后内置壁纸保持', true)

  console.log('  · E5 自定义壁纸')
  fs.writeFileSync(WALLPAPER_FIXTURE, Buffer.from(WALLPAPER_PNG_BASE64, 'base64'))
  await openHeaderMenu(page)
  await page.getByRole('button', { name: '外观', exact: true }).click()
  const uploadDialog = page.locator('dialog[open]')
  await uploadDialog.waitFor({ timeout: 5000 })
  await uploadDialog.locator('input[type="file"]').setInputFiles(WALLPAPER_FIXTURE)
  await page.waitForFunction(
    () => localStorage.getItem('wallpaper') === 'custom',
    null,
    { timeout: 5000 },
  )
  const customCss = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue('--wallpaper-image'),
  )
  check(
    '上传图片后启用自定义壁纸',
    customCss.startsWith('url("data:image/png'),
    customCss.slice(0, 60),
  )
  equal(
    '自定义壁纸写入 wallpapers 表',
    await indexedDbCount(page, 'wallpapers'),
    1,
  )
  await uploadDialog.getByRole('button', { name: '完成' }).click()

  await page.reload({ waitUntil: 'load' })
  await page
    .getByRole('heading', { name: '把刷题，变成每天的小进步' })
    .waitFor({ timeout: 15000 })
  await page.waitForFunction(
    () =>
      document.documentElement.classList.contains('has-wallpaper') &&
      document.documentElement.style
        .getPropertyValue('--wallpaper-image')
        .startsWith('url("data:image/png'),
    null,
    { timeout: 5000 },
  )
  check('刷新后自定义壁纸保持', true)

  await openHeaderMenu(page)
  await page.getByRole('button', { name: '外观', exact: true }).click()
  const removeDialog = page.locator('dialog[open]')
  await removeDialog.waitFor({ timeout: 5000 })
  await removeDialog.locator('input[type="file"]').setInputFiles({
    name: 'note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  })
  await removeDialog.getByRole('alert').waitFor({ timeout: 5000 })
  check(
    '非图片文件被拒绝',
    (await removeDialog.getByRole('alert').innerText()).includes('图片文件'),
  )
  await removeDialog.getByRole('button', { name: '移除图片' }).click()
  await page.waitForFunction(
    () => localStorage.getItem('wallpaper') === 'none',
    null,
    { timeout: 5000 },
  )
  check(
    '移除图片后恢复无壁纸',
    !(await page.evaluate(() =>
      document.documentElement.classList.contains('has-wallpaper'),
    )),
  )
  equal('移除后 wallpapers 表为空', await indexedDbCount(page, 'wallpapers'), 0)
  await removeDialog.getByRole('button', { name: '完成' }).click()

  console.log('  · E5 动态特效')
  await goHome(page)
  await openHeaderMenu(page)
  await page.getByRole('button', { name: '外观', exact: true }).click()
  const effectDialog = page.locator('dialog[open]')
  await effectDialog.waitFor({ timeout: 5000 })
  equal(
    '外观弹窗提供 4 种动态特效',
    await effectDialog
      .getByRole('button', { name: /^(关闭特效|樱花飘落|动态线条|粒子动画)$/ })
      .count(),
    4,
  )
  await effectDialog.getByRole('button', { name: '樱花飘落', exact: true }).click()
  check(
    '选择特效后渲染 Canvas',
    (await page.locator('canvas[data-effect="sakura"]').count()) === 1,
  )
  equal(
    '特效选择写入 localStorage',
    await page.evaluate(() => localStorage.getItem('effect')),
    'sakura',
  )
  check(
    '特效 Canvas 不拦截指针事件',
    await page
      .locator('canvas[data-effect="sakura"]')
      .evaluate((element) => getComputedStyle(element).pointerEvents === 'none'),
  )
  await page.screenshot({ path: path.join(SHOTS, 't3-10-effect-dialog.png') })
  await effectDialog.getByRole('button', { name: '完成' }).click()
  await sleep(400)
  await page.screenshot({ path: path.join(SHOTS, 't3-11-effect-sakura.png') })

  await page.reload({ waitUntil: 'load' })
  await page
    .getByRole('heading', { name: '把刷题，变成每天的小进步' })
    .waitFor({ timeout: 15000 })
  await page
    .locator('canvas[data-effect="sakura"]')
    .waitFor({ timeout: 5000 })
  check('刷新后特效保持', true)

  await openHeaderMenu(page)
  await page.getByRole('button', { name: '外观', exact: true }).click()
  const switchDialog = page.locator('dialog[open]')
  await switchDialog.waitFor({ timeout: 5000 })
  await switchDialog.getByRole('button', { name: '动态线条', exact: true }).click()
  check(
    '切换特效只保留一个 Canvas',
    (await page.locator('canvas[data-effect]').count()) === 1 &&
      (await page.locator('canvas[data-effect="lines"]').count()) === 1,
  )

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page
    .waitForFunction(() => document.querySelector('canvas[data-effect]') === null, null, {
      timeout: 5000,
    })
  check('减少动态效果时不渲染 Canvas', true)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page
    .locator('canvas[data-effect="lines"]')
    .waitFor({ timeout: 5000 })
  check('恢复动态效果后重新渲染', true)

  await switchDialog.getByRole('button', { name: '关闭特效', exact: true }).click()
  check(
    '关闭特效后移除 Canvas',
    (await page.locator('canvas[data-effect]').count()) === 0,
  )
  equal(
    '关闭特效写入 localStorage',
    await page.evaluate(() => localStorage.getItem('effect')),
    'none',
  )
  await switchDialog.getByRole('button', { name: '完成' }).click()

  console.log('  · E6 键盘快捷键')
  await goHome(page)
  await startBank(page, 'Web前端题库')
  await page.keyboard.press('b')
  check(
    '字母键选择对应选项',
    await page.locator('article').first().locator('input[value="B"]').isChecked(),
  )
  check(
    '键盘选择后可提交',
    await page.getByRole('button', { name: '提交答案' }).first().isEnabled(),
  )
  await page.keyboard.press('Enter')
  await page
    .locator('article')
    .first()
    .getByText(/回答(正确|错误)/)
    .waitFor({ timeout: 5000 })
  check('Enter 提交答案', true)

  await page.keyboard.press('ArrowRight')
  await page.getByText(/第 2 \/ 118 题/).first().waitFor({ timeout: 5000 })
  check('→ 进入下一题', true)
  await page.keyboard.press('ArrowLeft')
  await page.getByText(/第 1 \/ 118 题/).first().waitFor({ timeout: 5000 })
  check('← 返回上一题', true)

  await page
    .locator('article')
    .first()
    .getByRole('button', { name: '反馈', exact: true })
    .click()
  const shortcutDialog = page.locator('dialog[open]')
  await shortcutDialog.waitFor({ timeout: 5000 })
  await page.keyboard.press('ArrowRight')
  await shortcutDialog.getByRole('button', { name: '关闭' }).first().click()
  await shortcutDialog.waitFor({ state: 'hidden', timeout: 5000 })
  check(
    '弹窗打开时快捷键不翻题',
    (await page.locator('main').innerText()).includes('第 1 / 118 题'),
  )
  await goHome(page)

  console.log('  · E1 章节/题型筛选')
  await openBank(page, 'Java程序设计题库')
  const filterPanel = page.locator('aside')
  await filterPanel.locator('label').filter({ hasText: '单选' }).click()
  await filterPanel.locator('label').filter({ hasText: '多选' }).click()
  check(
    '题库内侧显示可练习 15 道判断题',
    normalize(await filterPanel.innerText()).includes('将练习15道题'),
    normalize(await filterPanel.innerText()).slice(0, 120),
  )

  await filterPanel.getByRole('button', { name: '开始练习' }).click()
  await page.waitForURL(/#\/practice\//, { timeout: 15000 })
  await page.getByText(/第 1 \/ 15 题/).first().waitFor({ timeout: 15000 })
  const firstJudge = Object.values(data.questions)
    .filter((question) => question.bankId === 'java' && question.type === 'judge')
    .sort((a, b) => a.number - b.number)[0]
  equal('筛选后首题与题库数据一致', await stemText(page), normalize(firstJudge.stem))

  await goHome(page)
  await errorSummary(page, errors, '桌面端流程')

  await context.close()
}

async function runMobileFlow(browser, options, label, startAtDark) {
  const { context, page, errors } = await openPage(browser, options)
  if (startAtDark) {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
  }
  const dialogs = []
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message())
    await dialog.accept()
  })

  await goHome(page)
  if (startAtDark) {
    check(
      `${label} 深色模式已应用`,
      await page.evaluate(() => document.documentElement.classList.contains('dark')),
    )
    const background = await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    )
    check(`${label} 深色背景非白色`, background !== 'rgb(255, 255, 255)', background)
  }
  await noOverflow(page, `${label} 首页`)
  await sleep(950)
  await page.screenshot({
    path: path.join(SHOTS, `t4-${label}-home.png`),
  })

  console.log(`  · ${label} 移动端顶栏`)
  for (const name of ['首页', '题库', '历史成绩', '错题本', '收藏夹']) {
    check(
      `${label} 顶栏显示${name}入口`,
      await page.getByRole('link', { name, exact: true }).isVisible(),
    )
  }
  check(
    `${label} 移动端隐藏“在线刷题”品牌文字`,
    !(await page
      .locator('header')
      .getByText('在线刷题', { exact: true })
      .isVisible()),
  )
  check(
    `${label} 移动端顶栏提供“三”菜单入口`,
    await page.getByRole('button', { name: '打开菜单' }).isVisible(),
  )

  const targets = await page
    .locator('header a, header button, main button')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          const rect = node.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        })
        .map((node) => {
          const rect = node.getBoundingClientRect()
          return {
            text: (node.textContent ?? '').trim().slice(0, 20),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        })
        .filter((item) => item.width < 44 || item.height < 44),
    )
  check(`${label} 首页触控目标不小于 44px`, targets.length === 0, JSON.stringify(targets))

  console.log(`  · ${label} 历史成绩空状态`)
  await page.getByRole('link', { name: '历史成绩', exact: true }).click()
  await page.getByRole('heading', { name: '历史成绩' }).waitFor({ timeout: 15000 })
  await page.getByText('还没有已完成的练习').waitFor({ timeout: 5000 })
  await noOverflow(page, `${label} 历史成绩`)
  await goHome(page)

  console.log(`  · ${label} 外观壁纸`)
  await openHeaderMenu(page)
  await page.getByRole('button', { name: '外观', exact: true }).click()
  const appearance = page.locator('dialog[open]')
  await appearance.waitFor({ timeout: 5000 })
  await noOverflow(page, `${label} 外观弹窗`)
  await appearance.getByRole('button', { name: '暮色', exact: true }).click()
  await appearance.getByRole('button', { name: '完成' }).click()
  await page.waitForFunction(
    () => document.documentElement.classList.contains('has-wallpaper'),
    null,
    { timeout: 5000 },
  )
  check(`${label} 壁纸已应用`, true)
  await noOverflow(page, `${label} 壁纸首页`)
  await page.screenshot({
    path: path.join(SHOTS, `t3-08-wallpaper-${label}.png`),
  })

  await openHeaderMenu(page)
  await page.getByRole('button', { name: '外观', exact: true }).click()
  const resetDialog = page.locator('dialog[open]')
  await resetDialog.waitFor({ timeout: 5000 })
  await resetDialog.getByRole('button', { name: '无壁纸', exact: true }).click()
  await resetDialog.getByRole('button', { name: '完成' }).click()
  await page.waitForFunction(
    () => !document.documentElement.classList.contains('has-wallpaper'),
    null,
    { timeout: 5000 },
  )
  check(`${label} 可恢复无壁纸`, true)

  await startBank(page, 'Web前端题库')
  await noOverflow(page, `${label} 答题页`)

  const nav = page.locator('nav[aria-label="答题操作"]')
  check(`${label} 底部操作栏可见`, await nav.isVisible())
  const navTargets = await nav.locator('button').evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const rect = node.getBoundingClientRect()
        return {
          text: (node.textContent ?? '').trim().slice(0, 10),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })
      .filter((item) => item.width < 44 || item.height < 44),
  )
  check(
    `${label} 底部操作栏触控目标不小于 44px`,
    navTargets.length === 0,
    JSON.stringify(navTargets),
  )

  await nav.getByRole('button', { name: '题号' }).click()
  const sheet = page.locator('dialog[open]')
  await sheet.waitFor({ timeout: 5000 })
  check(`${label} 题号抽屉可打开`, await sheet.isVisible())
  await page.keyboard.press('Escape')
  await sheet.waitFor({ state: 'detached', timeout: 5000 })
  check(`${label} 题号抽屉可用 Escape 关闭`, true)
  // 原生 dialog 从顶层移除与随后点击可能同帧，留出一次交互间隔。
  await sleep(150)

  await selectOption(page, 'A')
  await submitMobile(page)
  const article = page.locator('article').first()
  await article.getByText(/回答(正确|错误)/).waitFor({ timeout: 5000 })
  await page.screenshot({
    path: path.join(SHOTS, `t4-${label}-practice.png`),
  })

  await nav.getByRole('button', { name: '交卷' }).click()
  await page.waitForURL(/#\/result\//, { timeout: 15000 })
  await page.getByText('本次成绩').waitFor({ timeout: 15000 })
  equal(`${label} 交卷确认次数`, dialogs.length, 2)
  await noOverflow(page, `${label} 结果页`)
  check(
    `${label} 结果页显示错题重练入口`,
    await page.getByRole('button', { name: /错题重练/ }).isVisible(),
  )

  const resultActions = page.getByRole('group', { name: '结果操作' })
  const actionControls = resultActions.locator('a, button')
  equal(`${label} 结果页提供四个操作`, await actionControls.count(), 4)
  const actionShapes = await actionControls.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect()
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        radius: getComputedStyle(node).borderRadius,
      }
    }),
  )
  const [firstShape] = actionShapes
  check(
    `${label} 结果页四个操作等宽等高`,
    actionShapes.every(
      (shape) =>
        Math.abs(shape.width - firstShape.width) <= 1 &&
        Math.abs(shape.height - firstShape.height) <= 1,
    ),
    JSON.stringify(actionShapes),
  )
  check(
    `${label} 结果页四个操作圆角一致`,
    actionShapes.every((shape) => shape.radius === firstShape.radius),
    JSON.stringify(actionShapes),
  )

  await page.screenshot({
    path: path.join(SHOTS, `t4-${label}-result.png`),
  })

  await page.getByRole('link', { name: '查看错题本' }).click()
  await page.getByRole('heading', { name: '错题本', exact: true }).waitFor()
  const mobileAssemble = page.getByRole('button', { name: /^重练/ })
  await mobileAssemble.waitFor({ timeout: 5000 })
  check(`${label} 错题本显示重练入口`, await mobileAssemble.isVisible())
  equal(
    `${label} 重练按钮不显示题数`,
    (await mobileAssemble.innerText()).trim(),
    '重练',
  )
  await noOverflow(page, `${label} 错题本`)

  await page.getByRole('link', { name: '收藏夹', exact: true }).click()
  await page.getByRole('heading', { name: '收藏夹', exact: true }).waitFor({ timeout: 5000 })
  check(
    `${label} 收藏夹显示空状态`,
    await page.getByText('收藏夹是空的').isVisible(),
  )
  await noOverflow(page, `${label} 收藏夹`)
  await errorSummary(page, errors, label)

  await context.close()
}

async function runOfflineFlow(browser) {
  console.log('\n[E6] PWA 离线访问')
  const { context, page, errors } = await openPage(browser, {
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
  })

  await goHome(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    return true
  })
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    null,
    { timeout: 15000 },
  )
  check('Service Worker 已接管页面', true)
  equal(
    '页面声明 Web App Manifest',
    await page.locator('link[rel="manifest"]').getAttribute('href'),
    './manifest.webmanifest',
  )

  await context.setOffline(true)
  await page.reload({ waitUntil: 'load' })
  await page
    .getByRole('heading', { name: '把刷题，变成每天的小进步' })
    .waitFor({ timeout: 15000 })
  check('离线刷新后首页可打开', true)
  check('浏览器处于离线状态', await page.evaluate(() => !navigator.onLine))
  await page.screenshot({ path: path.join(SHOTS, 't3-09-offline-home.png') })

  await startBank(page, 'Web前端题库')
  check('离线状态可开始练习', true)

  await context.setOffline(false)
  await errorSummary(page, errors, '离线流程')
  await context.close()
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true })

  const executablePath = findBrowser()
  if (!executablePath) {
    throw new Error('未找到 Edge/Chrome。请设置 EDGE_PATH 环境变量。')
  }
  console.log(`[e2e] 浏览器：${executablePath}`)

  const server = await startPreview()
  const data = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src', 'data', 'banks.json'), 'utf8'),
  )
  const browser = await chromium.launch({ executablePath, headless: true })

  try {
    await runDesktopFlow(browser, data)
    await runMobileFlow(
      browser,
      {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        colorScheme: 'dark',
      },
      '375-dark',
      true,
    )
    await runMobileFlow(
      browser,
      {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        colorScheme: 'light',
      },
      '390-light',
      false,
    )
    await runOfflineFlow(browser)
  } finally {
    await browser.close()
    if (server) server.kill()
  }

  console.log(`\n[e2e] 共 ${checks} 项检查，失败 ${failures.length} 项`)
  if (failures.length > 0) {
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
  }
  console.log('[e2e] 全部通过')
}

main().catch((error) => {
  console.error('[e2e] 运行失败：', error)
  process.exit(1)
})
