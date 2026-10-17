#!/usr/bin/env node
/**
 * 题库 Markdown → src/data/banks.json + src/data/anomalies.json
 *
 * 无第三方 Markdown 依赖；按题库既有格式逐行解析。
 * 运行：node scripts/parse-banks.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_DIR = path.join(ROOT, 'src', 'data')

/** 题库顺序固定，保证重复执行输出稳定。 */
const SPECS = [
  { id: 'java', file: '题库/Java题库.md', expectedCount: 219 },
  { id: 'web', file: '题库/Web题库.md', expectedCount: 120 },
]

const TYPE_MAP = {
  单选题: 'single',
  多选题: 'multi',
  判断题: 'judge',
}

const OPTION_RE = /^\s*-\s+([A-Za-z])[.．、]\s*(.*)$/
const QUESTION_HEADING_RE = /^(\d+)\.\s*(.+?)\s*$/
const ANSWER_RE = /^\*\*答案\*\*[：:]\s*(.*)$/
const EXPLANATION_RE = /^\*\*解析\*\*[：:]\s*(.*)$/
const FENCE_RE = /^\s*```/

function emptyTypeCounts() {
  return { single: 0, multi: 0, judge: 0 }
}

/**
 * 解析答案原文：去空格、转大写；支持 `、` `,` `，` 与无分隔符。
 * 返回去重排序后的字母数组；无法识别时返回空数组。
 */
function parseAnswer(raw) {
  if (!raw) return []
  const compact = raw.replace(/\s+/g, '').toUpperCase()
  if (!compact) return []
  if (!/^[A-Z、,，]+$/.test(compact)) return []

  let letters
  if (/[、,，]/.test(compact)) {
    letters = compact.split(/[、,，]+/)
  } else if (compact.length > 1) {
    letters = compact.split('')
  } else {
    letters = [compact]
  }

  return [...new Set(letters.filter(Boolean))].sort()
}

function excerptOf(lines, fallback) {
  const text = lines.find((line) => line.trim() && !line.startsWith('```')) ?? fallback
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > 80 ? `${clean.slice(0, 80)}…` : clean
}

/**
 * 把题目块拆成题干、选项、答案、解析。
 * 代码围栏内的 `- A.` 与 `---` 不参与结构识别。
 */
function parseQuestionBody(bodyLines) {
  const stemLines = []
  const explanationLines = []
  const options = []
  let answerRaw = ''
  let section = 'stem'
  let inCode = false

  for (const line of bodyLines) {
    if (FENCE_RE.test(line)) {
      inCode = !inCode
      if (section === 'explanation') explanationLines.push(line)
      else stemLines.push(line)
      continue
    }

    if (!inCode) {
      if (/^\s*---+\s*$/.test(line)) {
        section = 'done'
        continue
      }

      const answerMatch = line.match(ANSWER_RE)
      if (answerMatch) {
        if (!answerRaw) answerRaw = answerMatch[1]
        section = 'answer'
        continue
      }

      const explanationMatch = line.match(EXPLANATION_RE)
      if (explanationMatch) {
        section = 'explanation'
        if (explanationMatch[1]) explanationLines.push(explanationMatch[1])
        continue
      }

      if (section === 'stem' || section === 'options') {
        const optionMatch = line.match(OPTION_RE)
        if (optionMatch) {
          section = 'options'
          options.push({ key: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() })
          continue
        }
      }
    }

    if (section === 'explanation') {
      explanationLines.push(line)
    } else if (section === 'options') {
      if (line.trim() && options.length > 0 && !inCode) {
        // 选项文本换行时并入上一条，避免丢失内容。
        options[options.length - 1].text += ` ${line.trim()}`
      } else if (inCode) {
        options[options.length - 1].text += `\n${line}`
      }
    } else if (section === 'stem') {
      stemLines.push(line)
    }
  }

  return {
    stem: stemLines.join('\n').trim(),
    options,
    answerRaw: answerRaw.trim(),
    explanation: explanationLines.join('\n').trim(),
  }
}

function parseBank(spec) {
  const absPath = path.join(ROOT, spec.file)
  const text = fs.readFileSync(absPath, 'utf8').replace(/^﻿/, '')
  const lines = text.split(/\r?\n/)

  const anomalies = []
  const chapters = []
  const blocks = []
  const seenIds = new Set()
  const anomalyQuestionIds = new Set()

  let bankName = ''
  let declaredCount = 0
  let declaredTypeCounts = null
  let currentChapter = null
  let currentBlock = null
  let inCode = false

  const closeBlock = () => {
    if (currentBlock) {
      blocks.push(currentBlock)
      currentBlock = null
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]
    const lineNo = i + 1

    if (FENCE_RE.test(raw)) {
      inCode = !inCode
      if (currentBlock) currentBlock.body.push(raw)
      continue
    }

    if (inCode) {
      if (currentBlock) currentBlock.body.push(raw)
      continue
    }

    const h1 = raw.match(/^#\s+(.+)$/)
    if (h1) {
      if (!bankName) bankName = h1[1].trim()
      continue
    }

    const h2 = raw.match(/^##\s+(.+)$/)
    if (h2) {
      closeBlock()
      currentChapter = { title: h2[1].trim(), line: lineNo }
      chapters.push({
        id: `${spec.id}-ch${chapters.length + 1}`,
        title: currentChapter.title,
        questionIds: [],
      })
      continue
    }

    const h3 = raw.match(/^###\s+(.+)$/)
    if (h3) {
      closeBlock()
      const m = h3[1].match(QUESTION_HEADING_RE)
      if (!m) {
        anomalies.push({
          code: 'unparsable-structure',
          bankId: spec.id,
          line: lineNo,
          message: `无法识别的题目标题：${h3[1]}`,
          excerpt: excerptOf([raw], raw),
        })
        continue
      }
      const typeLabel = m[2].trim()
      const type = TYPE_MAP[typeLabel]
      if (!type) {
        anomalies.push({
          code: 'unparsable-structure',
          bankId: spec.id,
          line: lineNo,
          message: `无法识别的题型：${typeLabel}`,
          excerpt: excerptOf([raw], raw),
        })
        continue
      }
      if (!currentChapter) {
        anomalies.push({
          code: 'unparsable-structure',
          bankId: spec.id,
          number: Number(m[1]),
          line: lineNo,
          message: '题目出现在章节标题之前，无法归属章节',
          excerpt: excerptOf([raw], raw),
        })
        continue
      }
      currentBlock = {
        number: Number(m[1]),
        type,
        typeLabel,
        line: lineNo,
        chapterIndex: chapters.length - 1,
        body: [],
      }
      continue
    }

    if (currentBlock) currentBlock.body.push(raw)
  }

  closeBlock()

  const declaredMatch = text.match(/共\s*(\d+)\s*题/)
  if (declaredMatch) declaredCount = Number(declaredMatch[1])

  const declaredSingle = text.match(/单选题\s*(\d+)/)
  const declaredMulti = text.match(/多选题\s*(\d+)/)
  const declaredJudge = text.match(/判断题\s*(\d+)/)
  if (declaredSingle || declaredMulti || declaredJudge) {
    declaredTypeCounts = {
      single: declaredSingle ? Number(declaredSingle[1]) : 0,
      multi: declaredMulti ? Number(declaredMulti[1]) : 0,
      judge: declaredJudge ? Number(declaredJudge[1]) : 0,
    }
  }

  const parsedTypeCounts = emptyTypeCounts()
  const validTypeCounts = emptyTypeCounts()
  const validQuestions = []

  for (const block of blocks) {
    const number = block.number
    const questionId = `${spec.id}:${number}`
    const parsed = parseQuestionBody(block.body)
    parsedTypeCounts[block.type] += 1

    const reasons = []

    if (seenIds.has(questionId)) {
      reasons.push({ code: 'duplicate-id', message: `题目 ID 重复：${questionId}` })
    }
    if (!parsed.stem) {
      reasons.push({ code: 'missing-stem', message: '题干为空' })
    }
    if (parsed.options.length < 2) {
      reasons.push({
        code: 'invalid-options',
        message: `选项不足（${parsed.options.length} 个）`,
      })
    }

    const answer = parseAnswer(parsed.answerRaw)
    if (answer.length === 0) {
      reasons.push({ code: 'missing-answer', message: '答案缺失或无法解析' })
    }

    const optionKeys = new Set(parsed.options.map((option) => option.key))
    const unknownKeys = answer.filter((key) => !optionKeys.has(key))
    if (answer.length > 0 && unknownKeys.length > 0) {
      reasons.push({
        code: 'answer-not-in-options',
        message: `答案 ${unknownKeys.join('、')} 不在选项内`,
      })
    }

    if (answer.length > 0) {
      const shouldBeSingle = block.type !== 'multi'
      if (shouldBeSingle && answer.length !== 1) {
        reasons.push({
          code: 'answer-count-mismatch',
          message: `${block.typeLabel}答案应有 1 个，实际 ${answer.length} 个`,
        })
      }
      if (block.type === 'multi' && answer.length < 2) {
        reasons.push({
          code: 'answer-count-mismatch',
          message: `多选题答案应至少 2 个，实际 ${answer.length} 个`,
        })
      }
    }

    if (reasons.length > 0) {
      if (seenIds.has(questionId)) {
        // 重复题保留首条；这里只记录异常，不再登记 ID。
      } else {
        seenIds.add(questionId)
      }
      anomalyQuestionIds.add(questionId)
      for (const reason of reasons) {
        anomalies.push({
          code: reason.code,
          bankId: spec.id,
          questionId,
          number,
          line: block.line,
          message: `${block.typeLabel}：${reason.message}`,
          excerpt: excerptOf(block.body, `第 ${number} 题`),
        })
      }
      continue
    }

    seenIds.add(questionId)
    const chapter = chapters[block.chapterIndex]
    chapter.questionIds.push(questionId)
    validTypeCounts[block.type] += 1
    validQuestions.push({
      id: questionId,
      bankId: spec.id,
      chapterId: chapter.id,
      number,
      type: block.type,
      stem: parsed.stem,
      options: parsed.options,
      answer,
      explanation: parsed.explanation,
    })
  }

  if (declaredCount > 0 && blocks.length !== declaredCount) {
    anomalies.push({
      code: 'declared-count-mismatch',
      bankId: spec.id,
      message: `文件头声明 ${declaredCount} 题，实际解析 ${blocks.length} 题`,
      excerpt: `共 ${declaredCount} 题`,
    })
  }

  if (declaredTypeCounts) {
    for (const [type, declared] of Object.entries(declaredTypeCounts)) {
      if (parsedTypeCounts[type] !== declared) {
        anomalies.push({
          code: 'declared-type-mismatch',
          bankId: spec.id,
          message: `文件头声明 ${type} ${declared} 题，实际解析 ${parsedTypeCounts[type]} 题`,
          excerpt: `题型统计 ${type}`,
        })
      }
    }
  }

  const meta = {
    id: spec.id,
    name: bankName || path.basename(spec.file, '.md'),
    sourceFile: spec.file,
    declaredCount,
    declaredTypeCounts,
    parsedCount: blocks.length,
    validCount: validQuestions.length,
    typeCounts: validTypeCounts,
    /** 异常题数（按题目去重，不含题库级异常记录）。 */
    anomalyCount: anomalyQuestionIds.size,
    chapters,
  }

  return { meta, questions: validQuestions, anomalies }
}

function main() {
  const banks = []
  const questions = {}
  const anomalies = []

  for (const spec of SPECS) {
    const result = parseBank(spec)
    const { meta } = result

    if (meta.parsedCount !== spec.expectedCount) {
      throw new Error(
        `${meta.name}：预期解析 ${spec.expectedCount} 题，实际 ${meta.parsedCount} 题`,
      )
    }
    if (meta.declaredCount !== spec.expectedCount) {
      throw new Error(
        `${meta.name}：文件头声明 ${meta.declaredCount} 题，与预期 ${spec.expectedCount} 题不一致`,
      )
    }
    if (meta.validCount === 0) {
      throw new Error(`${meta.name}：有效题为 0，已阻止构建`)
    }

    banks.push(meta)
    for (const question of result.questions) {
      questions[question.id] = question
    }
    anomalies.push(...result.anomalies)
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'banks.json'),
    `${JSON.stringify({ banks, questions }, null, 2)}\n`,
    'utf8',
  )
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'anomalies.json'),
    `${JSON.stringify(anomalies, null, 2)}\n`,
    'utf8',
  )

  console.log('[parse-banks] 解析完成')
  for (const bank of banks) {
    console.log(
      `  ${bank.name}：声明 ${bank.declaredCount}，解析 ${bank.parsedCount}，` +
        `有效 ${bank.validCount}，异常 ${bank.anomalyCount}`,
    )
    console.log(
      `    单选 ${bank.typeCounts.single} / 多选 ${bank.typeCounts.multi} / ` +
        `判断 ${bank.typeCounts.judge}，章节 ${bank.chapters.length}`,
    )
  }
  if (anomalies.length > 0) {
    console.log(`  异常明细（${anomalies.length} 条）：`)
    for (const anomaly of anomalies) {
      const where = anomaly.number ? `第 ${anomaly.number} 题` : '题库级'
      console.log(
        `    - ${anomaly.bankId} ${where}${anomaly.line ? `（行 ${anomaly.line}）` : ''} ` +
          `[${anomaly.code}] ${anomaly.message}`,
      )
    }
  }
  console.log(`  输出：src/data/banks.json、src/data/anomalies.json`)
}

try {
  main()
} catch (error) {
  console.error(`[parse-banks] 失败：${error.message}`)
  process.exit(1)
}
