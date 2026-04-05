import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useState } from 'react'

// Import all demos
import { TightBubblesDemo } from '../../components/demos/TightBubbles'
import { AccordionDemo } from '../../components/demos/Accordion'
import { EditorialEngineDemo } from '../../components/demos/EditorialEngine'
import { MasonryDemo } from '../../components/demos/Masonry'
import { I18nDemo } from '../../components/demos/I18n'

const demos = [
  {
    id: 'tight-bubbles',
    title: 'Tight Chat Bubbles',
    api: 'walkLineRanges() + layout()',
    level: 'Intermediate',
    desc: 'Shrinkwrap bubbles — find minimum width that keeps line count',
    component: TightBubblesDemo,
  },
  {
    id: 'accordion',
    title: 'Accordion Heights',
    api: 'prepare() + layout()',
    level: 'Beginner',
    desc: 'Expand/collapse with pre-computed heights — zero layout shift',
    component: AccordionDemo,
  },
  {
    id: 'editorial',
    title: 'Editorial Engine',
    api: 'layoutNextLine() + prepareWithSegments()',
    level: 'Advanced',
    desc: 'Text reflows around draggable obstacles in real-time',
    component: EditorialEngineDemo,
  },
  {
    id: 'masonry',
    title: 'Masonry Grid',
    api: 'prepare() + layout()',
    level: 'Beginner',
    desc: 'Pinterest-style grid with pre-computed card heights',
    component: MasonryDemo,
  },
  {
    id: 'i18n',
    title: 'Multilingual Feed',
    api: 'prepare() + layout()',
    level: 'Beginner',
    desc: 'CJK, Arabic, Georgian, Thai — same API, no locale hacks',
    component: I18nDemo,
  },
]

export default function DemosScreen() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null)

  if (activeDemo) {
    const demo = demos.find(d => d.id === activeDemo)!
    const DemoComponent = demo.component
    return (
      <View style={styles.container}>
        <Pressable style={styles.backBtn} onPress={() => setActiveDemo(null)}>
          <Text style={styles.backText}>← Back to Demos</Text>
        </Pressable>
        <Text style={styles.demoTitle}>{demo.title}</Text>
        <Text style={styles.demoApi}>{demo.api}</Text>
        <DemoComponent />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>expo-pretext Demos</Text>
      <Text style={styles.subtitle}>Every API in action</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {demos.map(demo => (
          <Pressable
            key={demo.id}
            style={styles.card}
            onPress={() => setActiveDemo(demo.id)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{demo.title}</Text>
              <Text style={[styles.badge, demo.level === 'Advanced' && styles.badgeAdvanced]}>
                {demo.level}
              </Text>
            </View>
            <Text style={styles.cardApi}>{demo.api}</Text>
            <Text style={styles.cardDesc}>{demo.desc}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeAdvanced: { backgroundColor: '#fff3e0', color: '#e65100' },
  cardApi: { fontSize: 12, color: '#007AFF', marginTop: 4, fontFamily: 'Menlo' },
  cardDesc: { fontSize: 14, color: '#666', marginTop: 6, lineHeight: 20 },
  backBtn: { padding: 12 },
  backText: { fontSize: 16, color: '#007AFF' },
  demoTitle: { fontSize: 20, fontWeight: '700', paddingHorizontal: 16 },
  demoApi: { fontSize: 12, color: '#007AFF', fontFamily: 'Menlo', paddingHorizontal: 16, marginBottom: 8 },
})
