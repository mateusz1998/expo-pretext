import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Pressable } from 'react-native'
import { useTextHeight } from 'expo-pretext'

const style = { fontFamily: 'System', fontSize: 14, lineHeight: 20 }

const sampleText = `The web renders text through a pipeline designed thirty years ago for static documents. A browser loads a font, shapes text into glyphs, measures their combined width, determines where lines break, and positions each line vertically. Every step requires the rendering engine to consult its internal layout tree. Pretext sidesteps this entirely.`

function ParagraphWithHeight({ text, width, justify }: { text: string; width: number; justify: boolean }) {
  const predicted = useTextHeight(text, style, width)

  return (
    <View style={[styles.paragraph, { width }]}>
      <Text
        style={[
          styles.paraText,
          justify && { textAlign: 'justify' },
          { width: width - 24 }, // minus padding
        ]}
      >
        {text}
      </Text>
      <Text style={styles.meta}>
        Predicted: {predicted.toFixed(0)}px · useTextHeight()
      </Text>
    </View>
  )
}

export function JustificationComparisonDemo() {
  const { width } = useWindowDimensions()
  const maxWidth = width - 48
  const [textWidth, setTextWidth] = useState(Math.min(300, maxWidth))

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.info}>
        Same text at same width — left-aligned vs justified.
        useTextHeight() predicts the height for both. RN Text handles the actual rendering.
      </Text>

      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>Width: {textWidth}px</Text>
        <View style={styles.sliderBtns}>
          <Pressable onPress={() => setTextWidth(w => Math.max(120, w - 20))} style={styles.btn}>
            <Text style={styles.btnText}>-</Text>
          </Pressable>
          <Pressable onPress={() => setTextWidth(w => Math.min(maxWidth, w + 20))} style={styles.btn}>
            <Text style={styles.btnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.colTitle}>Left-aligned</Text>
      <ParagraphWithHeight text={sampleText} width={textWidth} justify={false} />

      <View style={{ height: 16 }} />

      <Text style={styles.colTitle}>Justified</Text>
      <ParagraphWithHeight text={sampleText} width={textWidth} justify={true} />

      <View style={{ height: 16 }} />

      <Text style={styles.note}>
        Note: Both use the same useTextHeight() prediction.
        Justification changes word spacing but not line count or total height.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  info: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 12, fontStyle: 'italic' },
  sliderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8,
  },
  sliderLabel: { fontSize: 14, fontWeight: '600' },
  sliderBtns: { flexDirection: 'row', gap: 8 },
  btn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  colTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 6 },
  paragraph: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd',
  },
  paraText: { fontSize: 14, lineHeight: 20, color: '#333' },
  meta: { fontSize: 10, color: '#999', marginTop: 8, fontFamily: 'Menlo' },
  note: { fontSize: 12, color: '#888', lineHeight: 18, fontStyle: 'italic' },
})
