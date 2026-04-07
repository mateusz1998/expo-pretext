# Changelog

## 0.2.0 — 2026-04-08

### Added

- **obstacle-layout module** — `carveTextLineSlots`, `circleIntervalForBand`, `rectIntervalForBand`, `layoutColumn` for text reflow around obstacles
- **TextKit primary measurement** — `useTextHeight`, `useFlashListHeights`, `measureHeights` now use NSLayoutManager for pixel-perfect accuracy matching RN Text
- **8 demo screens** — Editorial Engine, Tight Bubbles, Accordion, Masonry, i18n, Markdown Chat, Justification Comparison, ASCII Art
- **`measureTextHeight` native function** — NSLayoutManager-based height measurement on iOS

### Fixed

- CJK/Georgian/Mixed text accuracy — TextKit measurement matches RN Text exactly
- Intl.Segmenter fallback for Hermes — grapheme splitting works without polyfill
- System font detection — no false warnings for built-in iOS fonts
- iOS native module CFLocale type mismatch

## 0.1.0 — 2026-04-05

### Added

- Initial release of expo-pretext
- Core API: `prepare()`, `layout()`, `prepareWithSegments()`, `layoutWithLines()`, `layoutNextLine()`, `walkLineRanges()`, `measureNaturalWidth()`
- React hooks: `useTextHeight()`, `usePreparedText()`, `useFlashListHeights()`
- Rich inline: `prepareInlineFlow()`, `walkInlineFlowLines()`, `measureInlineFlow()`
- Batch: `measureHeights()`
- iOS native module (Swift) — CFStringTokenizer + CTLine measurement
- Android native module (Kotlin) — BreakIterator + TextPaint measurement
- Auto-batching, JS-side caching, incremental streaming extend
- Ported from Pretext v0.0.4 (chenglou/pretext)
