import { ScrollView, StyleSheet, Text, View } from 'react-native';

const memories = [
  {
    id: '1',
    year: '2023',
    caption: '',
    placeholder: 'A photo from 3 years ago today',
  },
  {
    id: '2',
    year: '2022',
    caption: '',
    placeholder: 'A photo from 4 years ago today',
  },
  {
    id: '3',
    year: '2021',
    caption: '',
    placeholder: 'A photo from 5 years ago today',
  },
];

export default function OnThisDay() {
  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>On This Day</Text>
        <Text style={styles.headerDate}>{dateString}</Text>
      </View>

      {memories.map((memory) => (
        <View key={memory.id} style={styles.memoryCard}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📷</Text>
          </View>
          <View style={styles.memoryInfo}>
            <Text style={styles.yearTag}>{memory.year}</Text>
            <Text style={styles.captionPrompt}>
              What was happening this day in {memory.year}?
            </Text>
            <View style={styles.addCaptionButton}>
              <Text style={styles.addCaptionText}>+ Add caption</Text>
            </View>
          </View>
        </View>
      ))}
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
  },
  memoryCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  memoryInfo: {
    padding: 16,
  },
  yearTag: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  captionPrompt: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 12,
  },
  addCaptionButton: {
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  addCaptionText: {
    color: '#888888',
    fontSize: 14,
  },
});