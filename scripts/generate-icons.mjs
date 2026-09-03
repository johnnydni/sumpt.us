/**
 * Renders the PWA icon set without an image toolchain.
 *
 * The mark is the same `+` that drives the app's primary action: sum, and us.
 * Drawing it is pure pixel maths, so a hand-rolled PNG encoder (zlib is in
 * node) is enough and the repo stays dependency-free for this step.
 *
 * Run with: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const INK = [17, 17, 17]
const NAVY = [23, 42, 70]
const WHITE = [255, 255, 255]

function crc32(buffer) {
  let c
  const table = []
  for (let n = 0; n < 256; n += 1) {
    c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** rgba is a flat Uint8Array of size * size * 4. */
function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // truecolour with alpha
  header[10] = 0
  header[11] = 0
  header[12] = 0

  // One filter byte (0 = none) per scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy?.(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * Anti-aliased by supersampling 3×3 per pixel — enough to keep the plus's
 * edges clean at 192px without a real rasteriser.
 */
function render(size, { background, foreground, inset, arm, thickness, radius }) {
  const buffer = Buffer.alloc(size * size * 4)
  const centre = size / 2
  const samples = 3
  const step = 1 / samples

  const inPlus = (x, y) => {
    const dx = Math.abs(x - centre)
    const dy = Math.abs(y - centre)
    const horizontal = dx <= arm && dy <= thickness / 2
    const vertical = dy <= arm && dx <= thickness / 2
    return horizontal || vertical
  }

  const inBackground = (x, y) => {
    if (radius <= 0) return true
    const min = inset
    const max = size - inset
    if (x < min || x > max || y < min || y > max) return false
    const cx = Math.min(Math.max(x, min + radius), max - radius)
    const cy = Math.min(Math.max(y, min + radius), max - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
  }

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let bg = 0
      let fg = 0
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = px + (sx + 0.5) * step
          const y = py + (sy + 0.5) * step
          if (inBackground(x, y)) bg += 1
          if (inPlus(x, y)) fg += 1
        }
      }
      const total = samples * samples
      const bgAlpha = bg / total
      const fgAlpha = fg / total

      // Composite: foreground over background over transparent.
      const alpha = Math.max(bgAlpha, fgAlpha)
      const mix = alpha === 0 ? 0 : fgAlpha / alpha
      const offset = (py * size + px) * 4
      for (let channel = 0; channel < 3; channel += 1) {
        buffer[offset + channel] = Math.round(
          background[channel] * (1 - mix) + foreground[channel] * mix,
        )
      }
      buffer[offset + 3] = Math.round(alpha * 255)
    }
  }

  return buffer
}

function write(path, size, options) {
  const full = resolve(root, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, encodePng(size, render(size, options)))
  console.log(`wrote ${path} (${size}×${size})`)
}

// Standard icons: white sheet, ink plus — the app's own canvas.
for (const size of [192, 512]) {
  write(`public/icons/icon-${size}.png`, size, {
    background: WHITE,
    foreground: INK,
    inset: 0,
    radius: size * 0.22,
    arm: size * 0.26,
    thickness: size * 0.085,
  })
}

// Maskable: full-bleed navy so platform masks never clip into white.
write('public/icons/icon-512-maskable.png', 512, {
  background: NAVY,
  foreground: WHITE,
  inset: 0,
  radius: 0,
  arm: 512 * 0.19,
  thickness: 512 * 0.062,
})

writeFileSync(
  resolve(root, 'public/favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#FFFFFF"/>
  <path d="M32 15v34M15 32h34" stroke="#111111" stroke-width="7" stroke-linecap="square"/>
</svg>
`,
)
console.log('wrote public/favicon.svg')
