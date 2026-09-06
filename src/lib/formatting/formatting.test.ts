import { describe, expect, it } from 'vitest'
import { formatMoney, moneyGlyphs } from './index'

describe('moneyGlyphs', () => {
  it('splits an amount into the characters it is drawn with', () => {
    expect(moneyGlyphs(5165, 'EUR').map((g) => g.char).join('')).toBe(
      formatMoney(5165, 'EUR'),
    )
  })

  it('marks exactly the digits, so a counter can address them', () => {
    const glyphs = moneyGlyphs(5165, 'EUR')
    expect(glyphs.filter((g) => g.digit).map((g) => g.char)).toEqual(['5', '1', '6', '5'])
  })

  it('pads the major part so a running total keeps its width', () => {
    // The point of the padding: five and fifty-one draw the same number of
    // glyphs, so a counter passing ten does not jump sideways.
    const wide = moneyGlyphs(5165, 'EUR', 2)
    const narrow = moneyGlyphs(500, 'EUR', 2)
    expect(narrow.map((g) => g.char).join('')).toBe('€05.00')
    expect(narrow).toHaveLength(wide.length)
  })

  it('gives zero four digits when padded, which is what becomes four points', () => {
    const zero = moneyGlyphs(0, 'EUR', 2)
    expect(zero.map((g) => g.char).join('')).toBe('€00.00')
    expect(zero.filter((g) => g.digit)).toHaveLength(4)
  })

  it('keeps a multi-letter symbol as one glyph', () => {
    const glyphs = moneyGlyphs(1000, 'CHF')
    expect(glyphs[0]).toEqual({ char: 'CHF', digit: false })
  })

  it('leaves a currency without minor units alone', () => {
    expect(moneyGlyphs(1200, 'JPY').map((g) => g.char).join('')).toBe('¥1,200')
  })
})
