/**
 * Turns the mark artwork into the mask the app paints with `currentColor`.
 *
 * Same idea as build-wordmark.mjs: ship alpha, not a picture, so one file
 * serves black on white, white on navy and every accent in between. The source
 * is already keyed and trimmed; this only re-encodes it as greyscale+alpha,
 * which roughly halves the bytes since the colour channels are all zero.
 *
 * Run with: node scripts/build-mark.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync, inflateSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = resolve(root, 'brand/mark-source.png')
const OUTPUT = resolve(root, 'public/brand/mark.png')

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
    if (type === 'IHDR') header = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), colour: data[9] }
    if (type === 'IDAT') idat.push(data)
    off += 12 + len
  }
  if (header.colour !== 6) throw new Error(`expected RGBA source, got colour type ${header.colour}`)

  const { width, height } = header
  const stride = width * 4
  const raw = inflateSync(Buffer.concat(idat))
  const pixels = Buffer.alloc(height * stride)
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
  header[8] = 8
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
const out = Buffer.alloc(width * height * 2)
for (let i = 0; i < width * height; i += 1) {
  out[i * 2] = 0 // ink is painted by currentColor, so grey is always 0
  out[i * 2 + 1] = pixels[i * 4 + 3]
}

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, encodeGreyAlpha(width, height, out))
console.log(`mark.png ${width}x${height}  aspect ${(width / height).toFixed(4)}`)
