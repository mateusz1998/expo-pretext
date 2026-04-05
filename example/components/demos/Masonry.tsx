import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native'
import { prepare, layout } from 'expo-pretext'

const style = { fontFamily: 'Helvetica Neue', fontSize: 14, lineHeight: 20 }

const cards = [
  'The quick brown fox jumps over the lazy dog.',
  'React Native is awesome for building cross-platform mobile apps.',
  'საქართველო მდიდარი ისტორიისა და კულტურის ქვეყანაა. კავკასიის მთების ძირას.',
  'Short text.',
  '春天到了，万物复苏，到处都是生机勃勃的景象。小鸟在枝头歌唱，花儿在微风中摇曳。',
  'بدأت الرحلة في يوم مشمس من أيام الربيع، حين كانت الأزهار تتفتح في كل مكان.',
  'expo-pretext predicts text heights before rendering — no onLayout needed.',
  'AGI 春天到了 🚀',
  '羅生門の下で雨やみを待っていた。広い門の下にはこの男のほかに誰もいない。',
  'ในวันหนึ่ง มีชายหนุ่มคนหนึ่งออกเดินทางไปยังเมืองที่ห่างไกล',
  'Pure arithmetic. Zero native calls on resize.',
  'The giraffe stands as the tallest land animal on Earth, its long neck stretching skyward.',
]

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#FF9FF3', '#54A0FF', '#5F27CD', '#01CBC6']

export function MasonryDemo() {
  const { width } = useWindowDimensions()
  const gap = 8
  const columnWidth = (width - 48 - gap) / 2
  const padding = 12

  // Pre-compute ALL heights with prepare() + layout() — batch, pure arithmetic
  const heights = cards.map(text => {
    const prepared = prepare(text, style)
    const result = layout(prepared, columnWidth - padding * 2)
    return result.height + padding * 2 // content + padding
  })

  // Assign to columns by shortest column
  const columns: { items: { text: string; height: number; color: string; index: number }[] }[] = [
    { items: [] },
    { items: [] },
  ]
  const columnHeights = [0, 0]

  cards.forEach((text, i) => {
    const shorter = columnHeights[0]! <= columnHeights[1]! ? 0 : 1
    columns[shorter]!.items.push({
      text,
      height: heights[i]!,
      color: colors[i % colors.length]!,
      index: i,
    })
    columnHeights[shorter]! += heights[i]! + gap
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.info}>
        Every card height predicted by prepare() + layout() before rendering.
        Column assignment uses predicted heights — shortest column gets next card.
      </Text>
      <View style={styles.grid}>
        {columns.map((col, ci) => (
          <View key={ci} style={[styles.column, { width: columnWidth }]}>
            {col.items.map(item => (
              <View
                key={item.index}
                style={[styles.card, { backgroundColor: item.color, minHeight: item.height }]}
              >
                <Text style={styles.cardText}>{item.text}</Text>
                <Text style={styles.cardMeta}>h:{item.height.toFixed(0)}px</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  info: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 12, fontStyle: 'italic' },
  grid: { flexDirection: 'row', gap: 8 },
  column: { gap: 8 },
  card: { padding: 12, borderRadius: 10 },
  cardText: { fontFamily: 'Helvetica Neue', fontSize: 14, lineHeight: 20, color: '#333' },
  cardMeta: { fontSize: 10, color: 'rgba(0,0,0,0.3)', marginTop: 4 },
})
