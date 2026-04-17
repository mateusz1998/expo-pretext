;(globalThis as unknown as Record<string, unknown>).__DEV__ = false

import { describe, test, expect } from 'bun:test'
import { measureHeights } from '../prepare'
import type { TextStyle } from '../types'

const STYLE: TextStyle = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

describe('measureHeights batch optimization', () => {
  test('empty array returns empty result', () => {
    expect(measureHeights([], STYLE, 300)).toEqual([])
  })

  test('single text returns single height', () => {
    const result = measureHeights(['Hello World'], STYLE, 300)
    expect(result.length).toBe(1)
    expect(result[0]).toBeGreaterThan(0)
  })

  test('multiple texts return matching heights', () => {
    const texts = ['Short', 'Medium length text', 'A longer text that will wrap in a narrow container']
    const result = measureHeights(texts, STYLE, 100)
    expect(result.length).toBe(3)
    expect(result.every(h => h > 0)).toBe(true)
  })

  test('batch is deterministic — same input produces same output', () => {
    const texts = ['A', 'B', 'C', 'D', 'E']
    const r1 = measureHeights(texts, STYLE, 200)
    const r2 = measureHeights(texts, STYLE, 200)
    expect(r1).toEqual(r2)
  })

  test('large batch (100 texts) completes without errors', () => {
    const texts = Array.from({ length: 100 }, (_, i) => `Text number ${i} with some content`)
    const start = performance.now()
    const result = measureHeights(texts, STYLE, 200)
    const elapsed = performance.now() - start
    expect(result.length).toBe(100)
    expect(elapsed).toBeLessThan(1000) // sanity check
  })
})
