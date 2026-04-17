;(globalThis as unknown as Record<string, unknown>).__DEV__ = false

import { describe, it, expect } from 'bun:test'
import { prepareWithSegments } from '../prepare'
import { layoutWithLines, getLastLineWidth, measureNaturalWidth } from '../layout'
import { measureTokenWidth } from '../prepare'
import type { TextStyle } from '../types'

const style: TextStyle = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }
// Char width at fontSize 16: ~8.8px (0.55 * 16)

describe('getLastLineWidth', () => {
  it('returns 0 for empty text', () => {
    const prepared = prepareWithSegments('', style)
    expect(getLastLineWidth(prepared, 300)).toBe(0)
  })

  it('returns positive width for a single short word', () => {
    const prepared = prepareWithSegments('hello', style)
    const width = getLastLineWidth(prepared, 300)
    expect(width).toBeGreaterThan(0)
  })

  it('last line width < maxWidth for multi-line text', () => {
    const maxWidth = 100
    const prepared = prepareWithSegments('The quick brown fox jumps over the lazy dog', style)
    const lastWidth = getLastLineWidth(prepared, maxWidth)
    expect(lastWidth).toBeLessThanOrEqual(maxWidth)
  })

  it('last line width <= maxWidth always', () => {
    const maxWidth = 80
    const prepared = prepareWithSegments('A somewhat longer sentence that will wrap multiple times at this width', style)
    const lastWidth = getLastLineWidth(prepared, maxWidth)
    expect(lastWidth).toBeLessThanOrEqual(maxWidth)
  })
})

describe('measureTokenWidth', () => {
  it('returns positive number for a short token', () => {
    expect(measureTokenWidth('hello', style)).toBeGreaterThan(0)
  })

  it('returns 0 for empty token', () => {
    expect(measureTokenWidth('', style)).toBe(0)
  })

  it('same token twice returns same result (cache consistency)', () => {
    const w1 = measureTokenWidth('test', style)
    const w2 = measureTokenWidth('test', style)
    expect(w1).toBe(w2)
  })

  it('longer token > shorter token width', () => {
    const short = measureTokenWidth('hi', style)
    const long = measureTokenWidth('hello world', style)
    expect(long).toBeGreaterThan(short)
  })
})

describe('doesNextTokenWrap (underlying math)', () => {
  it('token fits: lastLineWidth + tokenWidth <= maxWidth -> false', () => {
    const maxWidth = 300
    const prepared = prepareWithSegments('Hi', style)
    const lastLineWidth = getLastLineWidth(prepared, maxWidth)
    const tokenWidth = measureTokenWidth(' there', style)
    // "Hi" is short, " there" is short, should fit in 300px
    expect(lastLineWidth + tokenWidth > maxWidth).toBe(false)
  })

  it('token overflows: lastLineWidth + tokenWidth > maxWidth -> true', () => {
    const maxWidth = 50
    const prepared = prepareWithSegments('Hello world', style)
    const lastLineWidth = getLastLineWidth(prepared, maxWidth)
    const tokenWidth = measureTokenWidth(' additional long text here', style)
    expect(lastLineWidth + tokenWidth > maxWidth).toBe(true)
  })
})
