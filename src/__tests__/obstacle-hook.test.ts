;(globalThis as unknown as Record<string, unknown>).__DEV__ = false

import { describe, test, expect } from 'bun:test'
import { prepareWithSegments } from '../prepare'
import { getLineHeight } from '../font-utils'
import {
  layoutColumn,
  type CircleObstacle,
  type RectObstacle,
  type LayoutRegion,
} from '../obstacle-layout'
import type { TextStyle } from '../types'

// We test the underlying layoutColumn() integration since bun:test has no React renderer.
// The hook is a thin useMemo wrapper around prepareWithSegments() + layoutColumn().

const STYLE: TextStyle = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

describe('useObstacleLayout (underlying integration)', () => {
  test('basic layout without obstacles fills region', () => {
    const text = 'The quick brown fox jumps over the lazy dog near the river on a sunny day'
    const prepared = prepareWithSegments(text, STYLE)
    const region: LayoutRegion = { x: 0, y: 0, width: 200, height: 500 }
    const result = layoutColumn(prepared, { segmentIndex: 0, graphemeIndex: 0 }, region, 24)
    expect(result.lines.length).toBeGreaterThan(0)
    for (const line of result.lines) {
      expect(line.x).toBeGreaterThanOrEqual(0)
      expect(line.y).toBeGreaterThanOrEqual(0)
      expect(line.text.length).toBeGreaterThan(0)
    }
  })

  test('circle obstacle reduces available width', () => {
    const text = 'The quick brown fox jumps over the lazy dog near the river on a sunny day in the park'
    const prepared = prepareWithSegments(text, STYLE)
    const region: LayoutRegion = { x: 0, y: 0, width: 300, height: 500 }

    const noObstacle = layoutColumn(prepared, { segmentIndex: 0, graphemeIndex: 0 }, region, 24)
    const circle: CircleObstacle = { cx: 150, cy: 50, r: 60 }
    const withObstacle = layoutColumn(
      prepared, { segmentIndex: 0, graphemeIndex: 0 }, region, 24, [circle],
    )

    // With obstacle, should have more lines (less width available)
    expect(withObstacle.lines.length).toBeGreaterThanOrEqual(noObstacle.lines.length)
  })

  test('rect obstacle creates text-free zone', () => {
    const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789'
    const prepared = prepareWithSegments(text, STYLE)
    const region: LayoutRegion = { x: 0, y: 0, width: 300, height: 500 }
    const rect: RectObstacle = { x: 100, y: 0, w: 100, h: 72 }
    const result = layoutColumn(
      prepared, { segmentIndex: 0, graphemeIndex: 0 }, region, 24, [], [rect],
    )
    // Lines in the rect zone should have x offset
    const linesInZone = result.lines.filter(l => l.y < 72)
    for (const line of linesInZone) {
      // Line should NOT overlap with rect (100-200)
      const lineEnd = line.x + line.width
      const isBeforeRect = lineEnd <= 100
      const isAfterRect = line.x >= 200
      expect(isBeforeRect || isAfterRect).toBe(true)
    }
  })

  test('empty text returns empty lines', () => {
    const prepared = prepareWithSegments('', STYLE)
    const region: LayoutRegion = { x: 0, y: 0, width: 200, height: 500 }
    const result = layoutColumn(prepared, { segmentIndex: 0, graphemeIndex: 0 }, region, 24)
    expect(result.lines.length).toBe(0)
  })

  test('region too small for any line', () => {
    const text = 'Hello'
    const prepared = prepareWithSegments(text, STYLE)
    const region: LayoutRegion = { x: 0, y: 0, width: 200, height: 10 } // less than lineHeight
    const result = layoutColumn(prepared, { segmentIndex: 0, graphemeIndex: 0 }, region, 24)
    expect(result.lines.length).toBe(0)
  })

  test('singleSlotOnly picks widest slot', () => {
    const text = 'Hello world this is a test of single slot mode'
    const prepared = prepareWithSegments(text, STYLE)
    const region: LayoutRegion = { x: 0, y: 0, width: 400, height: 500 }
    // Rect in the middle splits into two slots
    const rect: RectObstacle = { x: 150, y: 0, w: 50, h: 120 }
    const result = layoutColumn(
      prepared, { segmentIndex: 0, graphemeIndex: 0 }, region, 24, [], [rect], true,
    )
    // With singleSlotOnly, only the widest slot is used
    const linesInZone = result.lines.filter(l => l.y < 120)
    if (linesInZone.length > 0) {
      // All lines should be in the same slot (either left or right of rect)
      const allLeft = linesInZone.every(l => l.x + l.width <= 150)
      const allRight = linesInZone.every(l => l.x >= 200)
      expect(allLeft || allRight).toBe(true)
    }
  })

  test('cursor allows continuation from previous layout', () => {
    const text = 'First part of text. Second part of text. Third part continues here.'
    const prepared = prepareWithSegments(text, STYLE)
    const region1: LayoutRegion = { x: 0, y: 0, width: 200, height: 48 } // 2 lines
    const result1 = layoutColumn(prepared, { segmentIndex: 0, graphemeIndex: 0 }, region1, 24)

    // Continue from where we left off
    const region2: LayoutRegion = { x: 0, y: 48, width: 200, height: 500 }
    const result2 = layoutColumn(prepared, result1.cursor, region2, 24)

    // Combined should cover all text
    const allText = [...result1.lines, ...result2.lines].map(l => l.text).join('')
    expect(allText.length).toBeGreaterThan(0)
    expect(result2.lines.length).toBeGreaterThan(0)
  })
})
