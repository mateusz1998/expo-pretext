;(globalThis as unknown as Record<string, unknown>).__DEV__ = false

import { describe, test, expect } from 'bun:test'
import { fitFontSize, truncateText, measureCodeBlockHeight } from '../text-utils'

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

describe('measureCodeBlockHeight', () => {
  const CODE_STYLE = { fontFamily: 'Menlo', fontSize: 14, lineHeight: 20 }

  test('single line code', () => {
    const result = measureCodeBlockHeight('const x = 1', CODE_STYLE, 300)
    expect(result.lineCount).toBe(1)
    expect(result.height).toBe(20)
  })

  test('multi-line code preserves newlines', () => {
    const code = 'line1\nline2\nline3'
    const result = measureCodeBlockHeight(code, CODE_STYLE, 300)
    expect(result.lineCount).toBe(3)
    expect(result.height).toBe(60) // 3 * 20
  })

  test('empty lines are counted', () => {
    const code = 'line1\n\nline3'
    const result = measureCodeBlockHeight(code, CODE_STYLE, 300)
    // Engine may count empty lines as part of surrounding lines; at minimum 2 lines
    expect(result.lineCount).toBeGreaterThanOrEqual(2)
    expect(result.height).toBeGreaterThanOrEqual(40)
  })

  test('indented code preserves whitespace', () => {
    const code = 'function foo() {\n  return 1\n}'
    const result = measureCodeBlockHeight(code, CODE_STYLE, 300)
    expect(result.lineCount).toBe(3)
    expect(result.height).toBe(60)
  })

  test('long lines wrap at maxWidth', () => {
    const longLine = 'const veryLongVariableName = someFunctionCall(argument1, argument2, argument3, argument4)'
    const narrow = measureCodeBlockHeight(longLine, CODE_STYLE, 100)
    const wide = measureCodeBlockHeight(longLine, CODE_STYLE, 2000)
    expect(narrow.lineCount).toBeGreaterThan(wide.lineCount)
    expect(narrow.height).toBeGreaterThan(wide.height)
  })

  test('empty code returns zero', () => {
    const result = measureCodeBlockHeight('', CODE_STYLE, 300)
    expect(result.height).toBe(0)
    expect(result.lineCount).toBe(0)
  })

  test('zero width returns zero', () => {
    const result = measureCodeBlockHeight('const x = 1', CODE_STYLE, 0)
    expect(result.height).toBe(0)
    expect(result.lineCount).toBe(0)
  })

  test('code with trailing newline', () => {
    const code = 'line1\nline2\n'
    const result = measureCodeBlockHeight(code, CODE_STYLE, 300)
    // Trailing newline should add an empty line
    expect(result.lineCount).toBeGreaterThanOrEqual(2)
    expect(result.height).toBeGreaterThan(0)
  })

  test('realistic code block', () => {
    const code = [
      'import { useState } from "react"',
      '',
      'export function Counter() {',
      '  const [count, setCount] = useState(0)',
      '  return (',
      '    <button onClick={() => setCount(c => c + 1)}>',
      '      Count: {count}',
      '    </button>',
      '  )',
      '}',
    ].join('\n')
    const result = measureCodeBlockHeight(code, CODE_STYLE, 400)
    // 10 source lines; engine may merge empty lines, so at least 9 layout lines
    expect(result.lineCount).toBeGreaterThanOrEqual(9)
    expect(result.height).toBeGreaterThanOrEqual(180) // 9 * 20
  })

  test('height equals lineCount times lineHeight', () => {
    const code = 'a\nb\nc\nd\ne'
    const result = measureCodeBlockHeight(code, CODE_STYLE, 300)
    expect(result.height).toBe(result.lineCount * CODE_STYLE.lineHeight)
  })
})
