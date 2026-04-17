;(globalThis as unknown as Record<string, unknown>).__DEV__ = false

import { describe, test, expect } from 'bun:test'
import { prepareWithBudget, PrepareBudgetTracker } from '../perf-budget'
import type { TextStyle } from '../types'

const STYLE: TextStyle = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

describe('prepareWithBudget', () => {
  test('returns prepared handle', () => {
    const result = prepareWithBudget('Hello World', STYLE, 100)
    expect(result.prepared).toBeDefined()
  })

  test('returns timing metadata', () => {
    const result = prepareWithBudget('Hello World', STYLE, 100)
    expect(typeof result.elapsedMs).toBe('number')
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
    expect(typeof result.budgetExceeded).toBe('boolean')
  })

  test('budget not exceeded for short text with generous budget', () => {
    const result = prepareWithBudget('Hi', STYLE, 1000)
    expect(result.budgetExceeded).toBe(false)
  })

  test('budget exceeded flag correctness', () => {
    // Tiny budget (0ms) should always be "exceeded" unless measurement returns 0
    const result = prepareWithBudget('Hello World', STYLE, -1)
    expect(result.budgetExceeded).toBe(true)
  })

  test('source field is native', () => {
    const result = prepareWithBudget('Hello', STYLE, 100)
    expect(result.source).toBe('native')
  })

  test('empty text works', () => {
    const result = prepareWithBudget('', STYLE, 100)
    expect(result.prepared).toBeDefined()
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
  })
})

describe('PrepareBudgetTracker', () => {
  test('starts empty', () => {
    const tracker = new PrepareBudgetTracker()
    expect(tracker.sampleCount).toBe(0)
    expect(tracker.averageMs()).toBe(0)
    expect(tracker.maxMs()).toBe(0)
  })

  test('records samples', () => {
    const tracker = new PrepareBudgetTracker()
    tracker.record(5)
    tracker.record(10)
    tracker.record(15)
    expect(tracker.sampleCount).toBe(3)
  })

  test('computes average', () => {
    const tracker = new PrepareBudgetTracker()
    tracker.record(10)
    tracker.record(20)
    tracker.record(30)
    expect(tracker.averageMs()).toBe(20)
  })

  test('computes max', () => {
    const tracker = new PrepareBudgetTracker()
    tracker.record(5)
    tracker.record(25)
    tracker.record(10)
    expect(tracker.maxMs()).toBe(25)
  })

  test('isOverBudget based on average', () => {
    const tracker = new PrepareBudgetTracker()
    tracker.record(10)
    tracker.record(20)
    expect(tracker.isOverBudget(10)).toBe(true)
    expect(tracker.isOverBudget(20)).toBe(false)
  })

  test('respects maxSamples window', () => {
    const tracker = new PrepareBudgetTracker(3)
    tracker.record(1)
    tracker.record(2)
    tracker.record(3)
    tracker.record(4) // 1 should be evicted
    expect(tracker.sampleCount).toBe(3)
    expect(tracker.averageMs()).toBe(3) // (2+3+4)/3
  })

  test('reset clears samples', () => {
    const tracker = new PrepareBudgetTracker()
    tracker.record(10)
    tracker.record(20)
    tracker.reset()
    expect(tracker.sampleCount).toBe(0)
    expect(tracker.averageMs()).toBe(0)
  })
})
