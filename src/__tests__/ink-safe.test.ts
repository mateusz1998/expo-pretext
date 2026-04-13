import './setup-mocks'
import { describe, test, expect } from 'bun:test'
import { getInkSafePadding } from '../ink-safe'
import type { TextStyle } from '../types'

const ITALIC_STYLE: TextStyle = {
  fontFamily: 'Georgia',
  fontSize: 80,
  fontWeight: 'bold',
  fontStyle: 'italic',
}

const NORMAL_STYLE: TextStyle = {
  fontFamily: 'System',
  fontSize: 16,
}

describe('getInkSafePadding', () => {
  test('empty string returns zero padding', () => {
    const result = getInkSafePadding('', ITALIC_STYLE)
    expect(result.padding.paddingLeft).toBe(0)
    expect(result.padding.paddingRight).toBe(0)
    expect(result.padding.paddingTop).toBe(0)
    expect(result.padding.paddingBottom).toBe(0)
    expect(result.inkWidth).toBe(0)
    expect(result.advance).toBe(0)
    expect(result.isOvershooting).toBe(false)
  })

  test('non-italic text returns zero padding (fast path)', () => {
    const result = getInkSafePadding('hello', NORMAL_STYLE)
    expect(result.padding.paddingLeft).toBe(0)
    expect(result.padding.paddingRight).toBe(0)
    expect(result.padding.paddingTop).toBe(0)
    expect(result.padding.paddingBottom).toBe(0)
    expect(result.isOvershooting).toBe(false)
  })

  test('italic text returns non-negative padding', () => {
    const result = getInkSafePadding('fly', ITALIC_STYLE)
    expect(result.padding.paddingLeft).toBeGreaterThanOrEqual(0)
    expect(result.padding.paddingRight).toBeGreaterThanOrEqual(0)
    expect(result.padding.paddingTop).toBeGreaterThanOrEqual(0)
    expect(result.padding.paddingBottom).toBeGreaterThanOrEqual(0)
    expect(result.inkWidth).toBeGreaterThan(0)
    expect(result.advance).toBeGreaterThan(0)
  })

  test('inkWidth >= advance', () => {
    const result = getInkSafePadding('fly', ITALIC_STYLE)
    expect(result.inkWidth).toBeGreaterThanOrEqual(result.advance)
  })

  test('isOvershooting matches padding presence', () => {
    const result = getInkSafePadding('fly', ITALIC_STYLE)
    const hasPadding =
      result.padding.paddingLeft > 0 ||
      result.padding.paddingRight > 0 ||
      result.padding.paddingTop > 0 ||
      result.padding.paddingBottom > 0
    expect(result.isOvershooting).toBe(hasPadding)
  })

  test('padding values are finite numbers', () => {
    const result = getInkSafePadding('fly', ITALIC_STYLE)
    expect(Number.isFinite(result.padding.paddingLeft)).toBe(true)
    expect(Number.isFinite(result.padding.paddingRight)).toBe(true)
    expect(Number.isFinite(result.padding.paddingTop)).toBe(true)
    expect(Number.isFinite(result.padding.paddingBottom)).toBe(true)
    expect(Number.isFinite(result.inkWidth)).toBe(true)
    expect(Number.isFinite(result.advance)).toBe(true)
  })
})
