/**
 * 会话 ID 生成。
 *
 * crypto.randomUUID() 只在安全上下文（HTTPS / localhost）可用；
 * 手机通过 http://局域网IP 访问时会是 undefined，因此必须兜底。
 */

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  const cryptoApi = globalThis.crypto

  if (typeof cryptoApi?.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  let out = ''
  for (const byte of bytes) out += HEX[byte]
  return out
}

export function createId(prefix = ''): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return prefix ? `${prefix}_${uuid}` : uuid
  return `${prefix ? `${prefix}_` : ''}${Date.now().toString(36)}-${randomHex(12)}`
}

export function createSessionId(): string {
  return createId()
}
