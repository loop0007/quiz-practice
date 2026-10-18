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
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'
const SHOTS = path.join(ROOT, 'docs', 'screenshots', 'phase3')

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
  await page.getByRole('heading', { name: '选择题库' }).waitFor({ timeout: 15000 })
}

async function startBank(page, bankName) {
  const card = page.locator('article').filter({ hasText: bankName })
  await card.getByRole('button', { name: '开始练习' }).click()
  await page.waitForURL(/#\/practice\//, { timeout: 15000 })
  await page.getByText(/第 1 \/ 118 题/).first().waitFor({ timeout: 15000 })
}

async function selectOption(page, key) {
  const input = page.locator('article').first().locator(`input[value="${key}"]`)
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
  await page.screenshot({ path: path.join(SHOTS, 't3-01-home-desktop.png') })

  const cards = page.locator('article')
  equal('首页题库数量', await cards.count(), 2)
  const homeText = await page.locator('main').innerText()
  check('首页显示 Java 有效题量 218', homeText.includes('218'))
  check('首页显示 Web 有效题量 118', homeText.includes('118'))
  await noOverflow(page, '首页（1280）')

  console.log('  · 通用反馈')
  await page.getByRole('button', { name: '反馈', exact: true }).click()
  await submitFeedback(page, { typeLabel: '建议', note: 'T3 通用反馈' })
  equal('通用反馈已写入 feedback 表', await indexedDbCount(page, 'feedback'), 1)

  console.log('  · 开始 Web 题库练习')
  await startBank(page, 'Web前端题库')
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
  check('本次错题包含第 1 题', resultText.includes('第 1 题'))
  check(
    '本次错题与累计分开命名',
    resultText.includes('本次错题') && resultText.includes('错题本累计'),
  )
  check('错题本累计显示 1 题', resultText.includes('全部题库共 1 题'))
  await page.screenshot({ path: path.join(SHOTS, 't3-03-result-desktop.png') })

  console.log('  · 错题本对照')
  await page.getByRole('link', { name: '查看错题本' }).click()
  await page.getByRole('heading', { name: '错题本累计' }).waitFor()
  const wrongArticle = page.locator('article').first()
  equal('错题本条目数', await page.locator('article').count(), 1)
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
  await page.screenshot({ path: path.join(SHOTS, 't3-04-wrongbook-desktop.png') })

  console.log('  · 深链接与 404')
  await page.goto(`${BASE}/#/wrongbook`, { waitUntil: 'load' })
  await page.getByRole('heading', { name: '错题本累计' }).waitFor({
    timeout: 15000,
  })
  check('刷新后深链接 #/wrongbook 正常渲染', true)
  await page.goto(`${BASE}/#/not-a-page`, { waitUntil: 'load' })
  await page.getByRole('heading', { name: '页面不存在' }).waitFor({
    timeout: 15000,
  })
  check('未知路由显示 404 页面', true)
  await goHome(page)

  console.log('  · E1 章节/题型筛选')
  const javaCard = page.locator('article').filter({ hasText: 'Java程序设计题库' })
  await javaCard.getByRole('button', { name: '按章节/题型筛选' }).click()
  const filterDialog = page.locator('dialog[open]')
  await filterDialog.waitFor({ timeout: 5000 })

  await filterDialog.locator('label').filter({ hasText: '单选' }).click()
  await filterDialog.locator('label').filter({ hasText: '多选' }).click()
  check(
    '筛选弹窗显示可练习 15 道判断题',
    normalize(await filterDialog.innerText()).includes('将练习15道题'),
    normalize(await filterDialog.innerText()).slice(0, 120),
  )

  await filterDialog.getByRole('button', { name: '开始练习' }).click()
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
  await page.screenshot({
    path: path.join(SHOTS, `t4-${label}-home.png`),
  })

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
  await page.screenshot({
    path: path.join(SHOTS, `t4-${label}-result.png`),
  })

  await page.getByRole('link', { name: '查看错题本' }).click()
  await page.getByRole('heading', { name: '错题本累计' }).waitFor()
  await noOverflow(page, `${label} 错题本`)
  await errorSummary(page, errors, label)

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
