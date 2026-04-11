// Text Path — characters flow along an animated sine curve, each rotated
// to follow the tangent of the path. Per-character widths come from
// measureNaturalWidth() so the spacing matches the actual font metrics.

import { useMemo, useState, useEffect } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { prepareWithSegments, measureNaturalWidth } from 'expo-pretext'

const STYLE = { fontFamily: 'Georgia', fontSize: 22, lineHeight: 28 }
const TEXT = 'pretext flows along a curve'

export function TextPathDemo() {
  const { width } = useWindowDimensions()
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setPhase(p => p + 0.04), 33)
    return () => clearInterval(timer)
  }, [])

  // Per-character measured widths
  const charData = useMemo(() => {
    const chars = [...TEXT]
    const widths: number[] = []
    for (const ch of chars) {
      if (ch === ' ') {
        widths.push(STYLE.fontSize * 0.35)
      } else {
        const prepared = prepareWithSegments(ch, STYLE)
        widths.push(measureNaturalWidth(prepared))
      }
    }
    const total = widths.reduce((a, b) => a + b, 0)
    return { chars, widths, total }
  }, [])

  // Horizontal padding to keep the whole string on-screen even when curved
  const H_PAD = 24
  const pathWidth = width - H_PAD * 2
  // If the text is wider than the stage, scale down per-character spacing
  // by compressing x mapping. Otherwise, center it.
  const scale = Math.min(1, pathWidth / charData.total)
  const effectiveTotal = charData.total * scale
  const startX = (width - effectiveTotal) / 2

  const amplitude = 36
  const centerY = 200
  const waves = 2 // number of full sine cycles across the text

  // Compute per-character center position + tangent angle
  const positions = useMemo(() => {
    const out: Array<{ char: string; cx: number; cy: number; angle: number }> = []
    let cum = 0
    for (let i = 0; i < charData.chars.length; i++) {
      const ch = charData.chars[i]!
      const w = charData.widths[i]! * scale
      // Center of this character along the baseline
      const localX = cum + w / 2
      const t = charData.total > 0 ? localX / (charData.total * scale) : 0
      const x = startX + localX
      const theta = t * Math.PI * waves * 2 + phase
      const y = centerY + Math.sin(theta) * amplitude
      // Tangent: derivative d(y)/d(x) → arctan gives rotation angle
      // y = amp * sin(k * x + phase), dy/dx = amp * k * cos(k * x + phase)
      // k = (PI * waves * 2) / effectiveTotal
      const k = (Math.PI * waves * 2) / Math.max(effectiveTotal, 1)
      const slope = amplitude * k * Math.cos(theta)
      const angle = Math.atan(slope) * (180 / Math.PI)
      out.push({ char: ch, cx: x, cy: y, angle })
      cum += w
    }
    return out
  }, [charData, startX, scale, effectiveTotal, phase])

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        {positions.map((p, i) => (
          <Text
            key={i}
            style={[
              styles.char,
              {
                position: 'absolute',
                left: p.cx - STYLE.fontSize / 2,
                top: p.cy - STYLE.fontSize / 2,
                width: STYLE.fontSize,
                height: STYLE.fontSize,
                textAlign: 'center',
                transform: [{ rotate: `${p.angle}deg` }],
              },
            ]}
          >
            {p.char}
          </Text>
        ))}
      </View>
      <Text style={styles.info}>measureNaturalWidth() per character · characters rotate along sine tangent</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c' },
  stage: { flex: 1, position: 'relative' },
  char: { fontFamily: 'Georgia', fontSize: 22, color: '#e8e4dc' },
  info: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingBottom: 20 },
})
