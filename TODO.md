# expo-pretext TODO

## Current priorities

### 1. Keep accuracy honest

- The accuracy demo screen is the primary canary. Every release should show PASS on all test widths.
- CJK (Chinese, Japanese, Korean) is the most sensitive canary: native TextKit/TextPaint measurements diverge from segment-sum estimates most visibly here.
- Arabic and mixed bidi+numbers remain useful shaping canaries — they test RTL segment ordering and punctuation clustering.
- Georgian, Devanagari, Thai are secondary canaries — they test dictionary-based word boundaries from native segmenters.
- Emoji ZWJ sequences (family, flag, skin tone) test grapheme boundary detection — keep at least one in the accuracy suite.

### 2. Port upstream Pretext performance fixes

All fixes address O(n^2) -> O(n) regressions on long texts (10k+ chars). Critical for AI chat where assistant messages can be very long.

- [ ] Quadratic punctuation merges — `analysis.ts` [chenglou/pretext@30854d79]
- [ ] CJK keep-all merges linear — `analysis.ts` + `build.ts` [chenglou/pretext@eb3bbbe5]
- [ ] Degenerate breakable runs linear — `line-break.ts` [chenglou/pretext@39013c40]
- [ ] Restore cached prefix fits — `line-break.ts` [chenglou/pretext@2ff48ab8]
- [ ] Defer punctuation materialization — `analysis.ts` [chenglou/pretext@2148b904]
- [ ] Arabic no-space merges linear — `analysis.ts` [chenglou/pretext@4cb8b244]

### 3. Next engine work

- Use the native measurement path (TextKit/TextPaint) as ground truth. The JS fallback (`estimateSegments`) is a safety net, not a product path.
- Keep the hot `layout()` path simple and allocation-light. Rich features go through `prepareInlineFlow` / obstacle layout, not layout() itself.
- If streaming messages keep growing longer, consider a stateful streaming variant where `prepareStreaming` carries forward line-break state instead of re-preparing from scratch on each append.
- Explore Hermes-specific optimizations: `Intl.Segmenter` may not be available — the spread-operator fallback for grapheme splitting could be replaced with a lightweight C++ binding if it becomes a bottleneck.
- Profile `prepare()` vs `layout()` separately. `prepare()` is native-bound (15ms/500 texts); `layout()` is pure JS (~0.0002ms). Optimization effort should target `prepare()` batch throughput.

### 4. React Native specific work

- [ ] FlashList v2 compatibility — test with upcoming FlashList release, ensure `overrideItemLayout` contract holds.
- [ ] Fabric (new architecture) validation — verify native module bridge works correctly under Fabric/TurboModules.
- [ ] Expo SDK 54 compatibility — test when SDK 54 ships.
- [ ] Android: investigate `TextPaint.breakText()` as alternative to `measureText()` for more accurate line-break prediction.
- [ ] iOS: explore `NSLayoutManager` vs `NSString.size` tradeoffs — the latter is simpler but doesn't account for paragraph-level layout.

### 5. Demo and example work

- Keep the AI chat demo as the primary dogfood path — it's the #1 use case.
- Keep the editorial/obstacle demos as the dogfood path for rich line APIs (`layoutNextLine`, `walkLineRanges`, obstacle layout).
- The MarkdownRenderer is an example component, not a library export. Keep it polished but don't over-engineer — users who need production markdown should use a dedicated library.
- Add a new demo only if it exposes something the current demos don't cover.

### 6. Testing

- [ ] `line-break.ts` — line-breaking algorithm edge cases (long words, zero-width spaces, soft hyphens)
- [ ] `analysis.ts` — text analysis, CJK detection, kinsoku rules, whitespace normalization
- [ ] `rich-inline.ts` — inline flow layout with mixed fonts and atomic elements
- [ ] `streaming.ts` — append detection, cache warming, state management
- [ ] Hook tests with mocked native module (useTextHeight, useFlashListHeights, usePreparedText)
- [ ] Integration test: prepare() + layout() round-trip accuracy vs native measureTextHeight

### 7. Documentation

- [ ] CONTRIBUTING.md — architecture overview, pipeline diagram, how to add a new demo
- [ ] Inline comments for complex algorithms in `analysis.ts` and `line-break.ts`
- [ ] Migration guide when API changes

## Not worth doing right now

- Do not add a full markdown renderer to the core library. The example MarkdownRenderer demonstrates the pattern; users compose their own.
- Do not put measurement back in `layout()`. The prepare-once-layout-many split is the core performance contract.
- Do not add font loading/management. That's Expo's job (`expo-font`).
- Do not add text rendering. This library predicts dimensions — rendering is React Native `<Text>`.
- Do not explode the public API with cache tuning knobs. The current LRU strategy is sufficient.
- Do not chase pixel-perfect accuracy as the product claim. "Close enough for smooth virtualization" is the contract.
- Do not add `onLayout` fallback reconciliation. The whole point is to avoid `onLayout`.

## Open design questions

- Whether `prepareStreaming` should carry forward line-break state for truly incremental layout, or if full re-prepare with warmed cache is fast enough.
- Whether `{ whiteSpace: 'pre-wrap' }` should grow to handle tabs with configurable tab stops.
- Whether the obstacle layout API should support non-rectangular shapes beyond circles and rectangles.
- Whether intrinsic width APIs (`measureNaturalWidth`) should extend to rich inline flow.
- Whether the library should export a `validateFont` utility that checks if a font is loaded before measurement.
- Whether bidi rendering concerns (selection, cursor positioning) belong here or stay out of scope.
- Whether a diagnostic/verify mode should exist that compares JS-predicted height against native measurement and reports drift.
