import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const memories = [
  { id: '1', year: '2023', caption: '', placeholder: 'A photo from 3 years ago today' },
  { id: '2', year: '2022', caption: '', placeholder: 'A photo from 4 years ago today' },
  { id: '3', year: '2021', caption: '', placeholder: 'A photo from 5 years ago today' },
];

export default function OnThisDay() {
  const [memoryList, setMemoryList] = useState(memories);
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');

  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const openCaption = (id: string) => {
    const memory = memoryList.find(m => m.id === id);
    setCaptionText(memory?.caption || '');
    setSelectedMemory(id);
  };

  const saveCaption = () => {
    setMemoryList(prev =>
      prev.map(m => m.id === selectedMemory ? { ...m, caption: captionText } : m)
    );
    setSelectedMemory(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>On This Day</Text>
        <Text style={styles.headerDate}>{dateString}</Text>
      </View>

      {memoryList.map((memory) => (
        <View key={memory.id} style={styles.memoryCard}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📷</Text>
          </View>
          <View style={styles.memoryInfo}>
            <Text style={styles.yearTag}>{memory.year}</Text>
            {memory.caption ? (
              <Text style={styles.captionText}>"{memory.caption}"</Text>
            ) : (
              <Text style={styles.captionPrompt}>What was happening this day in {memory.year}?</Text>
            )}
            <TouchableOpacity
              style={styles.addCaptionButton}
              onPress={() => openCaption(memory.id)}>
              <Text style={styles.addCaptionText}>
                {memory.caption ? '✏️ Edit caption' : '+ Add caption'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Modal visible={selectedMemory !== null} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add a caption</Text>
            <Text style={styles.modalSubtitle}>What do you remember about this day?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Write something for future you..."
              placeholderTextColor="#555555"
              multiline
              value={captionText}
              onChangeText={setCaptionText}
              autoFocus
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveCaption}>
              <Text style={styles.saveButtonText}>Save caption</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedMemory(null)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: { paddingTop: 70, paddingHorizontal: 24, paddingBottom: 24 },
  headerTitle: { fontSize: 34, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  headerDate: { fontSize: 16, color: '#888888' },
  memoryCard: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: '#1a1a1a', borderRadius: 16, overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%', height: 240, backgroundColor: '#2a2a2a',
    justifyContent: 'center', alignItems: 'center',
  },
  imagePlaceholderText: { fontSize: 48 },
  memoryInfo: { padding: 16 },
  yearTag: { fontSize: 13, color: '#888888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  captionPrompt: { fontSize: 16, color: '#cccccc', marginBottom: 12 },
  captionText: { fontSize: 16, color: '#ffffff', marginBottom: 12, fontStyle: 'italic' },
  addCaptionButton: {
    borderWidth: 1, borderColor: '#333333', borderRadius: 8,
    padding: 10, alignItems: 'center',
  },
  addCaptionText: { color: '#888888', fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: '#666666', marginBottom: 20 },
  textInput: {
    backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16,
    color: '#ffffff', fontSize: 16, minHeight: 120,
    textAlignVertical: 'top', marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 10,
  },
  saveButtonText: { color: '#000000', fontWeight: '600', fontSize: 16 },
  cancelButton: { alignItems: 'center', padding: 10 },
  cancelButtonText: { color: '#555555', fontSize: 15 },
});