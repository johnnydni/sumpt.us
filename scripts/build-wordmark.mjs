/**
 * Turns the supplied wordmark artwork into the asset the app ships.
 *
 * The source is black-on-white artwork. What the UI needs is a *mask*: the ink
 * carried in the alpha channel with no colour of its own, so the logo can be
 * painted with currentColor and stays correct wherever it sits. Anti-aliased
 * edges survive because alpha is derived from luminance rather than thresholded.
 *
 * Output is greyscale+alpha (PNG colour type 4) — half the bytes of RGBA for
 * artwork that has no colour to begin with.
 *
 * Run with: node scripts/build-wordmark.mjs
 */
import { deflateSync, inflateSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = resolve(root, 'brand/wordmark-source.png')
const OUTPUT = resolve(root, 'public/brand/wordmark.png')

/** Ink below this luminance is fully opaque; pure white is fully transparent. */
const INK_FLOOR = 24
const WHITE_CEILING = 246

function crcTable() {
  const table = []
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
}
const TABLE = crcTable()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
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

function decode(file) {
  const buf = readFileSync(file)
  let off = 8
  const idat = []
  let header
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      header = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), colour: data[9] }
    }
    if (type === 'IDAT') idat.push(data)
    off += 12 + len
  }
  if (header.colour !== 6) throw new Error(`expected RGBA source, got colour type ${header.colour}`)

  const { width, height } = header
  const stride = width * 4
  const raw = inflateSync(Buffer.concat(idat))
  const pixels = Buffer.alloc(height * stride)

  // Reverse the per-scanline PNG filters.
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x += 1) {
      const a = x >= 4 ? pixels[y * stride + x - 4] : 0
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const c = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0
      let value = line[x]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      pixels[y * stride + x] = value & 0xff
    }
  }

  return { width, height, pixels }
}

function encodeGreyAlpha(width, height, data) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 4 // greyscale + alpha
  const stride = width * 2
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const { width, height, pixels } = decode(SOURCE)

/** Ink coverage 0..255, derived from luminance so edges stay smooth. */
const ink = new Uint8Array(width * height)
for (let i = 0; i < width * height; i += 1) {
  const r = pixels[i * 4]
  const g = pixels[i * 4 + 1]
  const b = pixels[i * 4 + 2]
  const a = pixels[i * 4 + 3]
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const coverage =
    luma <= INK_FLOOR ? 1 : luma >= WHITE_CEILING ? 0 : (WHITE_CEILING - luma) / (WHITE_CEILING - INK_FLOOR)
  ink[i] = Math.round(coverage * (a / 255) * 255)
}

// Trim the surrounding white so the logo can be positioned by its own bounds.
let top = height
let bottom = -1
let left = width
let right = -1
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (ink[y * width + x] > 8) {
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
  }
}

const outWidth = right - left + 1
const outHeight = bottom - top + 1
const out = Buffer.alloc(outWidth * outHeight * 2)
for (let y = 0; y < outHeight; y += 1) {
  for (let x = 0; x < outWidth; x += 1) {
    const alpha = ink[(y + top) * width + (x + left)]
    const o = (y * outWidth + x) * 2
    out[o] = 0 // grey value is irrelevant under a mask; keep it black
    out[o + 1] = alpha
  }
}

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, encodeGreyAlpha(outWidth, outHeight, out))

console.log(`source  ${width}×${height}`)
console.log(`trimmed ${outWidth}×${outHeight}  (aspect ${(outWidth / outHeight).toFixed(4)})`)
console.log(`wrote   public/brand/wordmark.png`)
