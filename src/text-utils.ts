import { prepare, prepareWithSegments } from './prepare'
import { layout, layoutWithLines, layoutNextLineRange, materializeLineRange } from './layout'
import type { TextStyle, LayoutCursor } from './types'

export type TruncationResult = {
  text: string
  truncated: boolean
  lineCount: number
}

/**
 * Find the largest fontSize that fits text in a box.
 * Binary search over prepare() + layout().
 */
export function fitFontSize(
  text: string,
  style: TextStyle,
  boxWidth: number,
  boxHeight: number,
  options?: { minSize?: number; maxSize?: number; step?: number },
): number {
  if (!text || boxWidth <= 0 || boxHeight <= 0) return options?.minSize ?? 1

  const minSize = options?.minSize ?? 1
  const maxSize = options?.maxSize ?? 200
  const step = options?.step ?? 0.5

  let lo = minSize
  let hi = maxSize

  while (hi - lo > step) {
    const mid = Math.round((lo + hi) / 2 / step) * step
    const prepared = prepare(text, { ...style, fontSize: mid })
    const result = layout(prepared, boxWidth)
    if (result.height <= boxHeight) {
      lo = mid
    } else {
      hi = mid - step
    }
  }

  // Verify lo fits
  const prepared = prepare(text, { ...style, fontSize: lo })
  const result = layout(prepared, boxWidth)
  return result.height <= boxHeight ? lo : minSize
}

/**
 * Truncate text to fit within maxLines at the given width.
 * Returns the truncated text with optional ellipsis.
 */
export function truncateText(
  text: string,
  style: TextStyle,
  maxWidth: number,
  maxLines: number,
  options?: { ellipsis?: string },
): TruncationResult {
  if (!text || maxWidth <= 0 || maxLines <= 0) {
    return { text: '', truncated: false, lineCount: 0 }
  }

  const ellipsis = options?.ellipsis ?? '\u2026'
  const prepared = prepareWithSegments(text, style)
  const result = layoutWithLines(prepared, maxWidth)

  // Fits within maxLines — no truncation needed
  if (result.lineCount <= maxLines) {
    return { text, truncated: false, lineCount: result.lineCount }
  }

  // Walk lines to find text up to maxLines
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let totalText = ''

  for (let i = 0; i < maxLines; i++) {
    const lineRange = layoutNextLineRange(prepared, cursor, maxWidth)
    if (!lineRange) break
    const line = materializeLineRange(prepared, lineRange)
    totalText += line.text
    cursor = lineRange.end
  }

  const trimmed = totalText.trimEnd()

  return {
    text: trimmed + ellipsis,
    truncated: true,
    lineCount: maxLines,
  }
}

/**
 * Measure the height of a code block with monospace font.
 *
 * Uses `whiteSpace: 'pre-wrap'` mode to preserve newlines, indentation,
 * and trailing spaces — matching how code is displayed in AI chat apps,
 * editors, and terminal UIs.
 *
 * Tabs are expanded at 8-space intervals (CSS `tab-size: 8` semantics).
 *
 * @param code - The source code text (newlines and whitespace preserved)
 * @param style - Text style (use a monospace fontFamily like 'Menlo', 'Courier', etc.)
 * @param maxWidth - Container width in pixels
 * @returns Height in pixels, line count, and whether the code was truncated
 *
 * @example
 * ```ts
 * import { measureCodeBlockHeight } from 'expo-pretext'
 *
 * const { height, lineCount } = measureCodeBlockHeight(
 *   'function hello() {\n  console.log("world")\n}',
 *   { fontFamily: 'Menlo', fontSize: 14, lineHeight: 20 },
 *   containerWidth,
 * )
 * ```
 *
 * @example
 * ```tsx
 * // In a FlashList AI chat — measure mixed prose + code blocks
 * function measureMessageHeight(message: Message, width: number): number {
 *   let totalHeight = 0
 *   for (const block of message.blocks) {
 *     if (block.type === 'code') {
 *       totalHeight += measureCodeBlockHeight(
 *         block.content, codeStyle, width - codePadding,
 *       ).height
 *     } else {
 *       totalHeight += layout(prepare(block.content, proseStyle), width).height
 *     }
 *   }
 *   return totalHeight
 * }
 * ```
 */
export type CodeBlockMeasurement = {
  /** Total height in pixels */
  height: number
  /** Number of lines (including empty lines from newlines) */
  lineCount: number
}

export function measureCodeBlockHeight(
  code: string,
  style: TextStyle,
  maxWidth: number,
): CodeBlockMeasurement {
  if (!code || maxWidth <= 0) return { height: 0, lineCount: 0 }

  const prepared = prepare(code, style, { whiteSpace: 'pre-wrap' })
  const result = layout(prepared, maxWidth)
  return { height: result.height, lineCount: result.lineCount }
}
