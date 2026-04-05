import { useRef, useMemo } from 'react'
import { prepareStreaming } from '../streaming'
import { layout } from '../layout'
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
    try {
      const prepared = prepareStreaming(keyRef.current, text, style, options)
      const result = layout(prepared, maxWidth)
      return result.height
    } catch (e) {
      if (__DEV__) {
        console.error('[expo-pretext] useTextHeight error:', e)
      }
      const lineHeight = style.lineHeight ?? style.fontSize * 1.2
      const charsPerLine = Math.max(1, maxWidth / (style.fontSize * 0.5))
      return Math.ceil(text.length / charsPerLine) * lineHeight
    }
  }, [text, style.fontFamily, style.fontSize, style.fontWeight,
      style.fontStyle, style.lineHeight, maxWidth,
      options?.whiteSpace, options?.locale, options?.accuracy])
}
