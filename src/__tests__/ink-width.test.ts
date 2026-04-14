import './setup-mocks'
import { describe, test, expect } from 'bun:test'
import { measureInkBounds, measureInkWidth } from '../ink-width'
import type { TextStyle } from '../types'

const STYLE: TextStyle = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

describe('measureInkWidth', () => {
  test('empty string returns 0', () => {
    expect(measureInkWidth('', STYLE)).toBe(0)
  })

  test('non-empty string returns positive number', () => {
    const w = measureInkWidth('hello', STYLE)
    expect(w).toBeGreaterThan(0)
    expect(Number.isFinite(w)).toBe(true)
  })

  test('measureInkBounds width matches measureInkWidth', () => {
    const bounds = measureInkBounds('hello', STYLE)
    expect(bounds.width).toBe(measureInkWidth('hello', STYLE))
    expect(bounds.right).toBeGreaterThan(bounds.left)
    expect(bounds.bottom).toBeGreaterThan(bounds.top)
  })

  test('longer text wider than shorter text', () => {
    expect(measureInkWidth('much longer text', STYLE)).toBeGreaterThan(measureInkWidth('short', STYLE))
  })

  test('multi-line returns max line width', () => {
    expect(measureInkWidth('a\nbb\nccccc', STYLE)).toBe(measureInkWidth('ccccc', STYLE))
  })

  test('scales with font size', () => {
    expect(measureInkWidth('hello', { ...STYLE, fontSize: 32 })).toBeGreaterThan(
      measureInkWidth('hello', { ...STYLE, fontSize: 12 })
    )
  })
})
