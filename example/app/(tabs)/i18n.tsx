import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native'

import { sampleTexts } from '../../data/sample-texts'

// TODO: Use useTextHeight() from expo-pretext for predicted heights

const languages: { key: string; name: string; dir: 'ltr' | 'rtl' }[] = [
  { key: 'english', name: 'English', dir: 'ltr' },
  { key: 'arabic', name: 'Arabic (RTL)', dir: 'rtl' },
  { key: 'chinese', name: 'Chinese', dir: 'ltr' },
  { key: 'japanese', name: 'Japanese', dir: 'ltr' },
  { key: 'georgian', name: 'Georgian', dir: 'ltr' },
  { key: 'thai', name: 'Thai', dir: 'ltr' },
  { key: 'emoji', name: 'Mixed + Emoji', dir: 'ltr' },
  { key: 'mixed', name: 'Multi-script', dir: 'ltr' },
]

export default function I18nScreen() {
  const { width } = useWindowDimensions()
  const cardWidth = width - 32

  return (
    <View style={styles.container}>
      <Text style={styles.title}>i18n Showcase</Text>
      <Text style={styles.subtitle}>Text height prediction across scripts</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {languages.map(lang => {
          const text = sampleTexts[lang.key as keyof typeof sampleTexts]
          return (
            <View key={lang.key} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.langName}>{lang.name}</Text>
                <Text style={styles.langDir}>{lang.dir.toUpperCase()}</Text>
              </View>
              <Text
                style={[
                  styles.sampleText,
                  { writingDirection: lang.dir, textAlign: lang.dir === 'rtl' ? 'right' : 'left' },
                ]}
              >
                {text}
              </Text>
              <View style={styles.metrics}>
                <Text style={styles.metricText}>
                  Chars: {text.length} | Width: {cardWidth - 32}px
                </Text>
                {/* TODO: Show predicted vs actual height */}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 16 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  langName: { fontSize: 14, fontWeight: '600', color: '#333' },
  langDir: { fontSize: 11, color: '#999', fontWeight: '500' },
  sampleText: { fontSize: 16, lineHeight: 24, color: '#333' },
  metrics: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  metricText: { fontSize: 11, color: '#999' },
})
