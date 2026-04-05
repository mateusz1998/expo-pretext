import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native'


// TODO: Use prepareInlineFlow() + measureInlineFlow() from expo-pretext

export default function RichNoteScreen() {
  const [text, setText] = useState(
    'Hello @maya, check out this note with **bold text** and `inline code`. The height should update as you type!'
  )

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rich Note</Text>
      <Text style={styles.subtitle}>Inline flow with mixed fonts and @mentions</Text>

      <ScrollView style={styles.content}>
        {/* Editable area */}
        <View style={styles.editor}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Type something..."
          />
        </View>

        {/* Preview with pills */}
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewContent}>
            <Text style={styles.previewText}>
              {text.split(/(@\w+)/g).map((part, i) =>
                part.startsWith('@') ? (
                  <Text key={i} style={styles.mention}>{part}</Text>
                ) : (
                  <Text key={i}>{part}</Text>
                )
              )}
            </Text>
          </View>
        </View>

        {/* Height info */}
        <View style={styles.info}>
          <Text style={styles.infoText}>
            Characters: {text.length} | Words: {text.split(/\s+/).length}
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 16 },
  content: { flex: 1, padding: 16 },
  editor: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  input: { fontSize: 16, lineHeight: 24, minHeight: 100 },
  preview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 8 },
  previewContent: { gap: 4 },
  previewText: { fontSize: 16, lineHeight: 24 },
  mention: {
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
    fontWeight: '600',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  info: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  infoText: { fontSize: 12, color: '#999' },
})
