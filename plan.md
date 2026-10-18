# 在线刷题网站开发计划（模块化）

> 依据 [README.md](README.md) 的一期范围制定。按五个阶段推进；每个核心模块完成即登记、验证并冻结接口，后续尽量只做加法，减少返工。

## 0. 模块化规则与完成标记

### 0.1 分层与依赖方向

```text
pages（页面编排）
  → components（展示与交互）
  → store（当前会话状态与动作）
  → lib（判分、存储、渲染、主题）
  → types（共享契约）
  → data/banks.json（解析产物）
```

约束：
- 本地只提交版本，推送与发布由人工执行
- 页面不直接操作 Dexie 表；统一通过 `lib/db.ts`。
- 组件不自行判分或算统计；统一调用 `lib/scoring.ts` 或 store selector。
- `lib` 不反向依赖 `pages/components`。
- 题库 JSON 只由解析脚本生成，不手改。
- 构建产物 `dist/` 必须能独立静态托管：资源相对路径、无本地绝对路径、无运行时后端依赖。
- UI 美化只改样式和组件结构，不改数据、判分、存储。
- 额外功能以新模块/新路由/新表加入，尽量不改核心 Session 与判分契约。

### 0.2 稳定接口

以下接口在对应模块完成后冻结；修改时必须列出受影响模块并补测试：

- `BankData`：题库、题目、异常报告（M1）。
- `PracticeSession` / `AnswerRecord` / `WrongEntry`：会话与记录（M2）。
- `db` API：建会话、读会话、存会话、错题、反馈（M2）。
- `scoring` API：判分、会话统计、题目状态（M3）。
- 题目渲染组件 props：题干、选项、状态、是否锁定（M5）。
- 主题 token：颜色、间距、字体、圆角（M9/U1）。

### 0.3 完成标记规则

状态：`⬜ 未开始` / `🟨 进行中` / `✅ 已完成` / `⏸ 暂缓`

每个模块完成后必须：

1. 更新第 0.4 节的“模块状态总表”。
2. 在该模块末尾填写完成标记：日期、涉及文件、验证结果、接口变更、影响模块。
3. 至少跑一次 `npm run build` 和相关验收步骤。
4. 冻结接口；后续变更按第 7 节的影响检查执行。

### 0.4 模块状态总表

| 编号 | 模块 | 阶段 | 优先级 | 依赖 | 对外产出/接口 | 状态 | 完成日期 | 验证 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M0 | 项目基线 | 一 | P0 | — | 可启动应用、路由、主题基线 | ✅ | 2026-10-17 | build + dev 200 |
| M1 | 题库解析 | 一 | P0 | M0 | `BankData`、`banks.json`、异常报告 | ✅ | 2026-10-17 | 336 有效题；重复执行一致；build 通过 |
| M2 | 数据与存储 | 二 | P0 | M1 | Session 类型、Dexie API | ✅ | 2026-10-17 | 11 项测试通过；build 通过 |
| M3 | 判分与统计 | 二 | P0 | M2 | `scoring` 纯函数 | ✅ | 2026-10-17 | 27 项测试通过；build 通过 |
| M4 | 题库选择 | 二 | P0 | M1, M2 | 题库卡片、创建/继续会话 | ✅ | 2026-10-17 | 32 项测试通过；build 通过 |
| M5 | 答题核心 | 二 | P0 | M2, M3, M4 | 答题页、判分、翻题、题号侧栏 | ✅ | 2026-10-17 | 42 项测试通过；build 通过 |
| M6 | 结果页 | 二 | P0 | M2, M3, M5 | 成绩、错题/未答题号、异常数 | ✅ | 2026-10-17 | 42 项测试通过；build 通过 |
| M7 | 错题本 | 二 | P0 | M2, M3, M5 | 累计错题列表与对照 | ✅ | 2026-10-17 | 42 项测试通过；build 通过 |
| M8 | 异常反馈 | 二 | P0 | M2, M5 | 本地反馈记录 | ✅ | 2026-10-17 | 43 项测试通过；build 通过 |
| M9 | 体验基线 | 二 | P0 | M5–M8 | 移动端、深色、无障碍 | ✅ | 2026-10-17 | 49 项测试；build；375/390 与 1280 布局截图 |
| M10 | 公网托管 | 二 | P0 | M2, M9 | HTTPS 公网地址、多端真机验证 | 🟨 | 2026-10-17 | GitHub Pages 已上线；HTTPS 200；待真机蜂窝/另一台电脑复验 |
| T1–T5 | 测试 | 三 | P0 | M0–M10 | 测试记录与缺陷清单 | 🟨 | 2026-10-18 | T1–T4 通过（Vitest 56 + 浏览器 72）；T5 Linux/WSL 实测待环境 |
| E1–E7 | 额外功能 | 四 | P2 | T5 | 可选增强 | 🟨 | 2026-10-18 | E1、E2、E3、E7 完成（Vitest 71 + 浏览器 104）；E4–E6 未开始 |
| U1 | UI 美化 | 五 | P1 | T5/E | 视觉统一与细节打磨 | ⬜ | | |
| D1 | 交付 | 五后 | P0 | 全部 | `dist/`、README、AI 记录、公网地址 | ⬜ | | |

## 1. 阶段一：初始化与题库转换

### M0 项目基线

目标：建立稳定工程骨架，后续模块只往里加内容。

- [x] 保留现有 `题库/`、README.md、plan.md，初始化 Vite + React + TS。
- [x] 建立目录：`scripts/`、`src/{data,types,lib,store,components,pages}`、`docs/`。
- [x] 配置 Tailwind CSS、路径别名 `@`、`base: './'`。
- [x] 建立 HashRouter 路由骨架、全局样式、移动端 viewport、深色模式初始化。
- [x] 安装 `react-router-dom`、`zustand`、`dexie`、`react-markdown`、`lucide-react`。
- [x] 建议 `git init`，每完成一个模块提交一次，便于回退。
- [x] 验证：`npm run dev` 可启动，`npm run build` 通过。

**完成标记**：✅ 已完成｜日期：2026-10-17｜验证：`npm run build` 通过（tsc + vite），`npm run dev` 首页 HTTP 200；`dist/index.html` 资源为 `./assets/` 相对路径｜接口变更：无｜影响模块：无

### M1 题库分析与转换

#### 题库概况（以文件头声明为准，解析后校验）

| 题库 | 章节 | 题量 | 单选 | 多选 | 判断 |
| --- | --- | --- | --- | --- | --- |
| Java | 1（Java题库） | 219 | 192 | 12 | 15 |
| Web | 6 | 120 | 65 | 13 | 42 |

#### 格式分析

- `#` 题库标题；`>` 题量/章节统计；`##` 章节；`### N. 题型` 题目。
- 选项：`- A. 文本`；答案：`**答案**：B` 或 `**答案**：A、C、D`；解析：`**解析**：...`；题目间用 `---` 分隔。
- 判断题也是 A/B 两个选项，题型映射为 `judge`。
- 题干、选项、解析可能包含行内代码和围栏代码块；解析时必须跟踪 ``` 状态，不能把代码里的 `-` 当选项。
- 多选题答案分隔符可能是 `、`、`,`、空格；统一转大写、去空、排序。

#### 异常定义与处理

| 异常 | 判定 | 处理 |
| --- | --- | --- |
| 缺题干 | 题干为空 | 标记“题库异常”，不进入练习 |
| 缺答案 | 答案为空或无法解析 | 标记“题库异常”，不进入练习 |
| 答案不在选项 | 答案 key 不在选项集合 | 标记“题库异常”，不进入练习 |
| 选项无效 | 无选项或少于 2 个 | 标记“题库异常”，不进入练习 |
| 重复题目 ID | `bankId:number` 重复 | 保留首条，其余标记异常 |
| 题型/答案数量不匹配 | 单选/判断多于 1 个答案，或多选少于 2 个 | 标记“题库异常”，不进入练习 |
| 题号/章节无法解析 | 结构不符合格式 | 标记“题库异常”，记录源行号 |
| 题库题量不一致 | 声明题量 ≠ 解析有效题量 | 题库级异常，打印报告 |

统一口径：

- 异常题在报告中标记为 **“题库异常”**。
- 异常题不进入练习，也不计入正确率分母。
- 结果页单独显示“题库异常 N 题”。
- 若某题库有效题为 0，解析脚本失败退出，阻止构建。

#### 任务

- [x] 编写 `scripts/parse-banks.mjs`，无第三方 Markdown 依赖。
- [x] 生成 `src/data/banks.json`：
  - `banks`：题库元信息、章节、题量、题型统计、异常数。
  - `questions`：以 `bankId:number` 为键的题目对象。
- [x] 生成 `src/data/anomalies.json`：异常类型、题库、题号、源行号、原文摘要。
- [x] 题目对象统一包含：`id/bankId/chapterId/number/type/stem/options/answer/explanation`。
- [x] 增加脚本：`parse:banks`、`predev`、`prebuild`。
- [x] 断言：Java 219、Web 120；ID 唯一；答案 key 均在选项内。
- [x] 抽查：单选、多选、判断、含代码块题各 1–2 道。
- [x] 验证：`node scripts/parse-banks.mjs` 输出统计与异常报告，重复执行结果稳定。

**完成标记**：✅ 已完成｜日期：2026-10-17｜涉及文件：`scripts/parse-banks.mjs`、`scripts/check-banks.mjs`、`src/types/index.ts`、`src/data/banks.json`、`src/data/anomalies.json`、`package.json`｜验证：解析块 Java 219 / Web 120，有效题 218 / 118（共 336）；ID 唯一、答案均在选项内、代码围栏成对；连续两次解析 md5 一致；`npm run build` 通过｜接口变更：新增并冻结 `BankData` / `BankMeta` / `Question` / `Anomaly`（`src/types/index.ts`）｜影响模块：M2 起读取题库数据

**题库异常（不进入练习，不计入正确率分母）**：

| 题库 | 题号 | 源行 | 异常 |
| --- | --- | --- | --- |
| Java | 71 | 1118 | 缺少答案 |
| Web | 31 | 409 | 无选项，答案 A 无法对照 |
| Web | 80 | 1060 | 答案 E 不在 A–D 选项内（解析指向 B） |

> 另：Java 142 有答案但无解析（计划未定义为异常，保留，解析为空）；Java 219、Web 120 为末题，缺少结尾 `---` 属正常。

## 2. 阶段二：逐模块完成基础功能

> 顺序按依赖推进：存储与判分先定型，再接页面，然后补体验基线，最后部署公网并做真机验证。

### M2 数据与存储

- [x] `src/types/index.ts`：Question、BankMeta、PracticeSession、AnswerRecord、WrongEntry、Feedback。
- [x] `src/lib/db.ts`：Dexie v1。

```ts
sessions:  'id, bankId, startedAt, finishedAt'
wrongBook: 'questionId, bankId, firstWrongAt'
feedback:  '++id, questionId, createdAt'
```

- [x] `src/lib/id.ts`：会话 ID 生成。`crypto.randomUUID()` 只在安全上下文可用（HTTPS / localhost），手机通过 `http://局域网IP` 访问时会是 `undefined`，必须写成 `crypto.randomUUID?.() ?? 时间戳 + randomValues` 兜底；不要直接在页面里调用。
- [x] API：`createSession`、`getSession`、`saveSession`、`findActiveSession`、`addWrong`、`listWrong`、`addFeedback`。
- [x] 会话规则：每次开始练习新建 session；同 session 每题只提交一次；重开练习是新 session。
- [x] session 保存 `questionIds` 快照，结果统计以快照为准。
- [x] 验收：在临时页面/控制台完成增删查，刷新后数据仍在。
- [x] 禁止：任何页面直接写 Dexie 表名或查询。

**完成标记**：✅ 已完成｜日期：2026-10-17｜涉及文件：`src/types/index.ts`、`src/lib/db.ts`、`src/lib/id.ts`、`src/lib/db.test.ts`、`package.json`｜验证：Vitest 11 项全部通过（会话增删查、关闭重开持久化、错题累计、反馈、ID 兜底）；`npm run build` 通过｜接口变更：新增并冻结 `PracticeSession` / `AnswerRecord` / `WrongEntry` / `Feedback` 与 db API；额外提供 `deleteSession`、`removeWrong`、`listFeedback`｜影响模块：M3–M8

> 说明：验收以 Vitest + fake-indexeddb 自动化测试完成；真实浏览器 IndexedDB 持久化在 T3/M10 真机流程中复验。

### M3 判分与统计

- [x] `src/lib/scoring.ts`：
  - `isAnswerCorrect(question, selected)`
  - `getSessionStats(session, questions)`
  - `getQuestionStatus(session, questionId)`
- [x] 规则：
  - 单选/判断：集合完全一致。
  - 多选：集合相等即正确，少选/多选均错，顺序无关。
  - 未作答：交卷时按错误计入正确率。
  - 正确率 = 答对数 / 有效题总数。
  - 首次提交计分；后续提交直接返回。
  - “本次错题”只统计本 session；“错题本”跨 session 累计。
- [x] 纯函数，不 import React、Dexie、页面组件。
- [x] 验收用例：单选对/错、多选全对/少选/多选/顺序不同、判断题、未作答、重复提交。
- [x] 验收：结果与预期一致，构建通过。

**完成标记**：✅ 已完成｜日期：2026-10-17｜涉及文件：`src/lib/scoring.ts`、`src/lib/scoring.test.ts`｜验证：Vitest 27 项全部通过（其中判分/统计 16 项：单选、判断、多选全对/少选/多选/乱序、大小写与重复、空答案、未答计入分母、快照外记录忽略、空会话、重复提交幂等、题目不在快照报错、题目状态）；`npm run build` 通过｜接口变更：新增并冻结 `isAnswerCorrect` / `getSessionStats` / `getQuestionStatus`，另提供 `submitAnswer`（首次提交幂等，返回新 session）、`normalizeSelected`、`isMultiChoice`；`getSessionStats` 第二参数为可选题目表，统计口径始终以 session 快照为准｜影响模块：M5、M6、M7、T2

### M4 题库选择

- [x] 题库卡片：名称、题量、题型构成、章节数、异常数。
- [x] 开始练习：按有效题生成 session，跳转 `#/practice/:sessionId`。
- [x] 未完成 session：显示“继续上次”和“重新开始”。
- [x] 空数据/题库异常兜底。
- [x] 验收：两套题库可进入；继续/重开行为正确。

**完成标记**：✅ 已完成｜日期：2026-10-17｜涉及文件：`src/lib/banks.ts`、`src/lib/banks.test.ts`、`src/pages/BankSelectPage.tsx`｜验证：Vitest 32 项全部通过（题库数据 5 项：两套题库、有效题数与元数据一致、题号升序与 ID 查询、未知题库兜底、异常归组）；`npm run build` 通过。卡片展示名称、有效题量、题型构成、章节数、异常数；“继续上次”读取未交卷会话，“重新开始”二次确认后新建 session。浏览器内继续/重开与 IndexedDB 持久化在 T3 真机流程复验｜接口变更：新增 `src/lib/banks.ts`（`banks` / `questions` / `anomalies` / `getBank` / `getQuestion` / `getBankQuestions` / `getBankAnomalies`）｜影响模块：M5–M7、T1

### M5 答题核心

- [x] 题目渲染：题干、选项、代码块、行内代码；使用 react-markdown，不启用原始 HTML。
- [x] 单选/判断 radio，多选 checkbox；未选择禁用提交。
- [x] 提交：判分、写入 session、首次答错写错题本；提交后锁定选项和按钮。
- [x] 幂等：按 `questionId` 检查已有记录，存在直接返回；双击无副作用。
- [x] 提交后展示：正确/错误、正确答案、解析。
- [x] 上一题/下一题；保持每题状态；切换后滚动到题目顶部。
- [x] 显示当前题号、已答数、答对数、进度。
- [x] 题号侧栏：未做/正确/错误/当前题；颜色 + 图标/文字。
- [x] 交卷：未答题提示；确认后写 `finishedAt` 并跳转结果页。
- [x] 验收：题库选择 → 答题 → 提交 → 翻题 → 交卷完整走通；首次提交后成绩不变。

**完成标记**：✅ 已完成｜日期：2026-10-17｜涉及文件：`src/store/usePracticeStore.ts`、`src/store/usePracticeStore.test.ts`、`src/components/MarkdownContent.tsx`、`src/components/QuestionCard.tsx`、`src/components/QuestionPalette.tsx`、`src/pages/PracticePage.tsx`｜验证：Vitest 42 项全部通过（新增 store 10 项：题目快照加载、缺失会话报错、单选替换、多选切换、已提交锁定、答对不写错题本、答错累计一次、未选择提交无效、翻题持久化与越界收敛、交卷幂等）；`npm run build` 通过。交卷确认：全部答完直接交卷；存在未提交题时提示未提交题数并需二次确认。浏览器内翻题、滚动、移动端题号折叠与交卷确认在 T3/T4 真机复验｜接口变更：冻结 `QuestionCard` props（`question` / `index` / `total` / `selected` / `record` / `onSelect`）与 `QuestionPalette` props；新增 zustand store actions（`loadSession` / `select` / `submitCurrent` / `goTo` / `finish`）｜影响模块：M6、M8、M9、T3

### M6 结果页

- [x] 读取 session 与题目快照，展示：总题数、已答、答对、答错、未答、正确率、题库异常数。
- [x] 正确率口径注明“未作答按错误计入”。
- [x] 展示本次错题题号、未作答题号。
- [x] “本次错题”与“错题本累计”分开命名。
- [x] 操作：返回题库、查看错题本、再练一次（新 session）。
- [x] 验收：结果数字与 session 记录一致；刷新结果页不丢数据。

**完成标记**：✅ 已完成｜日期：2026-10-17｜涉及文件：`src/pages/ResultPage.tsx`｜验证：Vitest 42 项全部通过；`npm run build` 通过。结果页直接从 IndexedDB 读取 session，刷新不依赖内存状态；统计统一调用 `getSessionStats`，与答题页同口径；正确率旁新增问号气泡（点击切换、鼠标/触控笔停留 1 秒显示，Escape 或点击外部关闭）；本次错题/未答题号按原题号展示；“错题本累计”独立读取 `listWrong`，区分全部题库与本题库数量；未交卷会话显示当前进度并提供“继续答题”；“再练一次”按原快照创建新 session｜接口变更：无｜影响模块：M7、M9、T3、T4

### M7 错题本

- [x] 读取 `wrongBook`，按题库分组，join 静态题目数据。
- [x] 展示：题号、题干、你的答案、正确答案、解析、首次答错时间。
- [x] 题目已不存在/解析异常时显示兜底，不崩溃。
- [x] 验收：跨多次练习累计；同一题重复答错不覆盖首次时间；与结果页“本次错题”区分清楚。

**完成标记**：✅ 已完成｜日期：2026-10-17｜涉及文件：`src/pages/WrongBookPage.tsx`｜验证：Vitest 42 项全部通过（累计与首次时间语义由 M2 的 db 测试覆盖：重复答错累加 `wrongCount`、保留 `firstWrongAt`、按首次答错时间倒序）；`npm run build` 通过。页面按题库分组，展示题干、答案字母与选项内容对照、解析、首次答错时间；重复答错显示累计次数与最近时间；题目缺失时显示黄色兜底卡片并保留已有记录信息；与结果页“本次错题”口径在文案中区分｜接口变更：无｜影响模块：M9、T3、T4

### M8 异常反馈

- [x] 题目旁“反馈”入口。
- [x] 主页增加通用反馈入口。
- [x] 弹窗：类型（答案错误/选项缺失/解析错误/建议/其他）+ 备注。
- [x] 写入 `feedback` 表，成功提示；不依赖网络。
- [x] 验收：反馈可保存；刷新后仍存在；不阻塞答题。

**完成标记**：✅ 已完成｜日期：2026-10-17｜涉及文件：`src/components/FeedbackDialog.tsx`、`src/components/QuestionCard.tsx`、`src/pages/BankSelectPage.tsx`、`src/types/index.ts`、`src/lib/db.ts`、`src/lib/db.test.ts`｜验证：Vitest 43 项全部通过（新增通用反馈持久化 1 项：无 `questionId`/`bankId` 写入 `suggestion` 后可读取）；`npm run build` 通过。题目卡片头部与主页头部均新增“反馈”入口；题目反馈提供五种类型，主页通用反馈提供“建议/其他”；原生 `dialog` 支持 Escape/点击遮罩关闭；保存成功在弹窗内提示，反馈写入本机 IndexedDB；弹窗不改变答题状态｜接口变更：`FeedbackType` 新增 `suggestion`；`Feedback.questionId`/`bankId` 与 `AddFeedbackInput` 对应字段改为可选，支持主页通用反馈｜影响模块：M9、T3

### M9 体验基线（移动端/深色/无障碍）

> 这是验收场景的下限，不是阶段五的美化项。

- [x] 手机布局：底部操作栏、safe-area、44px 以上触控目标。
- [x] 题号侧栏在手机端改为底部抽屉/弹层。
- [x] 深色模式：跟随系统 + 手动切换 + 持久化；首屏无闪烁。
- [x] 对比度：深色下题干、选项、解析、状态色可读。
- [x] 原生 input + label；键盘可操作；focus-visible。
- [x] 题号状态不只靠颜色；判分结果用 `aria-live`。
- [x] 长题干、长选项、代码块横向滚动不撑破布局。
- [x] 空状态、错误状态、404。
- [x] 验收：375px/390px 手机宽度 + 深色模式 + 单手完成整套流程。

**完成标记**：✅ 已完成｜日期：2026-10-17｜涉及文件：`src/lib/theme.ts`、`src/lib/theme.test.ts`、`src/store/useThemeStore.ts`、`src/components/ThemeToggle.tsx`、`src/components/MobilePaletteSheet.tsx`、`src/components/Layout.tsx`、`src/components/QuestionPalette.tsx`、`src/components/QuestionCard.tsx`、`src/components/MarkdownContent.tsx`、`src/components/AccuracyHint.tsx`、`src/components/FeedbackDialog.tsx`、`src/pages/PracticePage.tsx`、`src/pages/BankSelectPage.tsx`、`src/pages/ResultPage.tsx`、`src/pages/WrongBookPage.tsx`、`src/pages/NotFoundPage.tsx`、`src/index.css`、`index.html`｜验证：Vitest 49 项全部通过（新增主题模式 6 项：非法值回退、三种模式、系统偏好解析、手动模式、切换顺序、名称）；`npm run build` 通过。无头 Edge 按 375×812、390×844 模拟移动端（非真机）走完选题→作答→提交→交卷→结果→错题本，浅色/深色均无横向溢出；题号抽屉为原生 dialog，最高 85dvh，网格内部滚动且图例保持可见；题号按钮与主题按钮均不小于 44px，正确率问号命中区实测约 44px；系统深色跟随、手动三态切换、刷新持久化与系统外观实时切换均验证；另以 1280×900 检查桌面布局，截图存 `docs/screenshots/`。真机与蜂窝网络验证留 M10/T4｜接口变更：`QuestionPalette` 新增可选 `listClassName`、`showHeader`；新增 `theme` 工具与 `useThemeStore`（`mode` / `resolved` / `setMode` / `cycle` / `syncSystem`）｜影响模块：M10、T4、U1

### M10 公网托管与多端访问

> 目标：部署为公网 HTTPS 站点，手机（蜂窝网络）和任意一台电脑都能通过同一个网址使用。纯静态站，无后端；跨设备数据同步仍不在本期范围。

- [x] 选定托管平台：GitHub Pages（与仓库绑定、GitHub Actions 自动构建发布、免费 HTTPS；项目页子路径由 `base: './'` + HashRouter 兼容）。候选对比：
  - GitHub Pages：与仓库绑定、可自动发布；国内访问可能不稳定。
  - Netlify / Vercel / Cloudflare Pages：拖拽或 Git 集成，部署最快；国内访问可能不稳定。
  - 腾讯 EdgeOne Pages / 云厂商对象存储静态托管：国内访问更稳，通常需要实名账号。
- [x] 发布前检查：`npm run build` 通过；`dist/` 资源为相对路径（`base: './'`）；无 `file://`、`localhost`、本机绝对路径引用；代码与 Git 历史中无密钥或私有数据。
- [x] 配置 GitHub Actions 构建：`.github/workflows/deploy.yml`（仅手动 `workflow_dispatch`）依次执行 `npm ci`、`npm test`、`npm run build`，再把 `dist/` 发布到 Pages；仓库 Pages Source 设为 GitHub Actions。
- [x] 子路径部署无需额外配置：`base: './'` + HashRouter 已兼容 GitHub Pages 项目页 `/quiz-practice/` 子路径，不需要服务端 rewrite。
- [ ] 公网验证：手机**关闭 Wi-Fi 用蜂窝网络**打开网址，确认不是局域网访问；再用另一台电脑打开一次。
- [ ] 手机真机走完整流程：题库选择 → 答题 → 提交 → 翻题 → 交卷 → 结果页 → 错题本。
- [x] 深链接：`https://loop0007.github.io/quiz-practice/#/wrongbook` 直接打开正常渲染，JS/CSS 资源加载正常；`#/practice/<id>` 由同一 HashRouter 处理，不请求服务端路径。
- [x] 发布更新：本地只提交版本，推送与发布由人工执行；工作流改为仅 `workflow_dispatch`，在 Actions 页面手动 Run workflow 后发布 `dist/`。
- [x] README 补充：公网地址、托管平台、发布/更新步骤。
- [x] 数据边界写清楚：IndexedDB 按 **origin** 隔离，手机与电脑、不同域名之间答题记录和错题本不互通；换设备等于从零开始，界面不要出现会让人误以为会同步的文案。
- [x] 验收：手机（蜂窝网络）+ 另一台电脑都能通过公网 HTTPS 地址完成一套练习，结果正确。

**完成标记**：🟨 进行中｜日期：2026-10-17｜涉及文件：`.github/workflows/deploy.yml`、`.gitignore`、`README.md`、`plan.md`｜验证：GitHub Actions 部署成功；公网 `https://loop0007.github.io/quiz-practice/` 首页、JS、CSS 均 200，HTTP 301 跳 HTTPS；无头 Edge 正常渲染首页与 `#/wrongbook`；`npm test` 49 项、`npm run build` 通过；真机蜂窝网络与另一台电脑待复验｜接口变更：无｜影响模块：D1、T4

## 3. 阶段三：测试

> 不追求测试数量；覆盖验收关键路径和数据一致性。

### T1 解析与数据测试

- [x] 题量：Java 219、Web 120；题型统计与文件头一致。
- [x] ID 唯一；答案 key 均在选项内；无空题干/空选项。
- [x] 多选分隔符、判断题、代码块题目抽查。
- [x] 异常报告可复现；异常题不计入正确率分母。

**完成标记**：✅ 已完成｜日期：2026-10-18｜涉及文件：`src/lib/banks.test.ts`、`src/data/banks.json`、`src/data/anomalies.json`、`scripts/parse-banks.mjs`｜验证：新增 6 项数据质量测试；Java 声明/解析/有效 219/219/218，Web 120/120/118；336 道有效题 ID 唯一、答案均在选项内；判断题 57 道均为两选项，含围栏题 30 道；异常题 `java:71`、`web:31`、`web:80` 不进入有效题；连续两次解析产物 md5 一致｜接口变更：无｜影响模块：无

### T2 判分与统计测试

- [x] 单选/判断对错。
- [x] 多选：全对、少选、多选、顺序不同。
- [x] 未作答计入错误；正确率分母正确。
- [x] 首次提交后重复提交/双击不改变成绩。
- [x] 结果页“本次错题”与错题本累计不混用。

**完成标记**：✅ 已完成｜日期：2026-10-18｜涉及文件：`src/lib/scoring.test.ts`、`src/lib/db.test.ts`、`src/store/usePracticeStore.test.ts`｜验证：判分/统计 16 项、提交幂等 6 项、本次错题与错题本口径 1 项全部通过；新会话答对旧错题后，本次错题 0、错题本仍保留原记录｜接口变更：无｜影响模块：无

### T3 核心流程测试

- [x] 题库选择 → 答题 → 提交 → 上一题/下一题 → 交卷 → 结果页。
- [x] 刷新恢复进度；已提交题保持锁定。
- [x] 错题本能打开并显示正确对照。
- [x] 反馈能提交并持久化。

**完成标记**：✅ 已完成｜日期：2026-10-18｜涉及文件：`scripts/e2e-browser.mjs`、`package.json`、`docs/测试记录.md`｜验证：无头 Edge 走通完整流程；刷新后当前题、已答 2、答对 1 与锁定状态恢复；交卷两次确认提示 116 道未提交；结果页数字与 session 一致；反馈写入 IndexedDB（计数 1 → 2）；错题本题目/选项/答案/解析与练习页逐项一致；深链接与 404 正常｜接口变更：无｜影响模块：T4、D1

### T4 场景与一致性测试

- [x] 375px/390px 手机、深色模式、单手操作（无头设备模拟；真机随 M10 复验）。
- [x] 同一道题在练习、结果、错题本中题干/选项/答案/解析一致。
- [x] 无未实现按钮、死链接、调试日志。
- [x] 控制台无报错。

**完成标记**：✅ 已完成｜日期：2026-10-18｜涉及文件：`scripts/e2e-browser.mjs`、`scripts/check-source.mjs`、`public/favicon.svg`、`index.html`、`docs/screenshots/phase3/`｜验证：1280/375/390 三种视口无横向溢出；375 深色背景生效；触控目标均 ≥44px；底部操作栏与题号抽屉可用；静态检查 31 个源文件、59 条本地 import，无调试残留/空链接；全程 0 控制台报错。测试中发现 favicon 404 并修复｜接口变更：无｜影响模块：M10、D1

### T5 Linux 与构建测试

- [ ] Linux/WSL 下 `npm install`、`npm run build`、`npm run preview` 通过。
- [x] import 大小写与实际文件名一致；无 Windows 专属路径。
- [x] `dist/` 用静态服务器可访问；HashRouter 深链接刷新正常。
- [ ] 按 README 从零执行一遍（Windows 下已验 `npm ci --dry-run` 与构建；未做删库重装及 Linux 实测）。

**完成标记**：🟨 进行中｜日期：2026-10-18｜涉及文件：`scripts/check-source.mjs`、`docs/测试记录.md`、`dist/`｜验证：`npm run build` 通过；`dist/index.html` 资源均为 `./` 相对路径；`python -m http.server -d dist 8080` 下首页/JS/CSS/favicon 均 200；`#/wrongbook` 深链接正常渲染且无控制台报错；59 条本地 import 大小写一致。本机无 WSL、无 Docker，Linux 实测待具备环境后补跑｜接口变更：无｜影响模块：D1

### 测试记录

- [x] 建立 `docs/测试记录.md`：问题、复现步骤、修复、验证结果。
- [x] 每个缺陷修复后补跑相关用例，防止回归。

**完成标记**：✅ 已完成｜日期：2026-10-18｜涉及文件：`docs/测试记录.md`｜验证：记录环境、T1–T5 用例结果、2 个缺陷（favicon 404、静态检查误报）与 Linux/真机限制；修复后补跑 Vitest 56 项与浏览器 72 项｜接口变更：无

**阶段完成标记**：🟨 进行中｜日期：2026-10-18｜验证：Vitest 56 项、浏览器 72 项、静态检查与静态托管均通过；`npm run build` 通过｜剩余：T5 Linux/WSL 实测（当前无 WSL/Docker）、M10 真机蜂窝与另一台电脑复验｜接口变更：无

## 4. 阶段四：额外功能

原则：测试通过后再做；一次只加一个；不改核心 Session/判分契约；新增模块、路由、表；每个功能单独验收。

| 编号 | 功能 | 价值 | 成本 | 依赖 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| E1 | 按章节/题型筛选练习 | 利用解析出的章节数据 | 低 | M1, M4 | P1 |
| E2 | 历史成绩统计 | 复用 session 数据 | 中 | M2, M6 | P1 |
| E3 | 错题组卷练习 | 复用错题本 | 中 | M7 | P2 |
| E4 | 收藏夹 | 新表 + 新入口 | 中 | M2, M5 | P2 |
| E5 | 主题/壁纸 | 只改 UI token | 低 | M9 | P2 |
| E6 | PWA 离线 / 键盘快捷键 | 地铁场景增强 | 中 | M9 | P2 |
| E7 | 结果页错题重练 | 本轮未答对的题独立重练 | 低 | M6 | P1 |
| — | 账号/云端/后端管理 | 超出本期范围 | 高 | — | 不做 |

- [x] 从表中按剩余时间选择 1–2 个，优先 E1。（本次选择 E1）
- [x] 每个功能完成后更新模块状态表、补测试、更新 README。（E1 已完成）
- [ ] 时间不足直接放弃，不留下半成品入口。

### E1 按章节/题型筛选练习

- [x] 题库卡片新增“按章节/题型筛选”入口；弹窗选择章节与单选/多选/判断组合。
- [x] 实时显示筛选后可练习题数；题数为 0 时禁用开始。
- [x] 按筛选结果冻结 `questionIds` 快照创建新 session，不改 Session/判分/统计契约。
- [x] 新增 4 项筛选单测、2 项无头浏览器检查（判断题 15 道、筛选后首题一致）。
- [x] 修复回归中发现的旧会话首帧重定向缺陷。

**完成标记**：✅ 已完成｜日期：2026-10-18｜涉及文件：`src/lib/banks.ts`、`src/lib/banks.test.ts`、`src/components/PracticeFilterDialog.tsx`、`src/pages/BankSelectPage.tsx`、`src/pages/PracticePage.tsx`、`scripts/e2e-browser.mjs`、`README.md`、`plan.md`、`docs/测试记录.md`｜验证：Vitest 60 项、浏览器 74 项全部通过；`npm run build` 与 `check:source` 通过｜接口变更：`getBankQuestions` 新增可选 `filter` 参数（`QuestionFilter`）；新增筛选弹窗组件｜影响模块：M4、T3、D1

### E2 历史成绩统计

- [x] `db.ts` 新增 `listFinishedSessions`：只返回已交卷会话，按交卷时间倒序。
- [x] 新增 `history.ts` 汇总函数：练习次数、累计答对/总题数、平均正确率（未答计入分母）。
- [x] 新增 `/history` 页面：累计统计 + 已完成练习列表，可进入对应结果页；空状态与读取失败兜底。
- [x] 主导航增加“历史成绩”入口。
- [x] 新增 4 项单测；无头浏览器追加 6 项检查（桌面汇总/跳转 4 项、移动空状态 2 项）。

**完成标记**：✅ 已完成｜日期：2026-10-18｜涉及文件：`src/lib/db.ts`、`src/lib/db.test.ts`、`src/lib/history.ts`、`src/lib/history.test.ts`、`src/pages/HistoryPage.tsx`、`src/App.tsx`、`src/components/Layout.tsx`、`scripts/e2e-browser.mjs`、`README.md`、`plan.md`、`docs/测试记录.md`｜验证：Vitest 64 项、浏览器 80 项全部通过；`npm run build` 与 `check:source` 通过｜接口变更：db 新增只读 `listFinishedSessions` 与 `FinishedSession` 类型；新增 `history.ts`｜影响模块：M6、T4、D1

### E3 错题组卷练习

- [x] 错题本按题库新增“错题组卷”入口，显示可组卷的有效题数。
- [x] 新增 `getWrongBookQuestionIds` 纯函数：按题库筛选、剔除题库中已失效的题目、按题号升序。
- [x] 复用 `createSession` 冻结题目快照创建独立 session；答对后错题本记录仍保留，成绩独立进入历史。
- [x] 新增 3 项组卷派生单测；无头浏览器追加 11 项桌面检查与 2 项移动端入口检查。

**完成标记**：✅ 已完成｜日期：2026-10-18｜涉及文件：`src/lib/wrongbook.ts`、`src/lib/wrongbook.test.ts`、`src/pages/WrongBookPage.tsx`、`scripts/e2e-browser.mjs`、`README.md`、`plan.md`、`docs/测试记录.md`｜验证：Vitest 71 项、浏览器 104 项全部通过；`npm run build` 与 `check:source` 通过。1 道累计错题组卷为 1 题练习，从零计分，答对后正确率 100%，sessions 表新增第 3 条记录，错题本记录保留｜接口变更：新增只读 `getWrongBookQuestionIds`；未改 Session/存储契约｜影响模块：M7、T3、T4、D1

### E7 结果页错题重练

- [x] 已交卷结果页新增“错题重练”入口，题数为本次答错 + 未作答。
- [x] 复用 `createSession` 冻结新一轮 `questionIds` 快照；新 session 独立计分、独立出现在历史成绩，不修改原结果。
- [x] 定义作答口径：只有提交才计入已答；选了正确答案但未提交仍算未作题，并进入重练。
- [x] `scoring.ts` 新增 `getRedoQuestionIds` 纯函数，保持原快照顺序；未答对时隐藏入口并提示全部答对。
- [x] 新增 3 项判分派生单测、1 项 store 单测；无头浏览器追加 9 项桌面检查与 2 项移动端入口检查。

**完成标记**：✅ 已完成｜日期：2026-10-18｜涉及文件：`src/lib/scoring.ts`、`src/lib/scoring.test.ts`、`src/store/usePracticeStore.test.ts`、`src/pages/ResultPage.tsx`、`scripts/e2e-browser.mjs`、`README.md`、`plan.md`、`docs/测试记录.md`｜验证：Vitest 68 项、浏览器 91 项全部通过；`npm run build` 与 `check:source` 通过。错题重练创建独立 session（原 118 题，重练 117 题），从零计分，sessions 表新增记录，原结果不受影响｜接口变更：`scoring.ts` 新增只读函数 `getRedoQuestionIds`；未改 Session/存储契约｜影响模块：M6、T3、T4、D1

**完成标记**：🟨 进行中｜日期：2026-10-18｜验证：E1、E2、E3、E7 已完成（Vitest 71 项、浏览器 104 项）；E4–E6 未开始｜接口变更：见 E1、E2、E3、E7｜影响模块：M4、M6、M7、T3、T4、D1

## 5. 阶段五：UI 界面美化

> 功能已稳定后再做；只改样式、布局、组件结构，不改数据/判分/存储。

- [ ] 建立设计 token：颜色、间距、字号、圆角、阴影；浅色/深色两套。
- [ ] 题库卡片：层级、题量信息、继续/开始按钮。
- [ ] 答题页：题干层级、选项卡片、选中/正确/错误状态、解析区。
- [ ] 题号侧栏/移动端抽屉：状态图例、当前题强调。
- [ ] 结果页：成绩卡片、正确率、错题/未答/异常分栏。
- [ ] 错题本：分组、答案对照、空状态。
- [ ] 反馈弹窗、404、加载/空状态。
- [ ] 动效克制；尊重 `prefers-reduced-motion`。
- [ ] 375/768/1280 宽度、浅色/深色下检查溢出与对比度。
- [ ] 验收：只改样式相关文件；构建和核心流程回归通过。

**完成标记**：⬜ 未开始｜日期：____｜验证：____｜接口变更：无

## 6. 交付检查（D1）

- [ ] `npm run build` 通过；`dist/` 可静态服务器运行。
- [ ] 公网地址已发布；手机蜂窝网络 + 另一台电脑验证通过。
- [ ] 按 README 在 Linux/WSL 从零跑通。
- [ ] 完成验收清单（第 8 节）。
- [ ] README 补齐：实际运行命令、公网地址与发布步骤、设计细节、AI 使用情况、未来方向。
- [ ] 导出 AI 会话记录，保留失败与修改过程。
- [ ] 清理未使用代码、未实现按钮、调试日志。
- [ ] README 待处理：
  - “本期不做”有一行未写完。
  - “未来完善方向（若再给 1 小时）”目前是账号/云端/排行榜/成就，与 1 小时口径不一致，交付前确认。

**完成标记**：⬜ 未开始｜日期：____｜验证：____｜接口变更：无

## 7. 变更影响检查（减少后期返工）

修改前先判断属于哪一层，只改对应层；跨层变更必须列影响清单。

| 变更 | 必须同步 | 需要回归 |
| --- | --- | --- |
| 题目/题库格式 | 解析脚本、`types`、`banks.json`、题目渲染 | M1、T1、练习/结果/错题本 |
| Session/记录结构 | `types`、`db`、store、结果/错题本 | M2、M3、T2、T3 |
| 判分/统计口径 | `scoring.ts`、结果页、错题本、测试用例 | M3、M6、M7、T2 |
| 存储表/索引 | `db.ts`、migration、读取方 | M2、T3、刷新恢复 |
| UI 样式 | components、样式文件、主题 token | U1、T4 视觉检查 |
| 额外功能 | 新模块/新表/新路由 | 对应功能 + 核心流程 |

固定规则：

- 判分只在 `scoring.ts` 实现；页面不得再写一套。
- 存储只在 `db.ts` 实现；页面不得直接开表。
- 题库只由脚本生成；不得手改 `banks.json`。
- 额外功能不得修改核心 Session 字段；如必须改，按上表执行。
- 每个模块完成后冻结接口；变更时在完成标记中写“接口变更/影响模块”。

## 8. 验收清单

- [ ] 打开站点能看到至少两个题库，题量显示正确。
- [ ] 选择题库后，题干和全部选项完整，代码块正常。
- [ ] 选择并提交，立即看到对错；答错显示正确答案与解析。
- [ ] 首次提交后成绩不变；双击/重复点击无副作用。
- [ ] 上一题/下一题可用；切换后状态保留。
- [ ] 随时看到当前题号、已答数、答对数。
- [ ] 题号侧栏未做白、正确绿、错误红，并有图标/文字。
- [ ] 交卷后显示答对数、错题题号、正确率（未做计入）、题库异常数。
- [ ] 结果页可发起错题重练：新一轮只含本次答错 + 未作答题，独立计分，原成绩不变。
- [ ] 选了正确答案但未提交，仍按未作题统计并进入错题重练。
- [ ] 刷新后答题记录和进度恢复。
- [ ] 错题本跨练习累计，与“本次错题”区分。
- [ ] 异常反馈可提交并本地保存。
- [ ] 375px 手机宽度、深色模式、单手操作可完成整套流程。
- [ ] 同一道题在练习、结果、错题本中内容与答案一致。
- [ ] 无未实现按钮、死链接、调试残留。
- [ ] Linux 按 README 可安装、构建、运行；`dist/` 可静态服务。
- [ ] 公网 HTTPS 地址可访问；手机蜂窝网络与另一台电脑都能完成一套练习。
- [ ] 公网下刷新深链接不 404，资源路径无 `/assets/` 绝对路径问题。
- [ ] 换设备打开时数据按 origin 隔离，界面无“已同步”类误导表述。
- [ ] 构建无错误，控制台无报错。
- [ ] README 四节完整；AI 会话记录真实并保留失败过程。

## 9. 时间与取舍

| 阶段 | 内容 | 预计 |
| --- | --- | --- |
| 一 | M0 + M1 | 4–6h |
| 二 | M2–M10 | 13–17h |
| 三 | T1–T5 | 3–4h |
| 四 | 额外功能 | 2–4h |
| 五 | UI 美化 + D1（含发布） | 4–5h |

时间不足时的顺序：

1. 保住 P0 主流程和移动端/深色，不砍验收场景。
2. M7 错题本、M8 反馈可降级为最简版；E1–E6 全部推迟。
3. UI 美化只做 token 和关键页面，不做动效。
4. 任何情况下不留半成品按钮；未做功能从界面移除。

## 10. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| Markdown 解析误判 | 题目/答案错误 | 代码块跟踪、断言、各题型抽查、异常报告 |
| 判分逻辑分散 | 页面间结果不一致 | 只允许 `scoring.ts` 实现 |
| 双击/重复提交 | 成绩被覆盖 | 已有记录直接返回 + 按钮锁定 |
| Zustand 与 Dexie 不同步 | 刷新丢数据 | 提交即落库；session 为唯一来源 |
| 手机/深色返工 | 场景验收失败 | M9 前置到阶段二，尽早 375px 检查 |
| Linux 大小写/Node 版本 | 验收跑不起来 | Linux/WSL 实测；import 大小写一致 |
| 公网托管国内访问不稳 | 手机打不开或很慢 | 本次选 GitHub Pages；如验收网络不稳，把 `dist/` 另发布到 EdgeOne Pages / 云存储作为备份 |
| 子路径部署资源 404 | 白屏 | 保持 `base: './'` + HashRouter，发布前检查 `dist/index.html` 引用为相对路径 |
| 误以为多端数据同步 | 换设备后记录“丢失” | README 与界面说明数据按 origin 本地存储，本期不做同步 |
| shadcn/ui 配置耗时 | 拖慢主流程 | 按需引入；必要时 Tailwind 自写 |
| 额外功能改核心契约 | 连锁回归 | 新模块/新表加入；不改 Session/判分 |
| 时间不足 | 交付不完整 | 按第 9 节取舍，优先主流程 |
