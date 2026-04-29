import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    emoji: '📷',
    title: 'We have all these\npictures for a reason.',
    subtitle: 'Chronicle turns your scattered photos and videos into a beautifully organised record of your life.',
  },
  {
    emoji: '🔁',
    title: 'The past meets\nthe present.',
    subtitle: 'See what you were doing on this exact date in previous years. Every day is a flashback.',
  },
  {
    emoji: '✍️',
    title: 'Capture the story\nbehind the photo.',
    subtitle: 'Add captions, answer daily prompts, record voice memos. The context is what gets lost — Chronicle preserves it.',
  },
  {
    emoji: '🔒',
    title: 'Private. Personal.\nYours forever.',
    subtitle: 'Your memories never leave your device. No ads. No algorithms. Just your life, beautifully kept.',
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleGetStarted = async () => {
    // Mark onboarding as complete so it never shows again
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(tabs)');
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <View style={styles.container}>

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Dot indicators showing which slide you're on */}
      <View style={styles.dots}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentSlide && styles.dotActive]}
          />
        ))}
      </View>

      {/* Bottom buttons */}
      <View style={styles.buttons}>
        {isLastSlide ? (
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>Start your Chronicle →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextText}>Next →</Text>
          </TouchableOpacity>
        )}

        {!isLastSlide && (
          <TouchableOpacity style={styles.skipButton} onPress={handleGetStarted}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 72,
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 17,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
  },
  dotActive: {
    backgroundColor: '#ffffff',
    width: 24,
  },
  buttons: {
    gap: 12,
  },
  nextButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  nextText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 17,
  },
  getStartedButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  getStartedText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 17,
  },
  skipButton: {
    alignItems: 'center',
    padding: 10,
  },
  skipText: {
    color: '#444444',
    fontSize: 15,
  },
});