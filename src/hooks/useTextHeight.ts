import { useRef, useMemo } from 'react'
import { getNativeModule } from '../ExpoPretext'
import { prepareStreaming } from '../streaming'
import { layout } from '../layout'
import { textStyleToFontDescriptor, getLineHeight } from '../font-utils'
import type { TextStyle, PrepareOptions } from '../types'

export function useTextHeight(
  text: string,
  style: TextStyle,
  maxWidth: number,
  options?: PrepareOptions
): number {
  const keyRef = useRef({})

  return useMemo(() => {
    if (!text) return 0

    // Try native TextKit measurement first (exact match with RN Text)
    const native = getNativeModule()
    if (native) {
      try {
        const font = textStyleToFontDescriptor(style)
        const lineHeight = getLineHeight(style)
        const result = native.measureTextHeight(text, font, maxWidth, lineHeight)
        return result.height
      } catch {
        // Fall through to JS-based measurement
      }
    }

    // Fallback: JS-based prepare + layout pipeline
    try {
      const prepared = prepareStreaming(keyRef.current, text, style, options)
      const result = layout(prepared, maxWidth)
      return result.height
    } catch (e) {
      if (__DEV__) {
        console.error('[expo-pretext] useTextHeight error:', e)
      }
      const lineHeight = getLineHeight(style)
      const charsPerLine = Math.max(1, maxWidth / (style.fontSize * 0.5))
      return Math.ceil(text.length / charsPerLine) * lineHeight
    }
  }, [text, style.fontFamily, style.fontSize, style.fontWeight,
      style.fontStyle, style.lineHeight, maxWidth,
      options?.whiteSpace, options?.locale, options?.accuracy])
}
