import { getNativeModule } from './ExpoPretext'
import { prepare } from './prepare'
import { textStyleToFontDescriptor, getFontKey } from './font-utils'
import { cacheNativeResult } from './cache'
import type { TextStyle, PreparedText, PrepareOptions } from './types'

type StreamingState = {
  sourceText: string
  prepared: PreparedText
}

const streamingStates = new WeakMap<object, StreamingState>()

export function prepareStreaming(
  key: object,
  text: string,
  style: TextStyle,
  options?: PrepareOptions
): PreparedText {
  if (!text) {
    const prepared = prepare('', style, options)
    streamingStates.delete(key)
    return prepared
  }

  const prev = streamingStates.get(key)

  // No previous state or text is not an append → full prepare
  if (!prev || !text.startsWith(prev.sourceText) || prev.sourceText === text) {
    if (prev && prev.sourceText === text) {
      return prev.prepared // same text, return cached
    }
    const prepared = prepare(text, style, options)
    streamingStates.set(key, { sourceText: text, prepared })
    return prepared
  }

  // Text grew — measure the new suffix to warm up the cache
  const native = getNativeModule()
  if (native) {
    const newSuffix = text.slice(prev.sourceText.length)
    if (newSuffix.length > 0) {
      const font = textStyleToFontDescriptor(style)
      const nativeOpts = options
        ? { whiteSpace: options.whiteSpace, locale: options.locale }
        : undefined
      const result = native.segmentAndMeasure(newSuffix, font, nativeOpts)
      const fontKey = getFontKey(style)
      cacheNativeResult(fontKey, result.segments, result.widths)
    }
  }

  // Full prepare with warmed cache — most segments will be JS cache hits
  const prepared = prepare(text, style, options)
  streamingStates.set(key, { sourceText: text, prepared })
  return prepared
}

export function clearStreamingState(key: object): void {
  streamingStates.delete(key)
}
