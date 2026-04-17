// example/components/demos/DebugOverlay.tsx
//
// PretextDebugOverlay canary — wraps text with a colored border showing
// predicted vs actual height. Green = exact, yellow = close, orange = loose,
// red = wrong. Also shows a live tally of predictions per accuracy bucket.

import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import {
  PretextDebugOverlay,
  useTextHeight,
  DEBUG_ACCURACY_COLORS,
  type DebugMeasurement,
} from 'expo-pretext'

type Tally = {
  exact: number
  close: number
  loose: number
  wrong: number
}

const ROWS = [
  'Short one-liner.',
  'A medium-length sentence that will likely wrap at narrower widths but fit on one line when given some room.',
  'The quick brown fox jumps over the lazy dog and then trots over to the next field for another round.',
  'Georgian: სწრაფი ყავისფერი მელა ხტუნავს ზარმაცი ძაღლის ზემოთ, მერე გადადის შემდეგ ველზე კიდევ ერთი გასეირნებისთვის.',
  'CJK: 快速的棕色狐狸跳过懒惰的狗，然后去下一个田野再来一次。',
  'Arabic: الثعلب البني السريع يقفز فوق الكلب الكسول ثم ينتقل إلى الحقل التالي لجولة أخرى.',
]

const WIDTHS = [200, 280, 360]

const STYLE = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

type RowProps = {
  text: string
  width: number
  onMeasurement: (m: DebugMeasurement) => void
}

function Row({ text, width, onMeasurement }: RowProps) {
  const predicted = useTextHeight(text, STYLE, width)
  return (
    <View style={[s.rowWrap, { width: width + 2 }]}>
      <PretextDebugOverlay
        predictedHeight={predicted}
        onMeasurement={onMeasurement}
      >
        <View style={{ width }}>
          <Text style={[STYLE, s.rowText]}>{text}</Text>
        </View>
      </PretextDebugOverlay>
    </View>
  )
}

export function DebugOverlayDemo() {
  const [tally, setTally] = useState<Tally>({ exact: 0, close: 0, loose: 0, wrong: 0 })
  const [key, setKey] = useState(0)

  const onMeasurement = useCallback((m: DebugMeasurement) => {
    setTally((t) => ({ ...t, [m.accuracy]: t[m.accuracy] + 1 }))
  }, [])

  const reset = useCallback(() => {
    setTally({ exact: 0, close: 0, loose: 0, wrong: 0 })
    setKey((k) => k + 1)
  }, [])

  const total = tally.exact + tally.close + tally.loose + tally.wrong

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>PretextDebugOverlay · Accuracy Check</Text>
      <Text style={s.desc}>
        Each row is wrapped in `PretextDebugOverlay`.{'\n'}
        Border color = how close predicted height is to measured.
      </Text>

      <View style={s.legendRow}>
        <Legend color={DEBUG_ACCURACY_COLORS.exact} label="exact" hint="<1px" value={tally.exact} />
        <Legend color={DEBUG_ACCURACY_COLORS.close} label="close" hint="<5%" value={tally.close} />
        <Legend color={DEBUG_ACCURACY_COLORS.loose} label="loose" hint="<15%" value={tally.loose} />
        <Legend color={DEBUG_ACCURACY_COLORS.wrong} label="wrong" hint=">15%" value={tally.wrong} />
      </View>

      <View style={s.totalBar}>
        <Text style={s.totalText}>
          {total} of {ROWS.length * WIDTHS.length} measured
        </Text>
        <Pressable onPress={reset} style={s.resetBtn}>
          <Text style={s.resetText}>reset</Text>
        </Pressable>
      </View>

      {WIDTHS.map((width) => (
        <View key={width} style={s.section}>
          <Text style={s.sectionLabel}>WIDTH {width}px</Text>
          {ROWS.map((text, i) => (
            <Row
              key={`${key}-${width}-${i}`}
              text={text}
              width={width}
              onMeasurement={onMeasurement}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

function Legend({ color, label, hint, value }: { color: string; label: string; hint: string; value: number }) {
  return (
    <View style={s.legendCell}>
      <View style={[s.legendSwatch, { backgroundColor: color }]} />
      <Text style={s.legendLabel}>{label}</Text>
      <Text style={s.legendHint}>{hint}</Text>
      <Text style={s.legendValue}>{value}</Text>
    </View>
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
  legendRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  legendCell: {
    flex: 1, backgroundColor: '#121218', borderRadius: 10, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  legendSwatch: { width: 24, height: 6, borderRadius: 3, marginBottom: 4 },
  legendLabel: {
    fontFamily: 'Menlo', fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  legendHint: {
    fontFamily: 'Menlo', fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 1,
  },
  legendValue: {
    fontFamily: 'Menlo', fontSize: 14, fontWeight: '800',
    color: '#ffd369', marginTop: 2,
  },
  totalBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#17171f', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)',
  },
  totalText: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  resetBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#ffd369',
  },
  resetText: {
    fontFamily: 'Menlo', fontSize: 10, color: '#0a0a0c', fontWeight: '800',
  },
  section: {
    backgroundColor: '#121218', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,211,105,0.15)',
  },
  sectionLabel: {
    fontFamily: 'Menlo', fontSize: 10, fontWeight: '700', color: '#ffd369',
    letterSpacing: 1, marginBottom: 10,
  },
  rowWrap: { marginBottom: 10, backgroundColor: '#fff', alignSelf: 'flex-start' },
  rowText: { color: '#1a1a1a' },
})
