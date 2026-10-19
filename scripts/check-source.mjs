#!/usr/bin/env node
/**
 * T4/T5 只读静态检查（不生成文件）：
 * - 无调试日志、debugger、TODO/FIXME、空链接、本机地址、Windows 绝对路径。
 * - import 路径大小写与实际文件名完全一致（Linux 大小写敏感预检）。
 *
 * 运行：node scripts/check-source.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json']
// Vite 可通过 ?url 直接 import 图片，解析大小写时也要覆盖这些扩展名。
const ASSET_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg', '.webp', '.gif']
const failures = []

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(abs))
    else files.push(abs)
  }
  return files
}

/** Windows 文件系统不区分大小写，逐段比对真实目录项。 */
function exactCaseExists(absPath) {
  const rel = path.relative(ROOT, absPath)
  if (rel.startsWith('..') || path.isAbsolute(rel)) return false

  let current = ROOT
  for (const segment of rel.split(path.sep)) {
    let entries
    try {
      entries = fs.readdirSync(current)
    } catch {
      return false
    }
    if (!entries.includes(segment)) return false
    current = path.join(current, segment)
  }
  return fs.existsSync(absPath)
}

function resolveLocal(absBase) {
  const candidates = [
    absBase,
    ...[...EXTENSIONS, ...ASSET_EXTENSIONS].map((extension) => `${absBase}${extension}`),
    ...EXTENSIONS.map((extension) => path.join(absBase, `index${extension}`)),
  ]
  for (const candidate of candidates) {
    if (exactCaseExists(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }
  return null
}

const FATAL_PATTERNS = [
  { re: /\bconsole\.(?:log|debug|info)\s*\(/, label: '调试日志' },
  { re: /\bdebugger\b/, label: 'debugger' },
  { re: /\b(?:TODO|FIXME)\b/, label: '未完成标记' },
  { re: /href\s*=\s*['"]#['"]/, label: '空链接 href="#"' },
  { re: /(?:localhost|127\.0\.0\.1):\d+/, label: '硬编码本机地址' },
  { re: /(?<![\w])[A-Za-z]:[\\/]/, label: 'Windows 绝对路径' },
  { re: /file:\/\//, label: 'file:// 引用' },
]

// 只检查文本源文件；图片等二进制资源不参与调试残留/路径扫描。
const sourceFiles = walk(SRC).filter((file) =>
  EXTENSIONS.includes(path.extname(file).toLowerCase()),
)
let checkedImports = 0

for (const file of sourceFiles) {
  const rel = path.relative(ROOT, file)
  const text = fs.readFileSync(file, 'utf8')
  // 题库 JSON 由解析脚本生成，题干里出现 console.log / 代码路径属正常内容。
  const generated = rel.startsWith(path.join('src', 'data') + path.sep)

  if (!generated) for (const { re, label } of FATAL_PATTERNS) {
    const lines = text.split(/\r?\n/)
    lines.forEach((line, index) => {
      if (re.test(line)) failures.push(`${rel}:${index + 1} ${label}：${line.trim()}`)
    })
  }

  if (!/\.(?:ts|tsx|js|jsx)$/.test(file)) continue

  const importRe =
    /(?:import\s+(?:[^'"]*?\s+from\s+)?|export\s+[^'"]*?\s+from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  for (const match of text.matchAll(importRe)) {
    const spec = match[1]
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue
    checkedImports += 1

    if (spec.includes('\\')) {
      failures.push(`${rel} import 使用了反斜杠：${spec}`)
      continue
    }

    // 去掉 Vite 的 ?url / ?raw 等查询后缀后再按实际文件名比对。
    const specPath = spec.split('?')[0]
    const absBase = specPath.startsWith('@/')
      ? path.join(SRC, specPath.slice(2))
      : path.resolve(path.dirname(file), specPath)

    if (!resolveLocal(absBase)) {
      failures.push(
        `${rel} import 无法按实际文件名解析（检查大小写/扩展名）：${spec}`,
      )
    }
  }
}

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
for (const match of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
  const abs = path.join(ROOT, match[1])
  if (!exactCaseExists(abs)) {
    failures.push(`index.html 引用无法按实际文件名解析：${match[1]}`)
  }
}

console.log(`[check-source] 检查 ${sourceFiles.length} 个源文件，${checkedImports} 条本地 import`)
if (failures.length > 0) {
  console.error(`[check-source] 发现 ${failures.length} 个问题：`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('[check-source] 通过：无调试残留、空链接或大小写不一致的 import')
