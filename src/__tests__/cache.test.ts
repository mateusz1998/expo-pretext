import { describe, test, expect, beforeEach } from 'bun:test'
import {
  getCachedWidth,
  setCachedWidth,
  cacheNativeResult,
  tryResolveAllFromCache,
  clearJSCache,
} from '../cache'

describe('JS-side width cache', () => {
  beforeEach(() => {
    clearJSCache()
  })

  test('set and get single width', () => {
    setCachedWidth('Inter_16_400_normal', 'Hello', 42.5)
    expect(getCachedWidth('Inter_16_400_normal', 'Hello')).toBe(42.5)
  })

  test('returns undefined for cache miss', () => {
    expect(getCachedWidth('Inter_16_400_normal', 'missing')).toBeUndefined()
  })

  test('returns undefined for unknown font key', () => {
    setCachedWidth('Inter_16_400_normal', 'Hello', 42.5)
    expect(getCachedWidth('Arial_16_400_normal', 'Hello')).toBeUndefined()
  })

  test('cacheNativeResult stores all segments', () => {
    cacheNativeResult('Inter_16_400_normal', ['Hello', ' ', 'world'], [42.5, 4.2, 38.1])
    expect(getCachedWidth('Inter_16_400_normal', 'Hello')).toBe(42.5)
    expect(getCachedWidth('Inter_16_400_normal', ' ')).toBe(4.2)
    expect(getCachedWidth('Inter_16_400_normal', 'world')).toBe(38.1)
  })

  test('tryResolveAllFromCache returns widths when all cached', () => {
    cacheNativeResult('Inter_16_400_normal', ['Hello', ' ', 'world'], [42.5, 4.2, 38.1])
    const result = tryResolveAllFromCache('Inter_16_400_normal', ['Hello', ' ', 'world'])
    expect(result).toEqual([42.5, 4.2, 38.1])
  })

  test('tryResolveAllFromCache returns null on partial miss', () => {
    cacheNativeResult('Inter_16_400_normal', ['Hello', ' '], [42.5, 4.2])
    const result = tryResolveAllFromCache('Inter_16_400_normal', ['Hello', ' ', 'world'])
    expect(result).toBeNull()
  })

  test('tryResolveAllFromCache returns null for unknown font', () => {
    const result = tryResolveAllFromCache('Unknown_16_400_normal', ['Hello'])
    expect(result).toBeNull()
  })

  test('clearJSCache clears everything', () => {
    cacheNativeResult('Inter_16_400_normal', ['Hello'], [42.5])
    clearJSCache()
    expect(getCachedWidth('Inter_16_400_normal', 'Hello')).toBeUndefined()
  })

  test('multiple font keys are independent', () => {
    setCachedWidth('Inter_16_400_normal', 'Hello', 42.5)
    setCachedWidth('Inter_16_700_normal', 'Hello', 44.0)
    expect(getCachedWidth('Inter_16_400_normal', 'Hello')).toBe(42.5)
    expect(getCachedWidth('Inter_16_700_normal', 'Hello')).toBe(44.0)
  })

  test('overwriting a cached value', () => {
    setCachedWidth('Inter_16_400_normal', 'Hello', 42.5)
    setCachedWidth('Inter_16_400_normal', 'Hello', 43.0)
    expect(getCachedWidth('Inter_16_400_normal', 'Hello')).toBe(43.0)
  })
})
