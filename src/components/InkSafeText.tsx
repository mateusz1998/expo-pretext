// src/components/InkSafeText.tsx
// Drop-in <Text> replacement with automatic italic-safe padding.
// No wrapper View — just <Text> with computed padding.
// Non-italic text renders identically to plain <Text> (zero overhead).

import React, { useMemo } from 'react'
import { Text, type TextProps } from 'react-native'
import { getInkSafePadding } from '../ink-safe'
import type { TextStyle } from '../types'

export type InkSafeTextProps = Omit<TextProps, 'style'> & {
  /** Text style — must include fontFamily and fontSize */
  style: TextStyle
  children: string | number
}

/**
 * Drop-in `<Text>` replacement that prevents italic/bold text clipping.
 *
 * Automatically measures ink bounds and applies padding so glyphs
 * that extend beyond their advance width are not cut off.
 * Non-italic text renders with zero overhead (no measurement, no padding).
 *
 * For complex children (nested `<Text>`), use `useInkSafeStyle` instead.
 *
 * @example
 * ```tsx
 * import { InkSafeText } from 'expo-pretext'
 *
 * <InkSafeText style={{ fontFamily: 'Georgia', fontSize: 80, fontWeight: 'bold', fontStyle: 'italic' }}>
 *   fly
 * </InkSafeText>
 * ```
 */
export function InkSafeText({ children, style, ...textProps }: InkSafeTextProps) {
  const text = typeof children === 'string' ? children : String(children ?? '')

  const mergedStyle = useMemo(() => {
    const { padding, isOvershooting } = getInkSafePadding(text, style)
    if (!isOvershooting) return style
    return { ...style, ...padding }
  }, [text, style.fontFamily, style.fontSize, style.fontWeight, style.fontStyle])

  return (
    <Text style={mergedStyle} {...textProps}>
      {children}
    </Text>
  )
}
