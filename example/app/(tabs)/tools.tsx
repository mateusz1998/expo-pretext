import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { sampleTexts } from '../../data/sample-texts'
import { useTextHeight } from 'expo-pretext'

const testWidths = [200, 280, 360]
const textStyleConfig = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }

function AccuracyRow({ text, testWidth }: { text: string; testWidth: number }) {
  const [actual, setActual] = useState<number | null>(null)
  const containerWidth = testWidth - 8
  const predicted = useTextHeight(text, textStyleConfig, containerWidth)
  const diff = actual !== null ? Math.abs(predicted - actual) : null
  const pass = diff !== null ? diff < 2 : null

  return (
    <View style={s.testCase}>
      <View style={s.testHeader}>
        <Text style={s.widthLabel}>{testWidth}px</Text>
      </View>
      <View style={s.metricsRow}>
        <View style={[s.metric, pass ? s.metricPass : (diff !== null ? s.metricFail : s.metricPending)]}>
          <Text style={s.metricLabel}>Predicted</Text>
          <Text style={s.metricValue}>{predicted.toFixed(0)}px</Text>
          {diff !== null && <Text style={s.metricDiff}>diff:{diff.toFixed(1)}</Text>}
        </View>
        <View style={[s.metric, s.metricRef]}>
          <Text style={s.metricLabel}>RN Text</Text>
          <Text style={s.metricValue}>{actual?.toFixed(0) ?? '...'}px</Text>
          <Text style={s.metricDiff}>reference</Text>
        </View>
        <View style={[s.metric, pass ? s.metricPass : (diff !== null ? s.metricFail : s.metricPending)]}>
          <Text style={s.metricLabel}>Result</Text>
          <Text style={[s.metricValue, pass && { color: '#155724' }, diff !== null && !pass && { color: '#721c24' }]}>
            {diff !== null ? (pass ? 'PASS' : 'FAIL') : '...'}
          </Text>
          {diff !== null && <Text style={s.metricDiff}>{diff.toFixed(1)}px</Text>}
        </View>
      </View>
      <View style={[s.textBox, { width: testWidth }]}>
        <Text style={s.sampleText} onLayout={e => setActual(e.nativeEvent.layout.height)}>
          {text}
        </Text>
      </View>
    </View>
  )
}

export default function ToolsScreen() {
  const texts = Object.entries(sampleTexts)
  const totalTests = texts.length * testWidths.length

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionTitle}>Accuracy Testing</Text>
        <Text style={s.subtitle}>
          useTextHeight (TextKit) vs RN Text onLayout
        </Text>
        <Text style={s.subtitle}>
          {texts.length} texts x {testWidths.length} widths = {totalTests} tests | Target: {'<'}2px
        </Text>

        {texts.map(([lang, text]) => (
          <View key={lang} style={s.section}>
            <Text style={s.langTitle}>{lang}</Text>
            {testWidths.map(w => (
              <AccuracyRow key={w} text={text} testWidth={w} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 12, gap: 12, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: '#666',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 4, paddingHorizontal: 4,
  },
  subtitle: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 2 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  langTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, textTransform: 'capitalize' },
  testCase: { marginBottom: 14 },
  testHeader: { marginBottom: 4 },
  widthLabel: { fontSize: 14, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  metric: {
    flex: 1, padding: 6, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#eee',
  },
  metricPass: { backgroundColor: '#d4edda', borderColor: '#28a745' },
  metricFail: { backgroundColor: '#f8d7da', borderColor: '#dc3545' },
  metricRef: { backgroundColor: '#e2e3e5', borderColor: '#6c757d' },
  metricPending: { backgroundColor: '#f0f0f0', borderColor: '#ddd' },
  metricLabel: { fontSize: 10, fontWeight: '700', color: '#555' },
  metricValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  metricDiff: { fontSize: 9, color: '#888', marginTop: 1 },
  textBox: {
    backgroundColor: '#f8f8f8', borderRadius: 6, padding: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd',
    alignSelf: 'flex-start',
  },
  sampleText: { fontSize: 16, lineHeight: 24 },
})
