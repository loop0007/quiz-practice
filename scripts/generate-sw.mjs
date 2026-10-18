#!/usr/bin/env node
/**
 * E6：构建后生成 Service Worker。
 * 预缓存 dist 内的全部静态文件；文件名带内容哈希，缓存版本也随之变化。
 *
 * 运行：vite build 之后执行（由 npm run build 串联）。
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SW_FILE = path.join(DIST, 'sw.js')

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(abs))
    else files.push(abs)
  }
  return files
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[generate-sw] 未找到 dist/index.html，请先运行 vite build')
  process.exit(1)
}

const files = walk(DIST)
  .filter((file) => file !== SW_FILE)
  .sort()

const precache = files.map(
  (file) => `./${path.relative(DIST, file).split(path.sep).join('/')}`,
)

const hash = crypto.createHash('sha256')
for (const file of files) {
  hash.update(path.relative(DIST, file))
  hash.update(fs.readFileSync(file))
}
const version = hash.digest('hex').slice(0, 12)

const sw = `/* 由 scripts/generate-sw.mjs 生成，请勿手动修改。 */
const CACHE = 'quiz-practice-${version}'
const PRECACHE = ${JSON.stringify(precache, null, 2)}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy))
          return response
        })
        .catch(() =>
          caches
            .match('./index.html', { ignoreVary: true })
            .then((cached) => cached || Response.error()),
        ),
    )
    return
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => Response.error())
    }),
  )
})
`

fs.writeFileSync(SW_FILE, sw)
console.log(`[generate-sw] 预缓存 ${precache.length} 个文件，版本 ${version}`)
