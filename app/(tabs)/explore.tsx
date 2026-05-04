import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const moods = [
  { emoji: '😔', label: 'Low' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😊', label: 'Great' },
  { emoji: '🤩', label: 'Amazing' },
];

const highlightPrompts = [
  "What was the most significant thing about today?",
  "What's one moment from today you want to remember?",
  "What surprised you today?",
  "What are you most proud of today?",
  "What challenged you today?",
  "What was today's unexpected highlight?",
  "What made today different from yesterday?",
];

const learnPrompts = [
  "What did you learn today?",
  "What realisation did you have today?",
  "What would you do differently today?",
  "What did someone teach you today?",
  "What changed your perspective today?",
  "What did you discover about yourself today?",
];

const getDayPrompt = (prompts: string[]) => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return prompts[dayOfYear % prompts.length];
};

const getWeatherInfo = (code: number, temp: number) => {
  let emoji = '🌤️';
  let description = 'Partly cloudy';
  if (code === 0) { emoji = '☀️'; description = 'Clear sky'; }
  else if (code <= 3) { emoji = '⛅'; description = 'Partly cloudy'; }
  else if (code <= 48) { emoji = '🌫️'; description = 'Foggy'; }
  else if (code <= 55) { emoji = '🌦️'; description = 'Drizzle'; }
  else if (code <= 65) { emoji = '🌧️'; description = 'Rain'; }
  else if (code <= 75) { emoji = '🌨️'; description = 'Snow'; }
  else if (code <= 82) { emoji = '🌧️'; description = 'Showers'; }
  else if (code <= 99) { emoji = '⛈️'; description = 'Thunderstorm'; }
  return { emoji, description, temp: Math.round(temp) };
};

type DayEntry = {
  mood: string;
  dayDescription: string;
  weatherEmoji: string;
  weatherDescription: string;
  weatherTemp: number;
  photoUri: string;
  extraPhotos: string[];
  highlight: string;
  learned: string;
  songName: string;
  songRating: number;
  songMeaning: string;
  withWho: string;
  voiceMemoUri: string;
};

const emptyEntry: DayEntry = {
  mood: '',
  dayDescription: '',
  weatherEmoji: '',
  weatherDescription: '',
  weatherTemp: 0,
  photoUri: '',
  extraPhotos: [],
  highlight: '',
  learned: '',
  songName: '',
  songRating: 0,
  songMeaning: '',
  withWho: '',
  voiceMemoUri: '',
};

export default function ThePresent() {
  const [entry, setEntry] = useState<DayEntry>(emptyEntry);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');
  const [tempRating, setTempRating] = useState(0);
  const [activeTab, setActiveTab] = useState<'today' | 'archive'>('today');
  const [archivedDays, setArchivedDays] = useState<{ key: string; entry: DayEntry }[]>([]);
  const [selectedDay, setSelectedDay] = useState<{ key: string; entry: DayEntry } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Full screen photo viewer
  const [fullScreenUri, setFullScreenUri] = useState<string | null>(null);

  const router = useRouter();

  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const todayKey = today.toISOString().split('T')[0];
  const highlightPrompt = getDayPrompt(highlightPrompts);
  const learnPrompt = getDayPrompt(learnPrompts);

  useEffect(() => {
    loadEntry();
    checkNotificationStatus();
    fetchWeather();
  }, []);

  useEffect(() => {
    if (activeTab === 'archive') loadArchive();
  }, [activeTab]);

  useEffect(() => {
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  const loadEntry = async () => {
    const saved = await AsyncStorage.getItem(`day_entry_${todayKey}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setEntry({ ...emptyEntry, ...parsed, extraPhotos: parsed.extraPhotos || [] });
    }
  };

  const saveEntry = async (updated: DayEntry) => {
    setEntry(updated);
    await AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(updated));
  };

  const loadArchive = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const dayKeys = keys.filter(k => k.startsWith('day_entry_')).sort().reverse();
    const days = [];
    for (const key of dayKeys) {
      const val = await AsyncStorage.getItem(key);
      if (val) {
        const parsed = JSON.parse(val);
        if (parsed.photoUri || parsed.mood) {
          days.push({
            key: key.replace('day_entry_', ''),
            entry: { ...emptyEntry, ...parsed, extraPhotos: parsed.extraPhotos || [] }
          });
        }
      }
    }
    setArchivedDays(days);
  };

  const fetchWeather = async () => {
    const saved = await AsyncStorage.getItem(`day_entry_${todayKey}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.weatherEmoji) return;
    }
    setWeatherLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setWeatherLoading(false); return; }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=celsius`
      );
      const data = await response.json();
      const weather = getWeatherInfo(data.current_weather.weathercode, data.current_weather.temperature);
      const saved2 = await AsyncStorage.getItem(`day_entry_${todayKey}`);
      const existing = saved2 ? JSON.parse(saved2) : emptyEntry;
      const updated = {
        ...emptyEntry, ...existing,
        extraPhotos: existing.extraPhotos || [],
        weatherEmoji: weather.emoji,
        weatherDescription: weather.description,
        weatherTemp: weather.temp,
      };
      setEntry(updated);
      await AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(updated));
    } catch (e) { console.log('Weather error:', e); }
    setWeatherLoading(false);
  };

  const pickPhoto = (isExtra = false) => {
    Alert.alert(
      isExtra ? "Add a photo" : "Today's photo",
      "Choose a photo",
      [
        {
          text: "Take a photo",
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
            if (!result.canceled && result.assets[0]) {
              if (isExtra) {
                saveEntry({ ...entry, extraPhotos: [...entry.extraPhotos, result.assets[0].uri] });
              } else {
                saveEntry({ ...entry, photoUri: result.assets[0].uri });
              }
            }
          },
        },
        {
          text: "Choose from camera roll",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
            if (!result.canceled && result.assets[0]) {
              if (isExtra) {
                saveEntry({ ...entry, extraPhotos: [...entry.extraPhotos, result.assets[0].uri] });
              } else {
                saveEntry({ ...entry, photoUri: result.assets[0].uri });
              }
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Chronicle needs microphone access.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (e) { console.log('Recording error:', e); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) saveEntry({ ...entry, voiceMemoUri: uri });
  };

  const playVoiceMemo = async (uri?: string) => {
    const memoUri = uri || entry.voiceMemoUri;
    if (!memoUri) return;
    if (isPlaying && sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      return;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: memoUri });
      setSound(newSound);
      setIsPlaying(true);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
      });
    } catch (e) { console.log('Playback error:', e); }
  };

  const openModal = (field: string, currentValue: string, currentRating?: number) => {
    setTempText(currentValue);
    setTempRating(currentRating || 0);
    setActiveModal(field);
  };

  const saveModal = async () => {
    if (!activeModal) return;
    let updated = { ...entry };
    if (activeModal === 'highlight') updated.highlight = tempText;
    if (activeModal === 'learned') updated.learned = tempText;
    if (activeModal === 'withWho') updated.withWho = tempText;
    if (activeModal === 'dayDescription') updated.dayDescription = tempText;
    if (activeModal === 'song') { updated.songName = tempText; updated.songRating = tempRating; }
    if (activeModal === 'songMeaning') updated.songMeaning = tempText;
    saveEntry(updated);
    setActiveModal(null);
  };

  const checkNotificationStatus = async () => {
    const enabled = await AsyncStorage.getItem('notifications_enabled');
    setNotificationsEnabled(enabled === 'true');
  };

  const testNotification = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') { alert('Need notification permission first.'); return; }
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Chronicle 📷', body: 'Tell me about your day 🎙️' },
      trigger: null,
    });
    alert('Notification sent!');
  };

  const enableNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') { alert('Need notification permission.'); return; }
    await AsyncStorage.setItem('notifications_enabled', 'true');
    setNotificationsEnabled(true);
    alert('Daily reminders enabled!');
  };

  const disableNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem('notifications_enabled', 'false');
    setNotificationsEnabled(false);
  };

  const formatArchiveDate = (key: string) => {
    return new Date(key + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  return (
    <View style={styles.outerContainer}>

      {/* Header — matches The Past style */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Present</Text>
        <Text style={styles.headerDate}>{dateString}</Text>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'today' && styles.tabButtonActive]}
            onPress={() => setActiveTab('today')}>
            <Text style={[styles.tabButtonText, activeTab === 'today' && styles.tabButtonTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'archive' && styles.tabButtonActive]}
            onPress={() => setActiveTab('archive')}>
            <Text style={[styles.tabButtonText, activeTab === 'archive' && styles.tabButtonTextActive]}>
              Your Days
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TODAY TAB */}
      {activeTab === 'today' && (
        <ScrollView style={styles.container}>
          <View style={styles.subHeader}>
            <Text style={styles.headerSubtitle}>Today's entry becomes tomorrow's flashback.</Text>
          </View>

          {/* Selfie card */}
          <TouchableOpacity style={styles.selfieCard} onPress={() => router.push('/(tabs)/selfie')}>
            <Text style={styles.selfieEmoji}>🤳</Text>
            <View style={styles.selfieText}>
              <Text style={styles.selfieTitle}>Today's selfie</Text>
              <Text style={styles.selfieSubtitle}>See how much you change over a year</Text>
            </View>
            <Text style={styles.selfieArrow}>→</Text>
          </TouchableOpacity>

          {/* Main photo + strip */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoCard} onPress={() => pickPhoto(false)}>
              {entry.photoUri ? (
                <View>
                  <Image source={{ uri: entry.photoUri }} style={styles.todayPhoto} />
                  <View style={styles.photoEditOverlay}>
                    <Text style={styles.photoEditText}>Change photo</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderEmoji}>🖼️</Text>
                  <Text style={styles.photoPlaceholderTitle}>Add today's photo</Text>
                  <Text style={styles.photoPlaceholderSubtitle}>Take one or choose from camera roll</Text>
                </View>
              )}
            </TouchableOpacity>

            {(entry.photoUri || entry.extraPhotos.length > 0) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.extraStrip} contentContainerStyle={styles.extraStripContent}>
                {entry.extraPhotos.map((uri, index) => (
                  <TouchableOpacity key={index} onPress={() => setFullScreenUri(uri)}>
                    <Image source={{ uri }} style={styles.extraPhoto} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.addExtraButton} onPress={() => pickPhoto(true)}>
                  <Text style={styles.addExtraText}>+</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

          {/* Mood + Weather */}
          <View style={styles.row}>
            <View style={styles.moodCard}>
              <Text style={styles.cardLabel}>MOOD</Text>
              <View style={styles.moodRow}>
                {moods.map((mood) => (
                  <TouchableOpacity
                    key={mood.emoji}
                    onPress={() => saveEntry({ ...entry, mood: mood.emoji })}
                    style={[styles.moodButton, entry.mood === mood.emoji && styles.moodButtonActive]}>
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {entry.mood ? (
                <Text style={styles.moodSelected}>
                  Feeling {moods.find(m => m.emoji === entry.mood)?.label}
                </Text>
              ) : (
                <Text style={styles.moodPrompt}>How are you feeling?</Text>
              )}
              <TouchableOpacity
                style={styles.dayDescButton}
                onPress={() => openModal('dayDescription', entry.dayDescription)}>
                {entry.dayDescription ? (
                  <Text style={styles.dayDescText}>"{entry.dayDescription}"</Text>
                ) : (
                  <Text style={styles.dayDescPlaceholder}>+ Describe your day in a sentence</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.weatherCard}>
              <Text style={styles.cardLabel}>WEATHER</Text>
              {weatherLoading ? (
                <ActivityIndicator color="#4a90d9" size="small" style={{ marginTop: 12 }} />
              ) : entry.weatherEmoji ? (
                <View style={styles.weatherContent}>
                  <Text style={styles.weatherEmoji}>{entry.weatherEmoji}</Text>
                  <Text style={styles.weatherTemp}>{entry.weatherTemp}°C</Text>
                  <Text style={styles.weatherDesc}>{entry.weatherDescription}</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={fetchWeather} style={styles.weatherContent}>
                  <Text style={styles.weatherEmoji}>🌍</Text>
                  <Text style={styles.weatherDesc}>Tap to load</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Voice memo */}
          <View style={styles.voiceCard}>
            <Text style={styles.cardLabel}>VOICE MEMO</Text>
            <Text style={styles.voicePrompt}>Tell me about your day...</Text>
            {entry.voiceMemoUri ? (
              <View style={styles.voiceControls}>
                <TouchableOpacity style={styles.voicePlayButton} onPress={() => playVoiceMemo()}>
                  <Text style={styles.voicePlayText}>{isPlaying ? '⏸ Stop' : '▶ Play memo'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.voiceRerecordButton}
                  onPress={isRecording ? stopRecording : startRecording}>
                  <Text style={styles.voiceRerecordText}>
                    {isRecording ? '⏹ Stop recording' : '🎙 Re-record'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.voiceRecordButton, isRecording && styles.voiceRecordButtonActive]}
                onPress={isRecording ? stopRecording : startRecording}>
                <Text style={styles.voiceRecordEmoji}>{isRecording ? '⏹' : '🎙'}</Text>
                <Text style={styles.voiceRecordText}>
                  {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
                </Text>
                {isRecording && <View style={styles.recordingDot} />}
              </TouchableOpacity>
            )}
          </View>

          {/* Highlight */}
          <TouchableOpacity style={styles.entryCard} onPress={() => openModal('highlight', entry.highlight)}>
            <Text style={styles.cardLabel}>TODAY'S HIGHLIGHT</Text>
            <Text style={styles.entryPrompt}>{highlightPrompt}</Text>
            {entry.highlight ? (
              <Text style={styles.entryAnswer}>"{entry.highlight}"</Text>
            ) : (
              <Text style={styles.entryAddText}>+ Write something</Text>
            )}
          </TouchableOpacity>

          {/* Learned */}
          <TouchableOpacity style={styles.entryCard} onPress={() => openModal('learned', entry.learned)}>
            <Text style={styles.cardLabel}>WHAT I LEARNED</Text>
            <Text style={styles.entryPrompt}>{learnPrompt}</Text>
            {entry.learned ? (
              <Text style={styles.entryAnswer}>"{entry.learned}"</Text>
            ) : (
              <Text style={styles.entryAddText}>+ Write something</Text>
            )}
          </TouchableOpacity>

          {/* Song */}
          <TouchableOpacity style={styles.entryCard} onPress={() => openModal('song', entry.songName, entry.songRating)}>
            <Text style={styles.cardLabel}>TODAY'S SONG</Text>
            {entry.songName ? (
              <View>
                <Text style={styles.songName}>🎵 {entry.songName}</Text>
                <View style={styles.ratingRow}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <View key={n} style={[styles.ratingDot, n <= entry.songRating && styles.ratingDotFilled]} />
                  ))}
                  <Text style={styles.ratingNumber}>{entry.songRating}/10</Text>
                </View>
                {entry.songMeaning ? (
                  <Text style={styles.entryAnswer}>"{entry.songMeaning}"</Text>
                ) : (
                  <TouchableOpacity onPress={() => openModal('songMeaning', entry.songMeaning)}>
                    <Text style={styles.entryAddText}>+ What does it mean to you?</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View>
                <Text style={styles.entryPrompt}>What are you listening to today?</Text>
                <Text style={styles.entryAddText}>+ Add a song</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* With who */}
          <TouchableOpacity style={styles.entryCard} onPress={() => openModal('withWho', entry.withWho)}>
            <Text style={styles.cardLabel}>WHO I WAS WITH</Text>
            {entry.withWho ? (
              <Text style={styles.entryAnswer}>👥 {entry.withWho}</Text>
            ) : (
              <View>
                <Text style={styles.entryPrompt}>Who mattered today?</Text>
                <Text style={styles.entryAddText}>+ Add people</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily reminders</Text>
            <View style={styles.notificationCard}>
              <Text style={styles.notificationEmoji}>🔔</Text>
              <View style={styles.notificationText}>
                <Text style={styles.notificationTitle}>
                  {notificationsEnabled ? 'Reminders on' : 'Get daily reminders'}
                </Text>
                <Text style={styles.notificationSubtitle}>
                  {notificationsEnabled ? "You'll get a daily prompt every evening" : 'A daily nudge to document your life'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.notificationToggle, notificationsEnabled && styles.notificationToggleOn]}
                onPress={notificationsEnabled ? disableNotifications : enableNotifications}>
                <Text style={styles.notificationToggleText}>{notificationsEnabled ? 'On' : 'Off'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.testButton} onPress={testNotification}>
              <Text style={styles.testButtonText}>Send test notification</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

      {/* YOUR DAYS ARCHIVE */}
      {activeTab === 'archive' && (
        <ScrollView style={styles.container}>
          <View style={styles.subHeader}>
            <Text style={styles.archiveSubtitle}>
              Every day you've documented — your life, one day at a time.
            </Text>
          </View>

          {archivedDays.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>No days archived yet</Text>
              <Text style={styles.emptySubtitle}>
                Add a photo or mood to today and it will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.archiveGrid}>
              {archivedDays.map(({ key, entry: dayEntry }) => (
                <TouchableOpacity
                  key={key}
                  style={styles.archiveItem}
                  onPress={() => setSelectedDay({ key, entry: dayEntry })}>
                  {dayEntry.photoUri ? (
                    <Image source={{ uri: dayEntry.photoUri }} style={styles.archivePhoto} />
                  ) : (
                    <View style={[styles.archivePhoto, styles.archivePhotoEmpty]}>
                      <Text style={styles.archiveMoodLarge}>{dayEntry.mood || '📅'}</Text>
                    </View>
                  )}
                  <View style={styles.archiveInfo}>
                    <Text style={styles.archiveDate}>
                      {new Date(key + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                    {dayEntry.mood && <Text style={styles.archiveMood}>{dayEntry.mood}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Day detail modal */}
      <Modal visible={selectedDay !== null} animationType="slide">
        <View style={styles.dayModal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero photo — tappable */}
            {selectedDay?.entry.photoUri ? (
              <TouchableOpacity onPress={() => setFullScreenUri(selectedDay.entry.photoUri)}>
                <Image source={{ uri: selectedDay.entry.photoUri }} style={styles.dayModalPhoto} />
                <View style={styles.photoTapHint}>
                  <Text style={styles.photoTapHintText}>Tap to view full screen</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <View style={styles.dayModalContent}>
              <View style={styles.dayTitleRow}>
                <View style={styles.dayYearBadge}>
                  <Text style={styles.dayYearBadgeText}>
                    {selectedDay?.key ? new Date(selectedDay.key + 'T12:00:00').getFullYear() : ''}
                  </Text>
                </View>
                <Text style={styles.dayDateText}>
                  {selectedDay?.key ? formatArchiveDate(selectedDay.key) : ''}
                </Text>
              </View>

              {/* Mood + weather chips */}
              <View style={styles.dayModalRow}>
                {selectedDay?.entry.mood && (
                  <View style={styles.dayModalChip}>
                    <Text style={styles.dayModalChipText}>
                      {selectedDay.entry.mood} {moods.find(m => m.emoji === selectedDay.entry.mood)?.label}
                    </Text>
                  </View>
                )}
                {selectedDay?.entry.weatherEmoji && (
                  <View style={styles.dayModalChip}>
                    <Text style={styles.dayModalChipText}>
                      {selectedDay.entry.weatherEmoji} {selectedDay.entry.weatherTemp}°C
                    </Text>
                  </View>
                )}
              </View>

              {selectedDay?.entry.dayDescription ? (
                <Text style={styles.dayModalDescription}>"{selectedDay.entry.dayDescription}"</Text>
              ) : null}

              {/* Context fields — tappable to add */}
              <Text style={styles.sectionTitle}>Context</Text>
              <Text style={styles.sectionSubtitle}>What was this day like?</Text>

              {[
                { key: 'highlight', label: 'HIGHLIGHT', emoji: '✨', value: selectedDay?.entry.highlight },
                { key: 'learned', label: 'WHAT I LEARNED', emoji: '💡', value: selectedDay?.entry.learned },
                { key: 'withWho', label: 'WHO I WAS WITH', emoji: '👥', value: selectedDay?.entry.withWho },
              ].map(field => (
                field.value ? (
                  <View key={field.key} style={styles.dayModalSection}>
                    <Text style={styles.dayModalLabel}>{field.emoji} {field.label}</Text>
                    <Text style={styles.dayModalText}>"{field.value}"</Text>
                  </View>
                ) : null
              ))}

              {selectedDay?.entry.songName ? (
                <View style={styles.dayModalSection}>
                  <Text style={styles.dayModalLabel}>🎵 SONG</Text>
                  <Text style={styles.dayModalText}>{selectedDay.entry.songName}</Text>
                  {selectedDay.entry.songRating > 0 && (
                    <Text style={styles.dayModalSubtext}>{selectedDay.entry.songRating}/10</Text>
                  )}
                  {selectedDay.entry.songMeaning ? (
                    <Text style={styles.dayModalText}>"{selectedDay.entry.songMeaning}"</Text>
                  ) : null}
                </View>
              ) : null}

              {/* Extra photos — tappable */}
              {(selectedDay?.entry.extraPhotos?.length ?? 0) > 0 && (
                <View style={styles.dayModalSection}>
                  <Text style={styles.dayModalLabel}>📷 MORE PHOTOS</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {(selectedDay?.entry.extraPhotos ?? []).map((uri, i) => (
                      <TouchableOpacity key={i} onPress={() => setFullScreenUri(uri)}>
                        <Image source={{ uri }} style={styles.dayModalExtraPhoto} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Voice memo */}
              {selectedDay?.entry.voiceMemoUri ? (
                <View style={styles.dayModalSection}>
                  <Text style={styles.dayModalLabel}>🎙 VOICE MEMO</Text>
                  <TouchableOpacity
                    style={styles.voicePlayButton}
                    onPress={() => playVoiceMemo(selectedDay.entry.voiceMemoUri)}>
                    <Text style={styles.voicePlayText}>{isPlaying ? '⏸ Stop' : '▶ Play memo'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.dayModalClose}
            onPress={() => setSelectedDay(null)}>
            <Text style={styles.dayModalCloseText}>← Back to The Present</Text>
          </TouchableOpacity>

          {/* Full screen viewer — inside day modal */}
          <Modal visible={fullScreenUri !== null} transparent animationType="fade">
            <TouchableOpacity
              style={styles.fullScreenOverlay}
              activeOpacity={1}
              onPress={() => setFullScreenUri(null)}>
              {fullScreenUri && (
                <Image source={{ uri: fullScreenUri }} style={styles.fullScreenImage} resizeMode="contain" />
              )}
              <Text style={styles.fullScreenDismiss}>Tap anywhere to close</Text>
            </TouchableOpacity>
          </Modal>
        </View>
      </Modal>

      {/* Full screen for today's photos */}
      <Modal visible={fullScreenUri !== null && selectedDay === null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.fullScreenOverlay}
          activeOpacity={1}
          onPress={() => setFullScreenUri(null)}>
          {fullScreenUri && (
            <Image source={{ uri: fullScreenUri }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
          <Text style={styles.fullScreenDismiss}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>

      {/* Text input modal */}
      <Modal
        visible={activeModal !== null && activeModal !== 'song'}
        animationType="slide"
        transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {activeModal === 'highlight' && "Today's highlight"}
              {activeModal === 'learned' && "What I learned"}
              {activeModal === 'withWho' && "Who I was with"}
              {activeModal === 'dayDescription' && "Describe your day"}
              {activeModal === 'songMeaning' && "What it means to you"}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Write something for future you..."
              placeholderTextColor="#555555"
              multiline
              value={tempText}
              onChangeText={setTempText}
              autoFocus
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveModal}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setActiveModal(null)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Song modal */}
      <Modal visible={activeModal === 'song'} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Today's song</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Song name and artist..."
              placeholderTextColor="#555555"
              value={tempText}
              onChangeText={setTempText}
              autoFocus
            />
            <Text style={styles.ratingLabel}>
              Rating: {tempRating > 0 ? `${tempRating}/10` : 'tap to rate'}
            </Text>
            <View style={styles.ratingButtons}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.ratingNumberButton, n <= tempRating && styles.ratingNumberButtonActive]}
                  onPress={() => setTempRating(n)}>
                  <Text style={[styles.ratingNumberText, n <= tempRating && styles.ratingNumberTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={saveModal}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setActiveModal(null)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#0d0d0d' },
  container: { flex: 1 },

  // Header — matches The Past exactly
  header: {
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 12,
    backgroundColor: '#0d0d0d',
  },
  headerTitle: { fontSize: 34, fontWeight: 'bold', color: '#ffffff', marginBottom: 2 },
  headerDate: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginBottom: 16 },
  tabSwitcher: {
    flexDirection: 'row', backgroundColor: '#1a1a1a',
    borderRadius: 12, padding: 4,
  },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#4a90d9' },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: '#555555' },
  tabButtonTextActive: { color: '#ffffff' },

  subHeader: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  headerSubtitle: { fontSize: 13, color: '#555555', fontStyle: 'italic' },
  archiveSubtitle: { fontSize: 14, color: '#555555', fontStyle: 'italic' },

  selfieCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a',
    borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  selfieEmoji: { fontSize: 28, marginRight: 14 },
  selfieText: { flex: 1 },
  selfieTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 2 },
  selfieSubtitle: { fontSize: 12, color: '#666666' },
  selfieArrow: { color: '#555555', fontSize: 16 },

  photoSection: { marginHorizontal: 16, marginBottom: 16 },
  photoCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  todayPhoto: { width: '100%', height: 240 },
  photoEditOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, alignItems: 'center',
  },
  photoEditText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  photoPlaceholder: {
    padding: 32, alignItems: 'center', borderWidth: 1,
    borderColor: '#2a2a2a', borderRadius: 16, borderStyle: 'dashed',
  },
  photoPlaceholderEmoji: { fontSize: 36, marginBottom: 10 },
  photoPlaceholderTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 6 },
  photoPlaceholderSubtitle: { fontSize: 13, color: '#555555', textAlign: 'center' },
  extraStrip: { marginTop: 10 },
  extraStripContent: { gap: 8, paddingRight: 8 },
  extraPhoto: { width: 80, height: 80, borderRadius: 10 },
  addExtraButton: {
    width: 80, height: 80, borderRadius: 10, backgroundColor: '#1a1a1a',
    borderWidth: 1, borderColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center',
  },
  addExtraText: { color: '#4a90d9', fontSize: 28, fontWeight: '300' },

  row: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 12 },
  moodCard: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: '#2a2a2a',
  },
  weatherCard: {
    width: 100, backgroundColor: '#1a1a1a', borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center',
  },
  cardLabel: { fontSize: 10, color: '#4a90d9', fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  moodRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  moodButton: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#2a2a2a',
  },
  moodButtonActive: { backgroundColor: '#4a90d9' },
  moodEmoji: { fontSize: 17 },
  moodSelected: { fontSize: 11, color: '#4a90d9', fontWeight: '600', marginBottom: 8 },
  moodPrompt: { fontSize: 11, color: '#555555', marginBottom: 8 },
  dayDescButton: { marginTop: 4, padding: 8, backgroundColor: '#2a2a2a', borderRadius: 8 },
  dayDescText: { fontSize: 12, color: '#cccccc', fontStyle: 'italic', lineHeight: 18 },
  dayDescPlaceholder: { fontSize: 12, color: '#444444' },
  weatherContent: { alignItems: 'center' },
  weatherEmoji: { fontSize: 28, marginBottom: 4 },
  weatherTemp: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 2 },
  weatherDesc: { fontSize: 10, color: '#666666', textAlign: 'center' },

  voiceCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a',
    borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2a2a2a',
  },
  voicePrompt: { fontSize: 15, color: '#cccccc', marginBottom: 14 },
  voiceRecordButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a',
    borderRadius: 12, padding: 14, gap: 10,
  },
  voiceRecordButtonActive: { backgroundColor: '#3a1a1a', borderWidth: 1, borderColor: '#ff4444' },
  voiceRecordEmoji: { fontSize: 22 },
  voiceRecordText: { flex: 1, fontSize: 14, color: '#cccccc' },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4444' },
  voiceControls: { gap: 10 },
  voicePlayButton: { backgroundColor: '#4a90d9', borderRadius: 12, padding: 12, alignItems: 'center' },
  voicePlayText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  voiceRerecordButton: {
    borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 12, padding: 12, alignItems: 'center',
  },
  voiceRerecordText: { color: '#666666', fontSize: 14 },

  entryCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a',
    borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2a2a2a',
  },
  entryPrompt: { fontSize: 15, color: '#cccccc', marginBottom: 10, lineHeight: 22 },
  entryAnswer: { fontSize: 15, color: '#ffffff', fontStyle: 'italic', lineHeight: 22, marginTop: 4 },
  entryAddText: { color: '#4a90d9', fontSize: 14, fontWeight: '600', marginTop: 4 },
  songName: { fontSize: 16, color: '#ffffff', fontWeight: '600', marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  ratingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a2a2a' },
  ratingDotFilled: { backgroundColor: '#4a90d9' },
  ratingNumber: { fontSize: 13, color: '#4a90d9', fontWeight: '600', marginLeft: 4 },

  section: { paddingHorizontal: 16, marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#555555', marginBottom: 12, fontStyle: 'italic' },
  notificationCard: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  notificationEmoji: { fontSize: 28, marginRight: 14 },
  notificationText: { flex: 1 },
  notificationTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  notificationSubtitle: { fontSize: 13, color: '#666666', lineHeight: 18 },
  notificationToggle: {
    backgroundColor: '#2a2a2a', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
  },
  notificationToggleOn: { backgroundColor: '#4a90d9' },
  notificationToggleText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  testButton: {
    borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 12, padding: 12, alignItems: 'center',
  },
  testButtonText: { color: '#444444', fontSize: 13 },

  // Archive grid
  archiveGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16,
    paddingBottom: 40, gap: 8,
  },
  archiveItem: { width: '31%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  archivePhoto: { width: '100%', aspectRatio: 1 },
  archivePhotoEmpty: { backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center' },
  archiveMoodLarge: { fontSize: 32 },
  archiveInfo: {
    padding: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  archiveDate: { fontSize: 11, color: '#888888', fontWeight: '600' },
  archiveMood: { fontSize: 14 },

  emptyState: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#666666', textAlign: 'center', lineHeight: 22 },

  // Day detail modal
  dayModal: { flex: 1, backgroundColor: '#0d0d0d' },
  dayModalPhoto: { width: '100%', height: 300 },
  photoTapHint: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, alignItems: 'center',
  },
  photoTapHintText: { color: '#ffffff', fontSize: 12 },
  dayModalContent: { padding: 24, paddingBottom: 100 },
  dayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  dayYearBadge: {
    backgroundColor: '#4a90d9', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 16,
  },
  dayYearBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  dayDateText: { fontSize: 16, fontWeight: '700', color: '#ffffff', flex: 1, flexWrap: 'wrap' },
  dayModalRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  dayModalChip: {
    backgroundColor: '#1a1a1a', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  dayModalChipText: { fontSize: 14, color: '#ffffff' },
  dayModalDescription: {
    fontSize: 17, color: '#cccccc', fontStyle: 'italic', marginBottom: 20, lineHeight: 26,
  },
  dayModalSection: { marginBottom: 20 },
  dayModalLabel: { fontSize: 10, color: '#4a90d9', fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  dayModalText: { fontSize: 16, color: '#ffffff', lineHeight: 24 },
  dayModalSubtext: { fontSize: 13, color: '#666666', marginTop: 4 },
  dayModalExtraPhoto: { width: 120, height: 120, borderRadius: 10, marginRight: 8 },
  dayModalClose: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    margin: 16, backgroundColor: '#1a1a1a',
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  dayModalCloseText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },

  // Full screen
  fullScreenOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullScreenImage: { width: '100%', height: '85%' },
  fullScreenDismiss: { color: '#555555', fontSize: 13, marginTop: 16 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  textInput: {
    backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, color: '#ffffff',
    fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 16,
  },
  ratingLabel: { fontSize: 14, color: '#888888', marginBottom: 12 },
  ratingButtons: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  ratingNumberButton: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#2a2a2a',
    justifyContent: 'center', alignItems: 'center',
  },
  ratingNumberButtonActive: { backgroundColor: '#4a90d9' },
  ratingNumberText: { color: '#666666', fontWeight: '600', fontSize: 14 },
  ratingNumberTextActive: { color: '#ffffff' },
  saveButton: {
    backgroundColor: '#4a90d9', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10,
  },
  saveButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  cancelButton: { alignItems: 'center', padding: 10 },
  cancelButtonText: { color: '#555555', fontSize: 15 },
});