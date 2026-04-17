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
          <Text style={[s.metricValue, pass && { color: '#4ade80' }, diff !== null && !pass && { color: '#ef4444' }]}>
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
  container: { flex: 1, backgroundColor: '#0a0a0c' },
  content: { padding: 12, gap: 12, paddingBottom: 40 },
  sectionTitle: {
    fontFamily: 'Menlo',
    fontSize: 12, fontWeight: '700', color: '#ffd369',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 4, paddingHorizontal: 4,
  },
  subtitle: {
    fontFamily: 'Menlo',
    fontSize: 11, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', marginBottom: 2,
  },
  section: {
    backgroundColor: '#121218', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,211,105,0.18)',
  },
  langTitle: {
    fontFamily: 'Menlo',
    fontSize: 12, fontWeight: '800', color: '#ffd369',
    letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase',
  },
  testCase: { marginBottom: 14 },
  testHeader: { marginBottom: 4 },
  widthLabel: {
    fontFamily: 'Menlo',
    fontSize: 11, fontWeight: '700',
    color: 'rgba(255,255,255,0.65)', letterSpacing: 0.5,
  },
  metricsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  metric: {
    flex: 1, padding: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#1a1a22',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  metricPass: { borderColor: 'rgba(74,222,128,0.6)', borderWidth: 1.5 },
  metricFail: { borderColor: 'rgba(239,68,68,0.6)', borderWidth: 1.5 },
  metricRef: { borderColor: 'rgba(255,255,255,0.2)' },
  metricPending: { borderColor: 'rgba(255,255,255,0.08)' },
  metricLabel: {
    fontFamily: 'Menlo',
    fontSize: 8, fontWeight: '700',
    color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2,
  },
  metricValue: {
    fontFamily: 'Menlo',
    fontSize: 16, fontWeight: '800', color: '#ffd369',
    marginTop: 2,
  },
  metricDiff: {
    fontFamily: 'Menlo',
    fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 1,
  },
  textBox: {
    backgroundColor: '#fff', borderRadius: 6, padding: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'flex-start',
  },
  sampleText: { fontSize: 16, lineHeight: 24, color: '#1a1a1a' },
})
