;(globalThis as unknown as Record<string, unknown>).__DEV__ = false

import { describe, test, expect } from 'bun:test'
import { computeZoomLayout } from '../zoom'
import type { TextStyle } from '../types'

const STYLE: TextStyle = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

describe('computeZoomLayout', () => {
  test('scale 1.0 returns base fontSize', () => {
    const result = computeZoomLayout('Hello', STYLE, 200, 1.0)
    expect(result.fontSize).toBe(16)
    expect(result.lineHeight).toBe(24)
  })

  test('scale 2.0 doubles fontSize', () => {
    const result = computeZoomLayout('Hello', STYLE, 200, 2.0)
    expect(result.fontSize).toBe(32)
    expect(result.lineHeight).toBe(48)
  })

  test('scale 0.5 halves fontSize', () => {
    const result = computeZoomLayout('Hello', STYLE, 200, 0.5)
    expect(result.fontSize).toBe(8) // min clamp at 8
  })

  test('larger fontSize produces taller layout (same width)', () => {
    const text = 'The quick brown fox jumps over the lazy dog near the riverbank'
    const small = computeZoomLayout(text, STYLE, 200, 1.0)
    const large = computeZoomLayout(text, STYLE, 200, 2.0)
    expect(large.height).toBeGreaterThan(small.height)
  })

  test('larger fontSize increases lineCount at same width', () => {
    const text = 'The quick brown fox jumps over the lazy dog near the riverbank on a sunny day'
    const small = computeZoomLayout(text, STYLE, 200, 1.0)
    const large = computeZoomLayout(text, STYLE, 200, 3.0)
    expect(large.lineCount).toBeGreaterThanOrEqual(small.lineCount)
  })

  test('minFontSize clamps down', () => {
    const result = computeZoomLayout('Hello', STYLE, 200, 0.1, { minFontSize: 10 })
    expect(result.fontSize).toBe(10)
  })

  test('maxFontSize clamps up', () => {
    const result = computeZoomLayout('Hello', STYLE, 200, 10, { maxFontSize: 48 })
    expect(result.fontSize).toBe(48)
  })

  test('empty text returns zero height', () => {
    const result = computeZoomLayout('', STYLE, 200, 1.5)
    expect(result.height).toBe(0)
    expect(result.lineCount).toBe(0)
  })

  test('zero width returns zero height', () => {
    const result = computeZoomLayout('Hello', STYLE, 0, 1.5)
    expect(result.height).toBe(0)
  })

  test('height equals lineCount times lineHeight', () => {
    const result = computeZoomLayout('Hello World this is test text', STYLE, 150, 1.5)
    expect(result.height).toBe(result.lineCount * result.lineHeight)
  })

  test('lineHeight scales proportionally with fontSize', () => {
    const base = computeZoomLayout('Hello', STYLE, 200, 1.0)
    const doubled = computeZoomLayout('Hello', STYLE, 200, 2.0)
    expect(doubled.lineHeight / base.lineHeight).toBeCloseTo(2.0, 1)
  })

  test('rapid scale changes do not throw', () => {
    const scales = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 0.3, 5.0]
    for (const scale of scales) {
      expect(() => computeZoomLayout('Test text', STYLE, 200, scale)).not.toThrow()
    }
  })
})
