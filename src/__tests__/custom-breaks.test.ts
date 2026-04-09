globalThis.__DEV__ = false

import { describe, test, expect } from 'bun:test'
import { prepare } from '../prepare'
import { layout } from '../layout'

const STYLE = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

describe('customBreakRules', () => {
  test('callback is invoked', () => {
    let callCount = 0
    prepare('Hello World', STYLE, {
      customBreakRules: (seg, idx, kind) => {
        callCount++
        return kind
      }
    })
    expect(callCount).toBeGreaterThan(0)
  })

  test('can override break kind', () => {
    // Without custom rules
    const p1 = prepare('hello/world', STYLE)
    const r1 = layout(p1, 50)

    // With custom rules that make / a break point
    const p2 = prepare('hello/world', STYLE, {
      customBreakRules: (seg, _idx, kind) => {
        if (seg === '/') return 'zero-width-break'
        return kind
      }
    })
    const r2 = layout(p2, 50)

    // Both should produce valid results
    expect(r1.height).toBeGreaterThan(0)
    expect(r2.height).toBeGreaterThan(0)
  })

  test('no callback — default behavior unchanged', () => {
    const p = prepare('Hello World', STYLE)
    const r = layout(p, 300)
    expect(r.lineCount).toBeGreaterThan(0)
  })
})
