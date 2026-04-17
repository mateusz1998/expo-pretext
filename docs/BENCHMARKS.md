# Benchmarks

Performance numbers for the core expo-pretext primitives. These measure the **pure-JS fallback path** — no native backend, no device. Real devices are faster on `prepare()` (native segmenter) and comparable on `layout()` (pure arithmetic either way).

Run the suite yourself:

```sh
bun run bench
```

The suite lives at [`scripts/bench.ts`](../scripts/bench.ts). Each benchmark reports the median, p95, p99, mean, and ops/s over 200–20,000 iterations. A warmup pass is excluded from statistics.

## The hot path — `layout()`

`layout()` is pure arithmetic over pre-measured widths. This is what runs on every re-layout (window resize, orientation change, pinch-zoom frame).

| Benchmark                                 | median  | p99    | ops/s   |
|-------------------------------------------|---------|--------|---------|
| `layout()` short (13 chars)               | 125ns   | 2.8µs  | 2.3M/s  |
| `layout()` medium (100 chars)             | 417ns   | 2.0µs  | 1.3M/s  |
| `layout()` long (500 chars)               | 2.2µs   | 11.2µs | 107k/s  |
| `layout()` CJK (90 chars)                 | 500ns   | 1.9µs  | 1.6M/s  |
| `layout()` long at 4 widths               | 5.7µs   | 58.9µs | 65k/s   |
| `layout()` long after `clearCache()`      | 1.3µs   | 1.8µs  | 747k/s  |

**Takeaway:** at typical chat-row length, `layout()` runs in under a microsecond. Scrolling through a 10,000-row FlashList spends more time in React's scheduling than in expo-pretext.

## First-measurement cost — `prepare()`

`prepare()` runs once per unique text string and is cached afterwards. It's slower than `layout()` because it has to tokenize + analyze the text. Tokenization dominates on long strings.

| Benchmark                 | median  | p99     | ops/s  |
|---------------------------|---------|---------|--------|
| `prepare()` short         | 4.4µs   | 84.7µs  | 57k/s  |
| `prepare()` medium        | 29.2µs  | 1.6ms   | 6.2k/s |
| `prepare()` long          | 156µs   | 2.8ms   | 3.0k/s |
| `prepareWithSegments()` long | 154µs | 619µs   | 5.0k/s |

**Takeaway:** the native backend is typically 2–5× faster than the JS fallback here because iOS TextKit / Android TextPaint segmenters are hand-tuned. In JS, this is still fast enough for a 1,000-row pre-warm to complete in ~40ms.

## Batched pre-warm — `measureHeights()`

This is what `useFlashListHeights` calls in the background to fill its cache.

| Benchmark                | median  | p99    | ops/s |
|--------------------------|---------|--------|-------|
| `measureHeights()` 10    | 399µs   | 768µs  | 2.7k/s |
| `measureHeights()` 100   | 3.7ms   | 5.4ms  | 261/s |
| `measureHeights()` 1000  | 38.4ms  | 54.8ms | 26/s  |

**Takeaway:** 1,000 rows pre-warm in ~40ms on JS — the same budget as three frames. On a real device with native segmentation, it's a single frame.

## Rich output — `layoutWithLines()` + `measureNaturalWidth()`

When you need per-line ranges (for truncation, line-by-line reveal, or rich inline flow) or the unconstrained natural width.

| Benchmark                        | median | p99   | ops/s   |
|----------------------------------|--------|-------|---------|
| `layoutWithLines()` long         | 2.3µs  | 5.2µs | 366k/s  |
| `measureNaturalWidth()` long     | 1.1µs  | 1.7µs | 823k/s  |

---

## Methodology

- **Hardware:** Apple Silicon (M-series). Runs may drift ±10% between laptops.
- **Runtime:** Bun 1.3.x. Node 24.x. The pure-JS code runs similarly under both.
- **Text fixtures:**
  - *short* — "Hello, world!" (13 chars)
  - *medium* — one English sentence (~100 chars)
  - *long* — a 7-sentence paragraph with Arabic + Chinese + Georgian + Thai (~500 chars)
  - *CJK* — 27 CJK characters repeated 3× (90 chars, heavy break-point density)
- **Segmenter:** the bench uses the same JS fallback that runs when the native module is unavailable (word splitting on whitespace + `fontSize * 0.55` width heuristic). Real devices use TextKit / TextPaint / `Intl.Segmenter`.

## Why no device numbers here

Device-level performance depends heavily on the specific phone, CPU scaling, thermal state, and the current foreground app. The example app's **Accuracy Testing** tool (in the Tools tab) runs `useTextHeight` vs `<Text onLayout>` and reports diff in pixels — that's a more useful on-device metric than microseconds.

If you need on-device numbers: run the example app, open the **Pinch to Zoom** demo, and watch the live metric `layout() — 0.0002ms` in the bottom grid. It's computed via `performance.now()` around the actual `layout()` call, real hardware, real style.
