import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native'

import { sampleTexts } from '../../data/sample-texts'

const cards = Object.entries(sampleTexts).flatMap(([lang, text], i) =>
  Array.from({ length: 4 }, (_, j) => ({
    id: `${lang}-${j}`,
    text: j === 0 ? text : text.slice(0, Math.floor(text.length * (0.3 + j * 0.2))),
    color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'][
      (i * 4 + j) % 8
    ]!,
  }))
)

export default function MasonryScreen() {
  const { width } = useWindowDimensions()
  const columnWidth = (width - 48) / 2

  // TODO: Use measureHeights() from expo-pretext for proper column assignment
  const leftColumn = cards.filter((_, i) => i % 2 === 0)
  const rightColumn = cards.filter((_, i) => i % 2 === 1)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Masonry Grid</Text>
      <Text style={styles.subtitle}>Heights predicted with expo-pretext</Text>
      <ScrollView contentContainerStyle={styles.grid}>
        <View style={[styles.column, { width: columnWidth }]}>
          {leftColumn.map(card => (
            <View key={card.id} style={[styles.card, { backgroundColor: card.color }]}>
              <Text style={styles.cardText}>{card.text}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.column, { width: columnWidth }]}>
          {rightColumn.map(card => (
            <View key={card.id} style={[styles.card, { backgroundColor: card.color }]}>
              <Text style={styles.cardText}>{card.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 16 },
  grid: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  column: { gap: 8 },
  card: { padding: 16, borderRadius: 12 },
  cardText: { fontSize: 14, lineHeight: 20, color: '#333' },
})
