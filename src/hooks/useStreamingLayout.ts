import { useMemo, useCallback } from 'react'
import { prepareWithSegments } from '../prepare'
import { layoutWithLines, getLastLineWidth, measureNaturalWidth } from '../layout'
import { measureTokenWidth } from '../prepare'
import type { TextStyle } from '../types'

type StreamingLayoutResult = {
  height: number
  lineCount: number
  lastLineWidth: number
  doesNextTokenWrap: (token: string) => boolean
}

export function useStreamingLayout(
  text: string,
  style: TextStyle,
  maxWidth: number,
): StreamingLayoutResult {
  const prepared = useMemo(() => prepareWithSegments(text, style), [text, style])

  const result = useMemo(
    () => layoutWithLines(prepared, maxWidth),
    [prepared, maxWidth],
  )

  const lastLineWidth = useMemo(() => {
    if (result.lines.length === 0) return 0
    return result.lines[result.lines.length - 1]!.width
  }, [result])

  const doesNextTokenWrap = useCallback(
    (token: string): boolean => {
      if (!token) return false
      const tokenWidth = measureTokenWidth(token, style)
      return lastLineWidth + tokenWidth > maxWidth
    },
    [lastLineWidth, maxWidth, style],
  )

  return {
    height: result.height,
    lineCount: result.lineCount,
    lastLineWidth,
    doesNextTokenWrap,
  }
}
