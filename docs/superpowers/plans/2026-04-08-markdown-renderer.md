# MarkdownRenderer Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance MarkdownRenderer into a full-featured markdown component with parser separation, theme presets, tight-wrap integration, and refactor MarkdownChat demo to use it.

**Architecture:** Split into `markdown-parser.ts` (pure parsing + height estimation) and `MarkdownRenderer.tsx` (React rendering + tight-wrap). Parser is reusable and memoized. Renderer supports `light`/`dark` presets with overrides.

**Tech Stack:** React Native, TypeScript, expo-pretext (`prepare` + `layout`), bun:test

**Spec:** `docs/superpowers/specs/2026-04-08-markdown-renderer-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `example/components/markdown-parser.ts` | Create | Pure markdown parsing, types, height estimation, memoization |
| `example/components/__tests__/markdown-parser.test.ts` | Create | Parser unit tests |
| `example/components/MarkdownRenderer.tsx` | Rewrite | React renderer with theme presets, tight-wrap, onLinkPress |
| `example/components/demos/MarkdownChat.tsx` | Modify | Remove custom parser/renderer, use MarkdownRenderer |
| `example/app/(tabs)/chat.tsx` | Modify | Replace `isUser` prop with `variant` |

---

### Task 1: Parser — Types and Inline Span Parsing

**Files:**
- Create: `example/components/markdown-parser.ts`
- Create: `example/components/__tests__/markdown-parser.test.ts`

- [ ] **Step 1: Write failing tests for parseSpans**

```ts
// example/components/__tests__/markdown-parser.test.ts
import { describe, test, expect } from 'bun:test'
import { parseSpans } from '../markdown-parser'

describe('parseSpans', () => {
  test('plain text', () => {
    expect(parseSpans('hello world')).toEqual([
      { t: 'text', v: 'hello world' },
    ])
  })

  test('bold', () => {
    expect(parseSpans('say **hello** now')).toEqual([
      { t: 'text', v: 'say ' },
      { t: 'bold', v: 'hello' },
      { t: 'text', v: ' now' },
    ])
  })

  test('italic', () => {
    expect(parseSpans('say *hello* now')).toEqual([
      { t: 'text', v: 'say ' },
      { t: 'italic', v: 'hello' },
      { t: 'text', v: ' now' },
    ])
  })

  test('bolditalic', () => {
    expect(parseSpans('say ***hello*** now')).toEqual([
      { t: 'text', v: 'say ' },
      { t: 'bolditalic', v: 'hello' },
      { t: 'text', v: ' now' },
    ])
  })

  test('strikethrough', () => {
    expect(parseSpans('say ~~hello~~ now')).toEqual([
      { t: 'text', v: 'say ' },
      { t: 'strike', v: 'hello' },
      { t: 'text', v: ' now' },
    ])
  })

  test('inline code', () => {
    expect(parseSpans('use `code` here')).toEqual([
      { t: 'text', v: 'use ' },
      { t: 'code', v: 'code' },
      { t: 'text', v: ' here' },
    ])
  })

  test('link', () => {
    expect(parseSpans('see [docs](https://example.com) now')).toEqual([
      { t: 'text', v: 'see ' },
      { t: 'link', v: 'docs', url: 'https://example.com' },
      { t: 'text', v: ' now' },
    ])
  })

  test('mixed spans', () => {
    const result = parseSpans('**bold** and `code` and [link](url)')
    expect(result).toEqual([
      { t: 'bold', v: 'bold' },
      { t: 'text', v: ' and ' },
      { t: 'code', v: 'code' },
      { t: 'text', v: ' and ' },
      { t: 'link', v: 'link', url: 'url' },
    ])
  })

  test('empty string', () => {
    expect(parseSpans('')).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/macbook/Desktop/JubaKitiashvili.Dev/Projects/ReactNative/expo-pretext && bun test example/components/__tests__/markdown-parser.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement types and parseSpans**

```ts
// example/components/markdown-parser.ts

// ─── Types ───────────────────────────────────────────────
export type MdBlock =
  | { type: 'paragraph'; spans: MdSpan[] }
  | { type: 'heading'; level: 1 | 2 | 3; spans: MdSpan[] }
  | { type: 'code'; lang: string; text: string }
  | { type: 'quote'; blocks: MdBlock[] }
  | { type: 'list'; ordered: boolean; items: MdListItem[] }
  | { type: 'table'; headers: MdSpan[][]; rows: MdSpan[][][] }
  | { type: 'image'; alt: string; url: string }
  | { type: 'rule' }

export type MdListItem = {
  blocks: MdBlock[]
  checked?: boolean
}

export type MdSpan =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'italic'; v: string }
  | { t: 'bolditalic'; v: string }
  | { t: 'strike'; v: string }
  | { t: 'code'; v: string }
  | { t: 'link'; v: string; url: string }

// ─── Inline span parser ──────────────────────────────────
export function parseSpans(text: string): MdSpan[] {
  const spans: MdSpan[] = []
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) spans.push({ t: 'text', v: text.slice(last, m.index) })
    if (m[2]) spans.push({ t: 'bolditalic', v: m[2] })
    else if (m[3]) spans.push({ t: 'bold', v: m[3] })
    else if (m[4]) spans.push({ t: 'italic', v: m[4] })
    else if (m[5]) spans.push({ t: 'strike', v: m[5] })
    else if (m[6]) spans.push({ t: 'code', v: m[6] })
    else if (m[7] && m[8]) spans.push({ t: 'link', v: m[7], url: m[8] })
    last = m.index + m[0].length
  }
  if (last < text.length) spans.push({ t: 'text', v: text.slice(last) })
  return spans
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/macbook/Desktop/JubaKitiashvili.Dev/Projects/ReactNative/expo-pretext && bun test example/components/__tests__/markdown-parser.test.ts`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add example/components/markdown-parser.ts example/components/__tests__/markdown-parser.test.ts
git commit -m "feat(example): add markdown parser types and inline span parsing with tests"
```

---

### Task 2: Parser — Block-Level Parsing (paragraphs, headings, code fences, rules)

**Files:**
- Modify: `example/components/markdown-parser.ts`
- Modify: `example/components/__tests__/markdown-parser.test.ts`

- [ ] **Step 1: Write failing tests for basic block parsing**

Add to `markdown-parser.test.ts`:

```ts
import { parseSpans, parseMarkdown } from '../markdown-parser'

describe('parseMarkdown — basic blocks', () => {
  test('single paragraph', () => {
    expect(parseMarkdown('hello world')).toEqual([
      { type: 'paragraph', spans: [{ t: 'text', v: 'hello world' }] },
    ])
  })

  test('two paragraphs separated by blank line', () => {
    const result = parseMarkdown('first\n\nsecond')
    expect(result).toHaveLength(2)
    expect(result[0]!.type).toBe('paragraph')
    expect(result[1]!.type).toBe('paragraph')
  })

  test('multi-line paragraph joined', () => {
    const result = parseMarkdown('line one\nline two')
    expect(result).toEqual([
      { type: 'paragraph', spans: [{ t: 'text', v: 'line one line two' }] },
    ])
  })

  test('heading levels', () => {
    expect(parseMarkdown('# Title')[0]).toMatchObject({ type: 'heading', level: 1 })
    expect(parseMarkdown('## Sub')[0]).toMatchObject({ type: 'heading', level: 2 })
    expect(parseMarkdown('### Small')[0]).toMatchObject({ type: 'heading', level: 3 })
  })

  test('heading with inline formatting', () => {
    const result = parseMarkdown('## Hello **world**')
    expect(result[0]).toMatchObject({
      type: 'heading',
      level: 2,
      spans: [
        { t: 'text', v: 'Hello ' },
        { t: 'bold', v: 'world' },
      ],
    })
  })

  test('code fence', () => {
    const result = parseMarkdown('```ts\nconst x = 1\n```')
    expect(result[0]).toEqual({ type: 'code', lang: 'ts', text: 'const x = 1' })
  })

  test('code fence without language', () => {
    const result = parseMarkdown('```\nhello\n```')
    expect(result[0]).toEqual({ type: 'code', lang: '', text: 'hello' })
  })

  test('code fence multiline', () => {
    const result = parseMarkdown('```js\na\nb\nc\n```')
    expect(result[0]).toEqual({ type: 'code', lang: 'js', text: 'a\nb\nc' })
  })

  test('horizontal rule', () => {
    expect(parseMarkdown('---')[0]).toEqual({ type: 'rule' })
    expect(parseMarkdown('-----')[0]).toEqual({ type: 'rule' })
  })

  test('mixed blocks', () => {
    const md = '# Title\n\nSome text.\n\n```ts\ncode\n```\n\n---'
    const result = parseMarkdown(md)
    expect(result).toHaveLength(4)
    expect(result[0]!.type).toBe('heading')
    expect(result[1]!.type).toBe('paragraph')
    expect(result[2]!.type).toBe('code')
    expect(result[3]!.type).toBe('rule')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test example/components/__tests__/markdown-parser.test.ts`
Expected: FAIL — parseMarkdown not found

- [ ] **Step 3: Implement parseMarkdown with basic blocks**

Add to `markdown-parser.ts`:

```ts
// ─── Parse cache ─────────────────────────────────────────
const parseCache = new Map<string, MdBlock[]>()

export function parseMarkdown(md: string): MdBlock[] {
  const cached = parseCache.get(md)
  if (cached) return cached
  const result = parseBlocks(md)
  parseCache.set(md, result)
  return result
}

function parseBlocks(md: string): MdBlock[] {
  const lines = md.split('\n')
  const blocks: MdBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    // Empty line
    if (line.trim() === '') { i++; continue }

    // Code fence
    const fence = line.match(/^```(\w*)/)
    if (fence) {
      const lang = fence[1] || ''
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        code.push(lines[i]!)
        i++
      }
      i++ // skip closing
      blocks.push({ type: 'code', lang, text: code.join('\n') })
      continue
    }

    // Heading
    const hm = line.match(/^(#{1,3})\s+(.+)/)
    if (hm) {
      blocks.push({ type: 'heading', level: Math.min(3, hm[1].length) as 1 | 2 | 3, spans: parseSpans(hm[2]) })
      i++
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: 'rule' })
      i++
      continue
    }

    // (blockquotes, lists, tables, images — added in later tasks)

    // Paragraph — collect until blank line or block-level start
    const pLines: string[] = []
    while (i < lines.length && lines[i]!.trim() !== '' && !lines[i]!.startsWith('```') &&
      !lines[i]!.startsWith('#') && !lines[i]!.startsWith('>') &&
      !/^[-*]\s/.test(lines[i]!) && !/^\d+\.\s/.test(lines[i]!) && !/^---+$/.test(lines[i]!.trim()) &&
      !/^\|/.test(lines[i]!) && !/^!\[/.test(lines[i]!)) {
      pLines.push(lines[i]!)
      i++
    }
    if (pLines.length > 0) {
      blocks.push({ type: 'paragraph', spans: parseSpans(pLines.join(' ')) })
    }
  }

  return blocks
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test example/components/__tests__/markdown-parser.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add example/components/markdown-parser.ts example/components/__tests__/markdown-parser.test.ts
git commit -m "feat(example): add block-level markdown parsing (paragraphs, headings, code, rules)"
```

---

### Task 3: Parser — Blockquotes and Lists (nested + task lists)

**Files:**
- Modify: `example/components/markdown-parser.ts`
- Modify: `example/components/__tests__/markdown-parser.test.ts`

- [ ] **Step 1: Write failing tests for blockquotes and lists**

Add to `markdown-parser.test.ts`:

```ts
describe('parseMarkdown — blockquotes', () => {
  test('simple blockquote', () => {
    const result = parseMarkdown('> hello world')
    expect(result[0]).toMatchObject({
      type: 'quote',
      blocks: [{ type: 'paragraph', spans: [{ t: 'text', v: 'hello world' }] }],
    })
  })

  test('multi-line blockquote', () => {
    const result = parseMarkdown('> line one\n> line two')
    expect(result[0]!.type).toBe('quote')
    expect((result[0] as any).blocks[0].spans[0].v).toBe('line one line two')
  })

  test('nested blockquote', () => {
    const result = parseMarkdown('> > nested')
    expect(result[0]!.type).toBe('quote')
    expect((result[0] as any).blocks[0].type).toBe('quote')
  })

  test('blockquote with multiple paragraphs', () => {
    const result = parseMarkdown('> para one\n>\n> para two')
    expect(result[0]!.type).toBe('quote')
    expect((result[0] as any).blocks).toHaveLength(2)
  })
})

describe('parseMarkdown — unordered lists', () => {
  test('simple list', () => {
    const result = parseMarkdown('- one\n- two\n- three')
    expect(result[0]).toMatchObject({ type: 'list', ordered: false })
    expect((result[0] as any).items).toHaveLength(3)
  })

  test('nested list', () => {
    const result = parseMarkdown('- parent\n  - child')
    expect(result[0]!.type).toBe('list')
    const items = (result[0] as any).items
    expect(items).toHaveLength(1)
    // child nested inside parent item
    expect(items[0].blocks).toHaveLength(2) // paragraph + nested list
  })

  test('list with inline formatting', () => {
    const result = parseMarkdown('- **bold** item')
    const items = (result[0] as any).items
    expect(items[0].blocks[0].spans).toEqual([
      { t: 'bold', v: 'bold' },
      { t: 'text', v: ' item' },
    ])
  })
})

describe('parseMarkdown — ordered lists', () => {
  test('simple ordered list', () => {
    const result = parseMarkdown('1. first\n2. second')
    expect(result[0]).toMatchObject({ type: 'list', ordered: true })
    expect((result[0] as any).items).toHaveLength(2)
  })
})

describe('parseMarkdown — task lists', () => {
  test('unchecked task', () => {
    const result = parseMarkdown('- [ ] todo item')
    const item = (result[0] as any).items[0]
    expect(item.checked).toBe(false)
  })

  test('checked task', () => {
    const result = parseMarkdown('- [x] done item')
    const item = (result[0] as any).items[0]
    expect(item.checked).toBe(true)
  })

  test('mixed task list', () => {
    const result = parseMarkdown('- [x] done\n- [ ] todo\n- normal')
    const items = (result[0] as any).items
    expect(items[0].checked).toBe(true)
    expect(items[1].checked).toBe(false)
    expect(items[2].checked).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test example/components/__tests__/markdown-parser.test.ts`
Expected: FAIL — blockquotes/lists parse as paragraphs

- [ ] **Step 3: Add blockquote and list parsing to parseBlocks**

Insert into `parseBlocks` function in `markdown-parser.ts`, before the paragraph fallback:

```ts
    // Blockquote
    if (line.startsWith('>')) {
      const qLines: string[] = []
      while (i < lines.length && (lines[i]!.startsWith('>') || lines[i]!.trim() === '')) {
        if (lines[i]!.startsWith('>')) {
          qLines.push(lines[i]!.replace(/^>\s?/, ''))
        } else {
          let peek = i + 1
          while (peek < lines.length && lines[peek]!.trim() === '') peek++
          if (peek < lines.length && lines[peek]!.startsWith('>')) {
            qLines.push('')
          } else {
            break
          }
        }
        i++
      }
      blocks.push({ type: 'quote', blocks: parseBlocks(qLines.join('\n')) })
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: MdListItem[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i]!)) {
        const text = lines[i]!.replace(/^\d+\.\s/, '')
        const { checked, content } = extractTaskCheck(text)
        const itemLines: string[] = [content]
        i++
        while (i < lines.length && lines[i]!.startsWith('  ') && !/^\d+\.\s/.test(lines[i]!)) {
          itemLines.push(lines[i]!.slice(2))
          i++
        }
        items.push({ blocks: parseBlocks(itemLines.join('\n')), checked })
      }
      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      const items: MdListItem[] = []
      while (i < lines.length && (/^[-*]\s/.test(lines[i]!) || (lines[i]!.startsWith('  ') && items.length > 0))) {
        if (/^[-*]\s/.test(lines[i]!)) {
          const text = lines[i]!.replace(/^[-*]\s/, '')
          const { checked, content } = extractTaskCheck(text)
          const itemLines: string[] = [content]
          i++
          while (i < lines.length && lines[i]!.startsWith('  ') && !/^[-*]\s/.test(lines[i]!.trim())) {
            itemLines.push(lines[i]!.slice(2))
            i++
          }
          items.push({ blocks: parseBlocks(itemLines.join('\n')), checked })
        } else {
          if (items.length > 0) {
            const lastItem = items[items.length - 1]!
            const sub = parseBlocks(lines[i]!.slice(2))
            lastItem.blocks.push(...sub)
          }
          i++
        }
      }
      blocks.push({ type: 'list', ordered: false, items })
      continue
    }
```

Also add the helper function:

```ts
function extractTaskCheck(text: string): { checked?: boolean; content: string } {
  if (text.startsWith('[ ] ')) return { checked: false, content: text.slice(4) }
  if (text.startsWith('[x] ') || text.startsWith('[X] ')) return { checked: true, content: text.slice(4) }
  return { content: text }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test example/components/__tests__/markdown-parser.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add example/components/markdown-parser.ts example/components/__tests__/markdown-parser.test.ts
git commit -m "feat(example): add blockquote and list parsing (nested, ordered, task lists)"
```

---

### Task 4: Parser — Tables and Images

**Files:**
- Modify: `example/components/markdown-parser.ts`
- Modify: `example/components/__tests__/markdown-parser.test.ts`

- [ ] **Step 1: Write failing tests for tables and images**

Add to `markdown-parser.test.ts`:

```ts
describe('parseMarkdown — tables', () => {
  test('simple table', () => {
    const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |'
    const result = parseMarkdown(md)
    expect(result[0]!.type).toBe('table')
    const table = result[0] as any
    expect(table.headers).toHaveLength(2)
    expect(table.headers[0][0]).toMatchObject({ t: 'text', v: 'Name' })
    expect(table.headers[1][0]).toMatchObject({ t: 'text', v: 'Age' })
    expect(table.rows).toHaveLength(2)
    expect(table.rows[0][0][0]).toMatchObject({ t: 'text', v: 'Alice' })
    expect(table.rows[1][1][0]).toMatchObject({ t: 'text', v: '25' })
  })

  test('table with inline formatting', () => {
    const md = '| **Bold** | `code` |\n| --- | --- |\n| data | data |'
    const result = parseMarkdown(md)
    const table = result[0] as any
    expect(table.headers[0][0]).toMatchObject({ t: 'bold', v: 'Bold' })
    expect(table.headers[1][0]).toMatchObject({ t: 'code', v: 'code' })
  })
})

describe('parseMarkdown — images', () => {
  test('image placeholder', () => {
    const result = parseMarkdown('![diagram](https://example.com/img.png)')
    expect(result[0]).toEqual({
      type: 'image',
      alt: 'diagram',
      url: 'https://example.com/img.png',
    })
  })

  test('image between paragraphs', () => {
    const md = 'text before\n\n![pic](url)\n\ntext after'
    const result = parseMarkdown(md)
    expect(result).toHaveLength(3)
    expect(result[0]!.type).toBe('paragraph')
    expect(result[1]!.type).toBe('image')
    expect(result[2]!.type).toBe('paragraph')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test example/components/__tests__/markdown-parser.test.ts`
Expected: FAIL — tables and images parse as paragraphs

- [ ] **Step 3: Add table and image parsing to parseBlocks**

Insert into `parseBlocks` function, after the horizontal rule check and before blockquote:

```ts
    // Table
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s-:|]+\|$/.test(lines[i + 1]!.trim())) {
      const headerCells = parseTableRow(line)
      i += 2 // skip header + separator
      const rows: MdSpan[][][] = []
      while (i < lines.length && /^\|/.test(lines[i]!)) {
        rows.push(parseTableRow(lines[i]!))
        i++
      }
      blocks.push({ type: 'table', headers: headerCells, rows })
      continue
    }

    // Image (standalone line)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      blocks.push({ type: 'image', alt: imgMatch[1] || '', url: imgMatch[2]! })
      i++
      continue
    }
```

Also add the table row helper:

```ts
function parseTableRow(line: string): MdSpan[][] {
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map(cell => parseSpans(cell.trim()))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test example/components/__tests__/markdown-parser.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add example/components/markdown-parser.ts example/components/__tests__/markdown-parser.test.ts
git commit -m "feat(example): add table and image parsing"
```

---

### Task 5: Parser — Height Estimation and Utilities

**Files:**
- Modify: `example/components/markdown-parser.ts`
- Modify: `example/components/__tests__/markdown-parser.test.ts`

- [ ] **Step 1: Write failing tests for height estimation and utilities**

Add to `markdown-parser.test.ts`:

```ts
import { parseSpans, parseMarkdown, estimateBlocksHeight, blocksToPlainText } from '../markdown-parser'

describe('blocksToPlainText', () => {
  test('paragraph', () => {
    const blocks = parseMarkdown('hello **world**')
    expect(blocksToPlainText(blocks)).toBe('hello world')
  })

  test('multiple blocks', () => {
    const blocks = parseMarkdown('# Title\n\nparagraph')
    expect(blocksToPlainText(blocks)).toBe('Title\nparagraph')
  })

  test('code block', () => {
    const blocks = parseMarkdown('```ts\nconst x = 1\n```')
    expect(blocksToPlainText(blocks)).toBe('const x = 1')
  })

  test('list', () => {
    const blocks = parseMarkdown('- one\n- two')
    expect(blocksToPlainText(blocks)).toBe('one\ntwo')
  })
})

describe('estimateBlocksHeight', () => {
  test('single short paragraph', () => {
    const blocks = parseMarkdown('hello')
    const h = estimateBlocksHeight(blocks, 300)
    expect(h).toBe(22) // 1 line * lineHeight 22
  })

  test('code block height includes padding', () => {
    const blocks = parseMarkdown('```\nline1\nline2\n```')
    const h = estimateBlocksHeight(blocks, 300)
    // 2 lines * 18 + 12 * 2 padding = 60
    expect(h).toBe(60)
  })

  test('code block with lang label adds height', () => {
    const blocks = parseMarkdown('```ts\nline1\n```')
    const h = estimateBlocksHeight(blocks, 300)
    // 1 line * 18 + 12 * 2 padding + 18 lang label = 60
    expect(h).toBe(60)
  })

  test('multiple blocks add gap', () => {
    const blocks = parseMarkdown('hello\n\nworld')
    const h = estimateBlocksHeight(blocks, 300)
    // 2 paragraphs * 22 + 10 gap = 54
    expect(h).toBe(54)
  })

  test('image placeholder height', () => {
    const blocks = parseMarkdown('![pic](url)')
    const h = estimateBlocksHeight(blocks, 300)
    expect(h).toBe(48)
  })

  test('horizontal rule', () => {
    const blocks = parseMarkdown('---')
    const h = estimateBlocksHeight(blocks, 300)
    expect(h).toBe(18)
  })

  test('table height', () => {
    const blocks = parseMarkdown('| A | B |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |')
    const h = estimateBlocksHeight(blocks, 300)
    // header: 22 + 2 rows * 22 + borders (2 * 1) = 68
    expect(h).toBe(68)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test example/components/__tests__/markdown-parser.test.ts`
Expected: FAIL — functions not found

- [ ] **Step 3: Implement height estimation and utility functions**

Add to `markdown-parser.ts`:

```ts
// ─── Height estimation config ────────────────────────────
export type HeightConfig = {
  blockGap: number
  listIndent: number
  quoteIndent: number
  codeBlockPad: number
  bodyFontSize: number
  bodyLineHeight: number
}

const DEFAULT_CONFIG: HeightConfig = {
  blockGap: 10,
  listIndent: 18,
  quoteIndent: 18,
  codeBlockPad: 12,
  bodyFontSize: 14,
  bodyLineHeight: 22,
}

// ─── Height estimation ───────────────────────────────────
export function estimateBlocksHeight(
  blocks: MdBlock[],
  width: number,
  config?: Partial<HeightConfig>,
): number {
  const c = { ...DEFAULT_CONFIG, ...config }
  let h = 0
  for (let i = 0; i < blocks.length; i++) {
    if (i > 0) h += c.blockGap
    h += estimateBlockHeight(blocks[i]!, width, c)
  }
  return h
}

function estimateBlockHeight(block: MdBlock, width: number, c: HeightConfig): number {
  switch (block.type) {
    case 'paragraph': {
      const text = spansToPlain(block.spans)
      return estimateLines(text, c.bodyFontSize, width) * c.bodyLineHeight
    }
    case 'heading': {
      const text = spansToPlain(block.spans)
      const fs = block.level === 1 ? 20 : block.level === 2 ? 17 : 15
      const lh = block.level === 1 ? 28 : block.level === 2 ? 25 : 22
      return estimateLines(text, fs, width) * lh
    }
    case 'code': {
      const lineCount = block.text.split('\n').length
      return lineCount * 18 + c.codeBlockPad * 2 + (block.lang ? 18 : 0)
    }
    case 'quote':
      return estimateBlocksHeight(block.blocks, width - c.quoteIndent, c)
    case 'list': {
      let total = 0
      for (let i = 0; i < block.items.length; i++) {
        if (i > 0) total += 4
        total += estimateBlocksHeight(block.items[i]!.blocks, width - c.listIndent, c)
      }
      return total
    }
    case 'table': {
      const rowHeight = c.bodyLineHeight
      return rowHeight + block.rows.length * rowHeight + (block.rows.length + 1)
    }
    case 'image':
      return 48
    case 'rule':
      return 18
  }
}

function estimateLines(text: string, fontSize: number, width: number): number {
  if (width <= 0 || text.length === 0) return 1
  const avgCharWidth = fontSize * 0.48
  const charsPerLine = Math.max(1, Math.floor(width / avgCharWidth))
  return Math.max(1, Math.ceil(text.length / charsPerLine))
}

function spansToPlain(spans: MdSpan[]): string {
  return spans.map(s => s.v).join('')
}

// ─── Utility ─────────────────────────────────────────────
export function blocksToPlainText(blocks: MdBlock[]): string {
  return blocks.map(blockToPlain).join('\n')
}

function blockToPlain(block: MdBlock): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return spansToPlain(block.spans)
    case 'code':
      return block.text
    case 'quote':
      return blocksToPlainText(block.blocks)
    case 'list':
      return block.items.map(item => blocksToPlainText(item.blocks)).join('\n')
    case 'table':
      return [
        block.headers.map(h => spansToPlain(h)).join(' | '),
        ...block.rows.map(r => r.map(c => spansToPlain(c)).join(' | ')),
      ].join('\n')
    case 'image':
      return block.alt
    case 'rule':
      return ''
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test example/components/__tests__/markdown-parser.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add example/components/markdown-parser.ts example/components/__tests__/markdown-parser.test.ts
git commit -m "feat(example): add height estimation and blocksToPlainText utility"
```

---

### Task 6: Renderer — MarkdownRenderer Rewrite (core + theme presets)

**Files:**
- Rewrite: `example/components/MarkdownRenderer.tsx`

- [ ] **Step 1: Read existing MarkdownRenderer.tsx to confirm current state**

Read `example/components/MarkdownRenderer.tsx` to verify current contents before overwriting.

- [ ] **Step 2: Rewrite MarkdownRenderer with full block rendering and theme presets**

```tsx
// example/components/MarkdownRenderer.tsx
import { memo, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native'
import type { TextStyle as RNTextStyle } from 'react-native'
import { prepare, layout } from 'expo-pretext'
import { parseMarkdown, blocksToPlainText } from './markdown-parser'
import type { MdBlock, MdSpan, MdListItem } from './markdown-parser'

// ─── Theme ───────────────────────────────────────────────
export type MarkdownTheme = {
  textColor: string
  linkColor: string
  codeBackground: string
  codeTextColor: string
  inlineCodeBackground: string
  inlineCodeColor: string
  quoteBarColor: string
  quoteTextColor: string
  headingColor: string
  hrColor: string
  checkboxColor: string
  tableBorderColor: string
}

const LIGHT: MarkdownTheme = {
  textColor: '#1a1a1a',
  linkColor: '#007AFF',
  codeBackground: '#1e1e1e',
  codeTextColor: '#d4d4d4',
  inlineCodeBackground: 'rgba(0,0,0,0.06)',
  inlineCodeColor: '#d63384',
  quoteBarColor: '#ddd',
  quoteTextColor: '#555',
  headingColor: '#1a1a1a',
  hrColor: '#ddd',
  checkboxColor: '#007AFF',
  tableBorderColor: '#ddd',
}

const DARK: MarkdownTheme = {
  textColor: '#ffffff',
  linkColor: '#a0d8ff',
  codeBackground: 'rgba(255,255,255,0.1)',
  codeTextColor: '#e0e0e0',
  inlineCodeBackground: 'rgba(255,255,255,0.2)',
  inlineCodeColor: '#ffd6e8',
  quoteBarColor: 'rgba(255,255,255,0.3)',
  quoteTextColor: 'rgba(255,255,255,0.8)',
  headingColor: '#ffffff',
  hrColor: 'rgba(255,255,255,0.2)',
  checkboxColor: '#a0d8ff',
  tableBorderColor: 'rgba(255,255,255,0.2)',
}

// ─── Props ───────────────────────────────────────────────
type Props = {
  content: string
  variant?: 'light' | 'dark'
  tightWrap?: boolean
  maxWidth?: number
  overrides?: Partial<MarkdownTheme>
  onLinkPress?: (url: string) => void
}

// ─── Constants ───────────────────────────────────────────
const BLOCK_GAP = 10
const LIST_INDENT = 18
const QUOTE_INDENT = 18
const CODE_BLOCK_PAD = 12

const BODY_STYLE = { fontFamily: 'System', fontSize: 14, lineHeight: 22 }

// ─── Inline Spans ────────────────────────────────────────
function RenderSpans({
  spans, theme, onLinkPress,
}: {
  spans: MdSpan[]
  theme: MarkdownTheme
  onLinkPress: (url: string) => void
}) {
  return (
    <Text style={{ fontSize: 14, lineHeight: 22, color: theme.textColor }}>
      {spans.map((span, i) => {
        switch (span.t) {
          case 'bold':
            return <Text key={i} style={{ fontWeight: '700' }}>{span.v}</Text>
          case 'italic':
            return <Text key={i} style={{ fontStyle: 'italic' }}>{span.v}</Text>
          case 'bolditalic':
            return <Text key={i} style={{ fontWeight: '700', fontStyle: 'italic' }}>{span.v}</Text>
          case 'strike':
            return <Text key={i} style={{ textDecorationLine: 'line-through', color: '#999' }}>{span.v}</Text>
          case 'code':
            return (
              <Text key={i} style={{
                fontFamily: 'Menlo', fontSize: 12,
                backgroundColor: theme.inlineCodeBackground,
                color: theme.inlineCodeColor,
                borderRadius: 3, paddingHorizontal: 4,
              }}>{span.v}</Text>
            )
          case 'link':
            return (
              <Text key={i}
                style={{ color: theme.linkColor, textDecorationLine: 'underline' }}
                onPress={() => onLinkPress(span.url)}
              >{span.v}</Text>
            )
          default:
            return <Text key={i}>{span.v}</Text>
        }
      })}
    </Text>
  )
}

// ─── Block Renderers ─────────────────────────────────────
const RenderBlock = memo(function RenderBlock({
  block, theme, onLinkPress, depth = 0,
}: {
  block: MdBlock
  theme: MarkdownTheme
  onLinkPress: (url: string) => void
  depth?: number
}) {
  switch (block.type) {
    case 'paragraph':
      return <RenderSpans spans={block.spans} theme={theme} onLinkPress={onLinkPress} />

    case 'heading': {
      const style =
        block.level === 1 ? { fontFamily: 'Georgia', fontSize: 20, lineHeight: 28, fontWeight: '700' as const } :
        block.level === 2 ? { fontFamily: 'Georgia', fontSize: 17, lineHeight: 25, fontWeight: '700' as const } :
        { fontSize: 15, lineHeight: 22, fontWeight: '700' as const }
      return (
        <Text style={[style, { color: theme.headingColor }]}>
          {block.spans.map((span, i) => {
            if (span.t === 'code') return <Text key={i} style={{ fontFamily: 'Menlo', fontSize: 12, backgroundColor: theme.inlineCodeBackground, color: theme.inlineCodeColor }}>{span.v}</Text>
            return <Text key={i}>{span.v}</Text>
          })}
        </Text>
      )
    }

    case 'code':
      return (
        <View style={{ backgroundColor: theme.codeBackground, borderRadius: 8, padding: CODE_BLOCK_PAD }}>
          {block.lang ? <Text style={{ fontSize: 10, color: '#666', marginBottom: 4, fontFamily: 'Menlo', fontWeight: '600' }}>{block.lang}</Text> : null}
          <Text style={{ fontFamily: 'Menlo', fontSize: 12, lineHeight: 18, color: theme.codeTextColor }}>{block.text}</Text>
        </View>
      )

    case 'quote':
      return (
        <View style={{ borderLeftWidth: 3, borderLeftColor: theme.quoteBarColor, paddingLeft: QUOTE_INDENT - 3 }}>
          {block.blocks.map((b, i) => (
            <View key={i} style={i > 0 ? { marginTop: 4 } : undefined}>
              <RenderBlock block={b} theme={{ ...theme, textColor: theme.quoteTextColor }} onLinkPress={onLinkPress} depth={depth + 1} />
            </View>
          ))}
        </View>
      )

    case 'list':
      return (
        <View>
          {block.items.map((item, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: idx > 0 ? 4 : 0 }}>
              <Text style={{ fontFamily: 'Menlo', fontSize: 11, fontWeight: '600', width: LIST_INDENT, lineHeight: 22, color: '#999' }}>
                {item.checked === true ? '☑' : item.checked === false ? '☐' :
                  block.ordered ? `${idx + 1}.` : '•'}
              </Text>
              <View style={{ flex: 1 }}>
                {item.blocks.map((b, i) => (
                  <View key={i} style={i > 0 ? { marginTop: 4 } : undefined}>
                    <RenderBlock block={b} theme={theme} onLinkPress={onLinkPress} depth={depth + 1} />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )

    case 'table':
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ borderWidth: 1, borderColor: theme.tableBorderColor, borderRadius: 4 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', backgroundColor: theme.variant === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
              {block.headers.map((cell, ci) => (
                <View key={ci} style={{ padding: 8, borderRightWidth: ci < block.headers.length - 1 ? 1 : 0, borderRightColor: theme.tableBorderColor, minWidth: 80 }}>
                  <RenderSpans spans={cell} theme={theme} onLinkPress={onLinkPress} />
                </View>
              ))}
            </View>
            {/* Rows */}
            {block.rows.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.tableBorderColor }}>
                {row.map((cell, ci) => (
                  <View key={ci} style={{ padding: 8, borderRightWidth: ci < row.length - 1 ? 1 : 0, borderRightColor: theme.tableBorderColor, minWidth: 80 }}>
                    <RenderSpans spans={cell} theme={theme} onLinkPress={onLinkPress} />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )

    case 'image':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inlineCodeBackground, borderRadius: 8, padding: 12, gap: 8 }}>
          <Text style={{ fontSize: 18 }}>🖼</Text>
          <Text style={{ fontSize: 13, color: theme.textColor, flex: 1 }} numberOfLines={1}>{block.alt || block.url}</Text>
        </View>
      )

    case 'rule':
      return <View style={{ height: 1, backgroundColor: theme.hrColor, marginVertical: 8 }} />
  }
})

// ─── Block List ──────────────────────────────────────────
const RenderBlocks = memo(function RenderBlocks({
  blocks, theme, onLinkPress,
}: {
  blocks: MdBlock[]
  theme: MarkdownTheme
  onLinkPress: (url: string) => void
}) {
  return (
    <View>
      {blocks.map((block, i) => (
        <View key={i} style={i > 0 ? { marginTop: BLOCK_GAP } : undefined}>
          <RenderBlock block={block} theme={theme} onLinkPress={onLinkPress} />
        </View>
      ))}
    </View>
  )
})

// ─── Main Component ──────────────────────────────────────
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  variant = 'light',
  tightWrap = false,
  maxWidth,
  overrides,
  onLinkPress,
}: Props) {
  const theme = useMemo(() => {
    const base = variant === 'dark' ? DARK : LIGHT
    return overrides ? { ...base, ...overrides } : base
  }, [variant, overrides])

  const handleLinkPress = useMemo(
    () => onLinkPress || ((url: string) => Linking.openURL(url)),
    [onLinkPress],
  )

  const blocks = useMemo(() => parseMarkdown(content), [content])

  // Tight-wrap: only for paragraph-only content
  const tightWidth = useMemo(() => {
    if (!tightWrap || !maxWidth) return undefined
    // Skip tight-wrap for mixed content
    const hasMixedContent = blocks.some(b => b.type !== 'paragraph')
    if (hasMixedContent) return undefined
    try {
      const plainText = blocksToPlainText(blocks)
      const p = prepare(plainText, BODY_STYLE)
      const full = layout(p, maxWidth)
      if (full.lineCount <= 1) return undefined
      let lo = 60, hi = maxWidth
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1
        const r = layout(p, mid)
        if (r.lineCount <= full.lineCount) hi = mid
        else lo = mid
      }
      return hi
    } catch {
      return undefined
    }
  }, [blocks, tightWrap, maxWidth])

  return (
    <View style={tightWidth ? { width: tightWidth } : undefined}>
      <RenderBlocks blocks={blocks} theme={theme} onLinkPress={handleLinkPress} />
    </View>
  )
})
```

Note: The table `RenderBlock` case references `theme.variant` which doesn't exist on `MarkdownTheme`. Instead, detect light/dark from `theme.textColor`:

Replace the table header background line with:
```tsx
backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
```

- [ ] **Step 3: Verify the app builds**

Run: `cd /Users/macbook/Desktop/JubaKitiashvili.Dev/Projects/ReactNative/expo-pretext/example && npx expo start --no-dev --clear 2>&1 | head -20`
Expected: No TypeScript/import errors

- [ ] **Step 4: Commit**

```bash
git add example/components/MarkdownRenderer.tsx
git commit -m "feat(example): rewrite MarkdownRenderer with full markdown, themes, tight-wrap, onLinkPress"
```

---

### Task 7: Refactor MarkdownChat Demo

**Files:**
- Modify: `example/components/demos/MarkdownChat.tsx`

- [ ] **Step 1: Read current MarkdownChat.tsx to confirm state**

Read `example/components/demos/MarkdownChat.tsx` to verify current contents.

- [ ] **Step 2: Rewrite MarkdownChat to use MarkdownRenderer**

Replace the entire file with:

```tsx
// example/components/demos/MarkdownChat.tsx
import { useCallback, useMemo, memo } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, FlatList } from 'react-native'
import { MarkdownRenderer } from '../MarkdownRenderer'

// ─── Constants ───────────────────────────────────────────
const BUBBLE_PAD_X = 16
const BUBBLE_PAD_Y = 10
const BUBBLE_MAX_RATIO = 0.78

// ─── Message data ─────────────────────────────────────────
type MarkdownSeed = { role: 'user' | 'assistant'; markdown: string }

function msg(role: 'user' | 'assistant', ...lines: string[]): MarkdownSeed {
  return { role, markdown: lines.join('\n') }
}

const BASE_MESSAGES: MarkdownSeed[] = [
  msg(
    'user',
    'Can we treat the rich-text inline flow helper (`rich-inline`) as a real primitive, or is it only good for one tiny demo?',
    '',
    'I mostly care about:',
    '- exact bubble heights',
    '- virtualization without layout reads',
    '- markdown-ish inline styling',
  ),
  msg(
    'assistant',
    'Short answer: **yes, inside a bounded corridor**.',
    '',
    'It already handles rich-text inline flow, `code`, and links like [expo-pretext](https://github.com/JubaKitiashvili/expo-pretext), while keeping pills and badges atomic. The real pressure starts once a chat bubble stops being one paragraph.',
  ),
  msg(
    'user',
    'Right. My side is usually short, but your side has the weird stuff: Beijing 北京, Arabic مرحبا, emoji 👩‍🚀, and long URLs like https://example.com/reports/q3?lang=ar&mode=full',
  ),
  msg(
    'assistant',
    '### What a chat renderer actually needs',
    '',
    '1. Parse markdown somewhere else.',
    '2. Normalize it into blocks and inline runs.',
    '3. Use the rich-text inline flow helper (`rich-inline`) for paragraph-ish content.',
    '4. Use the `pre-wrap` path for fenced code.',
  ),
  msg(
    'user',
    "Then let's stress it with **real markdown**: ***nested emphasis***, ~~deletions~~, `inline code`, [links](https://openai.com/), and a couple messages that are obviously richer on the AI side than on mine.",
  ),
  msg(
    'assistant',
    '> If we know the exact height in advance, then virtualization is no longer guesswork.',
    '>',
    '> It becomes geometry.',
    '',
    'That is the whole reason to keep the primitive low-level and composable.',
  ),
  msg(
    'user',
    'Okay, but the design matters too. The left side should feel lighter and more editorial, while my side can stay bubble-y.',
  ),
  msg(
    'assistant',
    '```ts',
    'const heights = await measureHeights(messages, style, width)',
    'const { estimatedItemSize, overrideItemLayout } = useFlashListHeights(',
    '  messages, getText, style, width',
    ')',
    '```',
  ),
  msg(
    'user',
    'I also want code fences, quotes, and lists to show up often enough that the 10k-thread run actually teaches us something.',
  ),
  msg(
    'assistant',
    'That part is important.',
    '',
    '- paragraph layout is one leaf',
    '- code fences are another leaf',
    '- the chat message is the block-level container above both',
    '',
    'The assistant side is the real stress test because it keeps hitting headings, bullets, quotes, code fences, and occasional long explanations.',
  ),
  msg(
    'user',
    'Try a checklist too. A product chat is full of little status updates.',
  ),
  msg(
    'assistant',
    'Current polish pass:',
    '',
    '- [x] lighter body copy is in',
    '- [x] the assistant lane is bubble-less',
    '- [x] exact height prediction is wired up',
    '- [ ] mobile screenshot smoke tests still remain',
  ),
  msg(
    'user',
    'Can we keep top-level bullets flush? I do not want them shoved way in from the left like an old email client.',
  ),
  msg(
    'assistant',
    'Yes. The top-level list should read almost like paragraph rhythm with markers, not like a nested document outline.',
    '',
    'Nested lists can still step in when they actually nest.',
  ),
  msg(
    'user',
    'I want a structured status block too. It does not need table syntax if we are not really rendering tables here.',
  ),
  msg(
    'assistant',
    '| Component | Status | Owner |',
    '| --- | --- | --- |',
    '| paragraph_leaf | ready | layout |',
    '| code_leaf | ready | pre-wrap |',
    '| quote_wrapper | in progress | block shell |',
    '| virtualization | testing | exact-height |',
  ),
  msg(
    'user',
    'What about images or chips? Even if they are fake, I want to know the primitive can hold an atomic thing.',
  ),
  msg(
    'assistant',
    'It can. Something like `![diagram](mock.png)` behaves more like an inline chip than a splittable word, which is exactly the right stress case.',
    '',
    '![architecture diagram](https://example.com/diagram.png)',
  ),
  msg(
    'user',
    'Throw in a messy status message too: deploys, timestamps, a ticket number, and maybe one escaped quote.',
  ),
  msg(
    'assistant',
    'Status snapshot:',
    '',
    '- deploy window 7:00-9:00',
    '- owner `RICH-431`',
    '- locale mix `24×7` and `२४×७`',
    '- comment: "ship it" after the Safari check',
  ),
  msg(
    'user',
    'I still think the width negotiation matters more than the parser. If widths are wrong, everything feels fake.',
  ),
  msg(
    'assistant',
    'Agreed. The parser is just an upstream producer.',
    '',
    'The hard contract is: once width and fonts are known, the layout layer should answer height exactly enough that virtualization never has to ask for `onLayout` help.',
  ),
  msg(
    'user',
    'Give me one answer that feels more structured, almost like a mini design review.',
  ),
  msg(
    'assistant',
    '## Design review',
    '',
    'The strongest signal so far is that **assistant messages want a different presentation contract from user messages**. The human side reads well as compact bubbles. The assistant side reads better as content on a surface with room to breathe.',
    '',
    'That split also maps nicely to the measurement model because user messages are usually short and AI responses are much more likely to hit rich block transitions.',
  ),
  msg(
    'user',
    'And one answer that feels operational, like we are handing this to another engineer.',
  ),
  msg(
    'assistant',
    '```json',
    '{',
    '  "heightEngine": "expo-pretext",',
    '  "paragraphLeaf": "prepare + layout",',
    '  "codeLeaf": "pre-wrap",',
    '  "virtualization": "FlashList + overrideItemLayout",',
    '  "openRisk": "long-scroll-device-smoke"',
    '}',
    '```',
  ),
  msg(
    'user',
    'We should probably include a short answer too, otherwise every assistant message looks essay-shaped.',
  ),
  msg(
    'assistant',
    'Yep. Short answers are a useful canary because they should not inherit giant block spacing or overbuilt chrome.',
  ),
  msg(
    'user',
    'Try a message with HTML-ish content too. Not because we love it, just because users paste odd things.',
  ),
  msg(
    'assistant',
    'Escaped HTML still needs a stable fallback path.',
    '',
    'If it comes through as a block token, we can still route it through a plain-text or code-like presentation instead of pretending we have a full browser renderer.',
  ),
  msg(
    'user',
    'I also want more than one quote style in the loop. Otherwise we are tuning for a single canned example.',
  ),
  msg(
    'assistant',
    '> The nice version of exact measurement is smooth scrolling.',
    '>',
    '> The brutal version is that every wrong guess accumulates.',
    '',
    '> In a 10k thread, accumulation is the enemy.',
  ),
  msg(
    'user',
    'Can you make one answer about search or citations? AI chats have that vibe a lot now.',
  ),
  msg(
    'assistant',
    'Sure. A citation-heavy answer is mostly the same inline problem with a little more link density:',
    '',
    '- [spec note](https://example.com/spec)',
    '- [issue thread](https://example.com/issues/431)',
    '- [benchmark doc](https://example.com/benchmarks)',
  ),
  msg(
    'user',
    'Maybe a message that mixes scripts more aggressively: English, 日本語, العربية, and a little emoji.',
  ),
  msg(
    'assistant',
    'Mixed-script sample: English for the framing, 日本語 for compact line breaks, العربية for punctuation clusters, and emoji like 🧪📐 to keep the grapheme path honest.',
  ),
  msg(
    'user',
    'I want at least one answer that uses nested bullets so we can see whether the second level still reads okay.',
  ),
  msg(
    'assistant',
    'Things to watch:',
    '',
    '- top-level bullets should feel close to body text',
    '- nested bullets can indent, but only when they truly nest',
    '  - this second level should not explode the width math',
    '  - the marker still needs a clean left gutter',
    '- quotes and code fences should tuck closer to the lead-in paragraph',
  ),
  msg(
    'user',
    'Can we include a very plain human message too? Real threads have those.',
  ),
  msg(
    'assistant',
    'Absolutely.',
  ),
  msg(
    'user',
    'cool. also make sure the scroll still feels stable when widths change',
  ),
  msg(
    'assistant',
    'That is one of the better parts of the demo right now: width changes rebuild the frame, preserve relative scroll intent, and remount only the visible window.',
  ),
  msg(
    'user',
    'One last thing: mention the hypothesis space. I still care a lot about not painting ourselves into a corner.',
  ),
  msg(
    'assistant',
    'The good version of this API is not "we solved rich text." It is "we found a low-level paragraph leaf that keeps the hypothesis space open for a richer block model above it."',
  ),
]

const TOTAL_COUNT = 10_000

// ─── Message generation ───────────────────────────────────
type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  markdown: string
}

function generateMessages(): ChatMsg[] {
  const msgs: ChatMsg[] = new Array(TOTAL_COUNT)
  const baseLen = BASE_MESSAGES.length
  for (let i = 0; i < TOTAL_COUNT; i++) {
    const seed = BASE_MESSAGES[i % baseLen]!
    msgs[i] = {
      id: String(i),
      role: seed.role,
      markdown: seed.markdown,
    }
  }
  return msgs
}

const allMessages = generateMessages()

// ─── Bubble component ─────────────────────────────────────
const ChatBubble = memo(function ChatBubble({
  msg, maxWidth,
}: {
  msg: ChatMsg
  maxWidth: number
}) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <View style={[s.bubble, s.userBubble]}>
        <MarkdownRenderer
          content={msg.markdown}
          variant="dark"
          tightWrap
          maxWidth={maxWidth}
        />
      </View>
    )
  }

  return (
    <View style={[s.assistantRow, { width: maxWidth + BUBBLE_PAD_X }]}>
      <MarkdownRenderer content={msg.markdown} variant="light" />
    </View>
  )
})

// ─── Main component ───────────────────────────────────────
export function MarkdownChatDemo() {
  const { width } = useWindowDimensions()
  const laneWidth = width - 32
  const userMax = Math.floor(laneWidth * BUBBLE_MAX_RATIO)
  const assistantMax = laneWidth

  const renderItem = useCallback(
    ({ item }: { item: ChatMsg }) => (
      <ChatBubble msg={item} maxWidth={item.role === 'user' ? userMax : assistantMax} />
    ),
    [userMax, assistantMax],
  )

  return (
    <View style={s.container}>
      <View style={s.infoBanner}>
        <Text style={s.infoText}>
          {TOTAL_COUNT.toLocaleString()} messages · virtualized · tight-wrap · rich markdown
        </Text>
      </View>
      <FlatList
        data={allMessages}
        renderItem={renderItem}
        keyExtractor={m => m.id}
        windowSize={7}
        maxToRenderPerBatch={10}
        initialNumToRender={12}
        removeClippedSubviews
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f8' },
  infoBanner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#eee',
  },
  infoText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    fontFamily: 'Menlo',
  },
  bubble: {
    padding: BUBBLE_PAD_X,
    paddingVertical: BUBBLE_PAD_Y,
    borderRadius: 18,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantRow: {
    paddingHorizontal: 16,
    paddingVertical: BUBBLE_PAD_Y,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
})
```

Key changes from original:
- Removed all custom parser/renderer code (~300 lines)
- Uses `MarkdownRenderer` with `variant="dark"` for user, `variant="light"` for assistant
- Uses `tightWrap` prop for user bubbles
- Updated BASE_MESSAGES: replaced YAML code fence with actual table, added task list checkboxes, added image placeholder
- Simplified ChatMsg type (removed `blocks` and `plainText` — parser is now internal to MarkdownRenderer)

- [ ] **Step 3: Verify the app loads the demo**

Run: `cd /Users/macbook/Desktop/JubaKitiashvili.Dev/Projects/ReactNative/expo-pretext/example && npx expo start --no-dev --clear 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add example/components/demos/MarkdownChat.tsx
git commit -m "refactor(example): MarkdownChat uses shared MarkdownRenderer, removes duplicate parser"
```

---

### Task 8: Update Main Chat Screen

**Files:**
- Modify: `example/app/(tabs)/chat.tsx`

- [ ] **Step 1: Read current chat.tsx**

Read `example/app/(tabs)/chat.tsx` to verify current usage of MarkdownRenderer.

- [ ] **Step 2: Replace isUser prop with variant**

In `ChatBubble` function, change:
```tsx
// Before
<MarkdownRenderer content={message.content} isUser={isUser} />
```
To:
```tsx
// After
<MarkdownRenderer content={message.content} variant={isUser ? 'dark' : 'light'} />
```

In `StreamingBubble` function, change:
```tsx
// Before
<MarkdownRenderer content={text} />
```
To:
```tsx
// After
<MarkdownRenderer content={text} variant="light" />
```

- [ ] **Step 3: Verify the app builds**

Run: `cd /Users/macbook/Desktop/JubaKitiashvili.Dev/Projects/ReactNative/expo-pretext/example && npx expo start --no-dev --clear 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add example/app/(tabs)/chat.tsx
git commit -m "refactor(example): update chat.tsx to use MarkdownRenderer variant prop"
```

---

### Task 9: Run All Tests and Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Run parser tests**

Run: `cd /Users/macbook/Desktop/JubaKitiashvili.Dev/Projects/ReactNative/expo-pretext && bun test example/components/__tests__/markdown-parser.test.ts`
Expected: All tests PASS

- [ ] **Step 2: Run existing project tests**

Run: `cd /Users/macbook/Desktop/JubaKitiashvili.Dev/Projects/ReactNative/expo-pretext && bun test src/__tests__/`
Expected: All 18 existing tests still PASS

- [ ] **Step 3: Check TypeScript compilation**

Run: `cd /Users/macbook/Desktop/JubaKitiashvili.Dev/Projects/ReactNative/expo-pretext && npx tsc --noEmit 2>&1 | head -30`
Expected: No type errors in modified files

- [ ] **Step 4: Visual verification on simulator**

Open the example app, navigate to:
1. AI Chat tab — verify markdown renders (headings, lists, code, quotes)
2. Demos → Markdown Chat — verify 10k messages with full markdown, tight-wrap, tables, task lists

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(example): address any issues found during verification"
```
