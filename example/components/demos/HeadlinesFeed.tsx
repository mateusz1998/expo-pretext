// example/components/demos/HeadlinesFeed.tsx
//
// Plain-text FlashList v2 demo — canary for useFlashListHeights.getHeight()
//
// 10,000 quotes with varying line counts. `getHeight(item)` returns the
// exact measured text height; we pad it and set an explicit height on the
// wrapping View so FlashList v2 skips the measurement frame and first
// paint stays smooth.

import { useCallback, memo } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useFlashListHeights } from 'expo-pretext'

const PAD_X = 16
const PAD_Y = 12
const GAP = 8

const TEXT_STYLE = {
  fontFamily: 'System',
  fontSize: 15,
  lineHeight: 22,
}

const SEEDS: string[] = [
  'Virtualized lists feel good when every item snaps into place at t = 0. No jitter, no re-layout, no flicker on first paint.',
  'Exact heights let FlashList skip the measurement frame.',
  'A chat app is not a fancy scroll view. It is a deep list with heterogeneous heights and an angry product manager.',
  'Native measurement is the ground truth. JS fallback is the safety net.',
  'The quick brown fox jumps over the lazy dog — a test case that would fit on one line in almost any reasonable container.',
  'Arabic مرحبا, Chinese 你好, Georgian გამარჯობა, Thai สวัสดี. Each script has its own rules; none of them cares about the others.',
  'Short.',
  'Predicting heights is arithmetic, not rendering. That is why it can hit a half millisecond per item and still be exact.',
  'Every wrong guess in a virtualized list accumulates until the user feels a tiny, impossible-to-explain wrongness while scrolling.',
  'Good typography is invisible. Bad typography is a meeting.',
  'A line wraps when the next word would push it past the box edge. That is the whole algorithm. Everything else is emergency handling.',
  'FlashList v2 removed estimatedItemSize because it could always measure faster than you could guess. But you can still help it.',
  'Pre-warming a cache in the background is cheap. The user only notices when you do not.',
  'Complexity belongs at the measurement boundary. The list layer should just ask for a number.',
  'The editor does not know what a word is, only where a grapheme cluster ends. That distinction will bite you.',
  'We measured 10,000 messages in 3.4ms using the batch API. Then we cached them. Then we pretended it was easy.',
  'Rendering is not the bottleneck; reflowing is. Once you separate the two, everything gets faster.',
  'A virtualized list with inexact heights is a list that lies to its scrollbar.',
  'There is no substitute for plain text in a performance benchmark. Markdown is a different problem.',
  'The layout function is 340 lines of cold arithmetic. It does one thing, and it does it without allocating more than it has to.',
  'Hermes does not have Intl.Segmenter yet. The spread operator handles 99% of cases. The last 1% is ZWJ emoji.',
  'Every release we run the accuracy test on four widths and three scripts. When one fails, we stop everything.',
  'Caching is a bet that the same text will be measured twice. In a chat app that bet always pays off.',
  'A list item that remeasures on every scroll is a bug with an alibi.',
  'iOS uses TextKit. Android uses TextPaint. Web uses Canvas. The contract between them is the same four floats.',
  'Predicted: 384.0. Actual: 384.0. Difference: 0.0. Every row, every width, every script.',
  'The right answer is usually a flat array and a for loop.',
  'Heights are not opinions. They are consequences.',
]

type Item = {
  id: string
  text: string
}

const TOTAL = 10_000

function buildItems(): Item[] {
  const out: Item[] = new Array(TOTAL)
  for (let i = 0; i < TOTAL; i++) {
    const seed = SEEDS[i % SEEDS.length]!
    out[i] = { id: String(i), text: `#${i + 1}. ${seed}` }
  }
  return out
}

const ITEMS = buildItems()

type RowProps = { item: Item; height: number; width: number }

const Row = memo(function Row({ item, height, width }: RowProps) {
  return (
    <View style={[s.rowWrap, { height }]}>
      <View style={[s.card, { width: width - 32 }]}>
        <Text style={s.rowText}>{item.text}</Text>
      </View>
    </View>
  )
})

export function HeadlinesFeedDemo() {
  const { width } = useWindowDimensions()
  const textMaxWidth = width - 32 - PAD_X * 2

  const { getHeight } = useFlashListHeights(
    ITEMS,
    (item) => item.text,
    TEXT_STYLE,
    textMaxWidth,
  )

  const renderItem = useCallback(
    ({ item }: { item: Item }) => {
      const height = getHeight(item) + PAD_Y * 2 + GAP
      return <Row item={item} height={height} width={width} />
    },
    [getHeight, width],
  )

  return (
    <View style={s.root}>
      <View style={s.banner}>
        <Text style={s.bannerText}>
          {TOTAL.toLocaleString()} plain-text rows · `getHeight(item)` · exact height per row
        </Text>
      </View>
      <FlashList
        data={ITEMS}
        renderItem={renderItem}
        keyExtractor={(m) => m.id}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#121218',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,211,105,0.15)',
  },
  bannerText: {
    fontFamily: 'Menlo',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  rowWrap: {
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#121218',
    borderRadius: 12,
    paddingHorizontal: PAD_X,
    paddingVertical: PAD_Y,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowText: {
    fontFamily: TEXT_STYLE.fontFamily,
    fontSize: TEXT_STYLE.fontSize,
    lineHeight: TEXT_STYLE.lineHeight,
    color: 'rgba(255,255,255,0.92)',
  },
})
