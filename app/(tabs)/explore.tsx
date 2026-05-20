import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const THUMB_SIZE = Math.floor((width - 32 - 12) / 7);

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
};
const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

type DayEntry = {
  mood: string; dayDescription: string; weatherEmoji: string;
  weatherDescription: string; weatherTemp: number; photoUri: string;
  extraPhotos: string[]; highlight: string; learned: string;
  songName: string; songRating: number; songMeaning: string;
  withWho: string; taggedPeople: string[]; voiceMemoUri: string;
  openedCapsules: { id: string; message: string; photoUri: string; createdDate: string }[];
  sealedCapsules: { id: string; openDate: string; context: string }[];
};

type Favourite = {
  id: string; category: string; name: string; rating: number;
  note: string; photoUri: string; dateKey: string; displayDate: string;
};

type Capsule = {
  id: string; message: string; photoUri: string;
  createdDate: string; openDate: string; opened: boolean;
};

const emptyEntry: DayEntry = {
  mood: '', dayDescription: '', weatherEmoji: '', weatherDescription: '',
  weatherTemp: 0, photoUri: '', extraPhotos: [], highlight: '', learned: '',
  songName: '', songRating: 0, songMeaning: '', withWho: '', taggedPeople: [], voiceMemoUri: '', openedCapsules: [], sealedCapsules: [],
};

const moods = [
  { emoji: '😔', label: 'Low' }, { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' }, { emoji: '😊', label: 'Great' }, { emoji: '🤩', label: 'Amazing' },
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

const favCategories = [
  { key: 'all', label: 'All', emoji: '⭐' },
  { key: 'song', label: 'Song', emoji: '🎵' },
  { key: 'movie', label: 'Movie / TV', emoji: '🎬' },
  { key: 'book', label: 'Book', emoji: '📚' },
  { key: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { key: 'recipe', label: 'Recipe', emoji: '🍳' },
  { key: 'place', label: 'Place', emoji: '📍' },
];

const getDayPrompt = (prompts: string[]) => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return prompts[dayOfYear % prompts.length];
};

const getWeatherInfo = (code: number, temp: number) => {
  let emoji = '🌤️'; let description = 'Partly cloudy';
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

// ── ANIMATED CARD ────────────────────────────────────────────────────────────
const AnimatedCard = ({ onPress, style, children }: {
  onPress: () => void; style?: any; children: React.ReactNode;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, {
    toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4,
  }).start();
  const onPressOut = () => Animated.spring(scale, {
    toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4,
  }).start();
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        activeOpacity={1} style={{ flex: 1 }}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ThePresent() {
  const [activeTab, setActiveTab] = useState<'today' | 'archive' | 'favourites'>('today');
  const router = useRouter();

  const [entry, setEntry] = useState<DayEntry>(emptyEntry);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');
  const [tempRating, setTempRating] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [fullScreenUri, setFullScreenUri] = useState<string | null>(null);

  const [archivedDays, setArchivedDays] = useState<{ key: string; entry: DayEntry }[]>([]);
  const [selectedDay, setSelectedDay] = useState<{ key: string; entry: DayEntry } | null>(null);
  const [archiveCalYear, setArchiveCalYear] = useState('');

  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [favFilter, setFavFilter] = useState('all');
  const [showAddFav, setShowAddFav] = useState(false);
  const [selectedFav, setSelectedFav] = useState<Favourite | null>(null);
  const [newFav, setNewFav] = useState<Partial<Favourite>>({ category: 'song', name: '', rating: 0, note: '', photoUri: '' });

  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [peopleInput, setPeopleInput] = useState('');
  const [knownPeople, setKnownPeople] = useState<string[]>([]);

  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [showCreateCapsule, setShowCreateCapsule] = useState(false);
  const [revealingCapsule, setRevealingCapsule] = useState<Capsule | null>(null);
  const [newCapsuleMessage, setNewCapsuleMessage] = useState('');
  const [newCapsulePhoto, setNewCapsulePhoto] = useState('');
  const [capsuleDay, setCapsuleDay] = useState(new Date().getDate());
  const [capsuleMonth, setCapsuleMonth] = useState(new Date().getMonth() + 1);
  const [capsuleYear, setCapsuleYear] = useState(new Date().getFullYear() + 1);
  const [capsuleAddToDay, setCapsuleAddToDay] = useState(false);
  const [capsuleContext, setCapsuleContext] = useState('');
  const [todaySelfieUri, setTodaySelfieUri] = useState<string | null>(null);
  const [selectedDaySelfieUri, setSelectedDaySelfieUri] = useState<string | null>(null);

  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayKey = formatDateKey(today);
  const highlightPrompt = getDayPrompt(highlightPrompts);
  const learnPrompt = getDayPrompt(learnPrompts);

  const archiveYears = [...new Set(archivedDays.map(d => d.key.split('-')[0]))].sort().reverse();
  const archiveDayMap: Record<string, DayEntry> = {};
  archivedDays.forEach(d => { archiveDayMap[d.key] = d.entry; });
  const archiveMonthsInYear = [...new Set(
    archivedDays.filter(d => d.key.startsWith(archiveCalYear)).map(d => parseInt(d.key.split('-')[1]) - 1)
  )].sort((a, b) => a - b);

  const peopleSuggestions = knownPeople
    .filter(p => peopleInput.trim().length > 0 &&
      p.toLowerCase().startsWith(peopleInput.toLowerCase()) &&
      !(entry.taggedPeople || []).includes(p))
    .slice(0, 5);

  const capsuleMaxDay = new Date(capsuleYear, capsuleMonth, 0).getDate();
  const readyCapsules = capsules.filter(c => !c.opened && c.openDate <= todayKey);
  const sealedCapsules = capsules.filter(c => !c.opened && c.openDate > todayKey);

  useEffect(() => {
    loadEntry(); checkNotificationStatus(); fetchWeather();
    loadFavourites(); loadCapsules(); loadKnownPeople();
  }, []);

  useEffect(() => { if (activeTab === 'archive') loadArchive(); }, [activeTab]);

  useEffect(() => {
    if (archivedDays.length > 0 && !archiveCalYear) {
      setArchiveCalYear(archivedDays[0].key.split('-')[0]);
    }
  }, [archivedDays]);

  useEffect(() => { return () => { if (sound) sound.unloadAsync(); }; }, [sound]);

  const loadEntry = async () => {
    const saved = await AsyncStorage.getItem(`day_entry_${todayKey}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setEntry({ ...emptyEntry, ...parsed, extraPhotos: parsed.extraPhotos || [], taggedPeople: parsed.taggedPeople || [] });
    }
    const selfieUri = await AsyncStorage.getItem(`selfie_${todayKey}`);
    if (selfieUri) setTodaySelfieUri(selfieUri);
  };

  useEffect(() => {
    if (selectedDay?.key) {
      AsyncStorage.getItem(`selfie_${selectedDay.key}`).then(uri => setSelectedDaySelfieUri(uri || null));
    } else {
      setSelectedDaySelfieUri(null);
    }
  }, [selectedDay]);

  const saveEntry = async (updated: DayEntry) => {
    setEntry(updated);
    await AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(updated));
  };

  const loadArchive = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const dayKeys = keys.filter(k => k.startsWith('day_entry_')).sort().reverse();
    const days: { key: string; entry: DayEntry }[] = [];
    for (const key of dayKeys) {
      const val = await AsyncStorage.getItem(key);
      if (val) {
        const parsed = JSON.parse(val);
        if (parsed.photoUri || parsed.mood || parsed.highlight || parsed.learned || parsed.songName) {
          days.push({
            key: key.replace('day_entry_', ''),
            entry: { ...emptyEntry, ...parsed, extraPhotos: parsed.extraPhotos || [], taggedPeople: parsed.taggedPeople || [], openedCapsules: parsed.openedCapsules || [], sealedCapsules: parsed.sealedCapsules || [] }
          });
        }
      }
    }
    setArchivedDays(days);
    if (days.length > 0 && !archiveCalYear) setArchiveCalYear(days[0].key.split('-')[0]);
  };

  const loadFavourites = async () => {
    const raw = await AsyncStorage.getItem('favourites');
    if (raw) setFavourites(JSON.parse(raw));
  };

  const saveFavourites = async (updated: Favourite[]) => {
    setFavourites(updated);
    await AsyncStorage.setItem('favourites', JSON.stringify(updated));
  };

  const loadCapsules = async () => {
    const raw = await AsyncStorage.getItem('capsules');
    if (raw) setCapsules(JSON.parse(raw));
  };

  const saveCapsules = async (updated: Capsule[]) => {
    setCapsules(updated);
    await AsyncStorage.setItem('capsules', JSON.stringify(updated));
  };

  const loadKnownPeople = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const peopleSet = new Set<string>();
    for (const key of keys.filter(k => k.startsWith('people_'))) {
      const val = await AsyncStorage.getItem(key);
      if (val) (JSON.parse(val) as string[]).forEach(p => peopleSet.add(p));
    }
    for (const key of keys.filter(k => k.startsWith('day_entry_'))) {
      const val = await AsyncStorage.getItem(key);
      if (val) {
        const e = JSON.parse(val);
        (e.taggedPeople || []).forEach((p: string) => peopleSet.add(p));
      }
    }
    setKnownPeople([...peopleSet].sort());
  };

  const fetchWeather = async () => {
    const saved = await AsyncStorage.getItem(`day_entry_${todayKey}`);
    if (saved && JSON.parse(saved).weatherEmoji) return;
    setWeatherLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setWeatherLoading(false); return; }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=celsius`);
      const data = await response.json();
      const weather = getWeatherInfo(data.current_weather.weathercode, data.current_weather.temperature);
      const saved2 = await AsyncStorage.getItem(`day_entry_${todayKey}`);
      const existing = saved2 ? JSON.parse(saved2) : emptyEntry;
      const updated = { ...emptyEntry, ...existing, extraPhotos: existing.extraPhotos || [], taggedPeople: existing.taggedPeople || [], weatherEmoji: weather.emoji, weatherDescription: weather.description, weatherTemp: weather.temp };
      setEntry(updated);
      await AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(updated));
    } catch (e) { console.log('Weather error:', e); }
    setWeatherLoading(false);
  };

  const pickPhoto = (isExtra = false) => {
    Alert.alert(isExtra ? 'Add a photo' : "Today's photo", 'Choose a photo', [
      { text: 'Take a photo', onPress: async () => {
        const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
        if (!result.canceled && result.assets[0]) {
          if (isExtra) saveEntry({ ...entry, extraPhotos: [...entry.extraPhotos, result.assets[0].uri] });
          else saveEntry({ ...entry, photoUri: result.assets[0].uri });
        }
      }},
      { text: 'Choose from camera roll', onPress: async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
        if (!result.canceled && result.assets[0]) {
          if (isExtra) saveEntry({ ...entry, extraPhotos: [...entry.extraPhotos, result.assets[0].uri] });
          else saveEntry({ ...entry, photoUri: result.assets[0].uri });
        }
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickFavPhoto = () => {
    Alert.alert('Add a photo', 'Choose a photo for this entry', [
      { text: 'Take a photo', onPress: async () => {
        const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
        if (!result.canceled && result.assets[0]) setNewFav(prev => ({ ...prev, photoUri: result.assets[0].uri }));
      }},
      { text: 'Choose from camera roll', onPress: async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
        if (!result.canceled && result.assets[0]) setNewFav(prev => ({ ...prev, photoUri: result.assets[0].uri }));
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickCapsulePhoto = () => {
    Alert.alert('Add a photo', 'Attach a photo to your capsule', [
      { text: 'Take a photo', onPress: async () => {
        const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
        if (!result.canceled && result.assets[0]) setNewCapsulePhoto(result.assets[0].uri);
      }},
      { text: 'Choose from camera roll', onPress: async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
        if (!result.canceled && result.assets[0]) setNewCapsulePhoto(result.assets[0].uri);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Chronicle needs microphone access.'); return; }
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
    if (isPlaying && sound) { await sound.stopAsync(); setIsPlaying(false); return; }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: memoUri });
      setSound(newSound);
      setIsPlaying(true);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate(status => { if (status.isLoaded && status.didJustFinish) setIsPlaying(false); });
    } catch (e) { console.log('Playback error:', e); }
  };

  const openModal = (field: string, currentValue: string, currentRating?: number) => {
    setTempText(currentValue); setTempRating(currentRating || 0); setActiveModal(field);
  };

  const saveModal = async () => {
    if (!activeModal) return;
    let updated = { ...entry };
    if (activeModal === 'highlight') updated.highlight = tempText;
    if (activeModal === 'learned') updated.learned = tempText;
    if (activeModal === 'dayDescription') updated.dayDescription = tempText;
    if (activeModal === 'song') { updated.songName = tempText; updated.songRating = tempRating; }
    if (activeModal === 'songMeaning') updated.songMeaning = tempText;
    saveEntry(updated);
    setActiveModal(null);
  };

  const addPersonTag = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = entry.taggedPeople || [];
    if (current.includes(trimmed)) { setPeopleInput(''); return; }
    const updated = [...current, trimmed];
    saveEntry({ ...entry, taggedPeople: updated, withWho: updated.join(', ') });
    if (!knownPeople.includes(trimmed)) setKnownPeople(prev => [...prev, trimmed].sort());
    setPeopleInput('');
  };

  const removePersonTag = (name: string) => {
    const updated = (entry.taggedPeople || []).filter(p => p !== name);
    saveEntry({ ...entry, taggedPeople: updated, withWho: updated.join(', ') });
  };

  const createCapsule = async () => {
    if (!newCapsuleMessage.trim()) { Alert.alert('Add a message', 'Write something for future you before sealing.'); return; }
    const day = Math.min(capsuleDay, capsuleMaxDay);
    const openDate = `${capsuleYear}-${String(capsuleMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (openDate <= todayKey) { Alert.alert('Pick a future date', 'The open date must be in the future.'); return; }
    const capsule: Capsule = {
      id: Date.now().toString(), message: newCapsuleMessage.trim(),
      photoUri: newCapsulePhoto, createdDate: todayKey, openDate, opened: false,
    };
    await saveCapsules([...capsules, capsule]);
    if (capsuleAddToDay) {
      const savedEntry = await AsyncStorage.getItem(`day_entry_${todayKey}`);
      const existing = savedEntry ? JSON.parse(savedEntry) : emptyEntry;
      const updatedEntry = {
        ...emptyEntry, ...existing,
        extraPhotos: existing.extraPhotos || [],
        taggedPeople: existing.taggedPeople || [],
        openedCapsules: existing.openedCapsules || [],
        sealedCapsules: [...(existing.sealedCapsules || []), {
          id: capsule.id, openDate: capsule.openDate, context: capsuleContext.trim(),
        }],
      };
      await AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(updatedEntry));
    }
    setNewCapsuleMessage(''); setNewCapsulePhoto(''); setCapsuleAddToDay(false); setCapsuleContext('');
    setShowCreateCapsule(false);
    Alert.alert('Sealed! 🔒', `Opens on ${new Date(openDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`);
  };

  const addCapsuleToDay = async (capsule: Capsule) => {
    const updated = capsules.map(c => c.id === capsule.id ? { ...c, opened: true } : c);
    await saveCapsules(updated);
    const savedEntry = await AsyncStorage.getItem(`day_entry_${todayKey}`);
    const existing = savedEntry ? JSON.parse(savedEntry) : emptyEntry;
    const updatedEntry = {
      ...emptyEntry, ...existing,
      extraPhotos: existing.extraPhotos || [],
      taggedPeople: existing.taggedPeople || [],
      sealedCapsules: existing.sealedCapsules || [],
      openedCapsules: [...(existing.openedCapsules || []), {
        id: capsule.id, message: capsule.message,
        photoUri: capsule.photoUri, createdDate: capsule.createdDate,
      }],
    };
    await AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(updatedEntry));
    setRevealingCapsule(null);
  };

  const checkNotificationStatus = async () => {
    const enabled = await AsyncStorage.getItem('notifications_enabled');
    setNotificationsEnabled(enabled === 'true');
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

  const addFavourite = async () => {
    if (!newFav.name?.trim()) { Alert.alert('Add a name', 'Please enter a name for this favourite.'); return; }
    const date = new Date();
    const fav: Favourite = {
      id: Date.now().toString(), category: newFav.category || 'song',
      name: newFav.name || '', rating: newFav.rating || 0,
      note: newFav.note || '', photoUri: newFav.photoUri || '',
      dateKey: formatDateKey(date),
      displayDate: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
    await saveFavourites([fav, ...favourites]);
    setNewFav({ category: 'song', name: '', rating: 0, note: '', photoUri: '' });
    setShowAddFav(false);
  };

  const deleteFavourite = async (id: string) => {
    Alert.alert('Delete', 'Remove this from your favourites?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await saveFavourites(favourites.filter(f => f.id !== id));
        setSelectedFav(null);
      }},
    ]);
  };

  const formatArchiveDate = (key: string) => new Date(key + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const filteredFavourites = favFilter === 'all' ? favourites : favourites.filter(f => f.category === favFilter);
  const getCategoryEmoji = (key: string) => favCategories.find(c => c.key === key)?.emoji || '⭐';

  return (
    <View style={styles.outerContainer}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Present</Text>
        <Text style={styles.headerDate}>{dateString}</Text>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'today' && styles.tabButtonActive]} onPress={() => setActiveTab('today')}>
            <Text style={[styles.tabButtonText, activeTab === 'today' && styles.tabButtonTextActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'archive' && styles.tabButtonActive]} onPress={() => setActiveTab('archive')}>
            <Text style={[styles.tabButtonText, activeTab === 'archive' && styles.tabButtonTextActive]}>Your Days</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'favourites' && styles.tabButtonActive]} onPress={() => setActiveTab('favourites')}>
            <Text style={[styles.tabButtonText, activeTab === 'favourites' && styles.tabButtonTextActive]}>Favourites</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'today' && (
        <ScrollView style={styles.container}>
          <View style={styles.subHeader}>
            <Text style={styles.headerSubtitle}>Today's entry becomes tomorrow's flashback.</Text>
          </View>

          {/* Selfie section */}
          <TouchableOpacity style={styles.selfieSectionToday} onPress={() => router.push('/(tabs)/selfie')} activeOpacity={0.85}>
            {todaySelfieUri ? (
              <Image source={{ uri: todaySelfieUri }} style={styles.selfiePhotoToday} resizeMode="cover" />
            ) : (
              <View style={styles.selfiePlaceholderToday}>
                <Text style={styles.selfiePlaceholderEmoji}>🤳</Text>
                <Text style={styles.selfiePlaceholderText}>Add today's selfie</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoCard} onPress={() => pickPhoto(false)}>
              {entry.photoUri ? (
                <View>
                  <Image source={{ uri: entry.photoUri }} style={styles.todayPhoto} />
                  <View style={styles.photoEditOverlay}><Text style={styles.photoEditText}>Change photo</Text></View>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extraStrip} contentContainerStyle={styles.extraStripContent}>
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

          <View style={styles.row}>
            <View style={styles.moodCard}>
              <Text style={styles.cardLabel}>MOOD</Text>
              <View style={styles.moodRow}>
                {moods.map(mood => (
                  <TouchableOpacity key={mood.emoji} onPress={() => saveEntry({ ...entry, mood: mood.emoji })}
                    style={[styles.moodButton, entry.mood === mood.emoji && styles.moodButtonActive]}>
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {entry.mood ? <Text style={styles.moodSelected}>Feeling {moods.find(m => m.emoji === entry.mood)?.label}</Text>
                : <Text style={styles.moodPrompt}>How are you feeling?</Text>}
              <TouchableOpacity style={styles.dayDescButton} onPress={() => openModal('dayDescription', entry.dayDescription)}>
                {entry.dayDescription ? <Text style={styles.dayDescText}>"{entry.dayDescription}"</Text>
                  : <Text style={styles.dayDescPlaceholder}>+ Describe your day in a sentence</Text>}
              </TouchableOpacity>
            </View>
            <View style={styles.weatherCard}>
              <Text style={styles.cardLabel}>WEATHER</Text>
              {weatherLoading ? <ActivityIndicator color="#4a90d9" size="small" style={{ marginTop: 12 }} />
                : entry.weatherEmoji ? (
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

          <View style={styles.compactCard}>
            <Text style={styles.cardLabel}>VOICE MEMO</Text>
            <Text style={styles.voicePrompt}>Tell me about your day...</Text>
            {entry.voiceMemoUri ? (
              <View style={styles.voiceControls}>
                <TouchableOpacity style={styles.voicePlayButton} onPress={() => playVoiceMemo()}>
                  <Text style={styles.voicePlayText}>{isPlaying ? '⏸ Stop' : '▶ Play memo'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.voiceRerecordButton} onPress={isRecording ? stopRecording : startRecording}>
                  <Text style={styles.voiceRerecordText}>{isRecording ? '⏹ Stop recording' : '🎙 Re-record'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.voiceRecordButton, isRecording && styles.voiceRecordButtonActive]} onPress={isRecording ? stopRecording : startRecording}>
                <Text style={styles.voiceRecordEmoji}>{isRecording ? '⏹' : '🎙'}</Text>
                <Text style={styles.voiceRecordText}>{isRecording ? 'Tap to stop recording' : 'Tap to start recording'}</Text>
                {isRecording && <View style={styles.recordingDot} />}
              </TouchableOpacity>
            )}
          </View>

          {/* Featured daily prompt */}
          <AnimatedCard onPress={() => openModal('highlight', entry.highlight)} style={styles.featuredCard}>
            <Text style={styles.featuredCardLabel}>TODAY'S PROMPT</Text>
            <Text style={styles.featuredPromptText}>{highlightPrompt}</Text>
            {entry.highlight
              ? <Text style={styles.featuredAnswer}>"{entry.highlight}"</Text>
              : <Text style={styles.featuredAddText}>Write your answer →</Text>}
          </AnimatedCard>

          {/* Compact entry cards */}
          <AnimatedCard onPress={() => openModal('learned', entry.learned)} style={styles.compactCard}>
            <Text style={styles.cardLabel}>WHAT I LEARNED</Text>
            <Text style={styles.entryPrompt}>{learnPrompt}</Text>
            {entry.learned ? <Text style={styles.entryAnswer}>"{entry.learned}"</Text> : <Text style={styles.entryAddText}>+ Write something</Text>}
          </AnimatedCard>

          <AnimatedCard onPress={() => openModal('song', entry.songName, entry.songRating)} style={styles.compactCard}>
            <Text style={styles.cardLabel}>TODAY'S SONG</Text>
            {entry.songName ? (
              <View>
                <Text style={styles.songName}>🎵 {entry.songName}</Text>
                <View style={styles.ratingRow}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <View key={n} style={[styles.ratingDot, n <= entry.songRating && styles.ratingDotFilled]} />)}
                  <Text style={styles.ratingNumber}>{entry.songRating}/10</Text>
                </View>
                {entry.songMeaning ? <Text style={styles.entryAnswer}>"{entry.songMeaning}"</Text>
                  : <TouchableOpacity onPress={() => openModal('songMeaning', entry.songMeaning)}><Text style={styles.entryAddText}>+ What does it mean to you?</Text></TouchableOpacity>}
              </View>
            ) : (
              <View>
                <Text style={styles.entryPrompt}>What are you listening to today?</Text>
                <Text style={styles.entryAddText}>+ Add a song</Text>
              </View>
            )}
          </AnimatedCard>

          <AnimatedCard onPress={() => setShowPeopleModal(true)} style={styles.compactCard}>
            <Text style={styles.cardLabel}>WHO I WAS WITH</Text>
            {(entry.taggedPeople || []).length > 0 ? (
              <View>
                <View style={styles.peopleChipsRow}>
                  {(entry.taggedPeople || []).map(person => (
                    <View key={person} style={styles.personChip}>
                      <Text style={styles.personChipText}>👤 {person}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.entryAddText}>+ Add more people</Text>
              </View>
            ) : entry.withWho ? (
              <View>
                <Text style={styles.entryAnswer}>👥 {entry.withWho}</Text>
                <Text style={styles.entryAddText}>+ Update</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.entryPrompt}>Who mattered today?</Text>
                <Text style={styles.entryAddText}>+ Tag people</Text>
              </View>
            )}
          </AnimatedCard>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily reminders</Text>
            <View style={styles.notificationCard}>
              <Text style={styles.notificationEmoji}>🔔</Text>
              <View style={styles.notificationText}>
                <Text style={styles.notificationTitle}>{notificationsEnabled ? 'Reminders on' : 'Get daily reminders'}</Text>
                <Text style={styles.notificationSubtitle}>{notificationsEnabled ? "You'll get a daily prompt every evening" : 'A daily nudge to document your life'}</Text>
              </View>
              <TouchableOpacity style={[styles.notificationToggle, notificationsEnabled && styles.notificationToggleOn]} onPress={notificationsEnabled ? disableNotifications : enableNotifications}>
                <Text style={styles.notificationToggleText}>{notificationsEnabled ? 'On' : 'Off'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Future Capsules</Text>
            <Text style={styles.sectionSubtitle}>Seal a message for future you. It unlocks on the date you choose.</Text>

            {readyCapsules.length > 0 && (
              <View style={styles.capsuleReadySection}>
                <Text style={styles.capsuleReadyLabel}>🔓 READY TO OPEN</Text>
                {readyCapsules.map(capsule => (
                  <TouchableOpacity key={capsule.id} style={styles.capsuleReadyCard} onPress={() => setRevealingCapsule(capsule)}>
                    <Text style={styles.capsuleReadyEmoji}>🎁</Text>
                    <View style={styles.capsuleCardInfo}>
                      <Text style={styles.capsuleReadyTitle}>A message from your past self</Text>
                      <Text style={styles.capsuleReadyDate}>Sealed {new Date(capsule.createdDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    </View>
                    <Text style={styles.capsuleArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {sealedCapsules.map(capsule => (
              <View key={capsule.id} style={styles.capsuleSealedCard}>
                <Text style={styles.capsuleSealedEmoji}>🔒</Text>
                <View style={styles.capsuleCardInfo}>
                  <Text style={styles.capsuleSealedTitle}>Opens {new Date(capsule.openDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                  <Text style={styles.capsuleSealedDate}>Sealed {new Date(capsule.createdDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.createCapsuleButton} onPress={() => setShowCreateCapsule(true)}>
              <Text style={styles.createCapsuleEmoji}>✉️</Text>
              <Text style={styles.createCapsuleText}>Seal a new capsule</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {activeTab === 'archive' && (
        <View style={styles.container}>
          {archivedDays.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>No days archived yet</Text>
              <Text style={styles.emptySubtitle}>Add a photo or mood to today and it will appear here.</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearPickerStrip} contentContainerStyle={styles.yearPickerContent}>
                {archiveYears.map(year => (
                  <TouchableOpacity key={year} style={[styles.yearPickerItem, archiveCalYear === year && styles.yearPickerItemActive]} onPress={() => setArchiveCalYear(year)}>
                    <Text style={[styles.yearPickerText, archiveCalYear === year && styles.yearPickerTextActive]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={styles.archiveCalSubtitle}>
                  <Text style={styles.archiveCalSubtitleText}>Every day you've documented.</Text>
                </View>
                {archiveMonthsInYear.map(month => {
                  const year = parseInt(archiveCalYear);
                  const daysInMonth = getDaysInMonth(year, month);
                  const firstDay = getFirstDayOfMonth(year, month);
                  const monthName = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long' });
                  return (
                    <View key={month} style={styles.calendarMonth}>
                      <Text style={styles.calendarMonthTitle}>{monthName}</Text>
                      <View style={styles.calendarDayHeaders}>
                        {WEEK_DAYS.map((d, i) => <Text key={i} style={styles.calendarDayHeader}>{d}</Text>)}
                      </View>
                      <View style={styles.calendarGrid}>
                        {Array.from({ length: firstDay }).map((_, i) => <View key={`e-${i}`} style={styles.calendarCell} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dateKey = `${archiveCalYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const archiveDay = archiveDayMap[dateKey];
                          return (
                            <TouchableOpacity key={day} style={styles.calendarCell} onPress={() => archiveDay ? setSelectedDay({ key: dateKey, entry: archiveDay }) : null} activeOpacity={archiveDay ? 0.8 : 1}>
                              {archiveDay ? (
                                <View style={styles.calendarCellFilled}>
                                  {archiveDay.photoUri
                                    ? <Image source={{ uri: archiveDay.photoUri }} style={styles.calendarThumb} />
                                    : archiveDay.mood
                                      ? <View style={[styles.calendarThumb, styles.calendarMoodCell]}><Text style={styles.calendarMoodEmoji}>{archiveDay.mood}</Text></View>
                                      : null}
                                  <Text style={styles.calendarDayNumber}>{day}</Text>
                                </View>
                              ) : (
                                <View style={styles.calendarCellEmpty}>
                                  <Text style={styles.calendarDayNumberEmpty}>{day}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
                <View style={{ height: 40 }} />
              </ScrollView>
            </>
          )}
        </View>
      )}

      {activeTab === 'favourites' && (
        <View style={styles.container}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favFilterStrip} contentContainerStyle={styles.favFilterContent}>
            {favCategories.map(cat => (
              <TouchableOpacity key={cat.key} style={[styles.favFilterPill, favFilter === cat.key && styles.favFilterPillActive]} onPress={() => setFavFilter(cat.key)}>
                <Text style={styles.favFilterEmoji}>{cat.emoji}</Text>
                <Text style={[styles.favFilterText, favFilter === cat.key && styles.favFilterTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {filteredFavourites.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⭐</Text>
              <Text style={styles.emptyTitle}>No favourites yet</Text>
              <Text style={styles.emptySubtitle}>Tap the + button to add your first favourite.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.favGrid}>
              {filteredFavourites.map(fav => (
                <TouchableOpacity key={fav.id} style={styles.favCard} onPress={() => setSelectedFav(fav)}>
                  {fav.photoUri ? <Image source={{ uri: fav.photoUri }} style={styles.favPhoto} />
                    : <View style={styles.favPhotoEmpty}><Text style={styles.favCategoryEmoji}>{getCategoryEmoji(fav.category)}</Text></View>}
                  <View style={styles.favInfo}>
                    <View style={styles.favInfoTop}>
                      <Text style={styles.favCategoryTag}>{getCategoryEmoji(fav.category)} {favCategories.find(c => c.key === fav.category)?.label}</Text>
                      {fav.rating > 0 && <Text style={styles.favRatingTag}>{fav.rating}/10</Text>}
                    </View>
                    <Text style={styles.favName} numberOfLines={1}>{fav.name}</Text>
                    {fav.note ? <Text style={styles.favNote} numberOfLines={2}>"{fav.note}"</Text> : null}
                    <Text style={styles.favDate}>{fav.displayDate}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.addFavButton} onPress={() => setShowAddFav(true)}>
            <Text style={styles.addFavButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* YOUR DAYS — day detail modal */}
      <Modal visible={selectedDay !== null} animationType="slide">
        <View style={styles.dayModal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedDaySelfieUri && (
              <Image source={{ uri: selectedDaySelfieUri }} style={styles.daySelfiePhoto} resizeMode="cover" />
            )}
            {selectedDay?.entry.photoUri ? (
              <TouchableOpacity onPress={() => setFullScreenUri(selectedDay.entry.photoUri)}>
                <Image source={{ uri: selectedDay.entry.photoUri }} style={styles.dayModalPhoto} />
                <View style={styles.photoTapHint}><Text style={styles.photoTapHintText}>Tap to view full screen</Text></View>
              </TouchableOpacity>
            ) : null}
            <View style={styles.dayModalContent}>
              <View style={styles.dayTitleRow}>
                <View style={styles.dayYearBadge}>
                  <Text style={styles.dayYearBadgeText}>{selectedDay?.key ? new Date(selectedDay.key + 'T12:00:00').getFullYear() : ''}</Text>
                </View>
                <Text style={styles.dayDateText}>{selectedDay?.key ? formatArchiveDate(selectedDay.key) : ''}</Text>
              </View>
              <View style={styles.dayModalRow}>
                {selectedDay?.entry.mood && <View style={styles.dayModalChip}><Text style={styles.dayModalChipText}>{selectedDay.entry.mood} {moods.find(m => m.emoji === selectedDay.entry.mood)?.label}</Text></View>}
                {selectedDay?.entry.weatherEmoji && <View style={styles.dayModalChip}><Text style={styles.dayModalChipText}>{selectedDay.entry.weatherEmoji} {selectedDay.entry.weatherTemp}°C</Text></View>}
              </View>
              {selectedDay?.entry.dayDescription ? <Text style={styles.dayModalDescription}>"{selectedDay.entry.dayDescription}"</Text> : null}
              {[
                { key: 'highlight', label: 'HIGHLIGHT', emoji: '✨', value: selectedDay?.entry.highlight },
                { key: 'learned', label: 'WHAT I LEARNED', emoji: '💡', value: selectedDay?.entry.learned },
                { key: 'withWho', label: 'WHO I WAS WITH', emoji: '👥', value: (selectedDay?.entry.taggedPeople || []).join(', ') || selectedDay?.entry.withWho },
              ].map(field => field.value ? (
                <View key={field.key} style={styles.dayModalSection}>
                  <Text style={styles.dayModalLabel}>{field.emoji} {field.label}</Text>
                  <Text style={styles.dayModalText}>"{field.value}"</Text>
                </View>
              ) : null)}
              {selectedDay?.entry.songName ? (
                <View style={styles.dayModalSection}>
                  <Text style={styles.dayModalLabel}>🎵 SONG</Text>
                  <Text style={styles.dayModalText}>{selectedDay.entry.songName}</Text>
                  {selectedDay.entry.songRating > 0 && <Text style={styles.dayModalSubtext}>{selectedDay.entry.songRating}/10</Text>}
                </View>
              ) : null}
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
              {selectedDay?.entry.voiceMemoUri ? (
                <View style={styles.dayModalSection}>
                  <Text style={styles.dayModalLabel}>🎙 VOICE MEMO</Text>
                  <TouchableOpacity style={styles.voicePlayButton} onPress={() => playVoiceMemo(selectedDay.entry.voiceMemoUri)}>
                    <Text style={styles.voicePlayText}>{isPlaying ? '⏸ Stop' : '▶ Play memo'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {((selectedDay?.entry.sealedCapsules?.length ?? 0) > 0 || (selectedDay?.entry.openedCapsules?.length ?? 0) > 0) && (
                <View style={styles.dayModalSection}>
                  <Text style={styles.dayModalLabel}>📬 CAPSULES</Text>
                  {(selectedDay?.entry.sealedCapsules ?? []).map((cap, i) => (
                    <View key={`sealed-${i}`} style={styles.capsuleSealedRecord}>
                      <Text style={styles.capsuleRecordMeta}>Capsule sealed · Opens {new Date(cap.openDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                      {cap.context ? <Text style={styles.capsuleRecordContext}>{cap.context}</Text> : null}
                    </View>
                  ))}
                  {(selectedDay?.entry.openedCapsules ?? []).map((cap, i) => (
                    <View key={`opened-${i}`} style={styles.capsuleOpenedRecord}>
                      <Text style={styles.capsuleRecordMeta}>Capsule opened · Written on {new Date(cap.createdDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                      <Text style={styles.capsuleOpenedMessage}>"{cap.message}"</Text>
                      {cap.photoUri ? <Image source={{ uri: cap.photoUri }} style={styles.capsuleOpenedPhoto} /> : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.dayModalClose} onPress={() => setSelectedDay(null)}>
            <Text style={styles.dayModalCloseText}>← Back to The Present</Text>
          </TouchableOpacity>
          <Modal visible={fullScreenUri !== null} transparent animationType="fade">
            <TouchableOpacity style={styles.fullScreenOverlay} activeOpacity={1} onPress={() => setFullScreenUri(null)}>
              {fullScreenUri && <Image source={{ uri: fullScreenUri }} style={styles.fullScreenImage} resizeMode="contain" />}
              <Text style={styles.fullScreenDismiss}>Tap anywhere to close</Text>
            </TouchableOpacity>
          </Modal>
        </View>
      </Modal>

      {/* Favourite detail modal */}
      <Modal visible={selectedFav !== null} animationType="slide" transparent>
        <TouchableOpacity style={styles.favDetailOverlay} activeOpacity={1} onPress={() => setSelectedFav(null)}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.favDetailBox}>
            {selectedFav?.photoUri ? <Image source={{ uri: selectedFav.photoUri }} style={styles.favDetailPhoto} />
              : <View style={styles.favDetailPhotoEmpty}><Text style={styles.favDetailEmoji}>{getCategoryEmoji(selectedFav?.category || '')}</Text></View>}
            <View style={styles.favDetailInfoRow}>
              <Text style={styles.favDetailCategory}>{getCategoryEmoji(selectedFav?.category || '')} {favCategories.find(c => c.key === selectedFav?.category)?.label}</Text>
              {selectedFav?.rating && selectedFav.rating > 0 ? <Text style={styles.favDetailRating}>{selectedFav.rating}/10</Text> : null}
            </View>
            <Text style={styles.favDetailName}>{selectedFav?.name}</Text>
            {selectedFav?.note ? <Text style={styles.favDetailNote}>"{selectedFav.note}"</Text> : null}
            <Text style={styles.favDetailDate}>{selectedFav?.displayDate}</Text>
            <TouchableOpacity style={styles.favDetailDelete} onPress={() => deleteFavourite(selectedFav?.id || '')}>
              <Text style={styles.favDetailDeleteText}>Remove from favourites</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add favourite modal — full screen, no blur needed */}
      <Modal visible={showAddFav} animationType="slide">
        <View style={styles.addFavModal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.addFavTitle}>Add a Favourite</Text>
            <Text style={styles.addFavLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addFavCategoryRow}>
              {favCategories.filter(c => c.key !== 'all').map(cat => (
                <TouchableOpacity key={cat.key} style={[styles.addFavCatPill, newFav.category === cat.key && styles.addFavCatPillActive]} onPress={() => setNewFav(prev => ({ ...prev, category: cat.key }))}>
                  <Text style={styles.addFavCatEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.addFavCatText, newFav.category === cat.key && styles.addFavCatTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.addFavLabel}>Photo (optional)</Text>
            <TouchableOpacity style={styles.addFavPhotoButton} onPress={pickFavPhoto}>
              {newFav.photoUri ? <Image source={{ uri: newFav.photoUri }} style={styles.addFavPhotoPreview} />
                : <View style={styles.addFavPhotoEmpty}><Text style={styles.addFavPhotoEmoji}>📷</Text><Text style={styles.addFavPhotoText}>Add a photo</Text></View>}
            </TouchableOpacity>
            <Text style={styles.addFavLabel}>Name</Text>
            <TextInput style={styles.addFavInput}
              placeholder={newFav.category === 'song' ? 'Song name and artist...' : newFav.category === 'movie' ? 'Movie or TV show name...' : newFav.category === 'book' ? 'Book title and author...' : newFav.category === 'restaurant' ? 'Restaurant name and location...' : newFav.category === 'recipe' ? 'Recipe name...' : 'Place name...'}
              placeholderTextColor="#555555" value={newFav.name} onChangeText={text => setNewFav(prev => ({ ...prev, name: text }))} />
            <Text style={styles.addFavLabel}>Rating: {(newFav.rating || 0) > 0 ? `${newFav.rating}/10` : 'tap to rate'}</Text>
            <View style={styles.addFavRatingRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity key={n} style={[styles.addFavRatingButton, (newFav.rating || 0) >= n && styles.addFavRatingButtonActive]} onPress={() => setNewFav(prev => ({ ...prev, rating: n }))}>
                  <Text style={[styles.addFavRatingText, (newFav.rating || 0) >= n && styles.addFavRatingTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.addFavLabel}>Note (optional)</Text>
            <TextInput style={[styles.addFavInput, { minHeight: 80 }]} placeholder="Why does this mean something to you?" placeholderTextColor="#555555" multiline value={newFav.note} onChangeText={text => setNewFav(prev => ({ ...prev, note: text }))} />
            <TouchableOpacity style={styles.addFavSave} onPress={addFavourite}><Text style={styles.addFavSaveText}>Save to Favourites</Text></TouchableOpacity>
            <TouchableOpacity style={styles.addFavCancel} onPress={() => { setNewFav({ category: 'song', name: '', rating: 0, note: '', photoUri: '' }); setShowAddFav(false); }}>
              <Text style={styles.addFavCancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* People tagging modal — with blur */}
      <Modal visible={showPeopleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Who were you with?</Text>
              {(entry.taggedPeople || []).length > 0 && (
                <View style={styles.peopleChipsRow}>
                  {(entry.taggedPeople || []).map(person => (
                    <TouchableOpacity key={person} style={styles.personChipRemovable} onPress={() => removePersonTag(person)}>
                      <Text style={styles.personChipText}>👤 {person}</Text>
                      <Text style={styles.personChipRemove}> ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.peopleInputRow}>
                <TextInput style={styles.peopleTextInput} placeholder="Type a name..." placeholderTextColor="#555555" value={peopleInput} onChangeText={setPeopleInput} autoFocus />
                <TouchableOpacity style={styles.peopleAddButton} onPress={() => addPersonTag(peopleInput)}>
                  <Text style={styles.peopleAddButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              {peopleSuggestions.length > 0 && (
                <View style={styles.peopleSuggestionsBox}>
                  {peopleSuggestions.map(person => (
                    <TouchableOpacity key={person} style={styles.peopleSuggestion} onPress={() => addPersonTag(person)}>
                      <Text style={styles.peopleSuggestionText}>👤 {person}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.saveButton} onPress={() => { if (peopleInput.trim()) addPersonTag(peopleInput); setShowPeopleModal(false); setPeopleInput(''); }}>
                <Text style={styles.saveButtonText}>Done</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowPeopleModal(false); setPeopleInput(''); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Create capsule — full screen, no blur */}
      <Modal visible={showCreateCapsule} animationType="slide">
        <View style={styles.capsuleModal}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.capsuleModalTitle}>Seal a Capsule ✉️</Text>
            <Text style={styles.capsuleModalSubtitle}>Write something for future you. It'll be waiting.</Text>
            <Text style={styles.addFavLabel}>Your message</Text>
            <TextInput style={[styles.addFavInput, { minHeight: 120 }]} placeholder="Dear future me... What do you want to remember? What are you hoping for?" placeholderTextColor="#555555" multiline value={newCapsuleMessage} onChangeText={setNewCapsuleMessage} />
            <Text style={styles.addFavLabel}>Photo (optional)</Text>
            <TouchableOpacity style={styles.addFavPhotoButton} onPress={pickCapsulePhoto}>
              {newCapsulePhoto ? <Image source={{ uri: newCapsulePhoto }} style={styles.addFavPhotoPreview} />
                : <View style={styles.addFavPhotoEmpty}><Text style={styles.addFavPhotoEmoji}>📷</Text><Text style={styles.addFavPhotoText}>Add a photo</Text></View>}
            </TouchableOpacity>
            <Text style={styles.addFavLabel}>Open on</Text>
            <View style={styles.capsuleDatePicker}>
              <View style={styles.capsuleDateColumn}>
                <TouchableOpacity onPress={() => setCapsuleMonth(m => m === 1 ? 12 : m - 1)} style={styles.capsuleDateArrow}><Text style={styles.capsuleDateArrowText}>‹</Text></TouchableOpacity>
                <Text style={styles.capsuleDateValue}>{MONTH_SHORT[capsuleMonth - 1]}</Text>
                <TouchableOpacity onPress={() => setCapsuleMonth(m => m === 12 ? 1 : m + 1)} style={styles.capsuleDateArrow}><Text style={styles.capsuleDateArrowText}>›</Text></TouchableOpacity>
              </View>
              <View style={styles.capsuleDateColumn}>
                <TouchableOpacity onPress={() => setCapsuleDay(d => d === 1 ? capsuleMaxDay : d - 1)} style={styles.capsuleDateArrow}><Text style={styles.capsuleDateArrowText}>‹</Text></TouchableOpacity>
                <Text style={styles.capsuleDateValue}>{capsuleDay}</Text>
                <TouchableOpacity onPress={() => setCapsuleDay(d => d === capsuleMaxDay ? 1 : d + 1)} style={styles.capsuleDateArrow}><Text style={styles.capsuleDateArrowText}>›</Text></TouchableOpacity>
              </View>
              <View style={styles.capsuleDateColumn}>
                <TouchableOpacity onPress={() => setCapsuleYear(y => y - 1)} style={styles.capsuleDateArrow}><Text style={styles.capsuleDateArrowText}>‹</Text></TouchableOpacity>
                <Text style={styles.capsuleDateValue}>{capsuleYear}</Text>
                <TouchableOpacity onPress={() => setCapsuleYear(y => y + 1)} style={styles.capsuleDateArrow}><Text style={styles.capsuleDateArrowText}>›</Text></TouchableOpacity>
              </View>
            </View>
            <Text style={styles.capsuleDatePreview}>Opens on {MONTH_NAMES[capsuleMonth - 1]} {Math.min(capsuleDay, capsuleMaxDay)}, {capsuleYear}</Text>
            <View style={styles.capsuleToggleRow}>
              <Text style={styles.capsuleToggleLabel}>Add to today's entry</Text>
              <Switch
                value={capsuleAddToDay}
                onValueChange={setCapsuleAddToDay}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#4a90d9' }}
                thumbColor="#ffffff"
              />
            </View>
            {capsuleAddToDay && (
              <TextInput
                style={styles.addFavInput}
                placeholder="Why are you writing this today? (optional)"
                placeholderTextColor="rgba(255,255,255,0.35)"
                multiline
                value={capsuleContext}
                onChangeText={setCapsuleContext}
              />
            )}
            <TouchableOpacity style={styles.addFavSave} onPress={createCapsule}><Text style={styles.addFavSaveText}>🔒 Seal Capsule</Text></TouchableOpacity>
            <TouchableOpacity style={styles.addFavCancel} onPress={() => { setNewCapsuleMessage(''); setNewCapsulePhoto(''); setCapsuleAddToDay(false); setCapsuleContext(''); setShowCreateCapsule(false); }}>
              <Text style={styles.addFavCancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Capsule reveal modal — with blur */}
      <Modal visible={revealingCapsule !== null} animationType="fade" transparent>
        <View style={styles.capsuleRevealOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.capsuleRevealBox}>
            <Text style={styles.capsuleRevealEmoji}>🎁</Text>
            <Text style={styles.capsuleRevealTitle}>A message from your past self</Text>
            {revealingCapsule?.createdDate && (
              <Text style={styles.capsuleRevealDate}>Sealed {new Date(revealingCapsule.createdDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            )}
            <ScrollView style={styles.capsuleRevealMessage} showsVerticalScrollIndicator={false}>
              {revealingCapsule?.photoUri ? <Image source={{ uri: revealingCapsule.photoUri }} style={styles.capsuleRevealPhoto} /> : null}
              <Text style={styles.capsuleRevealText}>{revealingCapsule?.message}</Text>
            </ScrollView>
            <View style={styles.capsuleRevealButtons}>
              <TouchableOpacity style={[styles.addFavSave, { flex: 1 }]} onPress={() => revealingCapsule && addCapsuleToDay(revealingCapsule)}>
                <Text style={styles.addFavSaveText}>Add to today's day</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addFavCancel, { flex: 1 }]} onPress={() => setRevealingCapsule(null)}>
                <Text style={styles.addFavCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Text entry modals — with blur */}
      <Modal visible={activeModal !== null && activeModal !== 'song'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {activeModal === 'highlight' && "Today's highlight"}
                {activeModal === 'learned' && "What I learned"}
                {activeModal === 'dayDescription' && "Describe your day"}
                {activeModal === 'songMeaning' && "What it means to you"}
              </Text>
              <TextInput style={styles.textInput} placeholder="Write something for future you..." placeholderTextColor="#555555" multiline value={tempText} onChangeText={setTempText} autoFocus />
              <TouchableOpacity style={styles.saveButton} onPress={saveModal}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setActiveModal(null)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Song modal — with blur */}
      <Modal visible={activeModal === 'song'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Today's song</Text>
              <TextInput style={styles.textInput} placeholder="Song name and artist..." placeholderTextColor="#555555" value={tempText} onChangeText={setTempText} autoFocus />
              <Text style={styles.ratingLabel}>Rating: {tempRating > 0 ? `${tempRating}/10` : 'tap to rate'}</Text>
              <View style={styles.ratingButtons}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <TouchableOpacity key={n} style={[styles.ratingNumberButton, n <= tempRating && styles.ratingNumberButtonActive]} onPress={() => setTempRating(n)}>
                    <Text style={[styles.ratingNumberText, n <= tempRating && styles.ratingNumberTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={saveModal}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setActiveModal(null)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Full screen image */}
      <Modal visible={fullScreenUri !== null && selectedDay === null} transparent animationType="fade">
        <TouchableOpacity style={styles.fullScreenOverlay} activeOpacity={1} onPress={() => setFullScreenUri(null)}>
          {fullScreenUri && <Image source={{ uri: fullScreenUri }} style={styles.fullScreenImage} resizeMode="contain" />}
          <Text style={styles.fullScreenDismiss}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#1a4fd4' },
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 12, backgroundColor: '#1a4fd4' },
  headerTitle: { fontSize: 34, fontWeight: 'bold', color: '#ffffff', marginBottom: 2, textAlign: 'center' },
  headerDate: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 16, letterSpacing: -0.5, textAlign: 'center' },
  tabSwitcher: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#ffffff' },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  tabButtonTextActive: { color: '#1a4fd4' },
  subHeader: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },
  photoSection: { marginHorizontal: 16, marginBottom: 16 },
  photoCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  todayPhoto: { width: '100%', height: 240 },
  photoEditOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, alignItems: 'center' },
  photoEditText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  photoPlaceholder: { padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 16, borderStyle: 'dashed' },
  photoPlaceholderEmoji: { fontSize: 36, marginBottom: 10 },
  photoPlaceholderTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 6 },
  photoPlaceholderSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  extraStrip: { marginTop: 10 },
  extraStripContent: { gap: 8, paddingRight: 8 },
  extraPhoto: { width: 80, height: 80, borderRadius: 10 },
  addExtraButton: { width: 80, height: 80, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' },
  addExtraText: { color: '#4a90d9', fontSize: 28, fontWeight: '300' },
  row: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 12 },
  moodCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  weatherCard: { width: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center' },
  cardLabel: { fontSize: 10, color: '#4a90d9', fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  moodRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  moodButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  moodButtonActive: { backgroundColor: '#4a90d9' },
  moodEmoji: { fontSize: 17 },
  moodSelected: { fontSize: 11, color: '#4a90d9', fontWeight: '600', marginBottom: 8 },
  moodPrompt: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 },
  dayDescButton: { marginTop: 4, padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 },
  dayDescText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 18 },
  dayDescPlaceholder: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  weatherContent: { alignItems: 'center' },
  weatherEmoji: { fontSize: 28, marginBottom: 4 },
  weatherTemp: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 2 },
  weatherDesc: { fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  voiceCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  voicePrompt: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 14 },
  selfieSectionToday: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden', height: 200 },
  selfiePhotoToday: { width: '100%', height: '100%' },
  selfiePlaceholderToday: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8, height: 200 },
  selfiePlaceholderEmoji: { fontSize: 32 },
  selfiePlaceholderText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '500' },
  daySelfiePhoto: { width: '100%', height: 240, marginBottom: 2 },
  featuredCard: { marginHorizontal: 16, marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', minHeight: 140 },
  featuredCardLabel: { fontSize: 10, color: '#4a90d9', fontWeight: '800', letterSpacing: 2, marginBottom: 14 },
  featuredPromptText: { fontSize: 22, fontWeight: '700', color: '#ffffff', lineHeight: 30, marginBottom: 16, letterSpacing: -0.3 },
  featuredAnswer: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', lineHeight: 24 },
  featuredAddText: { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '500' },
  compactCard: { marginHorizontal: 16, marginBottom: 22, paddingVertical: 16, paddingHorizontal: 18, borderLeftWidth: 3, borderLeftColor: 'rgba(74,144,217,0.6)', borderTopRightRadius: 8, borderBottomRightRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  voiceRecordButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, gap: 10 },
  voiceRecordButtonActive: { backgroundColor: '#3a1a1a', borderWidth: 1, borderColor: '#ff4444' },
  voiceRecordEmoji: { fontSize: 22 },
  voiceRecordText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4444' },
  voiceControls: { gap: 10 },
  voicePlayButton: { backgroundColor: '#4a90d9', borderRadius: 12, padding: 12, alignItems: 'center' },
  voicePlayText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  voiceRerecordButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 12, padding: 12, alignItems: 'center' },
  voiceRerecordText: { color: 'rgba(255,255,255,0.35)', fontSize: 14 },
  entryCard: { marginHorizontal: 16, marginBottom: 22, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  entryPrompt: { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 10, lineHeight: 22 },
  entryAnswer: { fontSize: 15, color: '#ffffff', fontStyle: 'italic', lineHeight: 22, marginTop: 4 },
  entryAddText: { color: '#4a90d9', fontSize: 14, fontWeight: '600', marginTop: 4 },
  songName: { fontSize: 16, color: '#ffffff', fontWeight: '600', marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  ratingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  ratingDotFilled: { backgroundColor: '#4a90d9' },
  ratingNumber: { fontSize: 13, color: '#4a90d9', fontWeight: '600', marginLeft: 4 },
  peopleChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  personChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74,144,217,0.15)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  personChipRemovable: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74,144,217,0.15)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  personChipText: { color: '#4a90d9', fontSize: 13, fontWeight: '600' },
  personChipRemove: { color: '#4a90d9', fontSize: 12, fontWeight: '600' },
  peopleInputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  peopleTextInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, color: '#ffffff', fontSize: 16 },
  peopleAddButton: { backgroundColor: '#4a90d9', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  peopleAddButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  peopleSuggestionsBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, marginBottom: 12, overflow: 'hidden' },
  peopleSuggestion: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.4)' },
  peopleSuggestionText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 4, letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginBottom: 14 },
  notificationCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  notificationEmoji: { fontSize: 28, marginRight: 14 },
  notificationText: { flex: 1 },
  notificationTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  notificationSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 18 },
  notificationToggle: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 },
  notificationToggleOn: { backgroundColor: '#4a90d9' },
  notificationToggleText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  capsuleReadySection: { marginBottom: 12 },
  capsuleReadyLabel: { fontSize: 11, color: '#f5c842', fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  capsuleReadyCard: { backgroundColor: 'rgba(245,200,66,0.1)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(245,200,66,0.4)', flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  capsuleReadyEmoji: { fontSize: 28, marginRight: 12 },
  capsuleCardInfo: { flex: 1 },
  capsuleReadyTitle: { fontSize: 15, fontWeight: '600', color: '#f5c842', marginBottom: 2 },
  capsuleReadyDate: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  capsuleArrow: { color: '#f5c842', fontSize: 16, marginLeft: 8 },
  capsuleSealedCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  capsuleSealedEmoji: { fontSize: 24, marginRight: 12 },
  capsuleSealedTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  capsuleSealedDate: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  createCapsuleButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed', borderRadius: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 },
  createCapsuleEmoji: { fontSize: 20 },
  createCapsuleText: { color: '#4a90d9', fontSize: 15, fontWeight: '600' },
  capsuleModal: { flex: 1, backgroundColor: '#1a4fd4', padding: 24, paddingTop: 60 },
  capsuleModalTitle: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 8, letterSpacing: -0.5 },
  capsuleModalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginBottom: 24 },
  capsuleDatePicker: { flexDirection: 'row', gap: 12, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  capsuleDateColumn: { flex: 1, alignItems: 'center', gap: 8 },
  capsuleDateArrow: { padding: 4 },
  capsuleDateArrowText: { color: '#4a90d9', fontSize: 26, fontWeight: '300' },
  capsuleDateValue: { fontSize: 18, fontWeight: '700', color: '#ffffff', minWidth: 50, textAlign: 'center' },
  capsuleDatePreview: { fontSize: 13, color: '#4a90d9', textAlign: 'center', marginBottom: 24 },
  capsuleRevealOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  capsuleRevealBox: { backgroundColor: 'rgba(14,18,26,0.98)', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', width: '100%', maxHeight: '85%' },
  capsuleRevealEmoji: { fontSize: 48, marginBottom: 12 },
  capsuleRevealTitle: { fontSize: 20, fontWeight: '800', color: '#f5c842', marginBottom: 4, textAlign: 'center' },
  capsuleRevealDate: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 },
  capsuleRevealMessage: { width: '100%', marginBottom: 24, maxHeight: 260 },
  capsuleRevealPhoto: { width: '100%', height: 160, borderRadius: 14, marginBottom: 16 },
  capsuleRevealText: { fontSize: 16, color: '#ffffff', lineHeight: 26, fontStyle: 'italic', textAlign: 'center' },
  yearPickerStrip: { maxHeight: 56 },
  yearPickerContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  yearPickerItem: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  yearPickerItemActive: { backgroundColor: '#4a90d9', borderColor: 'rgba(255,255,255,0.4)' },
  yearPickerText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },
  yearPickerTextActive: { color: '#ffffff' },
  archiveCalSubtitle: { paddingHorizontal: 16, paddingVertical: 8 },
  archiveCalSubtitleText: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },
  calendarMonth: { paddingHorizontal: 16, marginBottom: 32 },
  calendarMonthTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  calendarDayHeaders: { flexDirection: 'row', marginBottom: 6 },
  calendarDayHeader: { width: THUMB_SIZE, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: THUMB_SIZE, height: THUMB_SIZE, padding: 2 },
  calendarCellFilled: { flex: 1, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  calendarThumb: { width: '100%', height: '100%', position: 'absolute' },
  calendarMoodCell: { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  calendarMoodEmoji: { fontSize: 18 },
  calendarDayNumber: { position: 'absolute', bottom: 2, right: 3, fontSize: 11, color: '#4a90d9', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  calendarCellEmpty: { flex: 1, borderRadius: 6, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  calendarDayNumberEmpty: { fontSize: 11, color: 'rgba(255,255,255,0.2)' },
  emptyState: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 22 },
  favFilterStrip: { maxHeight: 56 },
  favFilterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  favFilterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  favFilterPillActive: { backgroundColor: '#4a90d9', borderColor: 'rgba(255,255,255,0.4)' },
  favFilterEmoji: { fontSize: 14 },
  favFilterText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  favFilterTextActive: { color: '#ffffff' },
  favGrid: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  favCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', flexDirection: 'row' },
  favPhoto: { width: 100, height: 100 },
  favPhotoEmpty: { width: 100, height: 100, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  favCategoryEmoji: { fontSize: 32 },
  favInfo: { flex: 1, padding: 14, justifyContent: 'center' },
  favInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  favCategoryTag: { fontSize: 11, color: '#4a90d9', fontWeight: '700' },
  favRatingTag: { fontSize: 12, color: '#4a90d9', fontWeight: '700' },
  favName: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  favNote: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginBottom: 4, lineHeight: 18 },
  favDate: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  addFavButton: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4a90d9', justifyContent: 'center', alignItems: 'center', shadowColor: '#4a90d9', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  addFavButtonText: { color: '#ffffff', fontSize: 28, fontWeight: '300' },
  favDetailOverlay: { flex: 1, justifyContent: 'flex-end' },
  favDetailBox: { backgroundColor: 'rgba(14,18,26,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  favDetailPhoto: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16 },
  favDetailPhotoEmpty: { width: '100%', height: 120, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  favDetailEmoji: { fontSize: 48 },
  favDetailInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  favDetailCategory: { fontSize: 13, color: '#4a90d9', fontWeight: '700' },
  favDetailRating: { fontSize: 16, fontWeight: '800', color: '#4a90d9' },
  favDetailName: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 8, letterSpacing: -0.3 },
  favDetailNote: { fontSize: 15, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 22, marginBottom: 8 },
  favDetailDate: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 },
  favDetailDelete: { alignItems: 'center', padding: 12 },
  favDetailDeleteText: { color: '#ff4444', fontSize: 14 },
  addFavModal: { flex: 1, backgroundColor: '#1a4fd4', padding: 24, paddingTop: 60 },
  addFavTitle: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 24, letterSpacing: -0.5 },
  addFavLabel: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginBottom: 10, marginTop: 16 },
  addFavCategoryRow: { gap: 8, paddingBottom: 4 },
  addFavCatPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  addFavCatPillActive: { backgroundColor: '#4a90d9', borderColor: 'rgba(255,255,255,0.4)' },
  addFavCatEmoji: { fontSize: 16 },
  addFavCatText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  addFavCatTextActive: { color: '#ffffff' },
  addFavPhotoButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  addFavPhotoPreview: { width: '100%', height: 180, borderRadius: 16 },
  addFavPhotoEmpty: { width: '100%', height: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 8 },
  addFavPhotoEmoji: { fontSize: 28 },
  addFavPhotoText: { color: 'rgba(255,255,255,0.35)', fontSize: 14 },
  addFavInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  addFavRatingRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  addFavRatingButton: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  addFavRatingButtonActive: { backgroundColor: '#4a90d9', borderColor: 'rgba(255,255,255,0.4)' },
  addFavRatingText: { color: 'rgba(255,255,255,0.35)', fontWeight: '600', fontSize: 14 },
  addFavRatingTextActive: { color: '#ffffff' },
  addFavSave: { backgroundColor: '#4a90d9', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 12 },
  addFavSaveText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  addFavCancel: { alignItems: 'center', padding: 12, marginBottom: 40 },
  addFavCancelText: { color: 'rgba(255,255,255,0.35)', fontSize: 15 },
  dayModal: { flex: 1, backgroundColor: '#1a4fd4' },
  dayModalPhoto: { width: '100%', height: 300 },
  photoTapHint: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, alignItems: 'center' },
  photoTapHintText: { color: '#ffffff', fontSize: 12 },
  dayModalContent: { padding: 24, paddingBottom: 100 },
  dayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  dayYearBadge: { backgroundColor: '#4a90d9', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 16 },
  dayYearBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  dayDateText: { fontSize: 16, fontWeight: '700', color: '#ffffff', flex: 1, flexWrap: 'wrap' },
  dayModalRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  dayModalChip: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  dayModalChipText: { fontSize: 14, color: '#ffffff' },
  dayModalDescription: { fontSize: 17, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: 20, lineHeight: 26 },
  dayModalSection: { marginBottom: 20 },
  dayModalLabel: { fontSize: 10, color: '#4a90d9', fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  dayModalText: { fontSize: 16, color: '#ffffff', lineHeight: 24 },
  dayModalSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 },
  dayModalExtraPhoto: { width: 120, height: 120, borderRadius: 10, marginRight: 8 },
  dayModalClose: { margin: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, alignItems: 'center' },
  dayModalCloseText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: 'rgba(10,14,22,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 16, letterSpacing: -0.3 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  ratingLabel: { fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 12 },
  ratingButtons: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  ratingNumberButton: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  ratingNumberButtonActive: { backgroundColor: '#4a90d9' },
  ratingNumberText: { color: 'rgba(255,255,255,0.35)', fontWeight: '600', fontSize: 14 },
  ratingNumberTextActive: { color: '#ffffff' },
  saveButton: { backgroundColor: '#4a90d9', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  cancelButton: { alignItems: 'center', padding: 10 },
  cancelButtonText: { color: 'rgba(255,255,255,0.35)', fontSize: 15 },
  fullScreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: '100%', height: '85%' },
  fullScreenDismiss: { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 16 },
  capsuleOpenedRecord: { backgroundColor: 'rgba(245,200,66,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(245,200,66,0.3)', marginBottom: 8 },
  capsuleSealedRecord: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  capsuleRecordMeta: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 6 },
  capsuleRecordContext: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 20 },
  capsuleOpenedMessage: { fontSize: 15, color: '#ffffff', fontStyle: 'italic', lineHeight: 22 },
  capsuleOpenedPhoto: { width: '100%', height: 160, borderRadius: 10, marginTop: 10 },
  capsuleToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 },
  capsuleToggleLabel: { fontSize: 15, color: '#ffffff', fontWeight: '600' },
  capsuleRevealButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
});