// Layout engine for expo-pretext, ported from chenglou/pretext src/layout.ts.
//
// The line-breaking algorithm, line walking, and all layout math are unchanged
// from Pretext. The public API surface is preserved:
//   layout(prepared, maxWidth)           -> { height, lineCount }
//   layoutWithLines(prepared, maxWidth)  -> { height, lineCount, lines }
//   layoutNextLine(prepared, start, maxWidth) -> LayoutLine | null
//   walkLineRanges(prepared, maxWidth, onLine) -> number
//   measureNaturalWidth(prepared)        -> number
//   clearCache()                         — clears internal + JS caches
//   setLocale(locale?)                   — sets locale for analysis

import {
  clearAnalysisCaches,
  setAnalysisLocale,
  type SegmentBreakKind,
} from './analysis'
import {
  countPreparedLines,
  layoutNextLineRange as stepPreparedLineRange,
  measurePreparedLineGeometry,
  walkPreparedLines,
  type InternalLayoutLine,
} from './line-break'
import { clearJSCache } from './cache'
import {
  getSharedGraphemeSegmenter,
  clearGraphemeSegmenter,
  type InternalPreparedText,
  type InternalPreparedTextWithSegments,
} from './build'
import type {
  TextStyle,
  LayoutCursor,
  LayoutResult,
  LayoutLine,
  LayoutLineRange,
  PreparedText,
  PreparedTextWithSegments as PublicPreparedTextWithSegments,
} from './types'

// Re-export build functions so existing consumers (prepare.ts, tests) can
// still import from layout.ts during migration. The canonical source is build.ts.
export { buildPreparedText, buildPreparedTextWithSegments } from './build'
export type { PreparedLineChunk, PrepareOptions } from './build'

// Rich-path only. Reuses grapheme splits while materializing multiple lines
// from the same prepared handle, without pushing that cache into the API.
let sharedLineTextCaches = new WeakMap<InternalPreparedTextWithSegments, Map<number, string[]>>()

export type LineGeometry = {
  lineCount: number
  maxLineWidth: number
}

export type LayoutLinesResult = LayoutResult & {
  lines: LayoutLine[]
}

// --- Internal helpers for public API ---

function getInternalPrepared(prepared: PreparedText): InternalPreparedText {
  return prepared as InternalPreparedText
}

function getInternalPreparedWithSegments(prepared: PublicPreparedTextWithSegments): InternalPreparedTextWithSegments {
  return prepared as unknown as InternalPreparedTextWithSegments
}

function resolveLineHeight(prepared: InternalPreparedText, lineHeightOverride?: number): number {
  if (lineHeightOverride !== undefined) return lineHeightOverride
  const style = prepared.style
  if (style !== null && style.lineHeight !== undefined) return style.lineHeight
  if (style !== null) return style.fontSize * 1.2
  return 0
}

// --- Public layout API ---

// Layout prepared text at a given max width. Pure arithmetic on cached widths —
// no native calls, no string operations, no allocations.
// ~0.0002ms per text block. Call on every resize.
//
// lineHeight is optional: if omitted, it is read from the prepared handle's
// TextStyle (style.lineHeight, or fontSize * 1.2 as fallback).
export function layout(prepared: PreparedText, maxWidth: number, lineHeight?: number): LayoutResult {
  const internal = getInternalPrepared(prepared)
  const lineCount = countPreparedLines(internal, maxWidth)
  const lh = resolveLineHeight(internal, lineHeight)
  return { lineCount, height: lineCount * lh }
}

function getSegmentGraphemes(
  segmentIndex: number,
  segments: string[],
  cache: Map<number, string[]>,
): string[] {
  let graphemes = cache.get(segmentIndex)
  if (graphemes !== undefined) return graphemes

  graphemes = []
  const graphemeSegmenter = getSharedGraphemeSegmenter()
  for (const gs of graphemeSegmenter.segment(segments[segmentIndex]!)) {
    graphemes.push(gs.segment)
  }
  cache.set(segmentIndex, graphemes)
  return graphemes
}

function getLineTextCache(prepared: InternalPreparedTextWithSegments): Map<number, string[]> {
  let cache = sharedLineTextCaches.get(prepared)
  if (cache !== undefined) return cache

  cache = new Map<number, string[]>()
  sharedLineTextCaches.set(prepared, cache)
  return cache
}

function lineHasDiscretionaryHyphen(
  kinds: SegmentBreakKind[],
  startSegmentIndex: number,
  startGraphemeIndex: number,
  endSegmentIndex: number,
): boolean {
  return (
    endSegmentIndex > 0 &&
    kinds[endSegmentIndex - 1] === 'soft-hyphen' &&
    !(startSegmentIndex === endSegmentIndex && startGraphemeIndex > 0)
  )
}

function buildLineTextFromRange(
  segments: string[],
  kinds: SegmentBreakKind[],
  cache: Map<number, string[]>,
  startSegmentIndex: number,
  startGraphemeIndex: number,
  endSegmentIndex: number,
  endGraphemeIndex: number,
): string {
  let text = ''
  const endsWithDiscretionaryHyphen = lineHasDiscretionaryHyphen(
    kinds,
    startSegmentIndex,
    startGraphemeIndex,
    endSegmentIndex,
  )

  for (let i = startSegmentIndex; i < endSegmentIndex; i++) {
    if (kinds[i] === 'soft-hyphen' || kinds[i] === 'hard-break') continue
    if (i === startSegmentIndex && startGraphemeIndex > 0) {
      text += getSegmentGraphemes(i, segments, cache).slice(startGraphemeIndex).join('')
    } else {
      text += segments[i]!
    }
  }

  if (endGraphemeIndex > 0) {
    if (endsWithDiscretionaryHyphen) text += '-'
    text += getSegmentGraphemes(endSegmentIndex, segments, cache).slice(
      startSegmentIndex === endSegmentIndex ? startGraphemeIndex : 0,
      endGraphemeIndex,
    ).join('')
  } else if (endsWithDiscretionaryHyphen) {
    text += '-'
  }

  return text
}

function createLayoutLine(
  prepared: InternalPreparedTextWithSegments,
  cache: Map<number, string[]>,
  width: number,
  startSegmentIndex: number,
  startGraphemeIndex: number,
  endSegmentIndex: number,
  endGraphemeIndex: number,
): LayoutLine {
  return {
    text: buildLineTextFromRange(
      prepared.segments,
      prepared.kinds,
      cache,
      startSegmentIndex,
      startGraphemeIndex,
      endSegmentIndex,
      endGraphemeIndex,
    ),
    width,
    start: {
      segmentIndex: startSegmentIndex,
      graphemeIndex: startGraphemeIndex,
    },
    end: {
      segmentIndex: endSegmentIndex,
      graphemeIndex: endGraphemeIndex,
    },
  }
}

function materializeLayoutLine(
  prepared: InternalPreparedTextWithSegments,
  cache: Map<number, string[]>,
  line: InternalLayoutLine,
): LayoutLine {
  return createLayoutLine(
    prepared,
    cache,
    line.width,
    line.startSegmentIndex,
    line.startGraphemeIndex,
    line.endSegmentIndex,
    line.endGraphemeIndex,
  )
}

function toLayoutLineRange(line: InternalLayoutLine): LayoutLineRange {
  return {
    width: line.width,
    start: {
      segmentIndex: line.startSegmentIndex,
      graphemeIndex: line.startGraphemeIndex,
    },
    end: {
      segmentIndex: line.endSegmentIndex,
      graphemeIndex: line.endGraphemeIndex,
    },
  }
}

function stepLineRange(
  prepared: InternalPreparedTextWithSegments,
  start: LayoutCursor,
  maxWidth: number,
): LayoutLineRange | null {
  const line = stepPreparedLineRange(prepared, start, maxWidth)
  if (line === null) return null
  return toLayoutLineRange(line)
}

function materializeLine(
  prepared: InternalPreparedTextWithSegments,
  line: LayoutLineRange,
): LayoutLine {
  return createLayoutLine(
    prepared,
    getLineTextCache(prepared),
    line.width,
    line.start.segmentIndex,
    line.start.graphemeIndex,
    line.end.segmentIndex,
    line.end.graphemeIndex,
  )
}

export function materializeLineRange(
  prepared: PublicPreparedTextWithSegments,
  line: LayoutLineRange,
): LayoutLine {
  return materializeLine(getInternalPreparedWithSegments(prepared), line)
}

// Batch low-level line geometry pass. Non-materializing counterpart to
// layoutWithLines(), useful for shrinkwrap and other aggregate geometry work.
export function walkLineRanges(
  prepared: PublicPreparedTextWithSegments,
  maxWidth: number,
  onLine: (line: LayoutLineRange) => void,
): number {
  const internal = getInternalPreparedWithSegments(prepared)
  if (internal.widths.length === 0) return 0

  return walkPreparedLines(internal, maxWidth, line => {
    onLine(toLayoutLineRange(line))
  })
}

export function measureLineGeometry(
  prepared: PublicPreparedTextWithSegments,
  maxWidth: number,
): LineGeometry {
  return measurePreparedLineGeometry(getInternalPreparedWithSegments(prepared), maxWidth)
}

// Intrinsic-width helper for rich/userland layout work. Returns the widest
// forced line when container width is unconstrained.
export function measureNaturalWidth(prepared: PublicPreparedTextWithSegments): number {
  let maxWidth = 0
  walkLineRanges(prepared, Number.POSITIVE_INFINITY, line => {
    if (line.width > maxWidth) maxWidth = line.width
  })
  return maxWidth
}

export function layoutNextLine(
  prepared: PublicPreparedTextWithSegments,
  start: LayoutCursor,
  maxWidth: number,
): LayoutLine | null {
  const line = layoutNextLineRange(prepared, start, maxWidth)
  if (line === null) return null
  return materializeLineRange(prepared, line)
}

export function layoutNextLineRange(
  prepared: PublicPreparedTextWithSegments,
  start: LayoutCursor,
  maxWidth: number,
): LayoutLineRange | null {
  return stepLineRange(getInternalPreparedWithSegments(prepared), start, maxWidth)
}

// Rich layout API for callers that want the actual line contents and widths.
// lineHeight is optional: if omitted, read from the prepared handle's style.
export function layoutWithLines(
  prepared: PublicPreparedTextWithSegments,
  maxWidth: number,
  lineHeight?: number,
): LayoutLinesResult {
  const internal = getInternalPreparedWithSegments(prepared)
  const lines: LayoutLine[] = []
  if (internal.widths.length === 0) return { lineCount: 0, height: 0, lines }

  const graphemeCache = getLineTextCache(internal)
  const lineCount = walkPreparedLines(internal, maxWidth, line => {
    lines.push(materializeLayoutLine(internal, graphemeCache, line))
  })

  const lh = resolveLineHeight(internal, lineHeight)
  return { lineCount, height: lineCount * lh, lines }
}

// --- Inline-flow compatibility ---

// Re-export the public PreparedTextWithSegments under the alias the inline-flow
// module expects.  The underlying type is the same opaque branded handle.
export type { PublicPreparedTextWithSegments as PreparedTextWithSegments }
export type { LayoutCursor, LayoutResult, LayoutLineRange, LayoutLine }

// --- Cache management ---

export function clearCache(): void {
  clearAnalysisCaches()
  clearGraphemeSegmenter()
  sharedLineTextCaches = new WeakMap<InternalPreparedTextWithSegments, Map<number, string[]>>()
  clearJSCache()
}

export function getLastLineWidth(prepared: PublicPreparedTextWithSegments, maxWidth: number): number {
  const result = layoutWithLines(prepared, maxWidth)
  if (result.lines.length === 0) return 0
  return result.lines[result.lines.length - 1]!.width
}

export function setLocale(locale?: string): void {
  setAnalysisLocale(locale)
  clearCache()
}
