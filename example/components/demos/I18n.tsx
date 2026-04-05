import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native'
import { useTextHeight } from 'expo-pretext'

const style = { fontFamily: 'Helvetica Neue', fontSize: 16, lineHeight: 24 }

const languages = [
  { name: 'English', dir: 'LTR', text: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.' },
  { name: 'Arabic', dir: 'RTL', text: 'بدأت الرحلة في يوم مشمس من أيام الربيع، حين كانت الأزهار تتفتح في كل مكان.' },
  { name: 'Chinese', dir: 'LTR', text: '春天到了，万物复苏，到处都是生机勃勃的景象。小鸟在枝头歌唱，花儿在微风中摇曳。' },
  { name: 'Japanese', dir: 'LTR', text: '羅生門の下で雨やみを待っていた。広い門の下にはこの男のほかに誰もいない。' },
  { name: 'Georgian', dir: 'LTR', text: 'საქართველო მდიდარი ისტორიისა და კულტურის ქვეყანაა. კავკასიის მთების ძირას განლაგებული.' },
  { name: 'Thai', dir: 'LTR', text: 'ในวันหนึ่ง มีชายหนุ่มคนหนึ่งออกเดินทางไปยังเมืองที่ห่างไกล เพื่อค้นหาความจริงของชีวิต' },
  { name: 'Korean', dir: 'LTR', text: '하늘과 바람과 별과 시. 죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를.' },
  { name: 'Mixed', dir: 'LTR', text: 'React Native is 🔥 and expo-pretext works across العربية, 中文, 日本語, and ქართული!' },
]

function LangCard({ lang, maxWidth }: { lang: typeof languages[0]; maxWidth: number }) {
  const predicted = useTextHeight(lang.text, style, maxWidth)

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.langName}>{lang.name}</Text>
        <Text style={styles.langDir}>{lang.dir}</Text>
        <Text style={styles.heightBadge}>h:{predicted.toFixed(0)}px</Text>
      </View>
      <Text
        style={[
          styles.sampleText,
          { writingDirection: lang.dir === 'RTL' ? 'rtl' : 'ltr' },
        ]}
      >
        {lang.text}
      </Text>
    </View>
  )
}

export function I18nDemo() {
  const { width } = useWindowDimensions()
  const cardWidth = width - 64

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.info}>
        Same prepare() + layout() API for every script. No locale hacks, no special-casing.
        Native OS segmenters handle Unicode correctly.
      </Text>
      {languages.map(lang => (
        <LangCard key={lang.name} lang={lang} maxWidth={cardWidth} />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  info: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4, fontStyle: 'italic' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  langName: { fontSize: 15, fontWeight: '600' },
  langDir: { fontSize: 11, color: '#999' },
  heightBadge: {
    fontSize: 11,
    color: '#007AFF',
    fontFamily: 'Menlo',
    marginLeft: 'auto',
  },
  sampleText: { fontFamily: 'Helvetica Neue', fontSize: 16, lineHeight: 24, color: '#333' },
})
