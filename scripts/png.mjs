/**
 * A PNG reader and writer, in the two shapes this repo needs.
 *
 * The environment has no image toolchain, and zlib ships with node, so the
 * codec is written out by hand. It lives here rather than in each script
 * because three copies of a decoder is three places for a bug to hide.
 */
import { readFileSync } from 'node:fs'
import { deflateSync, inflateSync } from 'node:zlib'

const TABLE = (() => {
  const table = []
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

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

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Read an 8-bit RGBA PNG (colour type 6) into a flat pixel buffer. */
export function decodeRgba(file) {
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
  if (!header) throw new Error(`${file}: no IHDR`)
  if (header.colour !== 6) throw new Error(`${file}: expected RGBA, got colour type ${header.colour}`)

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

function encode(width, height, channels, colourType, data) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = colourType
  const stride = width * channels
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0 // filter: none
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Grey + alpha (colour type 4) — what a CSS mask needs, at half the bytes. */
export function encodeGreyAlpha(width, height, data) {
  return encode(width, height, 2, 4, data)
}

/** Truecolour + alpha (colour type 6). */
export function encodeRgba(width, height, data) {
  return encode(width, height, 4, 6, data)
}

/**
 * Box-filter resample of the alpha channel down to `w`×`h`, returned 0..1.
 *
 * Averaging every source pixel that falls under a target pixel is what keeps
 * thin parts of a drawing visible at icon sizes; point sampling drops them.
 */
export function resampleAlpha(src, w, h) {
  const out = new Float64Array(w * h)
  for (let y = 0; y < h; y += 1) {
    const y0 = (y * src.height) / h
    const y1 = ((y + 1) * src.height) / h
    for (let x = 0; x < w; x += 1) {
      const x0 = (x * src.width) / w
      const x1 = ((x + 1) * src.width) / w
      let sum = 0
      let count = 0
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy += 1) {
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx += 1) {
          sum += src.pixels[(sy * src.width + sx) * 4 + 3]
          count += 1
        }
      }
      out[y * w + x] = count ? sum / count / 255 : 0
    }
  }
  return out
}
