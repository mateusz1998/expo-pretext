import { useMemo } from 'react'
import { prepare } from '../prepare'
import type { TextStyle, PreparedText, PrepareOptions } from '../types'

export function usePreparedText(
  text: string,
  style: TextStyle,
  options?: PrepareOptions
): PreparedText | null {
  return useMemo(() => {
    if (!text) return null
    return prepare(text, style, options)
  }, [text, style.fontFamily, style.fontSize, style.fontWeight,
      style.fontStyle, style.lineHeight,
      options?.whiteSpace, options?.locale, options?.accuracy])
}
