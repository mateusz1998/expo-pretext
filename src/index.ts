// src/index.ts
// Public API for expo-pretext.
// Simple API (hooks) + Power API (Pretext 1:1) + Utilities.

// --- Types ---
export type {
  TextStyle,
  PrepareOptions,
  PreparedText,
  PreparedTextWithSegments,
  LayoutResult,
  LayoutLine,
  LayoutLineRange,
  LayoutCursor,
  LayoutWithLinesResult,
  InlineFlowItem,
  PreparedInlineFlow,
  InlineFlowCursor,
  InlineFlowFragment,
  InlineFlowLine,
} from './types.js'

// --- Simple API ---
export { useTextHeight } from './hooks/useTextHeight.js'
export { usePreparedText } from './hooks/usePreparedText.js'
export { useFlashListHeights } from './hooks/useFlashListHeights.js'
export { measureHeights } from './prepare.js'

// --- Core API ---
export { prepare, prepareWithSegments } from './prepare.js'
export { layout, layoutWithLines, layoutNextLine, walkLineRanges, measureNaturalWidth } from './layout.js'

// --- Rich Inline (formerly inline-flow) ---
export { prepareInlineFlow, walkInlineFlowLines, measureInlineFlow } from './rich-inline.js'

// --- Utilities ---
export { clearCache, setLocale } from './layout.js'
