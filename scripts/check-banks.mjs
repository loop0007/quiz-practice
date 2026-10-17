#!/usr/bin/env node
/**
 * 只读题库体检脚本（不生成任何数据文件）。
 * 运行：node scripts/check-banks.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILES = [
  { id: 'java', file: '题库/Java题库.md' },
  { id: 'web', file: '题库/Web题库.md' },
]
const TYPE_MAP = { 单选题: 'single', 多选题: 'multi', 判断题: 'judge' }
const OPTION_RE = /^\s*-\s+([A-Za-z])[.．、)]\s*(.*)$/

function parseAnswer(raw) {
  if (!raw) return []
  const compact = raw.replace(/\s+/g, '').toUpperCase()
  if (!compact || !/^[A-Z、,，]+$/.test(compact)) return []
  const letters = /[、,，]/.test(compact)
    ? compact.split(/[、,，]+/)
    : compact.length > 1
      ? compact.split('')
      : [compact]
  return [...new Set(letters.filter(Boolean))].sort()
}

const summary = []

for (const spec of FILES) {
  const abs = path.join(ROOT, spec.file)
  const lines = fs.readFileSync(abs, 'utf8').replace(/^﻿/, '').split(/\r?\n/)
  const issues = []
  const blocks = []
  let inCode = false
  let fenceCount = 0
  let fenceLine = 0
  let chapter = null
  let block = null
  let h1 = ''
  let chapterCount = 0

  const close = () => {
    if (block) blocks.push(block)
    block = null
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]
    const n = i + 1

    if (/^\s*```/.test(raw)) {
      inCode = !inCode
      fenceCount += 1
      if (inCode) fenceLine = n
      if (block) block.body.push({ raw, n, inCode: true })
      continue
    }

    if (inCode) {
      if (block) block.body.push({ raw, n, inCode: true })
      if (/^###\s/.test(raw)) issues.push(`行 ${n}: 代码围栏内出现标题：${raw.trim()}`)
      if (OPTION_RE.test(raw)) issues.push(`行 ${n}: 代码围栏内出现选项样式：${raw.trim()}`)
      if (/^\*\*答案\*\*/.test(raw)) issues.push(`行 ${n}: 代码围栏内出现答案行`)
      continue
    }

    if (/^#\s+/.test(raw) && !block) {
      h1 = raw.replace(/^#\s+/, '').trim()
      continue
    }
    if (/^##\s+/.test(raw)) {
      close()
      chapter = raw.replace(/^##\s+/, '').trim()
      chapterCount += 1
      continue
    }
    if (/^###\s+/.test(raw)) {
      close()
      const m = raw.match(/^###\s+(\d+)\.\s*(.+?)\s*$/)
      if (!m) {
        issues.push(`行 ${n}: 无法识别的题目标题：${raw.trim()}`)
        continue
      }
      if (!TYPE_MAP[m[2].trim()]) {
        issues.push(`行 ${n}: 未知题型「${m[2].trim()}」`)
      }
      block = {
        number: Number(m[1]),
        type: TYPE_MAP[m[2].trim()] ?? m[2].trim(),
        chapter,
        line: n,
        body: [],
      }
      continue
    }
    if (block) block.body.push({ raw, n, inCode: false })
  }
  close()

  if (inCode) issues.push(`围栏未闭合，起始行 ${fenceLine}`)
  if (fenceCount % 2 !== 0) issues.push(`代码围栏数量为奇数：${fenceCount}`)

  const numbers = blocks.map((b) => b.number)
  const seen = new Set()
  for (const num of numbers) {
    if (seen.has(num)) issues.push(`题号重复：${num}`)
    seen.add(num)
  }
  for (let i = 1; i < numbers.length; i += 1) {
    if (numbers[i] !== numbers[i - 1] + 1) {
      issues.push(`题号不连续：${numbers[i - 1]} → ${numbers[i]}（行 ${blocks[i].line}）`)
    }
  }

  const declared = fs.readFileSync(abs, 'utf8').match(/共\s*(\d+)\s*题/)
  const typeCounts = { single: 0, multi: 0, judge: 0 }
  const valid = []
  const questionIssues = []

  for (const b of blocks) {
    if (b.type in typeCounts) typeCounts[b.type] += 1

    let section = 'stem'
    let inQCode = false
    const stem = []
    const options = []
    const explanations = []
    let answerRaw = ''
    let answerCount = 0
    let explanationCount = 0
    let separatorCount = 0

    for (const { raw, inCode: fenced } of b.body) {
      if (fenced) {
        if (section === 'explanation') explanations.push(raw)
        else stem.push(raw)
        continue
      }
      if (/^\s*```/.test(raw)) {
        inQCode = !inQCode
        stem.push(raw)
        continue
      }
      if (inQCode) {
        stem.push(raw)
        continue
      }
      if (/^\s*---+\s*$/.test(raw)) {
        section = 'done'
        separatorCount += 1
        continue
      }
      const am = raw.match(/^\*\*答案\*\*[：:]\s*(.*)$/)
      if (am) {
        section = 'answer'
        answerCount += 1
        if (!answerRaw) answerRaw = am[1]
        continue
      }
      const em = raw.match(/^\*\*解析\*\*[：:]\s*(.*)$/)
      if (em) {
        section = 'explanation'
        explanationCount += 1
        if (em[1]) explanations.push(em[1])
        continue
      }
      if (section === 'stem' || section === 'options') {
        const om = raw.match(OPTION_RE)
        if (om) {
          section = 'options'
          options.push({ key: om[1].toUpperCase(), line: b.line, raw })
          continue
        }
      }
      if (section === 'explanation') explanations.push(raw)
      else if (section === 'stem') stem.push(raw)
    }

    const stemText = stem.join('\n').trim()
    const optionKeys = options.map((o) => o.key)
    const uniqueKeys = [...new Set(optionKeys)]
    const answer = parseAnswer(answerRaw)
    const local = []
    if (!b.chapter) local.push('缺少章节归属')
    if (!stemText) local.push('题干为空')
    if (options.length < 2) local.push(`选项不足（${options.length} 个）`)
    if (optionKeys.length !== uniqueKeys.length) local.push('存在重复选项字母')
    if (!answerRaw) local.push('缺少答案行')
    else if (answer.length === 0) local.push(`答案无法解析：「${answerRaw}」`)
    if (answerCount > 1) local.push(`答案行重复 ${answerCount} 次`)
    if (explanationCount === 0) local.push('缺少解析行')
    if (explanationCount > 1) local.push(`解析行重复 ${explanationCount} 次`)
    if (separatorCount === 0) local.push('缺少题目分隔符 ---')
    if (answer.length > 0) {
      const unknown = answer.filter((k) => !uniqueKeys.includes(k))
      if (unknown.length) local.push(`答案 ${unknown.join('、')} 不在选项内`)
      if (b.type !== 'multi' && answer.length !== 1) {
        local.push(`${b.type} 答案数量为 ${answer.length}`)
      }
      if (b.type === 'multi' && answer.length < 2) {
        local.push(`多选题答案只有 ${answer.length} 个`)
      }
    }
    if (local.length) {
      questionIssues.push(`第 ${b.number} 题（行 ${b.line}，${b.chapter ?? '无章节'}）：${local.join('；')}`)
    } else {
      valid.push(b.number)
    }
  }

  summary.push({
    id: spec.id,
    name: h1,
    declared: declared ? Number(declared[1]) : null,
    chapters: chapterCount,
    blocks: blocks.length,
    valid: valid.length,
    typeCounts,
    fences: fenceCount,
    issueCount: issues.length,
    issues,
    questionIssues,
  })
}

for (const s of summary) {
  console.log(`\n=== ${s.name}（${s.id}）===`)
  console.log(
    `声明 ${s.declared} 题 | 章节 ${s.chapters} | 解析块 ${s.blocks} | 结构完整 ${s.valid} | ` +
      `单选 ${s.typeCounts.single} / 多选 ${s.typeCounts.multi} / 判断 ${s.typeCounts.judge}`,
  )
  console.log(`代码围栏标记 ${s.fences} 个`)
  if (s.issues.length === 0) console.log('结构问题：无')
  else {
    console.log(`结构问题（${s.issues.length}）：`)
    for (const issue of s.issues) console.log(`  - ${issue}`)
  }
  if (s.questionIssues.length === 0) console.log('题目问题：无')
  else {
    console.log(`题目问题（${s.questionIssues.length}）：`)
    for (const issue of s.questionIssues) console.log(`  - ${issue}`)
  }
}
