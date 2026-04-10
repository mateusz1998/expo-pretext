// src/index.ts
// Public API for expo-pretext.
// Simple API (hooks) + Power API (Pretext 1:1) + Utilities.

// --- Types ---
export type {
  TextStyle,
  SegmentBreakKind,
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
} from './types'

// --- Simple API ---
export { useTextHeight } from './hooks/useTextHeight'
export { usePreparedText } from './hooks/usePreparedText'
export { useFlashListHeights } from './hooks/useFlashListHeights'
export { useStreamingLayout } from './hooks/useStreamingLayout'
export { useMultiStreamLayout } from './hooks/useMultiStreamLayout'
export { measureHeights, measureTokenWidth } from './prepare'

// --- Core API ---
export { prepare, prepareWithSegments } from './prepare'
export { layout, layoutWithLines, layoutNextLine, walkLineRanges, measureNaturalWidth, getLastLineWidth } from './layout'

// --- Rich Inline (formerly inline-flow) ---
export { prepareInlineFlow, walkInlineFlowLines, measureInlineFlow } from './rich-inline'

// --- Obstacle Layout ---
export {
  carveTextLineSlots,
  circleIntervalForBand,
  rectIntervalForBand,
  layoutColumn,
} from './obstacle-layout'
export type {
  Interval,
  CircleObstacle,
  RectObstacle,
  LayoutRegion,
  PositionedLine,
  LayoutColumnResult,
} from './obstacle-layout'
export { useObstacleLayout } from './hooks/useObstacleLayout'
export type { ObstacleLayoutResult } from './hooks/useObstacleLayout'

// --- Streaming ---
export { prepareStreaming, clearStreamingState } from './streaming'

// --- Text Utilities ---
export { fitFontSize, truncateText, measureCodeBlockHeight } from './text-utils'
export type { TruncationResult, CodeBlockMeasurement } from './text-utils'

// --- Typewriter ---
export { buildTypewriterFrames } from './typewriter'
export type { TypewriterFrame } from './typewriter'
export { useTypewriterLayout } from './hooks/useTypewriterLayout'
export type { TypewriterLayoutResult } from './hooks/useTypewriterLayout'

// --- Text Morphing ---
export { buildTextMorph } from './morphing'
export type { MorphLine, TextMorphResult } from './morphing'
export { useTextMorphing } from './hooks/useTextMorphing'

// --- Zoom ---
export { computeZoomLayout } from './zoom'
export type { ZoomLayoutResult } from './zoom'

// --- Animated (requires react-native-reanimated) ---
export { useAnimatedTextHeight } from './hooks/useAnimatedTextHeight'
export type { HeightAnimationConfig } from './hooks/useAnimatedTextHeight'
export { useCollapsibleHeight } from './hooks/useCollapsibleHeight'
export type { CollapsibleHeightResult } from './hooks/useCollapsibleHeight'
export { usePinchToZoomText } from './hooks/usePinchToZoomText'
export type { PinchToZoomResult } from './hooks/usePinchToZoomText'

// --- Engine Profile ---
export { getEngineProfile, setEngineProfile, ENGINE_PROFILES } from './engine-profile'
export type { EngineProfile } from './engine-profile'

// --- Accessibility ---
export { getFontScale, onFontScaleChange, clearAllCaches } from './accessibility'

// --- Utilities ---
export { clearCache, setLocale } from './layout'
