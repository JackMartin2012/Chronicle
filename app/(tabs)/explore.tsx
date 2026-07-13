import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold, useFonts } from '@expo-google-fonts/space-grotesk';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DayCard from '../../components/DayCard';

const { width } = Dimensions.get('window');
const CAL_SLOT_WIDTH = Math.floor((width - 32) / 7);

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  pairSelfieUri: string;
  threeWords: string[];
  dailyQuestion: string;
  dailyAnswer: string;
  reflectionQuestion: string;
  reflectionAnswer: string;
  cookedDish: string;
  cookedPhotoUri: string;
  watched: string;
  locations: { name: string; withWho?: string }[];
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
  songName: '', songRating: 0, songMeaning: '', withWho: '', taggedPeople: [], voiceMemoUri: '',
  openedCapsules: [], sealedCapsules: [],
  pairSelfieUri: '', threeWords: [], dailyQuestion: '', dailyAnswer: '',
  reflectionQuestion: '', reflectionAnswer: '', cookedDish: '', cookedPhotoUri: '',
  watched: '', locations: [],
};

const normaliseEntry = (parsed: any): DayEntry => ({
  ...emptyEntry,
  ...parsed,
  extraPhotos: parsed.extraPhotos || [],
  taggedPeople: parsed.taggedPeople || [],
  openedCapsules: parsed.openedCapsules || [],
  sealedCapsules: parsed.sealedCapsules || [],
  threeWords: parsed.threeWords || [],
  locations: parsed.locations || [],
});

const MOODS = ['😞', '😐', '🙂', '😊', '🤩'];

const dailyQuestions = [
  "What did you eat today that you'd eat again?",
  "What's one conversation you had today?",
  'What did today smell like?',
  'What made you laugh today?',
  "What did you see today that you'd photograph again?",
  'Who did you think about today?',
  "What's something small that went right?",
  'Where were you at 3pm today?',
  'What would you redo about today?',
  'What did you put off today?',
  'What surprised you today?',
  "What's the most ordinary thing you did today?",
];

const reflectionQuestions = [
  'What are you looking forward to right now?',
  'What are you waiting to hear back about?',
  "What's worrying you at the moment?",
  'What are you working towards?',
  'What do you hope is different in a year?',
  "What's about to change?",
];

const getSeededPrompt = (dateKey: string, prompts: string[], offset = 0) => {
  const parts = dateKey.split('-');
  const seed = parseInt(parts[0]) * 1000 + parseInt(parts[1]) * 31 + parseInt(parts[2]) + offset;
  return prompts[seed % prompts.length];
};

const favCategories = [
  { key: 'all', label: 'All', emoji: '⭐' },
  { key: 'song', label: 'Song', emoji: '🎵' },
  { key: 'movie', label: 'Movie / TV', emoji: '🎬' },
  { key: 'book', label: 'Book', emoji: '📚' },
  { key: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { key: 'recipe', label: 'Recipe', emoji: '🍳' },
  { key: 'place', label: 'Place', emoji: '📍' },
];

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

// ── MOOD SLIDER ──────────────────────────────────────────────────────────────
const THUMB_W = 44;

const MoodSlider = ({ value, onChange }: { value: string; onChange: (emoji: string) => void }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const trackWidthRef = useRef(0);
  const lastIndex = useRef(-1);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const thumbScale = useRef(new Animated.Value(1)).current;

  const indexFromX = (x: number) => {
    const usable = trackWidthRef.current - THUMB_W;
    if (usable <= 0) return 0;
    return Math.min(4, Math.max(0, Math.round((x - THUMB_W / 2) / (usable / 4))));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        Animated.spring(thumbScale, { toValue: 1.3, useNativeDriver: true, speed: 40 }).start();
        const idx = indexFromX(e.nativeEvent.locationX);
        lastIndex.current = idx;
        Haptics.selectionAsync();
        setDragIndex(idx);
      },
      onPanResponderMove: (e) => {
        const idx = indexFromX(e.nativeEvent.locationX);
        if (idx !== lastIndex.current) {
          lastIndex.current = idx;
          Haptics.selectionAsync();
          setDragIndex(idx);
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(thumbScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
        if (lastIndex.current >= 0) onChangeRef.current(MOODS[lastIndex.current]);
        setDragIndex(null);
      },
      onPanResponderTerminate: () => {
        Animated.spring(thumbScale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
        setDragIndex(null);
      },
    })
  ).current;

  const valueIndex = MOODS.indexOf(value === '😔' ? '😞' : value);
  const displayIndex = dragIndex !== null ? dragIndex : valueIndex;
  const usable = Math.max(0, trackWidth - THUMB_W);
  const thumbLeft = displayIndex >= 0 ? (displayIndex * usable) / 4 : usable / 2;

  return (
    <View
      style={sliderStyles.track}
      onLayout={e => { setTrackWidth(e.nativeEvent.layout.width); trackWidthRef.current = e.nativeEvent.layout.width; }}
      {...pan.panHandlers}
    >
      <View style={sliderStyles.stopsRow} pointerEvents="none">
        {MOODS.map((m, i) => (
          <Text key={m} style={[sliderStyles.stopEmoji, i === displayIndex && { opacity: 0 }]}>{m}</Text>
        ))}
      </View>
      {displayIndex >= 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[sliderStyles.thumb, { left: thumbLeft, transform: [{ scale: thumbScale }] }]}
        >
          <Text style={sliderStyles.thumbEmoji}>{MOODS[displayIndex]}</Text>
        </Animated.View>
      ) : (
        <Text style={sliderStyles.hint} pointerEvents="none">slide to set your mood</Text>
      )}
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  track: { height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', marginTop: 4 },
  stopsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  stopEmoji: { fontSize: 20, opacity: 0.35 },
  thumb: { position: 'absolute', width: THUMB_W, height: THUMB_W, borderRadius: THUMB_W / 2, backgroundColor: 'rgba(74,144,217,0.25)', borderWidth: 1, borderColor: 'rgba(74,144,217,0.5)', justifyContent: 'center', alignItems: 'center', top: 2 },
  thumbEmoji: { fontSize: 26 },
  hint: { position: 'absolute', alignSelf: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)' },
});

export default function ThePresent() {
  const [fontsLoaded] = useFonts({ SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
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
  const [archiveCalYear, setArchiveCalYear] = useState('');
  const [dayCardKey, setDayCardKey] = useState<string | null>(null);

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
  const [revealPhase, setRevealPhase] = useState<'capsule' | 'content'>('capsule');
  const revealScale = useRef(new Animated.Value(0.6)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const [newCapsuleMessage, setNewCapsuleMessage] = useState('');
  const [newCapsulePhoto, setNewCapsulePhoto] = useState('');
  const [capsuleDay, setCapsuleDay] = useState(new Date().getDate());
  const [capsuleMonth, setCapsuleMonth] = useState(new Date().getMonth() + 1);
  const [capsuleYear, setCapsuleYear] = useState(new Date().getFullYear() + 1);
  const [capsuleAddToDay, setCapsuleAddToDay] = useState(false);
  const [capsuleContext, setCapsuleContext] = useState('');

  // Capture pair + new field local state
  const [pairSwapped, setPairSwapped] = useState(false);
  const [threeWordsLocal, setThreeWordsLocal] = useState<string[]>(['', '', '']);
  const [dailyAnswerLocal, setDailyAnswerLocal] = useState('');
  const [reflectionAnswerLocal, setReflectionAnswerLocal] = useState('');
  const [watchedLocal, setWatchedLocal] = useState('');
  const [cookedDishLocal, setCookedDishLocal] = useState('');
  const [writeOpen, setWriteOpen] = useState(false);
  const [dayDescLocal, setDayDescLocal] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locName, setLocName] = useState('');
  const [locWith, setLocWith] = useState('');
  const [savedToday, setSavedToday] = useState(false);

  // In-app cameras
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [photoCameraOpen, setPhotoCameraOpen] = useState(false);
  const [photoCameraMode, setPhotoCameraMode] = useState<'today' | 'extra' | 'pair' | 'cooked'>('today');
  const [photoCameraFacing, setPhotoCameraFacing] = useState<'front' | 'back'>('back');
  const [photoCaptured, setPhotoCaptured] = useState<string | null>(null);
  const [photoCapturing, setPhotoCapturing] = useState(false);
  const photoCameraRef = useRef<CameraView>(null);
  const photoShutterScale = useRef(new Animated.Value(1)).current;

  const [capsuleCameraOpen, setCapsuleCameraOpen] = useState(false);
  const [capsuleCameraPreview, setCapsuleCameraPreview] = useState<string | null>(null);
  const [capsuleCameraFacing, setCapsuleCameraFacing] = useState<'front' | 'back'>('back');
  const [capsuleCameraCapturing, setCapsuleCameraCapturing] = useState(false);
  const capsuleCameraRef = useRef<CameraView>(null);

  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayKey = formatDateKey(today);
  const dailyQuestion = getSeededPrompt(todayKey, dailyQuestions);
  const reflectionQuestion = getSeededPrompt(todayKey, reflectionQuestions, 7);

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

  const recipeSavedToday = favourites.some(f =>
    f.category === 'recipe' && f.dateKey === todayKey && f.name === (cookedDishLocal || '').trim()
  );

  useEffect(() => {
    loadEntry(); checkNotificationStatus(); fetchWeather();
    loadFavourites(); loadCapsules(); loadKnownPeople();
  }, []);

  useEffect(() => { if (activeTab === 'archive' && archivedDays.length === 0) loadArchive(); }, [activeTab]);

  useEffect(() => {
    if (archivedDays.length > 0 && !archiveCalYear) {
      setArchiveCalYear(archivedDays[0].key.split('-')[0]);
    }
  }, [archivedDays]);

  useEffect(() => { return () => { if (sound) sound.unloadAsync(); }; }, [sound]);

  // Capsule reveal — anticipation animation
  useEffect(() => {
    if (revealingCapsule) {
      setRevealPhase('capsule');
      revealScale.setValue(0.6);
      revealOpacity.setValue(0);
      Animated.spring(revealScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 12 }).start();
      const t = setTimeout(() => {
        setRevealPhase('content');
        Animated.timing(revealOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [revealingCapsule]);

  // ── ENTRY LOAD / SAVE ────────────────────────────────────────────────────

  const loadEntry = async () => {
    const saved = await AsyncStorage.getItem(`day_entry_${todayKey}`);
    if (saved) {
      const parsed = normaliseEntry(JSON.parse(saved));
      setEntry(parsed);
      setThreeWordsLocal([parsed.threeWords[0] || '', parsed.threeWords[1] || '', parsed.threeWords[2] || '']);
      setDailyAnswerLocal(parsed.dailyAnswer || '');
      setReflectionAnswerLocal(parsed.reflectionAnswer || '');
      setWatchedLocal(parsed.watched || '');
      setCookedDishLocal(parsed.cookedDish || '');
      setDayDescLocal(parsed.dayDescription || '');
    }
    const savedFlag = await AsyncStorage.getItem(`saved_day_${todayKey}`);
    setSavedToday(savedFlag === 'true');
  };

  const updateEntry = (patch: Partial<DayEntry>) => {
    setEntry(prev => {
      const updated = { ...prev, ...patch };
      AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(updated));
      return updated;
    });
  };

  const saveThreeWords = () => {
    const words = threeWordsLocal.map(w => w.trim());
    updateEntry({ threeWords: words.some(Boolean) ? words : [] });
  };

  const loadArchive = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const dayKeys = keys.filter(k => k.startsWith('day_entry_')).sort().reverse();
    if (dayKeys.length === 0) { setArchivedDays([]); return; }
    const results = await AsyncStorage.multiGet(dayKeys);
    const days: { key: string; entry: DayEntry }[] = [];
    for (const [key, val] of results) {
      if (val) {
        const parsed = JSON.parse(val);
        const hasContent = parsed.photoUri || parsed.mood || parsed.highlight || parsed.learned ||
          parsed.songName || parsed.dayDescription || parsed.dailyAnswer || parsed.reflectionAnswer ||
          parsed.watched || parsed.cookedDish || parsed.pairSelfieUri || parsed.voiceMemoUri ||
          (parsed.threeWords || []).some(Boolean) || (parsed.locations || []).length > 0;
        if (hasContent) {
          days.push({ key: key.replace('day_entry_', ''), entry: normaliseEntry(parsed) });
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
      const existing = saved2 ? normaliseEntry(JSON.parse(saved2)) : emptyEntry;
      const updated = { ...existing, weatherEmoji: weather.emoji, weatherDescription: weather.description, weatherTemp: weather.temp };
      setEntry(updated);
      await AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(updated));
    } catch (e) { console.log('Weather error:', e); }
    setWeatherLoading(false);
  };

  // ── CAMERAS & PHOTOS ─────────────────────────────────────────────────────

  const onPhotoShutterPressIn = () => Animated.spring(photoShutterScale, { toValue: 0.88, useNativeDriver: true, speed: 40 }).start();
  const onPhotoShutterPressOut = () => Animated.spring(photoShutterScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 14 }).start();

  const openPhotoCamera = async (mode: 'today' | 'extra' | 'pair' | 'cooked') => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Camera access needed', 'Allow camera access in Settings to take a photo.');
        return;
      }
    }
    setPhotoCameraMode(mode);
    setPhotoCameraFacing(mode === 'pair' ? 'front' : 'back');
    setPhotoCaptured(null);
    setPhotoCameraOpen(true);
  };

  const capturePhoto = async () => {
    if (!photoCameraRef.current || photoCapturing) return;
    setPhotoCapturing(true);
    try {
      const photo = await photoCameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      if (photo?.uri) {
        let uri = photo.uri;
        if (photoCameraFacing === 'front') {
          const flipped = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ flip: ImageManipulator.FlipType.Horizontal }],
            { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = flipped.uri;
        }
        setPhotoCaptured(uri);
      }
    } catch (e) { console.log('Camera error:', e); }
    finally { setPhotoCapturing(false); }
  };

  const usePhotoCaptured = () => {
    if (!photoCaptured) return;
    if (photoCameraMode === 'today') updateEntry({ photoUri: photoCaptured });
    else if (photoCameraMode === 'extra') updateEntry({ extraPhotos: [...entry.extraPhotos, photoCaptured] });
    else if (photoCameraMode === 'pair') updateEntry({ pairSelfieUri: photoCaptured });
    else if (photoCameraMode === 'cooked') updateEntry({ cookedPhotoUri: photoCaptured });
    setPhotoCameraOpen(false);
    setPhotoCaptured(null);
  };

  const pickPhoto = (mode: 'today' | 'extra' | 'pair' | 'cooked') => {
    const titles = { today: "Today's photo", extra: 'Add a photo', pair: 'Your selfie', cooked: 'Dish photo' };
    Alert.alert(titles[mode], 'Choose a photo', [
      { text: 'Take a photo', onPress: () => openPhotoCamera(mode) },
      {
        text: 'Choose from camera roll', onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.85,
            allowsMultipleSelection: mode === 'extra',
          });
          if (!result.canceled && result.assets.length > 0) {
            if (mode === 'extra') updateEntry({ extraPhotos: [...entry.extraPhotos, ...result.assets.map(a => a.uri)] });
            else if (mode === 'today') updateEntry({ photoUri: result.assets[0].uri });
            else if (mode === 'pair') updateEntry({ pairSelfieUri: result.assets[0].uri });
            else if (mode === 'cooked') updateEntry({ cookedPhotoUri: result.assets[0].uri });
          }
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const takeCapsulePhoto = async () => {
    if (!capsuleCameraRef.current || capsuleCameraCapturing) return;
    setCapsuleCameraCapturing(true);
    try {
      const photo = await capsuleCameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      if (photo?.uri) {
        let uri = photo.uri;
        if (capsuleCameraFacing === 'front') {
          const flipped = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ flip: ImageManipulator.FlipType.Horizontal }],
            { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = flipped.uri;
        }
        setCapsuleCameraPreview(uri);
      }
    } catch (e) { console.log('Camera error:', e); }
    finally { setCapsuleCameraCapturing(false); }
  };

  const pickFavPhoto = () => {
    Alert.alert('Add a photo', 'Choose a photo for this entry', [
      {
        text: 'Take a photo', onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
          if (!result.canceled && result.assets[0]) setNewFav(prev => ({ ...prev, photoUri: result.assets[0].uri }));
        }
      },
      {
        text: 'Choose from camera roll', onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
          if (!result.canceled && result.assets[0]) setNewFav(prev => ({ ...prev, photoUri: result.assets[0].uri }));
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickCapsulePhoto = () => {
    Alert.alert('Add a photo', 'Attach a photo to your capsule', [
      {
        text: 'Take a photo', onPress: async () => {
          if (!cameraPermission?.granted) {
            const { granted } = await requestCameraPermission();
            if (!granted) { Alert.alert('Camera access needed', 'Allow camera access in Settings.'); return; }
          }
          setCapsuleCameraFacing('back');
          setCapsuleCameraPreview(null);
          setCapsuleCameraOpen(true);
        }
      },
      {
        text: 'Choose from camera roll', onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
          if (!result.canceled && result.assets[0]) setNewCapsulePhoto(result.assets[0].uri);
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickFavDetailPhoto = async () => {
    if (!selectedFav) return;
    Alert.alert('Add a photo', 'Choose a photo for this favourite', [
      {
        text: 'Take a photo', onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
          if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            const updated = favourites.map(f => f.id === selectedFav.id ? { ...f, photoUri: uri } : f);
            await saveFavourites(updated);
            setSelectedFav({ ...selectedFav, photoUri: uri });
          }
        }
      },
      {
        text: 'Choose from camera roll', onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
          if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            const updated = favourites.map(f => f.id === selectedFav.id ? { ...f, photoUri: uri } : f);
            await saveFavourites(updated);
            setSelectedFav({ ...selectedFav, photoUri: uri });
          }
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── VOICE MEMO ───────────────────────────────────────────────────────────

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
    if (uri) updateEntry({ voiceMemoUri: uri });
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

  // ── MODALS / TAGS / CAPSULES ─────────────────────────────────────────────

  const openModal = (field: string, currentValue: string, currentRating?: number) => {
    setTempText(currentValue); setTempRating(currentRating || 0); setActiveModal(field);
  };

  const saveModal = async () => {
    if (!activeModal) return;
    const patch: Partial<DayEntry> = {};
    if (activeModal === 'song') { patch.songName = tempText; patch.songRating = tempRating; }
    if (activeModal === 'songMeaning') patch.songMeaning = tempText;
    updateEntry(patch);
    setActiveModal(null);
  };

  const addPersonTag = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = entry.taggedPeople || [];
    if (current.includes(trimmed)) { setPeopleInput(''); return; }
    const updated = [...current, trimmed];
    updateEntry({ taggedPeople: updated, withWho: updated.join(', ') });
    if (!knownPeople.includes(trimmed)) setKnownPeople(prev => [...prev, trimmed].sort());
    setPeopleInput('');
  };

  const removePersonTag = (name: string) => {
    const updated = (entry.taggedPeople || []).filter(p => p !== name);
    updateEntry({ taggedPeople: updated, withWho: updated.join(', ') });
  };

  const addLocation = () => {
    const name = locName.trim();
    if (!name) return;
    const loc: { name: string; withWho?: string } = { name };
    if (locWith.trim()) loc.withWho = locWith.trim();
    updateEntry({ locations: [...(entry.locations || []), loc] });
    setLocName('');
    setLocWith('');
    setShowAddLocation(false);
  };

  const removeLocation = (index: number) => {
    updateEntry({ locations: (entry.locations || []).filter((_, i) => i !== index) });
  };

  const saveCookedToRecipes = async () => {
    const dish = cookedDishLocal.trim();
    if (!dish || recipeSavedToday) return;
    const fav: Favourite = {
      id: Date.now().toString(),
      category: 'recipe',
      name: dish,
      rating: 0,
      note: '',
      photoUri: entry.cookedPhotoUri || '',
      dateKey: todayKey,
      displayDate: today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
    await saveFavourites([fav, ...favourites]);
  };

  const saveToday = async () => {
    const finalEntry = { ...entry };
    await AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(finalEntry));
    await AsyncStorage.setItem(`saved_day_${todayKey}`, 'true');
    setSavedToday(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setDayCardKey(todayKey), 350);
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
      const existing = savedEntry ? normaliseEntry(JSON.parse(savedEntry)) : emptyEntry;
      const updatedEntry = {
        ...existing,
        sealedCapsules: [...(existing.sealedCapsules || []), {
          id: capsule.id, openDate: capsule.openDate, context: capsuleContext.trim(),
        }],
      };
      await AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(updatedEntry));
      setEntry(updatedEntry);
    }
    setNewCapsuleMessage(''); setNewCapsulePhoto(''); setCapsuleAddToDay(false); setCapsuleContext('');
    setShowCreateCapsule(false);
    Alert.alert('Sealed! 🔒', `Opens on ${new Date(openDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`);
  };

  const addCapsuleToDay = async (capsule: Capsule) => {
    const updated = capsules.map(c => c.id === capsule.id ? { ...c, opened: true } : c);
    await saveCapsules(updated);
    const savedEntry = await AsyncStorage.getItem(`day_entry_${todayKey}`);
    const existing = savedEntry ? normaliseEntry(JSON.parse(savedEntry)) : emptyEntry;
    const updatedEntry = {
      ...existing,
      openedCapsules: [...(existing.openedCapsules || []), {
        id: capsule.id, message: capsule.message,
        photoUri: capsule.photoUri, createdDate: capsule.createdDate,
      }],
    };
    await AsyncStorage.setItem(`day_entry_${todayKey}`, JSON.stringify(updatedEntry));
    setEntry(updatedEntry);
    setRevealingCapsule(null);
  };

  const daysUntil = (openDate: string) => {
    const target = new Date(openDate + 'T12:00:00').getTime();
    const now = new Date(todayKey + 'T12:00:00').getTime();
    return Math.max(0, Math.round((target - now) / 86400000));
  };

  const checkNotificationStatus = async () => {
    const enabled = await AsyncStorage.getItem('notifications_enabled');
    setNotificationsEnabled(enabled === 'true');
  };

  const enableNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Chronicle needs notification permission.'); return; }
    await AsyncStorage.setItem('notifications_enabled', 'true');
    setNotificationsEnabled(true);
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
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await saveFavourites(favourites.filter(f => f.id !== id));
          setSelectedFav(null);
        }
      },
    ]);
  };

  const filteredFavourites = favFilter === 'all' ? favourites : favourites.filter(f => f.category === favFilter);
  const getCategoryEmoji = (key: string) => favCategories.find(c => c.key === key)?.emoji || '⭐';

  if (!fontsLoaded) return null;

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
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.subHeader}>
            <Text style={styles.headerSubtitle}>Today&apos;s entry becomes tomorrow&apos;s flashback.</Text>
          </View>

          {/* 3.1 THE CAPTURE PAIR */}
          <View style={styles.card}>
            {entry.photoUri || entry.pairSelfieUri ? (
              <View style={styles.pairArea}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={0.9}
                  onPress={() => {
                    const bigUri = pairSwapped && entry.pairSelfieUri ? entry.pairSelfieUri : entry.photoUri;
                    if (!bigUri) { pickPhoto('today'); return; }
                    Alert.alert('Photo', '', [
                      { text: 'View photo', onPress: () => setFullScreenUri(bigUri) },
                      { text: 'Retake', onPress: () => pickPhoto(pairSwapped && entry.pairSelfieUri ? 'pair' : 'today') },
                      { text: 'Remove', style: 'destructive', onPress: () => updateEntry(pairSwapped && entry.pairSelfieUri ? { pairSelfieUri: '' } : { photoUri: '' }) },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}
                >
                  {(pairSwapped && entry.pairSelfieUri ? entry.pairSelfieUri : entry.photoUri) ? (
                    <Image
                      source={{ uri: pairSwapped && entry.pairSelfieUri ? entry.pairSelfieUri : entry.photoUri }}
                      style={styles.pairMainPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.pairMainPlaceholder}>
                      <Text style={{ fontSize: 32 }}>📷</Text>
                      <Text style={styles.pairPlaceholderText}>Add today&apos;s photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {entry.pairSelfieUri || entry.photoUri ? (
                  <TouchableOpacity
                    style={styles.pairInset}
                    activeOpacity={0.9}
                    onPress={() => {
                      const insetUri = pairSwapped ? entry.photoUri : entry.pairSelfieUri;
                      if (insetUri) setPairSwapped(s => !s);
                      else pickPhoto(pairSwapped ? 'today' : 'pair');
                    }}
                  >
                    {(pairSwapped ? entry.photoUri : entry.pairSelfieUri) ? (
                      <Image
                        source={{ uri: pairSwapped ? entry.photoUri : entry.pairSelfieUri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.pairInsetPlaceholder}>
                        <Text style={{ fontSize: 20 }}>🤳</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={styles.pairPromptRow}>
                <TouchableOpacity style={styles.pairPrompt} onPress={() => pickPhoto('today')}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={styles.pairPromptText}>Today&apos;s photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pairPrompt} onPress={() => pickPhoto('pair')}>
                  <Text style={{ fontSize: 28 }}>🤳</Text>
                  <Text style={styles.pairPromptText}>Add a selfie</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.extraStrip}>
              {entry.extraPhotos.map((uri, index) => (
                <TouchableOpacity key={index} onPress={() => {
                  Alert.alert('Photo', '', [
                    { text: 'View photo', onPress: () => setFullScreenUri(uri) },
                    { text: 'Remove photo', onPress: () => updateEntry({ extraPhotos: entry.extraPhotos.filter((_, i) => i !== index) }), style: 'destructive' },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}>
                  <Image source={{ uri }} style={styles.extraPhoto} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addExtraTile} onPress={() => pickPhoto('extra')}>
                <Text style={styles.addExtraText}>+</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.viewAllSelfies} onPress={() => router.push('/(tabs)/selfie')}>
              <Text style={styles.viewAllSelfiesText}>View all selfies →</Text>
            </TouchableOpacity>
          </View>

          {/* 3.2 MOOD SLIDER */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>MOOD</Text>
            <MoodSlider value={entry.mood} onChange={emoji => updateEntry({ mood: emoji })} />
          </View>

          {/* 3.3 THREE WORDS */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TODAY IN THREE WORDS</Text>
            <View style={styles.wordsRow}>
              {[0, 1, 2].map(i => (
                <TextInput
                  key={i}
                  style={[styles.wordChip, !!threeWordsLocal[i]?.trim() && styles.wordChipFilled]}
                  placeholder="word"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  maxLength={16}
                  value={threeWordsLocal[i]}
                  onChangeText={text => setThreeWordsLocal(prev => prev.map((w, j) => j === i ? text : w))}
                  onBlur={saveThreeWords}
                />
              ))}
            </View>
          </View>

          {/* 3.4 TODAY'S QUESTION */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TODAY&apos;S QUESTION</Text>
            <Text style={styles.questionText}>{dailyQuestion}</Text>
            <TextInput
              style={styles.questionInput}
              placeholder="Your answer..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              value={dailyAnswerLocal}
              onChangeText={setDailyAnswerLocal}
              onBlur={() => updateEntry({ dailyQuestion, dailyAnswer: dailyAnswerLocal })}
            />
          </View>

          {/* 3.5 REFLECTION — FOR FUTURE YOU */}
          <View style={[styles.card, styles.reflectionCard]}>
            <Text style={styles.cardLabel}>FOR FUTURE YOU</Text>
            <Text style={styles.questionText}>{reflectionQuestion}</Text>
            <TextInput
              style={styles.questionInput}
              placeholder="Future you will read this..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              value={reflectionAnswerLocal}
              onChangeText={setReflectionAnswerLocal}
              onBlur={() => updateEntry({ reflectionQuestion, reflectionAnswer: reflectionAnswerLocal })}
            />
          </View>

          {/* 3.6 YOUR DAY — write or speak */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>YOUR DAY</Text>
            <View style={styles.dayActionsRow}>
              <TouchableOpacity
                style={[styles.dayActionBtn, writeOpen && styles.dayActionBtnActive]}
                onPress={() => setWriteOpen(o => !o)}
              >
                <Text style={styles.dayActionText}>✍️ Write</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dayActionBtn, isRecording && styles.dayActionBtnRecording]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Text style={styles.dayActionText}>{isRecording ? '⏹ Stop' : '🎙 Speak'}</Text>
              </TouchableOpacity>
            </View>
            {isRecording && (
              <View style={styles.recordingRow}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording... tap Stop when done</Text>
              </View>
            )}
            {(writeOpen || !!dayDescLocal) && (
              <TextInput
                style={styles.questionInput}
                placeholder="Tell future you about today..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                value={dayDescLocal}
                onChangeText={setDayDescLocal}
                onBlur={() => updateEntry({ dayDescription: dayDescLocal })}
              />
            )}
            {!!entry.voiceMemoUri && !isRecording && (
              <TouchableOpacity style={styles.voicePlayRow} onPress={() => playVoiceMemo()}>
                <Ionicons name={isPlaying ? 'stop' : 'play'} size={16} color="#4a90d9" />
                <Text style={styles.voicePlayText}>{isPlaying ? 'Playing...' : 'Play voice memo'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 3.7 WHAT I COOKED */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>WHAT I COOKED</Text>
            <View style={styles.cookedRow}>
              <TextInput
                style={[styles.inlineInput, { flex: 1 }]}
                placeholder="Dish name..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={cookedDishLocal}
                onChangeText={setCookedDishLocal}
                onBlur={() => updateEntry({ cookedDish: cookedDishLocal.trim() })}
              />
              <TouchableOpacity style={styles.cookedPhotoSlot} onPress={() => pickPhoto('cooked')}>
                {entry.cookedPhotoUri ? (
                  <Image source={{ uri: entry.cookedPhotoUri }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                ) : (
                  <Ionicons name="camera-outline" size={20} color="rgba(255,255,255,0.35)" />
                )}
              </TouchableOpacity>
            </View>
            {!!cookedDishLocal.trim() && (
              <TouchableOpacity
                style={[styles.recipeSaveBtn, recipeSavedToday && styles.recipeSaveBtnDone]}
                onPress={saveCookedToRecipes}
                disabled={recipeSavedToday}
              >
                <Text style={[styles.recipeSaveText, recipeSavedToday && { color: 'rgba(255,255,255,0.5)' }]}>
                  {recipeSavedToday ? 'Saved ✓' : 'Save to recipes ★'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 3.8 THE SOUNDTRACK */}
          <AnimatedCard onPress={() => openModal('song', entry.songName, entry.songRating)} style={styles.card}>
            <Text style={styles.cardLabel}>THE SOUNDTRACK</Text>
            {entry.songName ? (
              <View>
                <Text style={styles.songName}>🎵 {entry.songName}</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <View key={n} style={[styles.ratingDot, n <= entry.songRating && styles.ratingDotFilled]} />)}
                  <Text style={styles.ratingNumber}>{entry.songRating}/10</Text>
                </View>
                {entry.songMeaning ? <Text style={styles.entryAnswer}>{`"${entry.songMeaning}"`}</Text>
                  : <TouchableOpacity onPress={() => openModal('songMeaning', entry.songMeaning)}><Text style={styles.entryAddText}>+ What does it mean to you?</Text></TouchableOpacity>}
              </View>
            ) : (
              <View>
                <Text style={styles.entryPrompt}>What are you listening to today?</Text>
                <Text style={styles.entryAddText}>+ Add a song</Text>
              </View>
            )}
          </AnimatedCard>

          {/* 3.9 WHAT I WATCHED */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>WHAT I WATCHED</Text>
            <TextInput
              style={styles.inlineInput}
              placeholder="Series, film, video..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={watchedLocal}
              onChangeText={setWatchedLocal}
              onBlur={() => updateEntry({ watched: watchedLocal.trim() })}
            />
          </View>

          {/* 3.10 WHO MADE TODAY BETTER */}
          <AnimatedCard onPress={() => setShowPeopleModal(true)} style={styles.card}>
            <Text style={styles.cardLabel}>WHO MADE TODAY BETTER</Text>
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
            ) : (
              <View>
                <Text style={styles.entryPrompt}>Who mattered today?</Text>
                <Text style={styles.entryAddText}>+ Tag people</Text>
              </View>
            )}
          </AnimatedCard>

          {/* 3.11 WHERE TODAY TOOK YOU */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>WHERE TODAY TOOK YOU</Text>
            {(entry.locations || []).map((loc, i) => (
              <View key={i} style={styles.locationRow}>
                <View style={styles.locationDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>{loc.name}</Text>
                  {!!loc.withWho && <Text style={styles.locationWith}>with {loc.withWho}</Text>}
                </View>
                <TouchableOpacity onPress={() => removeLocation(i)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={14} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addLocationRow} onPress={() => setShowAddLocation(true)}>
              <Text style={styles.addLocationText}>+ Add a place</Text>
            </TouchableOpacity>
          </View>

          {/* Weather */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>WEATHER</Text>
            {weatherLoading ? <ActivityIndicator color="#4a90d9" size="small" style={{ marginTop: 8 }} />
              : entry.weatherEmoji ? (
                <View style={styles.weatherRow}>
                  <Text style={styles.weatherEmoji}>{entry.weatherEmoji}</Text>
                  <Text style={styles.weatherTemp}>{entry.weatherTemp}°C</Text>
                  <Text style={styles.weatherDesc}>{entry.weatherDescription}</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={fetchWeather} style={styles.weatherRow}>
                  <Text style={styles.weatherEmoji}>🌍</Text>
                  <Text style={styles.weatherDesc}>Tap to load today&apos;s weather</Text>
                </TouchableOpacity>
              )}
          </View>

          {/* Daily reminders */}
          <View style={styles.card}>
            <View style={styles.notificationRow}>
              <Text style={styles.notificationEmoji}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.notificationTitle}>{notificationsEnabled ? 'Reminders on' : 'Get daily reminders'}</Text>
                <Text style={styles.notificationSubtitle}>{notificationsEnabled ? "You'll get a daily prompt every evening" : 'A daily nudge to document your life'}</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={v => v ? enableNotifications() : disableNotifications()}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(74,144,217,0.6)' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* 3.12 FUTURE CAPSULES — gold */}
          <View style={styles.capsuleSection}>
            <Text style={styles.capsuleSectionTitle}>Future Capsules</Text>
            <Text style={styles.capsuleSectionSubtitle}>Seal a message for future you. It unlocks on the date you choose.</Text>

            {readyCapsules.map(capsule => (
              <TouchableOpacity key={capsule.id} style={styles.capsuleReadyCard} onPress={() => setRevealingCapsule(capsule)}>
                <Text style={styles.capsuleEmoji}>🎁</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.capsuleReadyTitle}>Ready to open</Text>
                  <Text style={styles.capsuleReadyDate}>Sealed {new Date(capsule.createdDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#f5c842" />
              </TouchableOpacity>
            ))}

            {sealedCapsules.map(capsule => (
              <View key={capsule.id} style={styles.capsuleSealedCard}>
                <Text style={styles.capsuleEmoji}>🔒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.capsuleSealedTitle}>
                    Opens in {daysUntil(capsule.openDate)} day{daysUntil(capsule.openDate) === 1 ? '' : 's'}
                  </Text>
                  <Text style={styles.capsuleSealedDate}>
                    {new Date(capsule.openDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.createCapsuleButton} onPress={() => setShowCreateCapsule(true)}>
              <Text style={styles.createCapsuleEmoji}>✉️</Text>
              <Text style={styles.createCapsuleText}>Seal a new capsule</Text>
            </TouchableOpacity>
          </View>

          {/* 3.13 SAVE DAY */}
          <TouchableOpacity style={[styles.saveDayButton, savedToday && styles.saveDayButtonDone]} onPress={saveToday}>
            <Text style={styles.saveDayButtonText}>
              {savedToday ? '✓ Saved — view your day' : 'Save today to your days'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 110 }} />
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
                        {Array.from({ length: firstDay }).map((_, i) => (
                          <View key={`blank-${i}`} style={styles.calSlot} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dateKey = `${archiveCalYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const archiveDay = archiveDayMap[dateKey];
                          const isToday = dateKey === formatDateKey(new Date());
                          const hasPhoto = !!archiveDay?.photoUri;
                          return (
                            <TouchableOpacity
                              key={day}
                              style={styles.calSlot}
                              onPress={() => archiveDay ? setDayCardKey(dateKey) : null}
                              activeOpacity={archiveDay ? 0.8 : 1}
                            >
                              <View style={[
                                styles.calCard,
                                hasPhoto ? styles.calCardFilled : styles.calCardEmpty,
                                isToday && styles.calCardToday,
                              ]}>
                                {hasPhoto && (
                                  <Image
                                    source={{ uri: archiveDay!.photoUri }}
                                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                                    resizeMode="cover"
                                  />
                                )}
                                {hasPhoto && (
                                  <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                                    style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }}
                                  />
                                )}
                                {hasPhoto ? (
                                  <Text style={styles.calDayNumFilled}>{day}</Text>
                                ) : (
                                  <Text style={styles.calDayNumEmpty}>{day}</Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
                <View style={{ height: 100 }} />
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
                  {fav.photoUri
                    ? <Image source={{ uri: fav.photoUri }} style={[styles.favPhoto, fav.category === 'recipe' && styles.favPhotoRecipe]} />
                    : <View style={styles.favPhotoEmpty}><Text style={styles.favCategoryEmoji}>{getCategoryEmoji(fav.category)}</Text></View>}
                  <View style={styles.favInfo}>
                    <View style={styles.favInfoTop}>
                      <Text style={styles.favCategoryTag}>{getCategoryEmoji(fav.category)} {favCategories.find(c => c.key === fav.category)?.label}</Text>
                      {fav.rating > 0 && <Text style={styles.favRatingTag}>{fav.rating}/10</Text>}
                    </View>
                    <Text style={styles.favName} numberOfLines={1}>{fav.name}</Text>
                    {fav.note ? <Text style={styles.favNote} numberOfLines={2}>{`"${fav.note}"`}</Text> : null}
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

      {/* ═══ DAY CARD ═══ */}
      <DayCard
        dateKey={dayCardKey || ''}
        accent="present"
        visible={dayCardKey !== null}
        onClose={() => { setDayCardKey(null); loadArchive(); loadEntry(); }}
        onOpenDate={(dk) => setDayCardKey(dk)}
      />

      {/* Favourite detail modal */}
      <Modal visible={selectedFav !== null} animationType="fade" transparent>
        <TouchableOpacity style={styles.favDetailOverlay} activeOpacity={1} onPress={() => setSelectedFav(null)}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.favDetailBox} onStartShouldSetResponder={() => true}>
            <TouchableOpacity style={styles.favDetailCloseBtn} onPress={() => setSelectedFav(null)}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {selectedFav?.photoUri ? (
                <TouchableOpacity onPress={pickFavDetailPhoto} activeOpacity={0.85}>
                  <Image source={{ uri: selectedFav.photoUri }} style={styles.favDetailPhoto} />
                  <View style={styles.favDetailPhotoEditBadge}>
                    <Text style={styles.favDetailPhotoEditText}>Change photo</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.favDetailPhotoEmpty} onPress={pickFavDetailPhoto} activeOpacity={0.8}>
                  <Text style={styles.favDetailEmoji}>{getCategoryEmoji(selectedFav?.category || '')}</Text>
                  <Text style={styles.favDetailAddPhotoLabel}>+ Add photo</Text>
                </TouchableOpacity>
              )}
              <View style={styles.favDetailInfoRow}>
                <Text style={styles.favDetailCategory}>{getCategoryEmoji(selectedFav?.category || '')} {favCategories.find(c => c.key === selectedFav?.category)?.label}</Text>
                {selectedFav?.rating && selectedFav.rating > 0 ? <Text style={styles.favDetailRating}>{selectedFav.rating}/10</Text> : null}
              </View>
              <Text style={styles.favDetailName}>{selectedFav?.name}</Text>
              {selectedFav?.note ? <Text style={styles.favDetailNote}>{`"${selectedFav.note}"`}</Text> : null}
              <Text style={styles.favDetailDate}>{selectedFav?.displayDate}</Text>
              <TouchableOpacity style={styles.favDetailDelete} onPress={() => deleteFavourite(selectedFav?.id || '')}>
                <Text style={styles.favDetailDeleteText}>Remove from favourites</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add favourite modal */}
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
              placeholderTextColor="rgba(255,255,255,0.25)" value={newFav.name} onChangeText={text => setNewFav(prev => ({ ...prev, name: text }))} />
            <Text style={styles.addFavLabel}>Rating: {(newFav.rating || 0) > 0 ? `${newFav.rating}/10` : 'tap to rate'}</Text>
            <View style={styles.addFavRatingRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <TouchableOpacity key={n} style={[styles.addFavRatingButton, (newFav.rating || 0) >= n && styles.addFavRatingButtonActive]} onPress={() => setNewFav(prev => ({ ...prev, rating: n }))}>
                  <Text style={[styles.addFavRatingText, (newFav.rating || 0) >= n && styles.addFavRatingTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.addFavLabel}>Note (optional)</Text>
            <TextInput style={[styles.addFavInput, { minHeight: 80 }]} placeholder="Why does this mean something to you?" placeholderTextColor="rgba(255,255,255,0.25)" multiline value={newFav.note} onChangeText={text => setNewFav(prev => ({ ...prev, note: text }))} />
            <TouchableOpacity style={styles.addFavSave} onPress={addFavourite}><Text style={styles.addFavSaveText}>Save to Favourites</Text></TouchableOpacity>
            <TouchableOpacity style={styles.addFavCancel} onPress={() => { setNewFav({ category: 'song', name: '', rating: 0, note: '', photoUri: '' }); setShowAddFav(false); }}>
              <Text style={styles.addFavCancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* People tagging modal */}
      <Modal visible={showPeopleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Who made today better?</Text>
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
                <TextInput style={styles.peopleTextInput} placeholder="Type a name..." placeholderTextColor="rgba(255,255,255,0.25)" value={peopleInput} onChangeText={setPeopleInput} autoFocus />
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

      {/* Add location modal */}
      <Modal visible={showAddLocation} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Where did today take you?</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 48 }]}
                placeholder="Place name..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={locName}
                onChangeText={setLocName}
                autoFocus
              />
              <TextInput
                style={[styles.textInput, { minHeight: 48 }]}
                placeholder="Who with? (optional)"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={locWith}
                onChangeText={setLocWith}
              />
              <TouchableOpacity style={styles.saveButton} onPress={addLocation}>
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowAddLocation(false); setLocName(''); setLocWith(''); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Create capsule */}
      <Modal visible={showCreateCapsule} animationType="slide">
        <View style={styles.capsuleModal}>
          {capsuleCameraOpen && (
            <View style={[StyleSheet.absoluteFillObject, { zIndex: 10, backgroundColor: '#000000' }]}>
              {!capsuleCameraPreview ? (
                <>
                  <CameraView ref={capsuleCameraRef} style={StyleSheet.absoluteFillObject} facing={capsuleCameraFacing} />
                  <View style={styles.cameraTop}>
                    <TouchableOpacity style={styles.cameraTopButton} onPress={() => setCapsuleCameraOpen(false)}>
                      <Text style={styles.cameraTopButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cameraBottom}>
                    <TouchableOpacity style={styles.cameraFlipButton} onPress={() => setCapsuleCameraFacing(f => f === 'front' ? 'back' : 'front')}>
                      <Text style={styles.cameraFlipButtonText}>⟳</Text>
                    </TouchableOpacity>
                    <Animated.View style={{ transform: [{ scale: photoShutterScale }] }}>
                      <TouchableOpacity
                        style={[styles.cameraShutterButton, capsuleCameraCapturing && { opacity: 0.6 }]}
                        onPress={takeCapsulePhoto}
                        onPressIn={onPhotoShutterPressIn}
                        onPressOut={onPhotoShutterPressOut}
                        activeOpacity={1}>
                        <View style={styles.cameraShutterInner} />
                      </TouchableOpacity>
                    </Animated.View>
                    <View style={styles.cameraFlipButton} />
                  </View>
                </>
              ) : (
                <>
                  <Image source={{ uri: capsuleCameraPreview }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  <View style={styles.photoCaptureActions}>
                    <TouchableOpacity style={styles.photoCaptureBtn} onPress={() => setCapsuleCameraPreview(null)}>
                      <Text style={styles.photoCaptureBtnText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.photoCaptureBtn, styles.photoCaptureBtnPrimary]} onPress={() => {
                      setNewCapsulePhoto(capsuleCameraPreview!);
                      setCapsuleCameraOpen(false);
                      setCapsuleCameraPreview(null);
                    }}>
                      <Text style={[styles.photoCaptureBtnText, styles.photoCaptureBtnTextPrimary]}>Use Photo</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.capsuleModalTitle}>Seal a Capsule ✉️</Text>
            <Text style={styles.capsuleModalSubtitle}>Write something for future you. It&apos;ll be waiting.</Text>
            <Text style={styles.addFavLabel}>Your message</Text>
            <TextInput style={[styles.addFavInput, { minHeight: 120 }]} placeholder="Dear future me... What do you want to remember? What are you hoping for?" placeholderTextColor="rgba(255,255,255,0.35)" multiline value={newCapsuleMessage} onChangeText={setNewCapsuleMessage} />
            <Text style={styles.addFavLabel}>Photo (optional)</Text>
            <TouchableOpacity
              style={styles.addFavPhotoButton}
              onPress={() => {
                if (newCapsulePhoto) {
                  Alert.alert('Capsule photo', '', [
                    { text: 'View photo', onPress: () => setFullScreenUri(newCapsulePhoto) },
                    { text: 'Change photo', onPress: pickCapsulePhoto },
                    { text: 'Remove photo', onPress: () => setNewCapsulePhoto(''), style: 'destructive' },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                } else {
                  pickCapsulePhoto();
                }
              }}
            >
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
              <Text style={styles.capsuleToggleLabel}>Add to today&apos;s entry</Text>
              <Switch
                value={capsuleAddToDay}
                onValueChange={setCapsuleAddToDay}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#f5c842' }}
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
            <TouchableOpacity style={styles.capsuleSealButton} onPress={createCapsule}><Text style={styles.capsuleSealButtonText}>🔒 Seal Capsule</Text></TouchableOpacity>
            <TouchableOpacity style={styles.addFavCancel} onPress={() => { setNewCapsuleMessage(''); setNewCapsulePhoto(''); setCapsuleAddToDay(false); setCapsuleContext(''); setShowCreateCapsule(false); }}>
              <Text style={styles.addFavCancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Capsule reveal — the opening moment */}
      <Modal visible={revealingCapsule !== null} animationType="fade" transparent>
        <View style={styles.capsuleRevealOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
          {revealPhase === 'capsule' ? (
            <Animated.View style={[styles.capsuleGraphic, { transform: [{ scale: revealScale }] }]}>
              <Text style={styles.capsuleGraphicEmoji}>🎁</Text>
            </Animated.View>
          ) : (
            <Animated.View style={[styles.capsuleRevealBox, { opacity: revealOpacity }]}>
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
                <TouchableOpacity style={[styles.capsuleSealButton, { flex: 1 }]} onPress={() => revealingCapsule && addCapsuleToDay(revealingCapsule)}>
                  <Text style={styles.capsuleSealButtonText}>Add to today</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addFavCancel, { flex: 1 }]} onPress={() => setRevealingCapsule(null)}>
                  <Text style={styles.addFavCancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>

      {/* Song modal */}
      <Modal visible={activeModal === 'song'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>The soundtrack</Text>
              <TextInput style={styles.textInput} placeholder="Song name and artist..." placeholderTextColor="rgba(255,255,255,0.25)" value={tempText} onChangeText={setTempText} autoFocus />
              <Text style={styles.ratingLabel}>Rating: {tempRating > 0 ? `${tempRating}/10` : 'tap to rate'}</Text>
              <View style={styles.ratingButtons}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
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

      {/* Song meaning modal */}
      <Modal visible={activeModal === 'songMeaning'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>What it means to you</Text>
              <TextInput style={styles.textInput} placeholder="Write something for future you..." placeholderTextColor="rgba(255,255,255,0.25)" multiline value={tempText} onChangeText={setTempText} autoFocus />
              <TouchableOpacity style={styles.saveButton} onPress={saveModal}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setActiveModal(null)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Full screen image */}
      <Modal visible={fullScreenUri !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.fullScreenOverlay} activeOpacity={1} onPress={() => setFullScreenUri(null)}>
          {fullScreenUri && <Image source={{ uri: fullScreenUri }} style={styles.fullScreenImage} resizeMode="contain" />}
          <Text style={styles.fullScreenDismiss}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>

      {/* In-app photo camera */}
      <Modal visible={photoCameraOpen} animationType="slide" statusBarTranslucent>
        <View style={styles.cameraContainer}>
          {!photoCaptured ? (
            <>
              <CameraView ref={photoCameraRef} style={StyleSheet.absoluteFillObject} facing={photoCameraFacing} />
              <View style={styles.cameraTop}>
                <TouchableOpacity style={styles.cameraTopButton} onPress={() => setPhotoCameraOpen(false)}>
                  <Text style={styles.cameraTopButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cameraBottom}>
                <TouchableOpacity style={styles.cameraFlipButton} onPress={() => setPhotoCameraFacing(f => f === 'front' ? 'back' : 'front')}>
                  <Text style={styles.cameraFlipButtonText}>⟳</Text>
                </TouchableOpacity>
                <Animated.View style={{ transform: [{ scale: photoShutterScale }] }}>
                  <TouchableOpacity
                    style={[styles.cameraShutterButton, photoCapturing && { opacity: 0.6 }]}
                    onPress={capturePhoto}
                    onPressIn={onPhotoShutterPressIn}
                    onPressOut={onPhotoShutterPressOut}
                    activeOpacity={1}>
                    <View style={styles.cameraShutterInner} />
                  </TouchableOpacity>
                </Animated.View>
                <View style={styles.cameraFlipButton} />
              </View>
            </>
          ) : (
            <>
              <Image source={{ uri: photoCaptured }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <View style={styles.photoCaptureActions}>
                <TouchableOpacity style={styles.photoCaptureBtn} onPress={() => setPhotoCaptured(null)}>
                  <Text style={styles.photoCaptureBtnText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoCaptureBtn, styles.photoCaptureBtnPrimary]} onPress={usePhotoCaptured}>
                  <Text style={[styles.photoCaptureBtnText, styles.photoCaptureBtnTextPrimary]}>Use Photo</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#08090f' },
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#08090f' },
  headerTitle: { fontSize: 32, fontFamily: 'SpaceGrotesk_700Bold', color: '#ffffff' },
  headerDate: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 2, marginBottom: 14 },
  tabSwitcher: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  tabButtonActive: { backgroundColor: 'rgba(74,144,217,0.18)', borderColor: 'rgba(74,144,217,0.35)' },
  tabButtonText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.3)' },
  tabButtonTextActive: { color: '#ffffff', fontWeight: '700' },
  subHeader: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },

  // Card base
  card: { backgroundColor: '#0d1220', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(74,144,217,0.2)', marginHorizontal: 16, marginBottom: 14, padding: 14 },
  cardLabel: { fontSize: 10, color: '#4a90d9', fontWeight: '800', letterSpacing: 2, marginBottom: 10 },

  // 3.1 Capture pair
  pairArea: { height: 300, borderRadius: 12, overflow: 'hidden' },
  pairMainPhoto: { width: '100%', height: '100%' },
  pairMainPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,144,217,0.25)', borderStyle: 'dashed', borderRadius: 12 },
  pairPlaceholderText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  pairInset: { position: 'absolute', top: 10, left: 10, width: 100, height: 133, borderRadius: 12, borderWidth: 2, borderColor: '#ffffff', overflow: 'hidden', backgroundColor: '#0d1220', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  pairInsetPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderStyle: 'dashed', borderRadius: 10 },
  pairPromptRow: { flexDirection: 'row', gap: 12, height: 300 },
  pairPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,144,217,0.3)', borderStyle: 'dashed', borderRadius: 12, backgroundColor: 'rgba(74,144,217,0.05)' },
  pairPromptText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 10 },
  extraStrip: { gap: 8, paddingTop: 12 },
  extraPhoto: { width: 64, height: 64, borderRadius: 10 },
  addExtraTile: { width: 64, height: 64, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(74,144,217,0.3)', justifyContent: 'center', alignItems: 'center' },
  addExtraText: { color: '#4a90d9', fontSize: 26, fontWeight: '300' },
  viewAllSelfies: { marginTop: 10, alignSelf: 'flex-end' },
  viewAllSelfiesText: { fontSize: 12, color: 'rgba(74,144,217,0.8)', fontWeight: '600' },

  // 3.3 Three words
  wordsRow: { flexDirection: 'row', gap: 8 },
  wordChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: 'rgba(255,255,255,0.8)', fontSize: 14, borderWidth: 1, borderColor: 'transparent', textAlign: 'center' },
  wordChipFilled: { borderColor: 'rgba(74,144,217,0.5)', color: '#ffffff', fontWeight: '600' },

  // 3.4 / 3.5 Questions
  questionText: { fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: '#ffffff', lineHeight: 24, marginBottom: 10 },
  questionInput: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 10, color: '#ffffff', fontSize: 15, lineHeight: 21, minHeight: 60, textAlignVertical: 'top' },
  reflectionCard: { borderColor: 'rgba(74,144,217,0.35)', shadowColor: '#4a90d9', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 4 },

  // 3.6 Your day
  dayActionsRow: { flexDirection: 'row', gap: 10 },
  dayActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(74,144,217,0.3)', alignItems: 'center', backgroundColor: 'rgba(74,144,217,0.06)' },
  dayActionBtnActive: { backgroundColor: 'rgba(74,144,217,0.2)', borderColor: 'rgba(74,144,217,0.5)' },
  dayActionBtnRecording: { backgroundColor: 'rgba(255,68,68,0.15)', borderColor: 'rgba(255,68,68,0.5)' },
  dayActionText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4444' },
  recordingText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  voicePlayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(74,144,217,0.1)' },
  voicePlayText: { fontSize: 13, color: '#4a90d9', fontWeight: '600' },

  // 3.7 Cooked
  cookedRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inlineInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#ffffff', fontSize: 15 },
  cookedPhotoSlot: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(74,144,217,0.3)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  recipeSaveBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(74,144,217,0.15)', borderWidth: 1, borderColor: 'rgba(74,144,217,0.35)' },
  recipeSaveBtnDone: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.15)' },
  recipeSaveText: { fontSize: 13, color: '#4a90d9', fontWeight: '700' },

  // 3.8 Soundtrack
  songName: { fontSize: 16, color: '#ffffff', fontWeight: '600', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  ratingDot: { width: 14, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  ratingDotFilled: { backgroundColor: '#4a90d9' },
  ratingNumber: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 6 },
  entryAnswer: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', lineHeight: 20 },
  entryAddText: { fontSize: 13, color: 'rgba(74,144,217,0.8)', marginTop: 6 },
  entryPrompt: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },

  // People
  peopleChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  personChip: { backgroundColor: 'rgba(74,144,217,0.15)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(74,144,217,0.3)' },
  personChipText: { color: '#ffffff', fontSize: 13 },
  personChipRemovable: { flexDirection: 'row', backgroundColor: 'rgba(74,144,217,0.15)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(74,144,217,0.3)', alignItems: 'center' },
  personChipRemove: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  // 3.11 Locations
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  locationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4a90d9' },
  locationName: { fontSize: 15, color: '#ffffff', fontWeight: '600' },
  locationWith: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  addLocationRow: { paddingVertical: 8 },
  addLocationText: { fontSize: 13, color: 'rgba(74,144,217,0.8)', fontWeight: '600' },

  // Weather
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weatherEmoji: { fontSize: 26 },
  weatherTemp: { fontSize: 20, color: '#ffffff', fontWeight: '700' },
  weatherDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  // Notifications
  notificationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notificationEmoji: { fontSize: 22 },
  notificationTitle: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  notificationSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },

  // 3.12 Capsules — GOLD
  capsuleSection: { marginHorizontal: 16, marginBottom: 14, marginTop: 8 },
  capsuleSectionTitle: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: '#f5c842', marginBottom: 4 },
  capsuleSectionSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 },
  capsuleReadyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(245,200,66,0.12)', borderWidth: 1, borderColor: 'rgba(245,200,66,0.5)', borderRadius: 14, padding: 14, marginBottom: 8 },
  capsuleEmoji: { fontSize: 24 },
  capsuleReadyTitle: { fontSize: 15, color: '#f5c842', fontWeight: '700' },
  capsuleReadyDate: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  capsuleSealedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0d1220', borderWidth: 1, borderColor: 'rgba(245,200,66,0.4)', borderRadius: 14, padding: 14, marginBottom: 8 },
  capsuleSealedTitle: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  capsuleSealedDate: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  createCapsuleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(245,200,66,0.4)', borderStyle: 'dashed', borderRadius: 14, padding: 14 },
  createCapsuleEmoji: { fontSize: 16 },
  createCapsuleText: { fontSize: 14, color: '#f5c842', fontWeight: '600' },

  // 3.13 Save day
  saveDayButton: { marginHorizontal: 16, backgroundColor: '#4a90d9', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  saveDayButtonDone: { backgroundColor: 'rgba(74,144,217,0.35)' },
  saveDayButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },

  // Empty states
  emptyState: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 22 },

  // Calendar
  yearPickerStrip: { maxHeight: 56 },
  yearPickerContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  yearPickerItem: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(74,144,217,0.2)' },
  yearPickerItemActive: { backgroundColor: 'rgba(74,144,217,0.25)', borderColor: 'rgba(74,144,217,0.45)' },
  yearPickerText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },
  yearPickerTextActive: { color: '#ffffff' },
  calendarMonth: { paddingHorizontal: 16, marginBottom: 28 },
  calendarMonthTitle: { fontSize: 22, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#ffffff', marginBottom: 8 },
  calendarDayHeaders: { flexDirection: 'row', marginBottom: 4 },
  calendarDayHeader: { width: CAL_SLOT_WIDTH, textAlign: 'center', fontSize: 9, color: '#ffffff', fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calSlot: { width: CAL_SLOT_WIDTH, alignItems: 'center', marginBottom: 8 },
  calCard: { width: '86%', aspectRatio: 3 / 4, borderRadius: 8, overflow: 'hidden' },
  calCardFilled: { borderWidth: 1.5, borderColor: '#ffffff' },
  calCardEmpty: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  calCardToday: { borderWidth: 2, borderColor: '#ffffff' },
  calDayNumFilled: { position: 'absolute', bottom: 4, left: 5, color: '#ffffff', fontSize: 12, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  calDayNumEmpty: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },

  // Favourites
  favFilterStrip: { maxHeight: 54 },
  favFilterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  favFilterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'transparent' },
  favFilterPillActive: { backgroundColor: 'rgba(74,144,217,0.25)', borderColor: 'rgba(74,144,217,0.45)' },
  favFilterEmoji: { fontSize: 13 },
  favFilterText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  favFilterTextActive: { color: '#ffffff' },
  favGrid: { paddingHorizontal: 16, paddingBottom: 140, gap: 12 },
  favCard: { backgroundColor: '#0d1220', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(74,144,217,0.2)', overflow: 'hidden' },
  favPhoto: { width: '100%', height: 140 },
  favPhotoRecipe: { height: 200 },
  favPhotoEmpty: { width: '100%', height: 90, backgroundColor: 'rgba(74,144,217,0.06)', justifyContent: 'center', alignItems: 'center' },
  favCategoryEmoji: { fontSize: 32 },
  favInfo: { padding: 12 },
  favInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  favCategoryTag: { fontSize: 11, color: 'rgba(74,144,217,0.9)', fontWeight: '700' },
  favRatingTag: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  favName: { fontSize: 16, color: '#ffffff', fontWeight: '700', marginBottom: 2 },
  favNote: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginBottom: 4 },
  favDate: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  addFavButton: { position: 'absolute', bottom: 100, right: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: '#4a90d9', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  addFavButtonText: { color: '#ffffff', fontSize: 28, fontWeight: '300', marginTop: -2 },

  // Fav detail
  favDetailOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  favDetailBox: { backgroundColor: 'rgba(10,14,22,0.98)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)', padding: 20, maxHeight: '75%' },
  favDetailCloseBtn: { position: 'absolute', top: 12, right: 12, zIndex: 2, padding: 6 },
  favDetailPhoto: { width: '100%', height: 220, borderRadius: 14, marginBottom: 4 },
  favDetailPhotoEditBadge: { position: 'absolute', bottom: 12, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  favDetailPhotoEditText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  favDetailPhotoEmpty: { width: '100%', height: 140, borderRadius: 14, backgroundColor: 'rgba(74,144,217,0.06)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  favDetailEmoji: { fontSize: 40 },
  favDetailAddPhotoLabel: { fontSize: 12, color: 'rgba(74,144,217,0.8)', marginTop: 6 },
  favDetailInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  favDetailCategory: { fontSize: 12, color: 'rgba(74,144,217,0.9)', fontWeight: '700' },
  favDetailRating: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  favDetailName: { fontSize: 22, color: '#ffffff', fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 6 },
  favDetailNote: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 21, marginBottom: 8 },
  favDetailDate: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16 },
  favDetailDelete: { alignItems: 'center', paddingVertical: 10 },
  favDetailDeleteText: { color: '#ff4444', fontSize: 13, fontWeight: '600' },

  // Add favourite modal
  addFavModal: { flex: 1, backgroundColor: '#08090f', paddingTop: 70, paddingHorizontal: 20 },
  addFavTitle: { fontSize: 26, fontFamily: 'SpaceGrotesk_700Bold', color: '#ffffff', marginBottom: 20 },
  addFavLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, marginTop: 12 },
  addFavCategoryRow: { gap: 8, paddingBottom: 4 },
  addFavCatPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'transparent' },
  addFavCatPillActive: { backgroundColor: 'rgba(74,144,217,0.25)', borderColor: 'rgba(74,144,217,0.45)' },
  addFavCatEmoji: { fontSize: 13 },
  addFavCatText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  addFavCatTextActive: { color: '#ffffff' },
  addFavPhotoButton: { borderRadius: 14, overflow: 'hidden' },
  addFavPhotoPreview: { width: '100%', height: 160, borderRadius: 14 },
  addFavPhotoEmpty: { height: 100, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(74,144,217,0.3)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(74,144,217,0.04)' },
  addFavPhotoEmoji: { fontSize: 24 },
  addFavPhotoText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  addFavInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, color: '#ffffff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(74,144,217,0.2)' },
  addFavRatingRow: { flexDirection: 'row', gap: 6 },
  addFavRatingButton: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  addFavRatingButtonActive: { backgroundColor: '#4a90d9' },
  addFavRatingText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  addFavRatingTextActive: { color: '#ffffff' },
  addFavSave: { backgroundColor: '#4a90d9', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  addFavSaveText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  addFavCancel: { alignItems: 'center', padding: 14 },
  addFavCancelText: { color: 'rgba(255,255,255,0.35)', fontSize: 15 },

  // Modals — glass
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: 'rgba(10,14,22,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 12, letterSpacing: -0.3 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  saveButton: { backgroundColor: '#4a90d9', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  cancelButton: { alignItems: 'center', padding: 10 },
  cancelButtonText: { color: 'rgba(255,255,255,0.35)', fontSize: 15 },
  ratingLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  ratingButtons: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  ratingNumberButton: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  ratingNumberButtonActive: { backgroundColor: '#4a90d9' },
  ratingNumberText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  ratingNumberTextActive: { color: '#ffffff' },

  // People modal
  peopleInputRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  peopleTextInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, color: '#ffffff', fontSize: 15 },
  peopleAddButton: { backgroundColor: '#4a90d9', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  peopleAddButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  peopleSuggestionsBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 10 },
  peopleSuggestion: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  peopleSuggestionText: { color: '#ffffff', fontSize: 14 },

  // Capsule modal
  capsuleModal: { flex: 1, backgroundColor: '#08090f', paddingTop: 70, paddingHorizontal: 20 },
  capsuleModalTitle: { fontSize: 26, fontFamily: 'SpaceGrotesk_700Bold', color: '#f5c842', marginBottom: 4 },
  capsuleModalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 16 },
  capsuleDatePicker: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  capsuleDateColumn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,200,66,0.25)' },
  capsuleDateArrow: { paddingHorizontal: 12, paddingVertical: 12 },
  capsuleDateArrowText: { color: '#f5c842', fontSize: 20, fontWeight: '600' },
  capsuleDateValue: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  capsuleDatePreview: { fontSize: 13, color: 'rgba(245,200,66,0.8)', textAlign: 'center', marginTop: 10 },
  capsuleToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  capsuleToggleLabel: { fontSize: 14, color: '#ffffff' },
  capsuleSealButton: { backgroundColor: '#f5c842', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  capsuleSealButtonText: { color: '#1a1405', fontWeight: '800', fontSize: 16 },

  // Capsule reveal
  capsuleRevealOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  capsuleGraphic: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(245,200,66,0.15)', borderWidth: 2, borderColor: '#f5c842', justifyContent: 'center', alignItems: 'center', shadowColor: '#f5c842', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } },
  capsuleGraphicEmoji: { fontSize: 64 },
  capsuleRevealBox: { width: '100%', backgroundColor: 'rgba(10,14,22,0.98)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(245,200,66,0.4)', padding: 24, maxHeight: '75%', alignItems: 'center' },
  capsuleRevealEmoji: { fontSize: 40, marginBottom: 8 },
  capsuleRevealTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: '#f5c842', textAlign: 'center' },
  capsuleRevealDate: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, marginBottom: 12 },
  capsuleRevealMessage: { alignSelf: 'stretch', marginBottom: 16 },
  capsuleRevealPhoto: { width: '100%', height: 180, borderRadius: 14, marginBottom: 12 },
  capsuleRevealText: { fontSize: 16, color: '#ffffff', lineHeight: 24 },
  capsuleRevealButtons: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', alignItems: 'center' },

  // Fullscreen
  fullScreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: '100%', height: '72%' },
  fullScreenDismiss: { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 12 },

  // Cameras
  cameraContainer: { flex: 1, backgroundColor: '#000000' },
  cameraTop: { position: 'absolute', top: 60, left: 20 },
  cameraTopButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  cameraTopButtonText: { color: '#ffffff', fontSize: 18 },
  cameraBottom: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 40 },
  cameraFlipButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  cameraFlipButtonText: { color: '#ffffff', fontSize: 22 },
  cameraShutterButton: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  cameraShutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffffff' },
  photoCaptureActions: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 16 },
  photoCaptureBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)' },
  photoCaptureBtnPrimary: { backgroundColor: '#ffffff' },
  photoCaptureBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  photoCaptureBtnTextPrimary: { color: '#000000' },
});

