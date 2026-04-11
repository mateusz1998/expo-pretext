import { useMemo, useState, useEffect } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { prepareWithSegments, measureNaturalWidth } from 'expo-pretext'

const STYLE = { fontFamily: 'Georgia', fontSize: 32, lineHeight: 36 }
const TEXT = 'expo-pretext flows along a curve'

export function TextPathDemo() {
  const { width } = useWindowDimensions()
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setPhase(p => p + 0.05), 50)
    return () => clearInterval(timer)
  }, [])

  // Per-character width measurement via individual prepare calls
  const charPositions = useMemo(() => {
    const chars = [...TEXT]
    const positions: Array<{ char: string; x: number; width: number }> = []
    let cumX = 0
    for (const ch of chars) {
      const prepared = prepareWithSegments(ch === ' ' ? '· ' : ch, STYLE)
      // For spaces, use half a dot width
      const w = ch === ' ' ? STYLE.fontSize * 0.4 : measureNaturalWidth(prepared)
      positions.push({ char: ch, x: cumX, width: w })
      cumX += w
    }
    return { positions, totalWidth: cumX }
  }, [])

  const pathStart = (width - charPositions.totalWidth) / 2
  const amplitude = 40

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        {charPositions.positions.map((p, i) => {
          const x = pathStart + p.x
          const y = 200 + Math.sin((p.x / charPositions.totalWidth) * Math.PI * 3 + phase) * amplitude
          return (
            <Text key={i} style={[styles.char, {
              position: 'absolute',
              left: x,
              top: y,
            }]}>{p.char}</Text>
          )
        })}
      </View>
      <Text style={styles.info}>measureNaturalWidth() per character · curve animation</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c' },
  stage: { flex: 1, position: 'relative' },
  char: { fontFamily: 'Georgia', fontSize: 32, color: '#e8e4dc' },
  info: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingBottom: 20 },
})
