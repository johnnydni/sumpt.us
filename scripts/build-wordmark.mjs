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

/**
 * Stop at the lettering.
 *
 * The source artwork is a lockup: "sumpt.us" followed by a gap and then the
 * mark. The mark is its own asset now (brand/mark-source.png), and the app
 * composes the two, so baking it in here would put it on screen twice at a
 * size nobody could adjust. The widest run of blank columns in the right-hand
 * third is that gap; everything past it is the mark.
 */
const blank = []
for (let x = left; x <= right; x += 1) {
  let inked = false
  for (let y = top; y <= bottom && !inked; y += 1) if (ink[y * width + x] > 8) inked = true
  blank.push(inked ? 0 : 1)
}
let gapStart = -1
let runStart = -1
let widest = 0
for (let i = 0; i <= blank.length; i += 1) {
  if (blank[i] && runStart < 0) runStart = i
  if ((!blank[i] || i === blank.length) && runStart >= 0) {
    const run = i - runStart
    // Only a gap in the right-hand third, wider than a word space, separates
    // the mark from the lettering — inter-letter gaps are far narrower.
    if (run > widest && runStart / blank.length > 0.6 && run > outHeightGuess(bottom, top) * 0.15) {
      widest = run
      gapStart = runStart
    }
    runStart = -1
  }
}
if (gapStart > 0) right = left + gapStart - 1

function outHeightGuess(b, t) {
  return b - t + 1
}

const lettersWidth = right - left + 1
const outHeight = bottom - top + 1
const inked = (x, y) => ink[(y + top) * width + (x + left)] > 8

/**
 * Every glyph, as a run of inked columns.
 *
 * The face sets its own letterfit, so the spacing that looks right is the
 * spacing already in the artwork. Reading it back out is the only way to
 * change the word without inventing a rhythm of our own.
 */
const glyphs = []
for (let x = 0, start = -1; x <= lettersWidth; x += 1) {
  let hit = false
  for (let y = 0; y < outHeight && !hit; y += 1) if (inked(x, y)) hit = true
  if (hit && start < 0) start = x
  if ((!hit || x === lettersWidth) && start >= 0) {
    glyphs.push({ start, end: x - 1 })
    start = -1
  }
}

/**
 * The name lost its full stop: sumpt.us became sumptus.
 *
 * The period is the one glyph that is both narrow and sitting on the baseline
 * rather than reaching up into the x-height — no letter here does both. Found
 * that way rather than by column number, so re-running this against a
 * re-exported source still finds it.
 */
const widths = glyphs.map((g) => g.end - g.start + 1).sort((a, b) => a - b)
const medianWidth = widths[widths.length >> 1]
const period = glyphs.findIndex((glyph) => {
  if (glyph.end - glyph.start + 1 > medianWidth * 0.5) return false
  let highest = outHeight
  for (let y = 0; y < outHeight; y += 1) {
    for (let x = glyph.start; x <= glyph.end; x += 1) {
      if (inked(x, y)) {
        highest = Math.min(highest, y)
        break
      }
    }
  }
  return highest > outHeight * 0.55
})
if (period <= 0 || period >= glyphs.length - 1) {
  throw new Error('no full stop found between two letters — has the artwork changed?')
}

// The gap to close it with is the one the other letters already use. The two
// gaps flanking the period are excluded: punctuation is set looser than type.
const gaps = glyphs
  .slice(1)
  .map((glyph, index) => ({ gap: glyph.start - glyphs[index].end - 1, index }))
  .filter(({ index }) => index !== period - 1 && index !== period)
  .map(({ gap }) => gap)
  .sort((a, b) => a - b)
const letterGap = gaps[gaps.length >> 1]

const cutFrom = glyphs[period - 1].end + 1 + letterGap
const cutTo = glyphs[period + 1].start
const outWidth = lettersWidth - (cutTo - cutFrom)

const out = Buffer.alloc(outWidth * outHeight * 2)
for (let y = 0; y < outHeight; y += 1) {
  for (let x = 0; x < outWidth; x += 1) {
    const source = x < cutFrom ? x : x + (cutTo - cutFrom)
    const o = (y * outWidth + x) * 2
    out[o] = 0 // grey value is irrelevant under a mask; keep it black
    out[o + 1] = ink[(y + top) * width + (source + left)]
  }
}

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, encodeGreyAlpha(outWidth, outHeight, out))

console.log(`source   ${width}×${height}`)
console.log(`glyphs   ${glyphs.length}, full stop at index ${period}, letter gap ${letterGap}px`)
console.log(`closed   ${cutTo - cutFrom}px removed between "t" and "u"`)
console.log(`trimmed  ${outWidth}×${outHeight}  (aspect ${(outWidth / outHeight).toFixed(4)})`)
console.log(`wrote   public/brand/wordmark.png`)
