// scripts/bench.ts
//
// Performance benchmark suite for expo-pretext core primitives.
// Runs the JS fallback path (native backends are measured separately via
// device-level testing in the example app).
//
//   bun run bench
//   # equivalent: bun --preload ./src/__tests__/setup-mocks.ts scripts/bench.ts
//
// Each benchmark reports median / p95 / p99 over N iterations.
// Warmup pass is always excluded from statistics.

// Silence dev-only diagnostics
;(globalThis as unknown as Record<string, unknown>).__DEV__ = false

import { buildPreparedText, buildPreparedTextWithSegments } from '../src/build'
import { analyzeText } from '../src/analysis'
import {
  layout,
  layoutWithLines,
  measureNaturalWidth,
  clearCache,
} from '../src/layout'
import type { TextStyle, NativeSegmentResult } from '../src/types'

const STYLE: TextStyle = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }
const PROFILE = { carryCJKAfterClosingQuote: false }

const SHORT = 'Hello, world!'
const MEDIUM = 'The quick brown fox jumps over the lazy dog and keeps running through the meadow for a while yet.'
const LONG = [
  'Virtualized lists feel good when every item snaps into place at t = 0.',
  'No jitter, no re-layout, no flicker on first paint.',
  'Exact heights let FlashList skip the measurement frame entirely.',
  'A chat app is not a fancy scroll view; it is a deep list with heterogeneous heights and an angry product manager.',
  'Native measurement is the ground truth. JS fallback is the safety net.',
  'Arabic مرحبا, Chinese 你好, Georgian გამარჯობა, Thai สวัสดี.',
  'Predicting heights is arithmetic, not rendering. That is why it can hit a half millisecond per item and still be exact.',
].join(' ')
const CJK = '快速的棕色狐狸跳过懒惰的狗，然后去下一个田野再来一次。'.repeat(3)

// ---- Fake native segmenter (same logic used by tests) ----

function estimateSegments(text: string, style: TextStyle): NativeSegmentResult {
  const words = text.split(/(\s+)/)
  const charWidth = style.fontSize * 0.55
  return {
    segments: words,
    isWordLike: words.map((w) => !/^\s+$/.test(w)),
    widths: words.map((w) => w.length * charWidth),
  }
}

function widthMap(result: NativeSegmentResult): Map<string, number> {
  const m = new Map<string, number>()
  for (let i = 0; i < result.segments.length; i++) {
    m.set(result.segments[i]!, result.widths[i]!)
  }
  return m
}

function prepare(text: string, style: TextStyle) {
  const result = estimateSegments(text, style)
  const analysis = analyzeText(result.segments, result.isWordLike, PROFILE)
  return buildPreparedText(analysis, widthMap(result), style)
}

function prepareWithSegs(text: string, style: TextStyle) {
  const result = estimateSegments(text, style)
  const analysis = analyzeText(result.segments, result.isWordLike, PROFILE)
  return buildPreparedTextWithSegments(analysis, widthMap(result), style)
}

function measureHeights(texts: string[], style: TextStyle, maxWidth: number): number[] {
  return texts.map((t) => layout(prepare(t, style), maxWidth).height)
}

// ---- Stats ----

type Stats = {
  name: string
  iters: number
  median: number
  p95: number
  p99: number
  mean: number
  perSec: number
}

function bench(name: string, iters: number, fn: () => void): Stats {
  // Warmup
  for (let i = 0; i < Math.min(500, iters / 10); i++) fn()

  const samples: number[] = new Array(iters)
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now()
    fn()
    samples[i] = performance.now() - t0
  }
  samples.sort((a, b) => a - b)
  const sum = samples.reduce((s, v) => s + v, 0)
  const median = samples[Math.floor(iters / 2)]!
  const p95 = samples[Math.floor(iters * 0.95)]!
  const p99 = samples[Math.floor(iters * 0.99)]!
  const mean = sum / iters
  const perSec = mean === 0 ? Infinity : 1000 / mean
  return { name, iters, median, p95, p99, mean, perSec }
}

function fmtMs(ms: number): string {
  if (ms < 0.001) return `${(ms * 1_000_000).toFixed(0)}ns`
  if (ms < 1) return `${(ms * 1000).toFixed(1)}µs`
  return `${ms.toFixed(3)}ms`
}

function fmtOps(ops: number): string {
  if (!Number.isFinite(ops)) return '∞'
  if (ops > 1_000_000) return `${(ops / 1_000_000).toFixed(1)}M/s`
  if (ops > 1_000) return `${(ops / 1_000).toFixed(1)}k/s`
  return `${ops.toFixed(0)}/s`
}

function table(rows: Stats[]): string {
  const header =
    '| Benchmark                                 | iters   |  median  |    p95   |    p99   |   mean   |   ops/s  |'
  const sep =
    '|-------------------------------------------|---------|----------|----------|----------|----------|----------|'
  const body = rows.map((r) => {
    const name = r.name.padEnd(41)
    const iters = String(r.iters).padStart(7)
    const med = fmtMs(r.median).padStart(8)
    const p95 = fmtMs(r.p95).padStart(8)
    const p99 = fmtMs(r.p99).padStart(8)
    const mean = fmtMs(r.mean).padStart(8)
    const ops = fmtOps(r.perSec).padStart(8)
    return `| ${name} | ${iters} | ${med} | ${p95} | ${p99} | ${mean} | ${ops} |`
  })
  return [header, sep, ...body].join('\n')
}

// ---- Suites ----

const ITERS_FAST = 20_000
const ITERS_MED = 5_000
const ITERS_SLOW = 1_000

const results: Stats[] = []

// layout() only — the hot path. prepare() excluded.
{
  const pShort = prepare(SHORT, STYLE)
  const pMed = prepare(MEDIUM, STYLE)
  const pLong = prepare(LONG, STYLE)
  const pCJK = prepare(CJK, STYLE)
  results.push(bench('layout() short (13 chars)', ITERS_FAST, () => { layout(pShort, 320) }))
  results.push(bench('layout() medium (100 chars)', ITERS_FAST, () => { layout(pMed, 320) }))
  results.push(bench('layout() long (500 chars)', ITERS_FAST, () => { layout(pLong, 320) }))
  results.push(bench('layout() CJK (90 chars)', ITERS_FAST, () => { layout(pCJK, 280) }))

  // Re-layout at varying widths — realistic for resize / orientation change
  results.push(
    bench('layout() long at 4 widths (200/280/360/480)', ITERS_FAST, () => {
      layout(pLong, 200); layout(pLong, 280); layout(pLong, 360); layout(pLong, 480)
    }),
  )
}

// prepare() — first time through each text
{
  results.push(bench('prepare() short', ITERS_MED, () => { prepare(SHORT, STYLE) }))
  results.push(bench('prepare() medium', ITERS_MED, () => { prepare(MEDIUM, STYLE) }))
  results.push(bench('prepare() long', ITERS_MED, () => { prepare(LONG, STYLE) }))
  results.push(bench('prepareWithSegments() long', ITERS_MED, () => { prepareWithSegs(LONG, STYLE) }))
}

// measureHeights() — the FlashList pre-warm path
{
  const batch10 = Array.from({ length: 10 }, (_, i) => MEDIUM + ' ' + i)
  const batch100 = Array.from({ length: 100 }, (_, i) => MEDIUM + ' ' + i)
  const batch1000 = Array.from({ length: 1000 }, (_, i) => MEDIUM + ' ' + i)
  results.push(bench('measureHeights() 10 rows', ITERS_MED, () => { measureHeights(batch10, STYLE, 320) }))
  results.push(bench('measureHeights() 100 rows', ITERS_SLOW, () => { measureHeights(batch100, STYLE, 320) }))
  results.push(bench('measureHeights() 1000 rows', 200, () => { measureHeights(batch1000, STYLE, 320) }))
}

// layoutWithLines — richer output with per-line ranges
{
  const pLong = prepareWithSegs(LONG, STYLE)
  results.push(bench('layoutWithLines() long (ranges)', ITERS_FAST, () => { layoutWithLines(pLong, 320) }))
  results.push(bench('measureNaturalWidth() long', ITERS_FAST, () => { measureNaturalWidth(pLong) }))
}

// Cache clear cost — baseline for "cold" scenario comparison
{
  const pLong = prepare(LONG, STYLE)
  results.push(
    bench('layout() long after clearCache()', ITERS_MED, () => {
      clearCache()
      layout(pLong, 320)
    }),
  )
}

// ---- Output ----

console.log('\n# expo-pretext benchmark results\n')
console.log('JS fallback path (no native backend). Run: `bun run scripts/bench.ts`\n')
console.log(`Node: ${process.versions.node} · Bun: ${(globalThis as any).Bun?.version ?? 'n/a'}`)
console.log(`Date: ${new Date().toISOString()}\n`)
console.log(table(results))
console.log('')
