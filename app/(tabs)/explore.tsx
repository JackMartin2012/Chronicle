import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const todayPrompts = [
  "What are you most looking forward to right now?",
  "What song are you listening to on repeat?",
  "What's your current favourite place to eat?",
  "Who have you spent the most time with lately?",
  "What's been the best part of this week?",
];

export default function ThePresent() {
  const [answered, setAnswered] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Present</Text>
        <Text style={styles.headerDate}>{dateString}</Text>
        <Text style={styles.headerSubtitle}>
          Today's entry becomes tomorrow's flashback.
        </Text>
      </View>

      <TouchableOpacity style={styles.selfieCard}>
        <Text style={styles.selfieEmoji}>🤳</Text>
        <View style={styles.selfieText}>
          <Text style={styles.selfieTitle}>Today's selfie</Text>
          <Text style={styles.selfieSubtitle}>
            See how much you change over a year
          </Text>
        </View>
        <Text style={styles.selfieArrow}>→</Text>
      </TouchableOpacity>

      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>TODAY'S PROMPT</Text>
        <Text style={styles.promptText}>{todayPrompts[0]}</Text>
        <TouchableOpacity style={styles.answerButton}>
          <Text style={styles.answerButtonText}>Answer this →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More prompts</Text>
        {todayPrompts.slice(1).map((prompt, index) => (
          <TouchableOpacity
            key={index}
            style={styles.smallPromptCard}
            onPress={() => setSelected(prompt)}>
            <Text style={styles.smallPromptText}>{prompt}</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#555555',
    fontStyle: 'italic',
  },
  selfieCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  selfieEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  selfieText: {
    flex: 1,
  },
  selfieTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  selfieSubtitle: {
    fontSize: 13,
    color: '#666666',
  },
  selfieArrow: {
    color: '#555555',
    fontSize: 16,
  },
  promptCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#ffffff',
  },
  promptLabel: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 2,
    marginBottom: 12,
  },
  promptText: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 30,
  },
  answerButton: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  answerButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 15,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  smallPromptCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallPromptText: {
    fontSize: 15,
    color: '#cccccc',
    flex: 1,
    marginRight: 12,
  },
  arrow: {
    color: '#555555',
    fontSize: 16,
  },
  capsuleSection: {
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  capsuleCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  capsuleEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  capsuleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  capsuleSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});