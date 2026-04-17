;(globalThis as unknown as Record<string, unknown>).__DEV__ = false

import { describe, test, expect } from 'bun:test'
import { prepare } from '../prepare'
import { layout } from '../layout'
import { prepareStreaming } from '../streaming'
import type { TextStyle } from '../types'

// Tests for the height computation logic underlying useAnimatedTextHeight
// and useCollapsibleHeight. The hooks themselves are thin Reanimated wrappers
// that can't be tested in bun:test (no React renderer or Reanimated runtime).

const STYLE: TextStyle = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

describe('animated text height computation', () => {
  test('height changes when text grows', () => {
    const short = layout(prepare('Hello', STYLE), 200).height
    const long = layout(prepare('Hello World this is a longer text that wraps', STYLE), 200).height
    expect(long).toBeGreaterThanOrEqual(short)
  })

  test('height changes when width narrows', () => {
    const text = 'The quick brown fox jumps over the lazy dog'
    const wide = layout(prepare(text, STYLE), 500).height
    const narrow = layout(prepare(text, STYLE), 100).height
    expect(narrow).toBeGreaterThan(wide)
  })

  test('streaming prepare returns same height as regular prepare', () => {
    const text = 'Hello World'
    const key = {}
    const streamPrepared = prepareStreaming(key, text, STYLE)
    const regularPrepared = prepare(text, STYLE)
    const streamHeight = layout(streamPrepared, 200).height
    const regularHeight = layout(regularPrepared, 200).height
    expect(streamHeight).toBe(regularHeight)
  })

  test('empty text has zero height', () => {
    expect(layout(prepare('', STYLE), 200).height).toBe(0)
  })
})

describe('collapsible height computation', () => {
  test('expanded is taller than collapsed', () => {
    const fullText = 'This is a very long article with many paragraphs that goes on and on with lots of detail and explanation about various topics'
    const preview = 'This is a very long article...'

    const expandedHeight = layout(prepare(fullText, STYLE), 200).height
    const collapsedHeight = layout(prepare(preview, STYLE), 200).height

    expect(expandedHeight).toBeGreaterThan(collapsedHeight)
  })

  test('both heights are positive for non-empty text', () => {
    const expandedHeight = layout(prepare('Full content here', STYLE), 200).height
    const collapsedHeight = layout(prepare('Preview...', STYLE), 200).height
    expect(expandedHeight).toBeGreaterThan(0)
    expect(collapsedHeight).toBeGreaterThan(0)
  })

  test('height equals lineCount times lineHeight', () => {
    const result = layout(prepare('Line one\nLine two\nLine three', STYLE, { whiteSpace: 'pre-wrap' }), 200)
    expect(result.height).toBe(result.lineCount * 24)
  })

  test('same text same height regardless of preparation order', () => {
    const text = 'Some consistent text for testing'
    const h1 = layout(prepare(text, STYLE), 200).height
    const h2 = layout(prepare(text, STYLE), 200).height
    expect(h1).toBe(h2)
  })
})
