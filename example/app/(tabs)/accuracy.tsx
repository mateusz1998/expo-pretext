import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { sampleTexts } from '../../data/sample-texts'
import { prepare, layout } from 'expo-pretext'
import { getNativeModule } from 'expo-pretext/src/ExpoPretext'
import { textStyleToFontDescriptor, getLineHeight } from 'expo-pretext/src/font-utils'

const testWidths = [200, 280, 360]
const textStyleConfig = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

function AccuracyRow({ text, testWidth }: { text: string; testWidth: number }) {
  const [actual, setActual] = useState<number | null>(null)
  const [actualWidth, setActualWidth] = useState<number | null>(null)

  const containerWidth = testWidth - 8 // minus padding

  // Method 1: Segment-based (prepare + layout)
  const segmentResult = useMemo(() => {
    try {
      const prepared = prepare(text, textStyleConfig)
      return layout(prepared, containerWidth)
    } catch { return null }
  }, [text, containerWidth])

  // Method 2: TextKit (NSLayoutManager)
  const textkitResult = useMemo(() => {
    try {
      const native = getNativeModule()
      if (!native) return null
      const font = textStyleToFontDescriptor(textStyleConfig)
      const lh = getLineHeight(textStyleConfig)
      return native.measureTextHeight(text, font, containerWidth, lh)
    } catch { return null }
  }, [text, containerWidth])

  const segH = segmentResult?.height ?? 0
  const tkH = textkitResult?.height ?? 0
  const actH = actual ?? 0

  const segDiff = actual !== null ? Math.abs(segH - actH) : null
  const tkDiff = actual !== null ? Math.abs(tkH - actH) : null
  const segPass = segDiff !== null && segDiff < 1
  const tkPass = tkDiff !== null && tkDiff < 1

  return (
    <View style={styles.testCase}>
      <View style={styles.testHeader}>
        <Text style={styles.widthLabel}>{testWidth}px</Text>
      </View>

      {/* Three measurements side by side */}
      <View style={styles.metricsRow}>
        <View style={[styles.metric, segPass ? styles.metricPass : styles.metricFail]}>
          <Text style={styles.metricLabel}>Segments</Text>
          <Text style={styles.metricValue}>{segH.toFixed(0)}px</Text>
          <Text style={styles.metricLines}>{segmentResult?.lineCount ?? '?'}L</Text>
          {segDiff !== null && <Text style={styles.metricDiff}>diff:{segDiff.toFixed(1)}</Text>}
        </View>
        <View style={[styles.metric, tkPass ? styles.metricPass : styles.metricFail]}>
          <Text style={styles.metricLabel}>TextKit</Text>
          <Text style={styles.metricValue}>{tkH.toFixed(0)}px</Text>
          <Text style={styles.metricLines}>{textkitResult?.lineCount ?? '?'}L</Text>
          {tkDiff !== null && <Text style={styles.metricDiff}>diff:{tkDiff.toFixed(1)}</Text>}
        </View>
        <View style={[styles.metric, styles.metricActual]}>
          <Text style={styles.metricLabel}>RN Text</Text>
          <Text style={styles.metricValue}>{actH.toFixed(0)}px</Text>
          <Text style={styles.metricLines}>W:{actualWidth?.toFixed(0) ?? '?'}</Text>
        </View>
      </View>

      {/* Rendered text */}
      <View style={[styles.textBox, { width: testWidth }]}>
        <Text
          style={styles.sampleText}
          onLayout={e => {
            setActual(e.nativeEvent.layout.height)
            setActualWidth(e.nativeEvent.layout.width)
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  )
}

export default function AccuracyScreen() {
  const texts = Object.entries(sampleTexts)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accuracy Diagnostic</Text>
      <Text style={styles.subtitle}>Segments vs TextKit vs RN Text</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {texts.map(([lang, text]) => (
          <View key={lang} style={styles.section}>
            <Text style={styles.sectionTitle}>{lang}</Text>
            {testWidths.map(w => (
              <AccuracyRow key={w} text={text} testWidth={w} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 8 },
  list: { padding: 12, gap: 12, paddingBottom: 40 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, textTransform: 'capitalize' },
  testCase: { marginBottom: 16 },
  testHeader: { marginBottom: 4 },
  widthLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  metricsRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  metric: {
    flex: 1, padding: 6, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#eee',
  },
  metricPass: { backgroundColor: '#d4edda', borderColor: '#28a745' },
  metricFail: { backgroundColor: '#f8d7da', borderColor: '#dc3545' },
  metricActual: { backgroundColor: '#e2e3e5', borderColor: '#6c757d' },
  metricLabel: { fontSize: 10, fontWeight: '700', color: '#555' },
  metricValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  metricLines: { fontSize: 10, color: '#888' },
  metricDiff: { fontSize: 9, color: '#dc3545', marginTop: 1 },
  textBox: {
    backgroundColor: '#f8f8f8', borderRadius: 6, padding: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd',
    alignSelf: 'flex-start',
  },
  sampleText: { fontSize: 16, lineHeight: 24 },
})
