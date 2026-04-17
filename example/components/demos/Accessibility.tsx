// example/components/demos/Accessibility.tsx
//
// Dynamic Type demo — shows live re-layout when the system font scale changes.
// Users pinch the slider to simulate a font scale change; on real devices,
// changing Settings > Accessibility > Larger Text fires the same path.

import { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native'
import {
  getFontScale,
  onFontScaleChange,
  clearAllCaches,
  prepare,
  layout,
} from 'expo-pretext'

const SAMPLE = [
  'The quick brown fox jumps over the lazy dog.',
  'Dynamic Type on iOS lets users pick a text size from Settings > Accessibility > Larger Text.',
  'When the scale changes, every cached measurement goes stale at once — so you clear the cache and re-measure.',
  'Georgian: სწრაფი ყავისფერი მელა ხტუნავს ზარმაცი ძაღლის ზემოთ.',
]

const BASE = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }
const WIDTH = 320

const SIMULATED_SCALES = [1.0, 1.15, 1.35, 1.5, 1.75, 2.0]

function measureAt(scale: number, text: string) {
  const style = {
    fontFamily: BASE.fontFamily,
    fontSize: BASE.fontSize * scale,
    lineHeight: BASE.lineHeight * scale,
  }
  const p = prepare(text, style)
  const r = layout(p, WIDTH)
  return { style, ...r }
}

export function AccessibilityDemo() {
  const [systemScale, setSystemScale] = useState<number>(() => getFontScale())
  const [simulatedScale, setSimulatedScale] = useState<number>(1.0)

  useEffect(() => {
    return onFontScaleChange((newScale) => {
      clearAllCaches()
      setSystemScale(newScale)
    })
  }, [])

  const rows = useMemo(() => {
    return SAMPLE.map((text) => ({ text, sim: measureAt(simulatedScale, text) }))
  }, [simulatedScale])

  const totalHeight = rows.reduce((sum, r) => sum + r.sim.height, 0)

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>Dynamic Type · Font Scale</Text>
      <Text style={s.desc}>
        Change the simulated font scale. Each row re-measures through{'\n'}
        `prepare()` + `layout()` with the scaled style — no re-render flash,{'\n'}
        no onLayout round-trip.
      </Text>

      <View style={s.systemBox}>
        <View style={s.systemRow}>
          <Text style={s.systemLabel}>SYSTEM SCALE</Text>
          <Text style={s.systemValue}>{systemScale.toFixed(2)}x</Text>
        </View>
        <Text style={s.systemHint}>
          {Platform.OS === 'ios'
            ? 'Change in Settings > Accessibility > Larger Text'
            : 'Change in Settings > Accessibility > Font Size'}
        </Text>
      </View>

      <Text style={s.sectionLabel}>SIMULATED SCALE</Text>
      <View style={s.scaleRow}>
        {SIMULATED_SCALES.map((scale) => (
          <Pressable
            key={scale}
            onPress={() => setSimulatedScale(scale)}
            style={[s.scaleBtn, simulatedScale === scale && s.scaleBtnActive]}
          >
            <Text style={[s.scaleBtnText, simulatedScale === scale && s.scaleBtnTextActive]}>
              {scale.toFixed(2)}x
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={s.totalsBar}>
        <Text style={s.totalsText}>
          total column height: <Text style={s.totalsVal}>{totalHeight.toFixed(0)}px</Text>
          {'  '}· {rows.length} rows · width {WIDTH}px
        </Text>
      </View>

      {rows.map(({ text, sim }, i) => (
        <View key={i} style={s.card}>
          <View style={s.cardMeta}>
            <Text style={s.metaText}>
              height <Text style={s.metaVal}>{sim.height.toFixed(0)}px</Text>
              {'  '}lines <Text style={s.metaVal}>{sim.lineCount}</Text>
              {'  '}fs <Text style={s.metaVal}>{sim.style.fontSize.toFixed(1)}</Text>
            </Text>
          </View>
          <View style={[s.textBox, { width: WIDTH }]}>
            <Text style={sim.style}>{text}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  content: { padding: 16, paddingBottom: 60 },
  title: {
    fontFamily: 'Menlo', fontSize: 14, fontWeight: '800', color: '#ffd369',
    letterSpacing: 1, marginBottom: 6,
  },
  desc: {
    fontFamily: 'Menlo', fontSize: 11, color: 'rgba(255,255,255,0.5)',
    lineHeight: 17, marginBottom: 14,
  },
  systemBox: {
    backgroundColor: '#121218', borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,211,105,0.18)',
  },
  systemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  systemLabel: {
    fontFamily: 'Menlo', fontSize: 9, fontWeight: '700',
    color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2,
  },
  systemValue: {
    fontFamily: 'Menlo', fontSize: 20, fontWeight: '800', color: '#ffd369',
  },
  systemHint: {
    fontFamily: 'Menlo', fontSize: 9, color: 'rgba(255,255,255,0.35)',
    marginTop: 6,
  },
  sectionLabel: {
    fontFamily: 'Menlo', fontSize: 9, fontWeight: '700',
    color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, marginBottom: 6,
  },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  scaleBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#121218',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  scaleBtnActive: {
    backgroundColor: '#ffd369', borderColor: '#ffd369',
  },
  scaleBtnText: {
    fontFamily: 'Menlo', fontSize: 11, color: 'rgba(255,255,255,0.65)',
  },
  scaleBtnTextActive: { color: '#0a0a0c', fontWeight: '800' },
  totalsBar: {
    backgroundColor: '#17171f', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)',
  },
  totalsText: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  totalsVal: { color: '#93c5fd', fontWeight: '700' },
  card: {
    backgroundColor: '#121218', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardMeta: { marginBottom: 8 },
  metaText: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  metaVal: { color: '#ffd369', fontWeight: '700' },
  textBox: {
    backgroundColor: '#fff', borderRadius: 6, padding: 8,
  },
})
