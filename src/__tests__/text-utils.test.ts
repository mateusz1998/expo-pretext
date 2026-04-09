globalThis.__DEV__ = false

import { describe, test, expect } from 'bun:test'
import { fitFontSize, truncateText } from '../text-utils'

const STYLE = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

describe('fitFontSize', () => {
  test('returns positive number for normal text', () => {
    const size = fitFontSize('Hello World', STYLE, 200, 100)
    expect(size).toBeGreaterThan(0)
  })

  test('larger box allows larger font', () => {
    const small = fitFontSize('Hello World', STYLE, 100, 50)
    const large = fitFontSize('Hello World', STYLE, 400, 200)
    expect(large).toBeGreaterThanOrEqual(small)
  })

  test('respects minSize', () => {
    const size = fitFontSize('Hello World', STYLE, 1, 1, { minSize: 8 })
    expect(size).toBeGreaterThanOrEqual(8)
  })

  test('respects maxSize', () => {
    const size = fitFontSize('Hi', STYLE, 10000, 10000, { maxSize: 72 })
    expect(size).toBeLessThanOrEqual(72)
  })

  test('empty text returns minSize', () => {
    expect(fitFontSize('', STYLE, 200, 100)).toBe(1)
  })

  test('zero box returns minSize', () => {
    expect(fitFontSize('Hello', STYLE, 0, 100)).toBe(1)
  })
})

describe('truncateText', () => {
  test('short text not truncated', () => {
    const result = truncateText('Hi', STYLE, 300, 3)
    expect(result.truncated).toBe(false)
    expect(result.text).toBe('Hi')
  })

  test('long text truncated', () => {
    const longText = 'This is a very long text that should definitely wrap to multiple lines when rendered at normal font size in a narrow container'
    const result = truncateText(longText, STYLE, 100, 2)
    expect(result.truncated).toBe(true)
    expect(result.text.endsWith('\u2026')).toBe(true)
    expect(result.lineCount).toBe(2)
  })

  test('custom ellipsis', () => {
    const longText = 'This is a very long text that wraps to many many lines'
    const result = truncateText(longText, STYLE, 100, 1, { ellipsis: '...' })
    if (result.truncated) {
      expect(result.text.endsWith('...')).toBe(true)
    }
  })

  test('empty text', () => {
    const result = truncateText('', STYLE, 300, 3)
    expect(result.text).toBe('')
    expect(result.truncated).toBe(false)
  })

  test('zero maxLines', () => {
    const result = truncateText('Hello', STYLE, 300, 0)
    expect(result.text).toBe('')
  })
})
