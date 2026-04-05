import { Text, View, StyleSheet } from 'react-native'
import type { TextStyle as RNTextStyle } from 'react-native'

type Props = {
  content: string
  isUser?: boolean
}

type Block =
  | { type: 'paragraph'; content: string }
  | { type: 'code'; language: string; code: string }

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!
    const fenceMatch = line.match(/^```(\w*)/)
    if (fenceMatch) {
      const lang = fenceMatch[1] || 'code'
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        codeLines.push(lines[i]!)
        i++
      }
      i++ // skip closing ```
      blocks.push({ type: 'code', language: lang, code: codeLines.join('\n') })
    } else {
      // Collect paragraph lines until next fence or double newline
      const paraLines: string[] = []
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        if (lines[i] === '' && paraLines.length > 0) {
          break
        }
        if (lines[i] !== '') {
          paraLines.push(lines[i]!)
        }
        i++
      }
      if (paraLines.length > 0) {
        blocks.push({ type: 'paragraph', content: paraLines.join(' ') })
      }
      if (i < lines.length && lines[i] === '') i++
    }
  }

  return blocks
}

type InlineSpan =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }

function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = []
  // Match **bold**, *italic*, `code`
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    if (match[2]) {
      spans.push({ type: 'bold', text: match[2] })
    } else if (match[3]) {
      spans.push({ type: 'italic', text: match[3] })
    } else if (match[4]) {
      spans.push({ type: 'code', text: match[4] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    spans.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return spans
}

function InlineText({ content, isUser }: { content: string; isUser: boolean }) {
  const spans = parseInline(content)
  const textColor = isUser ? '#fff' : '#1a1a1a'

  return (
    <Text style={[styles.paragraph, { color: textColor }]}>
      {spans.map((span, i) => {
        switch (span.type) {
          case 'bold':
            return <Text key={i} style={{ fontWeight: '700' }}>{span.text}</Text>
          case 'italic':
            return <Text key={i} style={{ fontStyle: 'italic' }}>{span.text}</Text>
          case 'code':
            return (
              <Text
                key={i}
                style={[
                  styles.inlineCode,
                  isUser && styles.inlineCodeUser,
                ]}
              >
                {span.text}
              </Text>
            )
          default:
            return <Text key={i}>{span.text}</Text>
        }
      })}
    </Text>
  )
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <View style={styles.codeBlock}>
      <Text style={styles.codeLang}>{language}</Text>
      <Text style={styles.codeText}>{code}</Text>
    </View>
  )
}

export function MarkdownRenderer({ content, isUser = false }: Props) {
  const blocks = parseBlocks(content)

  return (
    <View>
      {blocks.map((block, i) => {
        if (block.type === 'code') {
          return <CodeBlock key={i} code={block.code} language={block.language} />
        }
        return <InlineText key={i} content={block.content} isUser={isUser} />
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
  inlineCode: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    fontFamily: 'Menlo',
    fontSize: 14,
    color: '#d63384',
  },
  inlineCodeUser: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
  },
  codeBlock: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
  },
  codeLang: {
    fontSize: 11,
    color: '#888',
    marginBottom: 6,
    fontFamily: 'Menlo',
  },
  codeText: {
    fontFamily: 'Menlo',
    fontSize: 13,
    lineHeight: 20,
    color: '#d4d4d4',
  },
})
