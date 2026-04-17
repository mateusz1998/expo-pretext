;(globalThis as unknown as Record<string, unknown>).__DEV__ = false

import { describe, test, expect } from 'bun:test'
import { prepareWithSegments } from '../prepare'
import { layoutWithLines } from '../layout'
import { buildTextMorph } from '../morphing'
import type { TextStyle } from '../types'

const STYLE: TextStyle = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

describe('buildTextMorph', () => {
  test('empty inputs produce empty morph', () => {
    const morph = buildTextMorph([], [], 24)
    expect(morph.lines.length).toBe(0)
    expect(morph.fromHeight).toBe(0)
    expect(morph.toHeight).toBe(0)
    expect(morph.heightAt(0)).toBe(0)
    expect(morph.heightAt(1)).toBe(0)
  })

  test('same text produces matching lines', () => {
    const text = 'Hello World'
    const prepared = prepareWithSegments(text, STYLE)
    const { lines } = layoutWithLines(prepared, 200)
    const morph = buildTextMorph(lines, lines, 24)
    expect(morph.fromLineCount).toBe(morph.toLineCount)
    expect(morph.fromHeight).toBe(morph.toHeight)
    for (const line of morph.lines) {
      expect(line.existsInFrom).toBe(true)
      expect(line.existsInTo).toBe(true)
      expect(line.fromText).toBe(line.toText)
    }
  })

  test('from short to long text increases lines', () => {
    const shortText = 'Thinking...'
    const longText = 'The quick brown fox jumps over the lazy dog near the riverbank on a sunny day'
    const shortLines = layoutWithLines(prepareWithSegments(shortText, STYLE), 150).lines
    const longLines = layoutWithLines(prepareWithSegments(longText, STYLE), 150).lines
    const morph = buildTextMorph(shortLines, longLines, 24)

    expect(morph.toLineCount).toBeGreaterThan(morph.fromLineCount)
    expect(morph.toHeight).toBeGreaterThan(morph.fromHeight)
    expect(morph.lines.length).toBe(Math.max(shortLines.length, longLines.length))

    // Extra lines in 'to' should not exist in 'from'
    for (let i = shortLines.length; i < morph.lines.length; i++) {
      expect(morph.lines[i]!.existsInFrom).toBe(false)
      expect(morph.lines[i]!.existsInTo).toBe(true)
    }
  })

  test('from long to short text decreases lines', () => {
    const longText = 'A very long text that wraps across several lines in a narrow container'
    const shortText = 'Done.'
    const longLines = layoutWithLines(prepareWithSegments(longText, STYLE), 100).lines
    const shortLines = layoutWithLines(prepareWithSegments(shortText, STYLE), 100).lines
    const morph = buildTextMorph(longLines, shortLines, 24)

    expect(morph.fromLineCount).toBeGreaterThan(morph.toLineCount)
    // Extra lines in 'from' should not exist in 'to'
    for (let i = shortLines.length; i < morph.lines.length; i++) {
      expect(morph.lines[i]!.existsInFrom).toBe(true)
      expect(morph.lines[i]!.existsInTo).toBe(false)
    }
  })

  test('heightAt interpolates linearly', () => {
    const from = layoutWithLines(prepareWithSegments('Short', STYLE), 200).lines
    const to = layoutWithLines(prepareWithSegments('A longer text that wraps to more lines', STYLE), 100).lines
    const morph = buildTextMorph(from, to, 24)

    expect(morph.heightAt(0)).toBe(morph.fromHeight)
    expect(morph.heightAt(1)).toBe(morph.toHeight)
    const mid = morph.heightAt(0.5)
    expect(mid).toBe((morph.fromHeight + morph.toHeight) / 2)
  })

  test('heightAt clamps progress to 0-1', () => {
    const lines = layoutWithLines(prepareWithSegments('Hello', STYLE), 200).lines
    const morph = buildTextMorph(lines, lines, 24)
    expect(morph.heightAt(-1)).toBe(morph.fromHeight)
    expect(morph.heightAt(2)).toBe(morph.toHeight)
  })

  test('visibleLinesAt interpolates and rounds', () => {
    const from = layoutWithLines(prepareWithSegments('A', STYLE), 200).lines // 1 line
    const to = layoutWithLines(prepareWithSegments('A\nB\nC\nD\nE', STYLE), 200).lines
    const morph = buildTextMorph(from, to, 24)

    expect(morph.visibleLinesAt(0)).toBe(morph.fromLineCount)
    expect(morph.visibleLinesAt(1)).toBe(morph.toLineCount)
  })

  test('from empty to text', () => {
    const to = layoutWithLines(prepareWithSegments('Hello World', STYLE), 200).lines
    const morph = buildTextMorph([], to, 24)
    expect(morph.fromHeight).toBe(0)
    expect(morph.toHeight).toBeGreaterThan(0)
    expect(morph.heightAt(0)).toBe(0)
    expect(morph.heightAt(1)).toBe(morph.toHeight)
    for (const line of morph.lines) {
      expect(line.existsInFrom).toBe(false)
      expect(line.existsInTo).toBe(true)
    }
  })

  test('from text to empty', () => {
    const from = layoutWithLines(prepareWithSegments('Hello World', STYLE), 200).lines
    const morph = buildTextMorph(from, [], 24)
    expect(morph.fromHeight).toBeGreaterThan(0)
    expect(morph.toHeight).toBe(0)
    for (const line of morph.lines) {
      expect(line.existsInFrom).toBe(true)
      expect(line.existsInTo).toBe(false)
    }
  })

  test('height equals lineCount times lineHeight for both states', () => {
    const from = layoutWithLines(prepareWithSegments('Line one\nLine two', STYLE), 200).lines
    const to = layoutWithLines(prepareWithSegments('A\nB\nC', STYLE), 200).lines
    const morph = buildTextMorph(from, to, 24)
    expect(morph.fromHeight).toBe(morph.fromLineCount * 24)
    expect(morph.toHeight).toBe(morph.toLineCount * 24)
  })
})
