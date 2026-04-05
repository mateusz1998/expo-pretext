import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { prepare, layout, prepareWithSegments, walkLineRanges } from 'expo-pretext'

const style = { fontFamily: 'Helvetica Neue', fontSize: 16, lineHeight: 24 }
const maxBubbleWidth = 280

const messages = [
  'Hey!',
  'How are you doing?',
  'I just shipped a new feature 🚀',
  'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.',
  'React Native is awesome',
  'საქართველო მდიდარი ისტორიისა და კულტურის ქვეყანაა.',
  'بدأت الرحلة في يوم مشمس',
  '春天到了，万物复苏',
]

// Binary search for tightest width that keeps same line count
function findTightWidth(text: string): number {
  const prepared = prepare(text, style)
  const fullResult = layout(prepared, maxBubbleWidth)
  const targetLines = fullResult.lineCount

  if (targetLines <= 1) {
    // Single line — natural width is the tight width
    const wideResult = layout(prepared, 9999)
    return Math.min(Math.ceil(wideResult.height > 0 ? maxBubbleWidth : 50), maxBubbleWidth)
  }

  // Binary search: find minimum width that still produces targetLines
  let lo = 50
  let hi = maxBubbleWidth

  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    const r = layout(prepared, mid)
    if (r.lineCount <= targetLines) {
      hi = mid
    } else {
      lo = mid
    }
  }

  return hi
}

function Bubble({ text, isUser }: { text: string; isUser: boolean }) {
  const tightWidth = findTightWidth(text)
  const predicted = layout(prepare(text, style), tightWidth)

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          { width: tightWidth + 24 }, // +padding
        ]}
      >
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
      <Text style={styles.meta}>
        w:{tightWidth} h:{predicted.height} l:{predicted.lineCount}
      </Text>
    </View>
  )
}

export function TightBubblesDemo() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.info}>
        Each bubble is shrinkwrapped to the tightest width that keeps the same line count.
        Binary search via prepare() + layout() — pure arithmetic, 0 native calls per resize.
      </Text>
      {messages.map((msg, i) => (
        <Bubble key={i} text={msg} isUser={i % 2 === 0} />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  info: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 8, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubble: { padding: 12, borderRadius: 16 },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  bubbleText: { fontFamily: 'Helvetica Neue', fontSize: 16, lineHeight: 24, color: '#1a1a1a' },
  meta: { fontSize: 10, color: '#999' },
})
