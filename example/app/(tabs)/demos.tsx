import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useState, useEffect, useLayoutEffect } from 'react'
import { useNavigation } from 'expo-router'

// Import all demos
import { TightBubblesDemo } from '../../components/demos/TightBubbles'
import { AccordionDemo } from '../../components/demos/Accordion'
import { EditorialEngineDemo } from '../../components/demos/EditorialEngine'
import { MasonryDemo } from '../../components/demos/Masonry'
import { I18nDemo } from '../../components/demos/I18n'
import { MarkdownChatDemo } from '../../components/demos/MarkdownChat'
import { JustificationComparisonDemo } from '../../components/demos/JustificationComparison'
import { AsciiArtDemo } from '../../components/demos/AsciiArt'
import { TypewriterDemo } from '../../components/demos/Typewriter'
import { TextMorphingDemo } from '../../components/demos/TextMorphing'
import { PinchToZoomDemo } from '../../components/demos/PinchToZoom'
import { CollapsibleDemo } from '../../components/demos/Collapsible'
import { RichInlineDemo } from '../../components/demos/RichInline'
import { TextClockDemo } from '../../components/demos/TextClock'
import { UmbrellaReflowDemo } from '../../components/demos/UmbrellaReflow'
import { PhysicsTodoDemo } from '../../components/demos/PhysicsTodo'
import { BreakoutTextDemo } from '../../components/demos/BreakoutText'
import { TextPathDemo } from '../../components/demos/TextPath'

const demos = [
  {
    id: 'editorial',
    title: 'Editorial Engine',
    api: 'layoutNextLine() + prepareWithSegments()',
    level: 'Advanced',
    desc: 'Text reflows around draggable obstacles in real-time',
    component: EditorialEngineDemo,
  },
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
  {
    id: 'markdown-chat',
    title: 'Markdown Chat',
    api: 'prepare() + layout() + FlashList',
    level: 'Advanced',
    desc: '10,000 messages with rich markdown — headings, code, quotes, lists, tight-wrap',
    component: MarkdownChatDemo,
  },
  {
    id: 'justification',
    title: 'Justification Comparison',
    api: 'layoutWithLines()',
    level: 'Intermediate',
    desc: 'Left-aligned vs justified text — same prepare(), custom line rendering',
    component: JustificationComparisonDemo,
  },
  {
    id: 'ascii-art',
    title: 'Typographic ASCII Art',
    api: 'prepareWithSegments() + layoutWithLines()',
    level: 'Intermediate',
    desc: 'Character-level width measurement — monospace vs proportional font comparison',
    component: AsciiArtDemo,
  },
  {
    id: 'typewriter',
    title: 'Typewriter Effect',
    api: 'useTypewriterLayout()',
    level: 'Intermediate',
    desc: 'Token-by-token reveal with pre-computed line wrapping — AI chat streaming',
    component: TypewriterDemo,
  },
  {
    id: 'text-morphing',
    title: 'Text Morphing',
    api: 'useTextMorphing()',
    level: 'Intermediate',
    desc: '"Thinking..." → response transition with line-by-line interpolation',
    component: TextMorphingDemo,
  },
  {
    id: 'pinch-zoom',
    title: 'Pinch to Zoom',
    api: 'usePinchToZoomText()',
    level: 'Advanced',
    desc: 'Per-frame fontSize scaling — 120+ layouts per frame via layout() at 0.0002ms',
    component: PinchToZoomDemo,
  },
  {
    id: 'collapsible',
    title: 'Collapsible Section',
    api: 'useCollapsibleHeight()',
    level: 'Beginner',
    desc: 'Expand/collapse with pre-computed heights and smooth Reanimated animation',
    component: CollapsibleDemo,
  },
  {
    id: 'rich-inline',
    title: 'Rich Inline Flow',
    api: 'prepareInlineFlow() + walkInlineFlowLines()',
    level: 'Advanced',
    desc: 'Mentions, code spans, bold runs — atomic pills stay whole during wraps',
    component: RichInlineDemo,
  },
  {
    id: 'text-clock',
    title: 'Text Clock',
    api: 'prepare() + layout()',
    level: 'Beginner',
    desc: 'Real-time clock with remeasurement every tick — fluent number transitions',
    component: TextClockDemo,
  },
  {
    id: 'umbrella',
    title: 'Umbrella Reflow',
    api: 'layoutColumn() + RectObstacle',
    level: 'Intermediate',
    desc: 'Drag the umbrella — text reflows around it in pure arithmetic',
    component: UmbrellaReflowDemo,
  },
  {
    id: 'physics-todo',
    title: 'Physics Todo',
    api: 'measureNaturalWidth()',
    level: 'Intermediate',
    desc: 'Bouncing todo items — real text widths drive collision detection',
    component: PhysicsTodoDemo,
  },
  {
    id: 'breakout',
    title: 'Breakout Text',
    api: 'measureNaturalWidth()',
    level: 'Advanced',
    desc: 'Text bricks sized to their labels — drag to move paddle, break every word',
    component: BreakoutTextDemo,
  },
  {
    id: 'text-path',
    title: 'Text Path',
    api: 'measureNaturalWidth() per character',
    level: 'Advanced',
    desc: 'Characters flowing along a sine wave — precise per-glyph positioning',
    component: TextPathDemo,
  },
]

export default function DemosScreen() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null)
  const navigation = useNavigation()

  useLayoutEffect(() => {
    if (activeDemo) {
      const demo = demos.find(d => d.id === activeDemo)!
      navigation.setOptions({
        headerTitle: demo.title,
        headerLeft: () => (
          <Pressable onPress={() => setActiveDemo(null)} style={{ paddingLeft: 16 }}>
            <Text style={{ fontSize: 16, color: '#007AFF' }}>← Demos</Text>
          </Pressable>
        ),
      })
    } else {
      navigation.setOptions({
        headerTitle: 'Demos',
        headerLeft: undefined,
      })
    }
  }, [activeDemo, navigation])

  if (activeDemo) {
    const demo = demos.find(d => d.id === activeDemo)!
    const DemoComponent = demo.component
    return (
      <View style={styles.container}>
        <DemoComponent />
      </View>
    )
  }

  return (
    <View style={styles.container}>
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
})
