import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native'
import { useTextHeight } from 'expo-pretext'

const style = { fontFamily: 'Helvetica Neue', fontSize: 15, lineHeight: 22 }

const sections = [
  {
    title: 'What is expo-pretext?',
    content: 'expo-pretext is a React Native/Expo port of Pretext — a pure JS text measurement library. It predicts text heights before rendering using native measurement + pure arithmetic layout. No onLayout, no layout jumps, no guesswork.',
  },
  {
    title: 'How does it work?',
    content: 'Two phases: prepare() calls native iOS/Android once to measure text segments. layout() runs pure JS arithmetic on cached widths — microseconds per call, no native bridge. prepare() once, layout() many times at different widths.',
  },
  {
    title: 'What languages are supported?',
    content: 'All of them. CJK (Chinese, Japanese, Korean) with per-character breaking. Arabic and Hebrew with RTL bidi. Thai, Lao, Khmer with dictionary-based boundaries. Georgian, Devanagari, and every Unicode script. Emoji including compound ZWJ sequences and flags.',
  },
  {
    title: 'How accurate is it?',
    content: 'For Latin scripts (English, French, German) — pixel-perfect, 0.0px difference from RN Text. For CJK and Georgian — within 1 line at narrow widths due to font substitution differences. We are actively working on improving CJK/Georgian accuracy.',
  },
  {
    title: 'What about streaming?',
    content: 'Built for AI chat. When text grows token-by-token, expo-pretext detects the append pattern and only measures the new suffix. Native measurement cache means most segments are instant cache hits. layout() recalculates in microseconds.',
  },
]

function AccordionSection({ title, content, maxWidth }: { title: string; content: string; maxWidth: number }) {
  const [expanded, setExpanded] = useState(false)
  // Pre-compute expanded height BEFORE animation — no onLayout needed
  const contentHeight = useTextHeight(content, style, maxWidth - 32) // minus padding

  return (
    <View style={styles.section}>
      <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.headerText}>{title}</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && (
        <View style={[styles.body, { height: contentHeight + 24 }]}>
          <Text style={styles.bodyText}>{content}</Text>
        </View>
      )}
      <Text style={styles.heightHint}>
        Predicted height: {contentHeight.toFixed(0)}px ({Math.round(contentHeight / 22)} lines)
      </Text>
    </View>
  )
}

export function AccordionDemo() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.info}>
        Content heights are calculated by expo-pretext BEFORE the animation.
        No onLayout measurement needed — zero layout shift on expand.
      </Text>
      {sections.map((section, i) => (
        <AccordionSection key={i} title={section.title} content={section.content} maxWidth={360} />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  info: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4, fontStyle: 'italic' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerText: { fontSize: 16, fontWeight: '600', flex: 1 },
  chevron: { fontSize: 12, color: '#999' },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  bodyText: { fontFamily: 'Helvetica Neue', fontSize: 15, lineHeight: 22, color: '#333' },
  heightHint: { fontSize: 10, color: '#bbb', paddingHorizontal: 16, paddingBottom: 8 },
})
