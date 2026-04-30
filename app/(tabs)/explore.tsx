import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const todayPrompts = [
  "What are you most looking forward to right now?",
  "What song are you listening to on repeat?",
  "What's your current favourite place to eat?",
  "Who have you spent the most time with lately?",
  "What's been the best part of this week?",
];

type Entry = {
  prompt: string;
  answer: string;
  date: string;
};

export default function ThePresent() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const router = useRouter();

  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const todayKey = today.toISOString().split('T')[0];

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const saved = await AsyncStorage.getItem(`entries_${todayKey}`);
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  };

  const openPrompt = (prompt: string) => {
    const existing = entries.find(e => e.prompt === prompt);
    setAnswerText(existing?.answer || '');
    setSelectedPrompt(prompt);
  };

  const saveAnswer = async () => {
    if (!selectedPrompt) return;
    const updated = entries.filter(e => e.prompt !== selectedPrompt);
    const newEntry: Entry = {
      prompt: selectedPrompt,
      answer: answerText,
      date: todayKey,
    };
    const newEntries = [...updated, newEntry];
    await AsyncStorage.setItem(`entries_${todayKey}`, JSON.stringify(newEntries));
    setEntries(newEntries);
    setSelectedPrompt(null);
  };

  const getAnswer = (prompt: string) => {
    return entries.find(e => e.prompt === prompt)?.answer || null;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Present</Text>
        <Text style={styles.headerDate}>{dateString}</Text>
        <Text style={styles.headerSubtitle}>
          Today's entry becomes tomorrow's flashback.
        </Text>
      </View>

      {/* Selfie card — navigates to selfie tab */}
      <TouchableOpacity
        style={styles.selfieCard}
        onPress={() => router.push('/(tabs)/selfie')}>
        <Text style={styles.selfieEmoji}>🤳</Text>
        <View style={styles.selfieText}>
          <Text style={styles.selfieTitle}>Today's selfie</Text>
          <Text style={styles.selfieSubtitle}>
            See how much you change over a year
          </Text>
        </View>
        <Text style={styles.selfieArrow}>→</Text>
      </TouchableOpacity>

      {/* Featured prompt */}
      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>TODAY'S PROMPT</Text>
        <Text style={styles.promptText}>{todayPrompts[0]}</Text>
        {getAnswer(todayPrompts[0]) ? (
          <View style={styles.answeredBox}>
            <Text style={styles.answeredText}>"{getAnswer(todayPrompts[0])}"</Text>
            <TouchableOpacity onPress={() => openPrompt(todayPrompts[0])}>
              <Text style={styles.editText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.answerButton} onPress={() => openPrompt(todayPrompts[0])}>
            <Text style={styles.answerButtonText}>Answer this →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* More prompts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More prompts</Text>
        {todayPrompts.slice(1).map((prompt, index) => (
          <TouchableOpacity
            key={index}
            style={styles.smallPromptCard}
            onPress={() => openPrompt(prompt)}>
            <View style={styles.smallPromptContent}>
              <Text style={styles.smallPromptText}>{prompt}</Text>
              {getAnswer(prompt) && (
                <Text style={styles.smallPromptAnswer}>"{getAnswer(prompt)}"</Text>
              )}
            </View>
            <Text style={styles.arrow}>{getAnswer(prompt) ? '✓' : '→'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Future Capsule */}
      <View style={styles.capsuleSection}>
        <Text style={styles.sectionTitle}>Future Capsule</Text>
        <TouchableOpacity style={styles.capsuleCard}>
          <Text style={styles.capsuleEmoji}>🔒</Text>
          <Text style={styles.capsuleTitle}>Write to future you</Text>
          <Text style={styles.capsuleSubtitle}>
            Seal a note to be opened on a date you choose
          </Text>
        </TouchableOpacity>
      </View>

      {/* Answer modal */}
      <Modal visible={selectedPrompt !== null} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Your answer</Text>
            <Text style={styles.modalSubtitle}>{selectedPrompt}</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Write something for future you..."
              placeholderTextColor="#555555"
              multiline
              value={answerText}
              onChangeText={setAnswerText}
              autoFocus
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveAnswer}>
              <Text style={styles.saveButtonText}>Save answer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedPrompt(null)}>
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
  headerDate: { fontSize: 16, color: '#888888', marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: '#555555', fontStyle: 'italic' },
  selfieCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a',
    borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  selfieEmoji: { fontSize: 32, marginRight: 16 },
  selfieText: { flex: 1 },
  selfieTitle: { fontSize: 17, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  selfieSubtitle: { fontSize: 13, color: '#666666' },
  selfieArrow: { color: '#555555', fontSize: 16 },
  promptCard: {
    marginHorizontal: 16, marginBottom: 24, backgroundColor: '#1a1a1a',
    borderRadius: 16, padding: 24, borderLeftWidth: 3, borderLeftColor: '#ffffff',
  },
  promptLabel: { fontSize: 11, color: '#555555', letterSpacing: 2, marginBottom: 12 },
  promptText: { fontSize: 22, color: '#ffffff', fontWeight: '600', marginBottom: 20, lineHeight: 30 },
  answeredBox: { backgroundColor: '#2a2a2a', borderRadius: 10, padding: 14, marginBottom: 4 },
  answeredText: { fontSize: 15, color: '#ffffff', fontStyle: 'italic', marginBottom: 8, lineHeight: 22 },
  editText: { color: '#888888', fontSize: 13 },
  answerButton: {
    backgroundColor: '#ffffff', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  answerButtonText: { color: '#000000', fontWeight: '600', fontSize: 15 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  smallPromptCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  smallPromptContent: { flex: 1, marginRight: 12 },
  smallPromptText: { fontSize: 15, color: '#cccccc', marginBottom: 4 },
  smallPromptAnswer: { fontSize: 13, color: '#888888', fontStyle: 'italic' },
  arrow: { color: '#555555', fontSize: 16 },
  capsuleSection: { paddingHorizontal: 16, marginBottom: 40 },
  capsuleCard: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  capsuleEmoji: { fontSize: 32, marginBottom: 12 },
  capsuleTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  capsuleSubtitle: { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 20 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  modalSubtitle: { fontSize: 15, color: '#888888', marginBottom: 20, lineHeight: 22 },
  textInput: {
    backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, color: '#ffffff',
    fontSize: 16, minHeight: 120, textAlignVertical: 'top', marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10,
  },
  saveButtonText: { color: '#000000', fontWeight: '600', fontSize: 16 },
  cancelButton: { alignItems: 'center', padding: 10 },
  cancelButtonText: { color: '#555555', fontSize: 15 },
});