// streaming.test.ts
// Tests for prepareStreaming() and clearStreamingState().
//
// The native module is unavailable in the test environment (mocked to null),
// so prepareStreaming falls back to the same JS estimator path that prepare()
// uses.  All cache-warming logic is a no-op in this environment, which lets us
// focus on state-machine behaviour: append detection, cache hits, key isolation,
// and state clearing.

import { describe, test, expect } from 'bun:test'

// React Native global required by font-utils.ts
;(globalThis as unknown as Record<string, unknown>).__DEV__ = false

import { prepareStreaming, clearStreamingState } from '../streaming'
import { layout } from '../layout'

const STYLE = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

// ---------------------------------------------------------------------------
// 1. Basic prepare — returns PreparedText with correct height
// ---------------------------------------------------------------------------

describe('prepareStreaming() basic prepare', () => {
  test('returns a PreparedText object for a simple string', () => {
    const key = {}
    const result = prepareStreaming(key, 'Hello', STYLE)
    expect(result).toBeDefined()
    // PreparedText must be usable by layout()
    const laid = layout(result, 300)
    expect(laid.lineCount).toBe(1)
    expect(laid.height).toBe(24)
  })

  test('returned PreparedText produces correct height for multi-word text', () => {
    const key = {}
    const result = prepareStreaming(key, 'Hello World Test', STYLE)
    const laid = layout(result, 100)
    expect(laid.lineCount).toBeGreaterThan(1)
    expect(laid.height).toBeGreaterThan(24)
  })

  test('height equals lineCount * lineHeight', () => {
    const key = {}
    const result = prepareStreaming(key, 'Hello World Test Long', STYLE)
    const laid = layout(result, 100)
    expect(laid.height).toBe(laid.lineCount * STYLE.lineHeight)
  })
})

// ---------------------------------------------------------------------------
// 2. Same text twice — returns cached result (same reference)
// ---------------------------------------------------------------------------

describe('prepareStreaming() same text twice', () => {
  test('returns identical reference on second call with same text', () => {
    const key = {}
    const first = prepareStreaming(key, 'Hello', STYLE)
    const second = prepareStreaming(key, 'Hello', STYLE)
    expect(second).toBe(first)
  })

  test('cache hit does not change layout output', () => {
    const key = {}
    const first = prepareStreaming(key, 'Hello World', STYLE)
    const second = prepareStreaming(key, 'Hello World', STYLE)
    expect(layout(second, 300).lineCount).toBe(layout(first, 300).lineCount)
  })
})

// ---------------------------------------------------------------------------
// 3. Append detection — "Hello" → "Hello World" triggers append path
// ---------------------------------------------------------------------------

describe('prepareStreaming() append detection', () => {
  test('"Hello" → "Hello World" returns a new PreparedText', () => {
    const key = {}
    const first = prepareStreaming(key, 'Hello', STYLE)
    const second = prepareStreaming(key, 'Hello World', STYLE)
    // Different text → must be a new (different) prepared result
    expect(second).not.toBe(first)
  })

  test('appended result lays out correctly at standard width', () => {
    const key = {}
    prepareStreaming(key, 'Hello', STYLE)
    const result = prepareStreaming(key, 'Hello World', STYLE)
    const laid = layout(result, 300)
    expect(laid.lineCount).toBe(1)
    expect(laid.height).toBe(24)
  })

  test('second call with same appended text returns cached reference', () => {
    const key = {}
    prepareStreaming(key, 'Hello', STYLE)
    const appended = prepareStreaming(key, 'Hello World', STYLE)
    const cached = prepareStreaming(key, 'Hello World', STYLE)
    expect(cached).toBe(appended)
  })
})

// ---------------------------------------------------------------------------
// 4. Non-append change — "Hello" → "Goodbye" triggers full prepare
// ---------------------------------------------------------------------------

describe('prepareStreaming() non-append change', () => {
  test('"Hello" → "Goodbye" returns a new PreparedText', () => {
    const key = {}
    const first = prepareStreaming(key, 'Hello', STYLE)
    const second = prepareStreaming(key, 'Goodbye', STYLE)
    expect(second).not.toBe(first)
  })

  test('result after non-append change lays out correctly', () => {
    const key = {}
    prepareStreaming(key, 'Hello', STYLE)
    const result = prepareStreaming(key, 'Goodbye', STYLE)
    const laid = layout(result, 300)
    expect(laid.lineCount).toBe(1)
    expect(laid.height).toBe(24)
  })

  test('subsequent same text is now cached with new source', () => {
    const key = {}
    prepareStreaming(key, 'Hello', STYLE)
    const changed = prepareStreaming(key, 'Goodbye', STYLE)
    const cached = prepareStreaming(key, 'Goodbye', STYLE)
    expect(cached).toBe(changed)
  })
})

// ---------------------------------------------------------------------------
// 5. Empty text — clears state, returns minimal PreparedText
// ---------------------------------------------------------------------------

describe('prepareStreaming() empty text', () => {
  test('returns a PreparedText for empty string', () => {
    const key = {}
    const result = prepareStreaming(key, '', STYLE)
    expect(result).toBeDefined()
  })

  test('empty text gives height = 0 and lineCount = 0 from layout()', () => {
    const key = {}
    const result = prepareStreaming(key, '', STYLE)
    const laid = layout(result, 300)
    expect(laid.height).toBe(0)
    expect(laid.lineCount).toBe(0)
  })

  test('after empty text, the next call with real text is a full prepare (not cached)', () => {
    const key = {}
    const first = prepareStreaming(key, 'Hello', STYLE)
    prepareStreaming(key, '', STYLE)            // clears state
    const third = prepareStreaming(key, 'Hello', STYLE)
    // State was wiped, so third is a freshly prepared object
    expect(third).not.toBe(first)
  })
})

// ---------------------------------------------------------------------------
// 6. clearStreamingState — after clear, next call is a full prepare
// ---------------------------------------------------------------------------

describe('clearStreamingState()', () => {
  test('after clear, same text returns a new PreparedText (not the cached one)', () => {
    const key = {}
    const first = prepareStreaming(key, 'Hello', STYLE)
    clearStreamingState(key)
    const second = prepareStreaming(key, 'Hello', STYLE)
    expect(second).not.toBe(first)
  })

  test('clear on unknown key does not throw', () => {
    expect(() => clearStreamingState({})).not.toThrow()
  })

  test('after clear, appending from scratch still works correctly', () => {
    const key = {}
    prepareStreaming(key, 'Hello World', STYLE)
    clearStreamingState(key)
    // Fresh start — "Hello" is new base, not an append of the cleared state
    prepareStreaming(key, 'Hello', STYLE)
    const result = prepareStreaming(key, 'Hello World', STYLE)
    const laid = layout(result, 300)
    expect(laid.lineCount).toBe(1)
    expect(laid.height).toBe(24)
  })
})

// ---------------------------------------------------------------------------
// 7. Multiple keys — independent state per key
// ---------------------------------------------------------------------------

describe('prepareStreaming() multiple keys', () => {
  test('two keys track independently', () => {
    const keyA = {}
    const keyB = {}
    const a1 = prepareStreaming(keyA, 'Hello', STYLE)
    const b1 = prepareStreaming(keyB, 'World', STYLE)

    // Second call with same text on each key → cache hits
    const a2 = prepareStreaming(keyA, 'Hello', STYLE)
    const b2 = prepareStreaming(keyB, 'World', STYLE)
    expect(a2).toBe(a1)
    expect(b2).toBe(b1)
  })

  test('clearing one key does not affect the other', () => {
    const keyA = {}
    const keyB = {}
    prepareStreaming(keyA, 'Hello', STYLE)
    const b1 = prepareStreaming(keyB, 'World', STYLE)

    clearStreamingState(keyA)

    // keyB cache must still be intact
    const b2 = prepareStreaming(keyB, 'World', STYLE)
    expect(b2).toBe(b1)
  })

  test('appending on one key does not affect state of another', () => {
    const keyA = {}
    const keyB = {}
    prepareStreaming(keyA, 'Hello', STYLE)
    const b1 = prepareStreaming(keyB, 'Foo', STYLE)

    // Append on keyA
    prepareStreaming(keyA, 'Hello World', STYLE)

    // keyB should still return cached result for 'Foo'
    const b2 = prepareStreaming(keyB, 'Foo', STYLE)
    expect(b2).toBe(b1)
  })
})

// ---------------------------------------------------------------------------
// 8. Rapid appends — simulate token-by-token streaming
// ---------------------------------------------------------------------------

describe('prepareStreaming() rapid appends (token-by-token simulation)', () => {
  test('streaming a sentence token by token does not throw', () => {
    const key = {}
    const tokens = ['The', ' quick', ' brown', ' fox', ' jumps', ' over', ' the', ' lazy', ' dog']
    let accumulated = ''
    expect(() => {
      for (const token of tokens) {
        accumulated += token
        prepareStreaming(key, accumulated, STYLE)
      }
    }).not.toThrow()
  })

  test('each token append produces a valid layout result', () => {
    const key = {}
    const tokens = ['Hello', ' World', ' from', ' the', ' streaming', ' engine']
    let accumulated = ''
    for (const token of tokens) {
      accumulated += token
      const result = prepareStreaming(key, accumulated, STYLE)
      const laid = layout(result, 300)
      expect(laid.lineCount).toBeGreaterThanOrEqual(1)
      expect(laid.height).toBeGreaterThanOrEqual(24)
    }
  })

  test('final accumulated text matches a direct prepare result layout-wise', () => {
    const keyStreamed = {}
    const keyDirect = {}
    const tokens = ['Streaming', ' is', ' token', ' by', ' token']
    let accumulated = ''
    for (const token of tokens) {
      accumulated += token
      prepareStreaming(keyStreamed, accumulated, STYLE)
    }
    const streamed = prepareStreaming(keyStreamed, accumulated, STYLE) // cached
    const direct = prepareStreaming(keyDirect, accumulated, STYLE)

    expect(layout(streamed, 300).lineCount).toBe(layout(direct, 300).lineCount)
    expect(layout(streamed, 300).height).toBe(layout(direct, 300).height)
  })

  test('many single-character appends do not throw and return valid results', () => {
    const key = {}
    const text = 'abcdefghijklmnopqrstuvwxyz'
    let accumulated = ''
    expect(() => {
      for (const ch of text) {
        accumulated += ch
        const result = prepareStreaming(key, accumulated, STYLE)
        expect(result).toBeDefined()
      }
    }).not.toThrow()
  })
})
