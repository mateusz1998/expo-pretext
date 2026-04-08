import { useMemo, useEffect, useRef, useCallback } from 'react'
import { getNativeModule } from '../ExpoPretext'
import { textStyleToFontDescriptor, getLineHeight } from '../font-utils'
import { prepare, measureHeights } from '../prepare'
import { layout } from '../layout'
import type { TextStyle } from '../types'

type FlashListLayoutResult = {
  estimatedItemSize: number
  overrideItemLayout: (layout: { size?: number }, item: any, index: number) => void
}

// Measure single text height — TextKit primary, segment fallback
function measureSingleHeight(text: string, style: TextStyle, maxWidth: number): number {
  const native = getNativeModule()
  if (native) {
    try {
      const font = textStyleToFontDescriptor(style)
      const lh = getLineHeight(style)
      return native.measureTextHeight(text, font, maxWidth, lh).height
    } catch {}
  }
  // Fallback: segment-based
  const prepared = prepare(text, style)
  return layout(prepared, maxWidth).height
}

export function useFlashListHeights<T>(
  data: T[],
  getText: (item: T) => string,
  style: TextStyle,
  maxWidth: number
): FlashListLayoutResult {
  const heightsRef = useRef<Map<string, number>>(new Map())
  const lineHeight = getLineHeight(style)

  // Pre-warm cache using batch API
  useEffect(() => {
    const allTexts = data.map(getText)
    const batchSize = 50
    let offset = 0

    function warmNext() {
      // Collect uncached texts for this batch
      const uncached: string[] = []
      const end = Math.min(offset + batchSize, allTexts.length)
      for (let i = offset; i < end; i++) {
        const text = allTexts[i]!
        if (!heightsRef.current.has(text)) uncached.push(text)
      }

      // Batch measure all uncached texts at once
      if (uncached.length > 0) {
        const heights = measureHeights(uncached, style, maxWidth)
        for (let i = 0; i < uncached.length; i++) {
          heightsRef.current.set(uncached[i]!, heights[i]!)
        }
      }

      offset = end
      if (typeof requestIdleCallback !== 'undefined' && offset < allTexts.length) {
        requestIdleCallback(warmNext)
      }
    }

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(warmNext)
    } else {
      // No requestIdleCallback — batch all at once
      const uncached: string[] = []
      for (const text of allTexts) {
        if (!heightsRef.current.has(text)) uncached.push(text)
      }
      if (uncached.length > 0) {
        const heights = measureHeights(uncached, style, maxWidth)
        for (let i = 0; i < uncached.length; i++) {
          heightsRef.current.set(uncached[i]!, heights[i]!)
        }
      }
    }
  }, [data.length, getText, style.fontFamily, style.fontSize, maxWidth])

  const estimatedItemSize = useMemo(() => lineHeight * 2, [lineHeight])

  const overrideItemLayout = useCallback(
    (layoutObj: { size?: number }, item: T, _index: number) => {
      const text = getText(item)
      const cached = heightsRef.current.get(text)
      if (cached !== undefined) {
        layoutObj.size = cached
        return
      }
      const height = measureSingleHeight(text, style, maxWidth)
      heightsRef.current.set(text, height)
      layoutObj.size = height
    },
    [getText, style, maxWidth]
  )

  return { estimatedItemSize, overrideItemLayout }
}
