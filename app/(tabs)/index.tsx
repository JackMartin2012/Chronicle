import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Fraunces_300Light, Fraunces_400Regular, Fraunces_600SemiBold, Fraunces_800ExtraBold, useFonts } from '@expo-google-fonts/fraunces';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Clipboard,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((width - 32) / 7);
const FOOTBALL_API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY;

const PIN_COLOURS: Record<'home' | 'visited' | 'meaningful', string> = {
  home: '#9b72ff',
  visited: '#4a90d9',
  meaningful: '#f0b429',
};

type Memory = {
  id: string;
  year: string;
  date: string;
  caption: string;
  uri: string | null;
  mediaType: 'photo' | 'video';
  isScreenshot: boolean;
  people: string[];
  hidden: boolean;
  isCover: boolean;
};

type DayContext = {
  living: string;
  doing: string;
  with: string;
  listening: string;
  thinking: string;
};

type VaultPhoto = {
  id: string;
  uri: string;
  caption: string;
  people: string[];
};

type VaultDay = {
  dateKey: string;
  displayDate: string;
  context: DayContext | null;
  presentEntry: any | null;
  photos: VaultPhoto[];
  thumbUri: string | null;
};

type PlaceContext = {
  liveWith?: string;
  chapterDescription?: string;
  bestMemory?: string;
  wentWith?: string;
  highlight?: string;
  wouldReturn?: string;
  whyItMatters?: string;
  whoYouAssociate?: string;
};

type Place = {
  id: string;
  type: 'home' | 'visited' | 'meaningful';
  name: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
  startDate?: string;
  endDate?: string;
  coverPhotoUri: string;
  photoUris: string[];
  dayKeys: string[];
  context: PlaceContext;
};

type TcPhoto = { id: string; uri: string; mediaType: 'photo' | 'video' };

type WikiEvent = { year: number; text: string };

type NewsCache = {
  fetchedAt: number;
  wikipedia: { events: WikiEvent[]; birth: WikiEvent | null } | null;
  football: any[] | null;
  weather: { max: number; min: number; emoji: string } | null;
};

const emptyContext: DayContext = {
  living: '', doing: '', with: '', listening: '', thinking: '',
};

const contextFields = [
  { key: 'living', label: 'WHERE I WAS LIVING', placeholder: 'My flat in Edinburgh...', emoji: '📍' },
  { key: 'doing', label: 'WHAT I WAS DOING', placeholder: 'Working at..., studying...', emoji: '💼' },
  { key: 'with', label: 'WHO I WAS WITH', placeholder: 'Mostly with Alex and...', emoji: '👥' },
  { key: 'listening', label: 'WHAT I WAS LISTENING TO', placeholder: 'Obsessed with...', emoji: '🎵' },
  { key: 'thinking', label: 'WHAT I WAS THINKING ABOUT', placeholder: 'Worried about / excited about...', emoji: '💭' },
];

const placeContextFields: Record<string, { key: string; label: string; emoji: string; placeholder: string }[]> = {
  home: [
    { key: 'liveWith', label: 'WHO DID YOU LIVE WITH?', emoji: '👥', placeholder: 'By myself, with flatmates...' },
    { key: 'chapterDescription', label: 'WHAT WAS THIS CHAPTER?', emoji: '📖', placeholder: 'Describe this period of life...' },
    { key: 'bestMemory', label: 'BEST MEMORY HERE?', emoji: '⭐', placeholder: 'The time when...' },
  ],
  visited: [
    { key: 'wentWith', label: 'WHO DID YOU GO WITH?', emoji: '👥', placeholder: 'Solo, with friends...' },
    { key: 'highlight', label: 'TRIP HIGHLIGHT?', emoji: '⭐', placeholder: 'The best part was...' },
    { key: 'wouldReturn', label: 'WOULD YOU GO BACK?', emoji: '🔄', placeholder: 'Absolutely / Maybe not...' },
  ],
  meaningful: [
    { key: 'whyItMatters', label: 'WHY DOES THIS PLACE MATTER?', emoji: '💭', placeholder: 'This place means...' },
    { key: 'bestMemory', label: 'BEST MEMORY HERE?', emoji: '⭐', placeholder: 'The time when...' },
    { key: 'whoYouAssociate', label: 'WHO DO YOU ASSOCIATE WITH IT?', emoji: '👥', placeholder: 'Always think of...' },
  ],
};

const personAboutFields = [
  { key: 'desc', label: 'WHO ARE THEY?', emoji: '👤', placeholder: 'My best mate from school...' },
  { key: 'since', label: 'KNOWN SINCE?', emoji: '📅', placeholder: '2018, first year of uni...' },
  { key: 'bday', label: 'BIRTHDAY', emoji: '🎂', placeholder: '14 June' },
  { key: 'phone', label: 'PHONE NUMBER', emoji: '📱', placeholder: '+44...' },
  { key: 'insta', label: 'INSTAGRAM', emoji: '📸', placeholder: '@handle' },
  { key: 'notes', label: 'NOTES', emoji: '💬', placeholder: 'Anything else...' },
];

const placeAddButtons: { type: 'home' | 'visited' | 'meaningful'; emoji: string; name: string; desc: string }[] = [
  { type: 'home', emoji: '🏠', name: 'Add a Home', desc: 'Halls, houses, family home...' },
  { type: 'visited', emoji: '✈️', name: 'Add a Trip', desc: 'Holidays, weekends away, travel...' },
  { type: 'meaningful', emoji: '❤️', name: 'Add a Meaningful Place', desc: "Pub, school, nan's house..." },
];

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

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

const wmoEmoji = (code: number | null | undefined): string => {
  if (code == null) return '🌤️';
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code === 51 || code === 53 || code === 55) return '🌦️';
  if (code === 61 || code === 63 || code === 65) return '🌧️';
  if (code === 71 || code === 73 || code === 75) return '❄️';
  if (code === 80 || code === 81 || code === 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return '🌤️';
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
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        activeOpacity={1} style={style}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function OnThisDay() {
  const [fontsLoaded] = useFonts({ Fraunces_300Light, Fraunces_400Regular, Fraunces_600SemiBold, Fraunces_800ExtraBold });
  const router = useRouter();
  const [memoryList, setMemoryList] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [activeTab, setActiveTab] = useState<'today' | 'vault' | 'places' | 'people'>('today');

  const [vaultDays, setVaultDays] = useState<VaultDay[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [selectedCalYear, setSelectedCalYear] = useState('');

  // People
  const [showPersonProfile, setShowPersonProfile] = useState<string | null>(null);
  const [personPhotos, setPersonPhotos] = useState<VaultPhoto[]>([]);
  const [personProfilePhotos, setPersonProfilePhotos] = useState<Record<string, string>>({});
  const [personDaysCount, setPersonDaysCount] = useState<Record<string, number>>({});
  const [personDayKeys, setPersonDayKeys] = useState<Record<string, string[]>>({});
  const [personDays, setPersonDays] = useState<{ dateKey: string; thumbUri: string | null }[]>([]);
  const [personAbout, setPersonAbout] = useState<Record<string, string>>({});
  const [personAboutField, setPersonAboutField] = useState<string | null>(null);
  const [personAboutText, setPersonAboutText] = useState('');
  const [personFullscreenUri, setPersonFullscreenUri] = useState<string | null>(null);

  // Places
  const [places, setPlaces] = useState<Place[]>([]);
  const [showCreatePlace, setShowCreatePlace] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showPlaceProfile, setShowPlaceProfile] = useState(false);
  const [showPlaceMapModal, setShowPlaceMapModal] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceType, setNewPlaceType] = useState<'home' | 'visited' | 'meaningful'>('home');
  const [newPlaceLocation, setNewPlaceLocation] = useState('');
  const [newPlaceCoverUri, setNewPlaceCoverUri] = useState('');
  const [newPlaceLat, setNewPlaceLat] = useState<number | null>(null);
  const [newPlaceLon, setNewPlaceLon] = useState<number | null>(null);
  const [editingPlaceField, setEditingPlaceField] = useState<string | null>(null);
  const [placeFieldText, setPlaceFieldText] = useState('');
  const [placesView, setPlacesView] = useState<'map' | 'list'>('map');
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<any[]>([]);
  const [selectedMapPlace, setSelectedMapPlace] = useState<Place | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    latitudeDelta: 8,
    longitudeDelta: 8,
  });
  const mapRef = useRef<MapView>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trading card
  const [showTradingCard, setShowTradingCard] = useState(false);
  const [tradingCardDateKey, setTradingCardDateKey] = useState('');
  const [tradingCardYear, setTradingCardYear] = useState('');
  const [tcPhotos, setTcPhotos] = useState<TcPhoto[]>([]);
  const [tcPhotosLoading, setTcPhotosLoading] = useState(false);
  const [tcCaptions, setTcCaptions] = useState<Record<string, string>>({});
  const [tcPeople, setTcPeople] = useState<Record<string, string[]>>({});
  const [tcContext, setTcContext] = useState<DayContext>(emptyContext);
  const [tcDescription, setTcDescription] = useState('');
  const [tcLocation, setTcLocation] = useState('');
  const [tcEditingLocation, setTcEditingLocation] = useState(false);
  const [tcWeather, setTcWeather] = useState<NewsCache['weather']>(null);
  const [tcNewsCache, setTcNewsCache] = useState<NewsCache | null>(null);
  const [tcHiddenPhotos, setTcHiddenPhotos] = useState<string[]>([]);
  const [tcCoverPhotoId, setTcCoverPhotoId] = useState<string>('');
  const [tcFullscreenPhoto, setTcFullscreenPhoto] = useState<string | null>(null);
  const [tcPhotoMenuId, setTcPhotoMenuId] = useState<string | null>(null);
  const [tcTagModal, setTcTagModal] = useState<string | null>(null);
  const [tcTagSelected, setTcTagSelected] = useState<string[]>([]);
  const [tcTagText, setTcTagText] = useState('');
  const [tcPlaceModal, setTcPlaceModal] = useState<string | 'day' | null>(null);
  const [tcPlaceScope, setTcPlaceScope] = useState<'photo' | 'day'>('photo');
  const [tcNewPlaceMode, setTcNewPlaceMode] = useState(false);
  const [tcContextModal, setTcContextModal] = useState<string | null>(null);
  const [tcContextField, setTcContextField] = useState<string | null>(null);
  const [tcModalText, setTcModalText] = useState('');
  const [tcSaved, setTcSaved] = useState(false);
  const [newsSettings, setNewsSettings] = useState({ wiki: true, football: false, weather: true });
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  useEffect(() => {
    if (permission?.granted) {
      loadMemories();
    } else if (permission?.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    if (activeTab === 'vault' || activeTab === 'people' || activeTab === 'places') loadVault();
  }, [activeTab]);

  useEffect(() => { loadPlaces(); }, []);

  const loadMemories = async () => {
    setLoading(true);
    const today = new Date();
    const found: Memory[] = [];

    const hiddenRaw = await AsyncStorage.getItem('hidden_photos');
    const hiddenSet = new Set<string>(hiddenRaw ? JSON.parse(hiddenRaw) : []);
    const coverRaw = await AsyncStorage.getItem('cover_photos');
    const coverMap: Record<string, string> = coverRaw ? JSON.parse(coverRaw) : {};

    for (let yearsAgo = 1; yearsAgo <= 15; yearsAgo++) {
      const targetDate = new Date(today);
      targetDate.setFullYear(today.getFullYear() - yearsAgo);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        createdAfter: startOfDay.getTime(),
        createdBefore: endOfDay.getTime(),
        first: 5,
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      for (const asset of result.assets) {
        if (hiddenSet.has(asset.id)) continue;
        let uri = asset.uri;
        try {
          const info = await MediaLibrary.getAssetInfoAsync(asset.id);
          uri = info.localUri || asset.uri;
        } catch { }

        const savedCaption = await AsyncStorage.getItem(`caption_${asset.id}`);
        const savedPeople = await AsyncStorage.getItem(`people_${asset.id}`);
        const isScreenshot = asset.filename?.toLowerCase().includes('screenshot') ?? false;
        const year = String(today.getFullYear() - yearsAgo);
        const isCover = coverMap[year] === asset.id;

        found.push({
          id: asset.id, year, date: formatDateKey(targetDate),
          caption: savedCaption || '', uri,
          mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
          isScreenshot, people: savedPeople ? JSON.parse(savedPeople) : [],
          hidden: false, isCover,
        });
      }
    }

    found.sort((a, b) => {
      if (a.year !== b.year) return b.year.localeCompare(a.year);
      if (a.isCover) return -1;
      if (b.isCover) return 1;
      return 0;
    });

    setMemoryList(found);
    setLoading(false);
  };

  const loadVault = async () => {
    setVaultLoading(true);
    const keys = await AsyncStorage.getAllKeys();

    const contextKeys = keys.filter(k => k.startsWith('day_context_'));
    const savedDayKeys = keys.filter(k => k.startsWith('saved_day_'));
    const captionKeys = keys.filter(k => k.startsWith('caption_'));

    const dateKeySet = new Set<string>();
    const savedFlagSet = new Set<string>();
    for (const k of contextKeys) dateKeySet.add(k.replace('day_context_', ''));
    for (const k of savedDayKeys) {
      const val = await AsyncStorage.getItem(k);
      if (val === 'true') {
        const dk = k.replace('saved_day_', '');
        dateKeySet.add(dk);
        savedFlagSet.add(dk);
      }
    }

    const photosByDate: Record<string, VaultPhoto[]> = {};
    for (const key of captionKeys) {
      const caption = await AsyncStorage.getItem(key);
      if (!caption) continue;
      const assetId = key.replace('caption_', '');
      try {
        const asset = await MediaLibrary.getAssetInfoAsync(assetId);
        if (asset) {
          const savedPeople = await AsyncStorage.getItem(`people_${assetId}`);
          const creationMs = asset.creationTime > 1e10 ? asset.creationTime : asset.creationTime * 1000;
          const date = new Date(creationMs);
          const dateKey = formatDateKey(date);
          dateKeySet.add(dateKey);
          if (!photosByDate[dateKey]) photosByDate[dateKey] = [];
          photosByDate[dateKey].push({
            id: assetId, uri: asset.localUri || asset.uri,
            caption, people: savedPeople ? JSON.parse(savedPeople) : [],
          });
        }
      } catch { }
    }

    const days: VaultDay[] = [];
    for (const dateKey of dateKeySet) {
      const contextRaw = await AsyncStorage.getItem(`day_context_${dateKey}`);
      const context = contextRaw ? JSON.parse(contextRaw) : null;
      const presentRaw = await AsyncStorage.getItem(`day_entry_${dateKey}`);
      const presentEntry = presentRaw ? JSON.parse(presentRaw) : null;
      const photos = photosByDate[dateKey] || [];
      if (!context && photos.length === 0 && !presentEntry && !savedFlagSet.has(dateKey)) continue;

      let thumbUri = photos.length > 0 ? photos[0].uri : null;
      if (!thumbUri) {
        const singleId = await AsyncStorage.getItem(`tc_single_photo_${dateKey}`);
        if (singleId) {
          try {
            const asset = await MediaLibrary.getAssetInfoAsync(singleId);
            thumbUri = asset.localUri || asset.uri;
          } catch { }
        }
      }

      const date = new Date(dateKey + 'T12:00:00');
      const displayDate = date.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });

      days.push({
        dateKey, displayDate, context, presentEntry, photos, thumbUri,
      });
    }

    days.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    setVaultDays(days);
    if (days.length > 0) setSelectedCalYear(days[0].dateKey.split('-')[0]);

    const personDaysSet: Record<string, Set<string>> = {};
    days.forEach(d => {
      const dayPeople = new Set(d.photos.flatMap(p => p.people));
      dayPeople.forEach(name => {
        if (!personDaysSet[name]) personDaysSet[name] = new Set();
        personDaysSet[name].add(d.dateKey);
      });
    });
    const dayEntryKeys = keys.filter(k => k.startsWith('day_entry_'));
    for (const key of dayEntryKeys) {
      const val = await AsyncStorage.getItem(key);
      if (val) {
        const e = JSON.parse(val);
        const dateKey = key.replace('day_entry_', '');
        (e.taggedPeople || []).forEach((name: string) => {
          if (!personDaysSet[name]) personDaysSet[name] = new Set();
          personDaysSet[name].add(dateKey);
        });
      }
    }
    // Day context "who I was with" mentions also count as days together
    const knownNames = Object.keys(personDaysSet);
    days.forEach(d => {
      const withText = d.context?.with?.toLowerCase() || '';
      if (!withText) return;
      knownNames.forEach(name => {
        if (withText.includes(name.toLowerCase())) personDaysSet[name].add(d.dateKey);
      });
    });

    const counts: Record<string, number> = {};
    const keysByPerson: Record<string, string[]> = {};
    Object.entries(personDaysSet).forEach(([name, daysSet]) => {
      counts[name] = daysSet.size;
      keysByPerson[name] = [...daysSet].sort().reverse();
    });
    setPersonDaysCount(counts);
    setPersonDayKeys(keysByPerson);

    const allNames = Object.keys(personDaysSet).filter(Boolean);
    const photoMap: Record<string, string> = {};
    for (const person of allNames) {
      const uri = await AsyncStorage.getItem(`person_photo_${person}`);
      if (uri) photoMap[person] = uri;
    }
    setPersonProfilePhotos(photoMap);

    setVaultLoading(false);
  };

  // ── TRADING CARD ───────────────────────────────────────────────────────────

  const openTradingCard = async (dateKey: string, year: string) => {
    setTradingCardDateKey(dateKey);
    setTradingCardYear(year);
    setTcPhotos([]);
    setTcCaptions({});
    setTcPeople({});
    setTcNewsCache(null);
    setTcWeather(null);
    setTcEditingLocation(false);

    const hiddenRaw = await AsyncStorage.getItem('hidden_photos');
    setTcHiddenPhotos(hiddenRaw ? JSON.parse(hiddenRaw) : []);
    const coverRaw = await AsyncStorage.getItem('cover_photos');
    const coverMap: Record<string, string> = coverRaw ? JSON.parse(coverRaw) : {};
    setTcCoverPhotoId(coverMap[year] || '');

    const ctxRaw = await AsyncStorage.getItem(`day_context_${dateKey}`);
    setTcContext(ctxRaw ? JSON.parse(ctxRaw) : { ...emptyContext });
    setTcDescription((await AsyncStorage.getItem(`tc_description_${dateKey}`)) || '');
    setTcLocation((await AsyncStorage.getItem(`tc_location_${dateKey}`)) || '');
    setTcSaved((await AsyncStorage.getItem(`saved_day_${dateKey}`)) === 'true');

    setShowTradingCard(true);
    loadTcPhotos(dateKey);
    loadNewsForDay(dateKey, year);
  };

  const loadTcPhotos = async (dateKey: string) => {
    setTcPhotosLoading(true);
    const day = new Date(dateKey + 'T12:00:00');
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const result = await MediaLibrary.getAssetsAsync({
      mediaType: ['photo', 'video'],
      createdAfter: start.getTime(),
      createdBefore: end.getTime(),
      first: 30,
      sortBy: MediaLibrary.SortBy.creationTime,
    });

    const photos: TcPhoto[] = [];
    const captions: Record<string, string> = {};
    const people: Record<string, string[]> = {};
    for (const asset of result.assets) {
      let uri = asset.uri;
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        uri = info.localUri || asset.uri;
      } catch { }
      const cap = await AsyncStorage.getItem(`caption_${asset.id}`);
      if (cap) captions[asset.id] = cap;
      const ppl = await AsyncStorage.getItem(`people_${asset.id}`);
      if (ppl) people[asset.id] = JSON.parse(ppl);
      photos.push({ id: asset.id, uri, mediaType: asset.mediaType === 'video' ? 'video' : 'photo' });
    }
    setTcPhotos(photos);
    setTcCaptions(captions);
    setTcPeople(people);
    setTcPhotosLoading(false);
  };

  const saveTradingCard = async () => {
    await AsyncStorage.setItem(`saved_day_${tradingCardDateKey}`, 'true');
    await AsyncStorage.setItem(`tc_description_${tradingCardDateKey}`, tcDescription);
    await AsyncStorage.setItem(`tc_location_${tradingCardDateKey}`, tcLocation);
    setTcSaved(true);
    setShowTradingCard(false);
    loadVault();
  };

  const onTcDescriptionChange = (text: string) => {
    setTcDescription(text);
    if (descTimer.current) clearTimeout(descTimer.current);
    const dateKey = tradingCardDateKey;
    descTimer.current = setTimeout(() => {
      AsyncStorage.setItem(`tc_description_${dateKey}`, text);
    }, 500);
  };

  const saveTcLocation = () => {
    setTcEditingLocation(false);
    AsyncStorage.setItem(`tc_location_${tradingCardDateKey}`, tcLocation);
  };

  const tcSaveSinglePhoto = async (assetId: string) => {
    await AsyncStorage.setItem(`saved_day_${tradingCardDateKey}`, 'true');
    await AsyncStorage.setItem(`tc_single_photo_${tradingCardDateKey}`, assetId);
    setTcSaved(true);
    Alert.alert('Saved 🔒', 'This photo now represents this day in your vault.');
    loadVault();
  };

  const tcSetCover = async (assetId: string) => {
    const coverRaw = await AsyncStorage.getItem('cover_photos');
    const coverMap = coverRaw ? JSON.parse(coverRaw) : {};
    coverMap[tradingCardYear] = assetId;
    await AsyncStorage.setItem('cover_photos', JSON.stringify(coverMap));
    setTcCoverPhotoId(assetId);
    setTcPhotoMenuId(null);
    loadMemories();
  };

  const tcHidePhoto = async (assetId: string) => {
    const hiddenRaw = await AsyncStorage.getItem('hidden_photos');
    const hidden: string[] = hiddenRaw ? JSON.parse(hiddenRaw) : [];
    hidden.push(assetId);
    await AsyncStorage.setItem('hidden_photos', JSON.stringify(hidden));
    setTcHiddenPhotos(hidden);
    setTcPhotoMenuId(null);
    setMemoryList(prev => prev.filter(m => m.id !== assetId));
  };

  const tcSharePhoto = async (assetId: string) => {
    const photo = tcPhotos.find(p => p.id === assetId);
    if (photo) {
      try {
        await Share.share({ url: photo.uri, message: tcCaptions[assetId] || 'A memory from Chronicle' });
      } catch { }
    }
    setTcPhotoMenuId(null);
  };

  const tcCopyCaption = (assetId: string) => {
    const caption = tcCaptions[assetId];
    if (caption) {
      Clipboard.setString(caption);
      Alert.alert('Copied!', 'Caption copied to clipboard.');
    } else {
      Alert.alert('No caption', 'Add context to this photo first.');
    }
    setTcPhotoMenuId(null);
  };

  const saveTcCaption = async () => {
    if (!tcContextModal) return;
    await AsyncStorage.setItem(`caption_${tcContextModal}`, tcModalText);
    setTcCaptions(prev => ({ ...prev, [tcContextModal]: tcModalText }));
    setTcContextModal(null);
  };

  const saveTcTags = async () => {
    if (!tcTagModal) return;
    let selected = tcTagSelected;
    const pending = tcTagText.trim();
    if (pending && !selected.includes(pending)) selected = [...selected, pending];
    await AsyncStorage.setItem(`people_${tcTagModal}`, JSON.stringify(selected));
    setTcPeople(prev => ({ ...prev, [tcTagModal]: selected }));
    setTcTagModal(null);
    setTcTagText('');
  };

  const saveTcContextField = async () => {
    if (!tcContextField) return;
    const updated = { ...tcContext, [tcContextField]: tcModalText };
    setTcContext(updated);
    await AsyncStorage.setItem(`day_context_${tradingCardDateKey}`, JSON.stringify(updated));
    setTcContextField(null);
  };

  const tcAddToPlace = async (placeId: string) => {
    const updated = places.map(p => {
      if (p.id !== placeId) return p;
      if (tcPlaceScope === 'day' || tcPlaceModal === 'day') {
        const dayKeys = p.dayKeys.includes(tradingCardDateKey) ? p.dayKeys : [...p.dayKeys, tradingCardDateKey];
        return { ...p, dayKeys };
      }
      const photo = tcPhotos.find(ph => ph.id === tcPlaceModal);
      if (!photo) return p;
      const photoUris = p.photoUris.includes(photo.uri) ? p.photoUris : [...p.photoUris, photo.uri];
      return { ...p, photoUris };
    });
    await savePlaces(updated);
    setTcPlaceModal(null);
    setTcNewPlaceMode(false);
  };

  const tcCreatePlaceAndAdd = async () => {
    if (!newPlaceName.trim()) return;
    const newPlace: Place = {
      id: Date.now().toString(),
      type: newPlaceType,
      name: newPlaceName.trim(),
      locationName: '',
      coverPhotoUri: '',
      photoUris: [],
      dayKeys: [],
      context: {},
    };
    if (tcPlaceScope === 'day' || tcPlaceModal === 'day') {
      newPlace.dayKeys = [tradingCardDateKey];
    } else {
      const photo = tcPhotos.find(ph => ph.id === tcPlaceModal);
      if (photo) newPlace.photoUris = [photo.uri];
    }
    await savePlaces([...places, newPlace]);
    setNewPlaceName('');
    setNewPlaceType('home');
    setTcNewPlaceMode(false);
    setTcPlaceModal(null);
  };

  // ── NEWS FEED ──────────────────────────────────────────────────────────────

  const fetchWikipedia = async (dateKey: string, year: string) => {
    try {
      const [, mm, dd] = dateKey.split('-');
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/${mm}/${dd}`);
      if (!res.ok) return null;
      const data = await res.json();
      const yearNum = parseInt(year);
      const pool = [...(data.selected || []), ...(data.events || [])];
      const seen = new Set<string>();
      const events: WikiEvent[] = [];
      for (const e of pool) {
        if (!e.year || e.year < yearNum - 25 || e.year > yearNum + 5) continue;
        if (seen.has(e.text)) continue;
        seen.add(e.text);
        events.push({ year: e.year, text: e.text });
        if (events.length >= 5) break;
      }
      const b = (data.births || [])[0];
      const birth: WikiEvent | null = b ? { year: b.year, text: b.text } : null;
      return { events, birth };
    } catch {
      return null;
    }
  };

  const fetchFootball = async (dateKey: string) => {
    if (!FOOTBALL_API_KEY) return null;
    try {
      const availRaw = await AsyncStorage.getItem('football_requests_available');
      const resetRaw = await AsyncStorage.getItem('football_reset_time');
      if (availRaw !== null && parseInt(availRaw) < 3 && resetRaw && parseInt(resetRaw) > Date.now()) {
        return null;
      }
      const res = await fetch(
        `https://api.football-data.org/v4/matches?dateFrom=${dateKey}&dateTo=${dateKey}`,
        { headers: { 'X-Auth-Token': FOOTBALL_API_KEY } }
      );
      if (res.status === 429) return null;
      const avail = res.headers.get('X-RequestsAvailable') || res.headers.get('X-Requests-Available-Minute');
      if (avail) await AsyncStorage.setItem('football_requests_available', avail);
      const reset = res.headers.get('X-RequestCounter-Reset');
      if (reset) await AsyncStorage.setItem('football_reset_time', String(Date.now() + parseInt(reset) * 1000));
      if (!res.ok) return null;
      const data = await res.json();
      return (data.matches || []).slice(0, 5);
    } catch {
      return null;
    }
  };

  const fetchHistoricWeather = async (dateKey: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const res = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&start_date=${dateKey}&end_date=${dateKey}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
      );
      if (!res.ok) return null;
      const data = await res.json();
      const max = data?.daily?.temperature_2m_max?.[0];
      const min = data?.daily?.temperature_2m_min?.[0];
      const code = data?.daily?.weathercode?.[0];
      if (max == null || min == null) return null;
      return { max: Math.round(max), min: Math.round(min), emoji: wmoEmoji(code) };
    } catch {
      return null;
    }
  };

  const loadNewsForDay = async (dateKey: string, year: string) => {
    const showWiki = (await AsyncStorage.getItem('show_wikipedia_feed')) !== 'false';
    const showFootball = (await AsyncStorage.getItem('show_football_feed')) === 'true';
    const showWeather = (await AsyncStorage.getItem('show_weather_feed')) !== 'false';
    setNewsSettings({ wiki: showWiki, football: showFootball, weather: showWeather });

    const cachedRaw = await AsyncStorage.getItem(`news_cache_${dateKey}`);
    if (cachedRaw) {
      try {
        const cached: NewsCache = JSON.parse(cachedRaw);
        if (cached.fetchedAt && Date.now() - cached.fetchedAt < 30 * 24 * 60 * 60 * 1000) {
          setTcNewsCache(cached);
          setTcWeather(cached.weather);
          if (showFootball && !cached.football) {
            const fb = await fetchFootball(dateKey);
            if (fb) {
              const merged = { ...cached, football: fb };
              setTcNewsCache(merged);
              await AsyncStorage.setItem(`news_cache_${dateKey}`, JSON.stringify(merged));
            }
          }
          return;
        }
      } catch { }
    }

    const [wiki, football, weather] = await Promise.all([
      showWiki ? fetchWikipedia(dateKey, year) : Promise.resolve(null),
      showFootball ? fetchFootball(dateKey) : Promise.resolve(null),
      showWeather ? fetchHistoricWeather(dateKey) : Promise.resolve(null),
    ]);

    const cache: NewsCache = { fetchedAt: Date.now(), wikipedia: wiki, football, weather };
    setTcNewsCache(cache);
    setTcWeather(weather);
    await AsyncStorage.setItem(`news_cache_${dateKey}`, JSON.stringify(cache));
  };

  const toggleFootballFeed = async (value: boolean) => {
    setNewsSettings(prev => ({ ...prev, football: value }));
    await AsyncStorage.setItem('show_football_feed', value ? 'true' : 'false');
    if (value && tcNewsCache && !tcNewsCache.football) {
      const fb = await fetchFootball(tradingCardDateKey);
      if (fb) {
        const merged = { ...tcNewsCache, football: fb };
        setTcNewsCache(merged);
        await AsyncStorage.setItem(`news_cache_${tradingCardDateKey}`, JSON.stringify(merged));
      }
    }
  };

  // ── PEOPLE ─────────────────────────────────────────────────────────────────

  const openPersonProfile = async (name: string) => {
    const photos = vaultDays.flatMap(d => d.photos.filter(p => p.people.includes(name)));
    setPersonPhotos(photos);

    const dayKeysForPerson = personDayKeys[name] || [];
    const daysTogether = dayKeysForPerson.map(dateKey => {
      const vd = vaultDays.find(d => d.dateKey === dateKey);
      let thumb = vd?.thumbUri || null;
      if (!thumb && vd) {
        const ph = vd.photos.find(p => p.people.includes(name));
        thumb = ph?.uri || null;
      }
      return { dateKey, thumbUri: thumb };
    });
    setPersonDays(daysTogether);

    const about: Record<string, string> = {};
    for (const f of personAboutFields) {
      const v = await AsyncStorage.getItem(`person_${f.key}_${name}`);
      if (v) about[f.key] = v;
    }
    setPersonAbout(about);
    setShowPersonProfile(name);
  };

  const scheduleBirthday = async (name: string, text: string) => {
    try {
      let d = new Date(text);
      if (isNaN(d.getTime())) d = new Date(`${text} 2000`);
      if (isNaN(d.getTime())) return;
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🎂 It's ${name}'s birthday!`,
          body: `Capture a memory with ${name} today.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.YEARLY,
          month: d.getMonth() + 1,
          day: d.getDate(),
          hour: 9,
          minute: 0,
        } as any,
      });
    } catch { }
  };

  const savePersonAboutField = async () => {
    if (!showPersonProfile || !personAboutField) return;
    await AsyncStorage.setItem(`person_${personAboutField}_${showPersonProfile}`, personAboutText);
    setPersonAbout(prev => ({ ...prev, [personAboutField]: personAboutText }));
    if (personAboutField === 'bday' && personAboutText.trim()) {
      scheduleBirthday(showPersonProfile, personAboutText.trim());
    }
    setPersonAboutField(null);
  };

  const savePersonProfilePhoto = (name: string) => {
    Alert.alert('Profile photo', `Choose a photo for ${name}`, [
      {
        text: 'Take a photo', onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
          if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            await AsyncStorage.setItem(`person_photo_${name}`, uri);
            setPersonProfilePhotos(prev => ({ ...prev, [name]: uri }));
          }
        }
      },
      {
        text: 'Choose from camera roll', onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
          if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            await AsyncStorage.setItem(`person_photo_${name}`, uri);
            setPersonProfilePhotos(prev => ({ ...prev, [name]: uri }));
          }
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── PLACES ─────────────────────────────────────────────────────────────────

  const loadPlaces = async () => {
    const raw = await AsyncStorage.getItem('places');
    if (raw) setPlaces(JSON.parse(raw));
  };

  const savePlaces = async (updated: Place[]) => {
    await AsyncStorage.setItem('places', JSON.stringify(updated));
    setPlaces(updated);
  };

  const createPlace = async () => {
    if (!newPlaceName.trim()) return;
    const newPlace: Place = {
      id: Date.now().toString(),
      type: newPlaceType,
      name: newPlaceName.trim(),
      locationName: newPlaceLocation.trim(),
      latitude: newPlaceLat ?? undefined,
      longitude: newPlaceLon ?? undefined,
      coverPhotoUri: newPlaceCoverUri,
      photoUris: [],
      dayKeys: [],
      context: {},
    };
    await savePlaces([...places, newPlace]);
    setShowCreatePlace(false);
    setNewPlaceName('');
    setNewPlaceType('home');
    setNewPlaceLocation('');
    setNewPlaceCoverUri('');
    setNewPlaceLat(null);
    setNewPlaceLon(null);
  };

  const updatePlaceContext = async (field: string, value: string) => {
    if (!selectedPlace) return;
    const updated = places.map(p => p.id === selectedPlace.id ? { ...p, context: { ...p.context, [field]: value } } : p);
    await savePlaces(updated);
    setSelectedPlace(prev => prev ? { ...prev, context: { ...prev.context, [field]: value } } : null);
    setEditingPlaceField(null);
  };

  const addPhotoToPlace = async () => {
    if (!selectedPlace) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const updated = places.map(p => p.id === selectedPlace.id ? { ...p, photoUris: [...p.photoUris, uri] } : p);
    await savePlaces(updated);
    setSelectedPlace(prev => prev ? { ...prev, photoUris: [...prev.photoUris, uri] } : null);
  };

  const pickPlaceCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setNewPlaceCoverUri(result.assets[0].uri);
  };

  const onPlaceSearchChange = (text: string) => {
    setPlaceSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setPlaceSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text.trim())}&format=json&limit=5`,
          { headers: { 'User-Agent': 'ChronicleApp/1.0' } }
        );
        if (!res.ok) return;
        const data = await res.json();
        setPlaceSearchResults(data);
      } catch { }
    }, 400);
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lon, latitudeDelta: 0.1, longitudeDelta: 0.1 }, 600);
    setNewPlaceName(String(result.display_name || '').split(',')[0]);
    setNewPlaceLocation(result.display_name || '');
    setNewPlaceLat(lat);
    setNewPlaceLon(lon);
    setPlaceSearch('');
    setPlaceSearchResults([]);
    setShowCreatePlace(true);
  };

  // ── DERIVED DATA ───────────────────────────────────────────────────────────

  const groupedMemories = memoryList.reduce((groups, memory) => {
    if (!groups[memory.year]) groups[memory.year] = [];
    groups[memory.year].push(memory);
    return groups;
  }, {} as Record<string, Memory[]>);

  const currentYear = today.getFullYear();
  const photoYears = Object.keys(groupedMemories).map(Number);
  const oldestPhotoYear = photoYears.length > 0 ? Math.min(...photoYears) : null;
  const yearRows: { year: string; memories: Memory[] | null }[] = [];
  if (oldestPhotoYear) {
    for (let y = currentYear - 1; y >= oldestPhotoYear; y--) {
      yearRows.push({ year: String(y), memories: groupedMemories[String(y)] || null });
    }
  }

  const dayMap: Record<string, VaultDay> = {};
  vaultDays.forEach(d => { dayMap[d.dateKey] = d; });

  const vaultYears = [...new Set(vaultDays.map(d => d.dateKey.split('-')[0]))].sort().reverse();

  const monthsInSelectedYear = [...new Set(
    vaultDays
      .filter(d => d.dateKey.startsWith(selectedCalYear))
      .map(d => parseInt(d.dateKey.split('-')[1]) - 1)
  )].sort((a, b) => a - b);

  const allPeople = Object.keys(personDaysCount).filter(Boolean).sort();

  const tcDate = tradingCardDateKey ? new Date(tradingCardDateKey + 'T12:00:00') : null;
  const visibleTcPhotos = tcPhotos
    .filter(p => !tcHiddenPhotos.includes(p.id))
    .sort((a, b) => (a.id === tcCoverPhotoId ? -1 : b.id === tcCoverPhotoId ? 1 : 0));

  if (!permission?.granted) {
    return (
      <View style={styles.centreScreen}>
        <Text style={styles.permissionTitle}>Chronicle needs your photos</Text>
        <Text style={styles.permissionSubtitle}>Your photos never leave your device.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Give access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!fontsLoaded) return null;

  return (
    <View style={styles.outerContainer}>

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>The Past</Text>
            <Text style={styles.headerDate}>{dateString}</Text>
          </View>
          <TouchableOpacity style={styles.headerGear} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'today' && styles.tabButtonActive]} onPress={() => setActiveTab('today')}>
            <Text style={[styles.tabButtonText, activeTab === 'today' && styles.tabButtonTextActive]}>On This Day</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'vault' && styles.tabButtonActive]} onPress={() => setActiveTab('vault')}>
            <Text style={[styles.tabButtonText, activeTab === 'vault' && styles.tabButtonTextActive]}>Vault</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'places' && styles.tabButtonActive]} onPress={() => setActiveTab('places')}>
            <Text style={[styles.tabButtonText, activeTab === 'places' && styles.tabButtonTextActive]}>Places</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'people' && styles.tabButtonActive]} onPress={() => setActiveTab('people')}>
            <Text style={[styles.tabButtonText, activeTab === 'people' && styles.tabButtonTextActive]}>People</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ON THIS DAY */}
      {activeTab === 'today' && (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9b72ff" />
              <Text style={styles.loadingText}>Finding your memories...</Text>
            </View>
          ) : yearRows.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📷</Text>
              <Text style={styles.emptyTitle}>No memories found</Text>
              <Text style={styles.emptySubtitle}>You don&apos;t have any photos from this date in previous years.</Text>
            </View>
          ) : (
            <View style={styles.yearCardsList}>
              {yearRows.map(({ year, memories }) => {
                if (!memories) {
                  return (
                    <View key={year} style={styles.yearEmptyRow}>
                      <View style={styles.yearEmptyPill}>
                        <Text style={styles.yearEmptyPillText}>{year}</Text>
                      </View>
                      <Text style={styles.yearEmptyText}>No photos on this day</Text>
                    </View>
                  );
                }
                const firstMemory = memories[0];
                const cardDate = new Date(memories[0].date + 'T12:00:00');
                const dayName = cardDate.toLocaleDateString('en-GB', { weekday: 'long' });
                const dayNum = cardDate.getDate();
                const monthName = cardDate.toLocaleDateString('en-GB', { month: 'long' });
                return (
                  <AnimatedCard key={year} onPress={() => openTradingCard(memories[0].date, year)} style={styles.yearCard}>
                    {firstMemory.uri && (
                      <Image source={{ uri: firstMemory.uri }} style={styles.yearCardBg} resizeMode="cover" />
                    )}
                    <LinearGradient
                      colors={['rgba(13,10,20,0.18)', 'transparent', 'rgba(10,5,20,0.82)']}
                      locations={[0, 0.35, 1]}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View pointerEvents="none" style={styles.yearGhostWrap}>
                      <Text style={styles.yearGhost}>{year}</Text>
                    </View>
                    <View style={styles.yearBadge}>
                      <Text style={styles.yearBadgeText}>{year}</Text>
                    </View>
                    <View style={styles.yearCardBottom}>
                      <View style={styles.yearCardDivider} />
                      <View style={styles.yearCardBottomRow}>
                        <Text style={styles.yearDateLabel}>
                          <Text style={styles.yearDateDay}>{dayName}</Text> {dayNum} {monthName}
                        </Text>
                        <Text style={styles.yearPhotoCount}>{memories.length} photo{memories.length === 1 ? '' : 's'}</Text>
                      </View>
                    </View>
                  </AnimatedCard>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* YOUR VAULT */}
      {activeTab === 'vault' && (
        <View style={styles.container}>
          {vaultLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9b72ff" />
              <Text style={styles.loadingText}>Loading your vault...</Text>
            </View>
          ) : vaultDays.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔒</Text>
              <Text style={styles.emptyTitle}>Your Vault is empty</Text>
              <Text style={styles.emptySubtitle}>Open a year card and tap Save to keep that day forever.</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearPickerStrip} contentContainerStyle={styles.yearPickerContent}>
                {vaultYears.map(year => (
                  <TouchableOpacity key={year} style={[styles.yearPickerItem, selectedCalYear === year && styles.yearPickerItemActive]} onPress={() => setSelectedCalYear(year)}>
                    <Text style={[styles.yearPickerText, selectedCalYear === year && styles.yearPickerTextActive]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {monthsInSelectedYear.map(month => {
                  const year = parseInt(selectedCalYear);
                  const daysInMonth = getDaysInMonth(year, month);
                  const firstDay = getFirstDayOfMonth(year, month);
                  const monthName = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                  const todayStr = formatDateKey(new Date());
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
                          const dateKey = `${selectedCalYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const vaultDay = dayMap[dateKey];
                          const isToday = dateKey === todayStr;
                          const hasPhoto = !!vaultDay?.thumbUri;
                          return (
                            <TouchableOpacity
                              key={day}
                              style={styles.calSlot}
                              onPress={() => vaultDay ? openTradingCard(dateKey, dateKey.split('-')[0]) : null}
                              activeOpacity={vaultDay ? 0.75 : 1}
                            >
                              <View style={[
                                styles.calCard,
                                hasPhoto ? styles.calCardFilled : styles.calCardEmpty,
                                isToday && styles.calCardToday,
                              ]}>
                                {hasPhoto && (
                                  <Image
                                    source={{ uri: vaultDay!.thumbUri! }}
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

      {/* YOUR PLACES */}
      {activeTab === 'places' && (
        <View style={styles.container}>
          {placesView === 'map' ? (
            <View style={{ flex: 1 }}>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                mapType="mutedStandard"
                showsUserLocation
                initialRegion={mapRegion}
                onRegionChangeComplete={setMapRegion}
                onPress={() => setSelectedMapPlace(null)}
              >
                {places.filter(p => p.latitude != null && p.longitude != null).map(place => (
                  <Marker
                    key={place.id}
                    coordinate={{ latitude: place.latitude!, longitude: place.longitude! }}
                    onPress={() => setSelectedMapPlace(place)}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <View style={[styles.mapPinBubble, { backgroundColor: PIN_COLOURS[place.type] }]}>
                        <Text style={styles.mapPinText}>{place.name}</Text>
                      </View>
                      <View style={[styles.mapPinTriangle, { borderTopColor: PIN_COLOURS[place.type] }]} />
                    </View>
                  </Marker>
                ))}
              </MapView>

              {/* Search bar + results */}
              <View style={styles.mapSearchWrap}>
                <View style={styles.mapSearchBar}>
                  <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    style={styles.mapSearchInput}
                    placeholder="Search for a place..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={placeSearch}
                    onChangeText={onPlaceSearchChange}
                  />
                </View>
                {placeSearchResults.length > 0 && (
                  <View style={styles.mapSearchResults}>
                    {placeSearchResults.map((result, i) => (
                      <TouchableOpacity key={i} style={styles.mapSearchResultRow} onPress={() => selectSearchResult(result)}>
                        <Text style={styles.mapSearchResultName} numberOfLines={2}>{result.display_name}</Text>
                        <Text style={styles.mapSearchResultCoords}>{parseFloat(result.lat).toFixed(3)}, {parseFloat(result.lon).toFixed(3)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {places.length === 0 ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                  <View style={styles.placesEmptyWrap}>
                    <Ionicons name="map-outline" size={56} color="rgba(155,114,255,0.4)" />
                    <Text style={styles.placesEmptyTitle}>Your Places</Text>
                    <Text style={styles.placesEmptySubtitle}>Start building a map of your life.</Text>
                  </View>
                  <View style={{ marginTop: 32, marginHorizontal: 20, gap: 12 }}>
                    {placeAddButtons.map(btn => (
                      <TouchableOpacity
                        key={btn.type}
                        style={[styles.placeAddButton, { borderColor: PIN_COLOURS[btn.type] + '66', backgroundColor: PIN_COLOURS[btn.type] + '14' }]}
                        onPress={() => { setNewPlaceType(btn.type); setShowCreatePlace(true); }}
                      >
                        <Text style={styles.placeAddEmoji}>{btn.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.placeAddName}>{btn.name}</Text>
                          <Text style={styles.placeAddDesc}>{btn.desc}</Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={24} color={PIN_COLOURS[btn.type]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160, paddingTop: 60 }}>
                  {([
                    { type: 'home' as const, title: '🏠 Homes' },
                    { type: 'visited' as const, title: "✈️ Places I've Been" },
                    { type: 'meaningful' as const, title: '❤️ Places That Matter' },
                  ]).map(section => {
                    const sectionPlaces = places
                      .filter(p => p.type === section.type)
                      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
                    return (
                      <View key={section.type}>
                        <Text style={[styles.placeSectionHeader, { color: PIN_COLOURS[section.type] }]}>{section.title}</Text>
                        {sectionPlaces.length > 0 ? sectionPlaces.map(place => (
                          <AnimatedCard
                            key={place.id}
                            onPress={() => { setSelectedMapPlace(place); setSelectedPlace(place); setShowPlaceProfile(true); }}
                            style={[styles.placeCard, !place.coverPhotoUri && { borderColor: PIN_COLOURS[place.type] + '4D' }]}
                          >
                            {place.coverPhotoUri
                              ? <Image source={{ uri: place.coverPhotoUri }} style={[StyleSheet.absoluteFillObject, { opacity: 0.85 }]} resizeMode="cover" />
                              : <View style={[StyleSheet.absoluteFillObject, styles.placeCardNoCover]} />}
                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={[StyleSheet.absoluteFillObject, { top: '30%' }]} />
                            <View style={styles.placeTypeBadge}>
                              <Text style={styles.placeTypeBadgeText}>{place.type.toUpperCase()}</Text>
                            </View>
                            <View style={styles.placeCardBottom}>
                              <Text style={styles.placeCardName}>{place.name}</Text>
                              {!!place.locationName && <Text style={styles.placeCardLocation} numberOfLines={1}>{place.locationName}</Text>}
                              {!!place.startDate && (
                                <Text style={styles.placeCardDate}>{place.startDate}{place.endDate ? ` — ${place.endDate}` : ''}</Text>
                              )}
                            </View>
                            {place.photoUris.length > 0 && (
                              <View style={styles.placeCardPhotoCount}>
                                <Text style={styles.placeCardPhotoCountText}>{place.photoUris.length} photo{place.photoUris.length === 1 ? '' : 's'}</Text>
                              </View>
                            )}
                          </AnimatedCard>
                        )) : <Text style={styles.placeEmptyText}>None added yet.</Text>}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* Map/List toggle */}
          <View style={styles.mapToggle}>
            {(['map', 'list'] as const).map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.mapToggleSegment, placesView === v && styles.mapToggleSegmentActive]}
                onPress={() => { setPlacesView(v); setSelectedMapPlace(null); }}
              >
                <Text style={[styles.mapToggleText, placesView === v && styles.mapToggleTextActive]}>{v === 'map' ? 'Map' : 'List'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected place bottom card */}
          {placesView === 'map' && selectedMapPlace && (
            <View style={styles.mapBottomCard}>
              <TouchableOpacity style={styles.mapBottomCardClose} onPress={() => setSelectedMapPlace(null)}>
                <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => { setSelectedPlace(selectedMapPlace); setShowPlaceProfile(true); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapBottomCardName}>{selectedMapPlace.name}</Text>
                  {!!selectedMapPlace.locationName && (
                    <Text style={styles.mapBottomCardLocation} numberOfLines={1}>{selectedMapPlace.locationName}</Text>
                  )}
                </View>
                <View style={[styles.placeTypePill, { marginRight: 8 }]}>
                  <Text style={styles.placeTypePillText}>{selectedMapPlace.type.toUpperCase()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          )}

          {/* Add place FAB */}
          {!(placesView === 'map' && selectedMapPlace) && (
            <TouchableOpacity style={styles.placeFab} onPress={() => setShowCreatePlace(true)}>
              <Ionicons name="add" size={26} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* YOUR PEOPLE */}
      {activeTab === 'people' && (
        <View style={styles.container}>
          {vaultLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9b72ff" />
              <Text style={styles.loadingText}>Loading your people...</Text>
            </View>
          ) : allPeople.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyTitle}>Your People</Text>
              <Text style={styles.emptySubtitle}>People you tag in your photos will appear here.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Your People</Text>
              <View style={styles.friendsGrid}>
                {allPeople.map(person => (
                  <TouchableOpacity key={person} style={styles.friendCard} onPress={() => openPersonProfile(person)}>
                    <View style={styles.friendAvatarWrap}>
                      {personProfilePhotos[person] ? (
                        <Image source={{ uri: personProfilePhotos[person] }} style={styles.friendAvatarPhoto} />
                      ) : (
                        <View style={styles.friendAvatarInner}>
                          <Text style={styles.friendAvatarInitial}>{person.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.friendName} numberOfLines={1}>{person}</Text>
                    <Text style={styles.friendDays}>{personDaysCount[person] || 0} day{(personDaysCount[person] || 0) === 1 ? '' : 's'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* ═══ THE TRADING CARD ═══ */}
      <Modal
        visible={showTradingCard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTradingCard(false)}
      >
        <View style={styles.tcContainer}>
          <TouchableOpacity style={styles.tcClose} onPress={() => setShowTradingCard(false)}>
            <Ionicons name="chevron-down" size={26} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tcSaveBtn} onPress={saveTradingCard}>
            <Text style={styles.tcSaveBtnText}>Save</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
            {/* Date block */}
            <View style={styles.tcDateBlock}>
              <Text style={styles.tcDayOfWeek}>{tcDate?.toLocaleDateString('en-GB', { weekday: 'long' })}</Text>
              <Text style={styles.tcDateBig}>
                {tcDate?.getDate()} {tcDate?.toLocaleDateString('en-GB', { month: 'long' })} {tradingCardYear}
              </Text>
            </View>

            {/* Info strip */}
            <View style={styles.tcInfoStrip}>
              {tcWeather && (
                <View style={styles.tcPill}>
                  <Text style={styles.tcPillText}>{tcWeather.emoji} {tcWeather.max}°C</Text>
                </View>
              )}
              {tcEditingLocation ? (
                <View style={styles.tcPill}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.6)" />
                  <TextInput
                    style={styles.tcPillInput}
                    value={tcLocation}
                    onChangeText={setTcLocation}
                    autoFocus
                    placeholder="Where were you?"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    onBlur={saveTcLocation}
                    onSubmitEditing={saveTcLocation}
                  />
                </View>
              ) : (
                <TouchableOpacity style={styles.tcPill} onPress={() => setTcEditingLocation(true)}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={[styles.tcPillText, !tcLocation && styles.tcPillTextMuted]}>
                    {tcLocation || 'Add location'}
                  </Text>
                </TouchableOpacity>
              )}
              {tcSaved && (
                <View style={styles.tcSavedPill}>
                  <Text style={styles.tcSavedPillText}>In Vault</Text>
                </View>
              )}
            </View>

            {/* Photos section */}
            <Text style={styles.tcSectionTitle}>Photos</Text>
            {tcPhotosLoading ? (
              <ActivityIndicator size="small" color="#9b72ff" style={{ marginVertical: 24 }} />
            ) : visibleTcPhotos.length === 0 ? (
              <Text style={styles.tcNoPhotosText}>No photos from this day.</Text>
            ) : (
              visibleTcPhotos.map(photo => (
                <View key={photo.id} style={styles.tcPhotoCard}>
                  <View>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setTcFullscreenPhoto(photo.uri)}>
                      <Image source={{ uri: photo.uri }} style={styles.tcPhotoImage} resizeMode="cover" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tcPhotoMenuBtn} onPress={() => setTcPhotoMenuId(photo.id)}>
                      <Ionicons name="ellipsis-horizontal" size={16} color="#ffffff" />
                    </TouchableOpacity>
                    {photo.id === tcCoverPhotoId && (
                      <View style={styles.tcCoverBadge}>
                        <Text style={styles.tcCoverBadgeText}>Cover</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={styles.tcSingleSaveRow} onPress={() => tcSaveSinglePhoto(photo.id)}>
                    <Ionicons name="bookmark-outline" size={14} color="rgba(255,255,255,0.35)" />
                    <Text style={styles.tcSingleSaveText}>Save just this photo</Text>
                  </TouchableOpacity>
                  <View style={styles.tcActionRow}>
                    <TouchableOpacity
                      style={styles.tcActionBtn}
                      onPress={() => { setTcModalText(tcCaptions[photo.id] || ''); setTcContextModal(photo.id); }}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={tcCaptions[photo.id] ? '#9b72ff' : 'rgba(255,255,255,0.4)'} />
                      <Text style={[styles.tcActionText, tcCaptions[photo.id] ? styles.tcActionTextActive : null]}>Add context</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.tcActionBtn}
                      onPress={() => { setTcTagSelected(tcPeople[photo.id] || []); setTcTagText(''); setTcTagModal(photo.id); }}
                    >
                      <Ionicons name="people-outline" size={16} color={tcPeople[photo.id]?.length ? '#9b72ff' : 'rgba(255,255,255,0.4)'} />
                      <Text style={[styles.tcActionText, tcPeople[photo.id]?.length ? styles.tcActionTextActive : null]}>Tag people</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.tcActionBtn}
                      onPress={() => { setTcPlaceScope('photo'); setTcNewPlaceMode(false); setTcPlaceModal(photo.id); }}
                    >
                      <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.tcActionText}>Add to place</Text>
                    </TouchableOpacity>
                  </View>
                  {tcCaptions[photo.id] ? (
                    <Text style={styles.tcCaption}>{`"${tcCaptions[photo.id]}"`}</Text>
                  ) : null}
                  {tcPeople[photo.id]?.length ? (
                    <View style={styles.tcPeopleRow}>
                      {tcPeople[photo.id].map(name => (
                        <View key={name} style={styles.tcPersonChip}>
                          <Text style={styles.tcPersonChipText}>{name}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))
            )}

            {/* Description */}
            <Text style={styles.tcSectionTitleSmall}>What were you doing?</Text>
            <TextInput
              style={styles.tcDescInput}
              multiline
              value={tcDescription}
              onChangeText={onTcDescriptionChange}
              placeholder="Describe your day..."
              placeholderTextColor="rgba(255,255,255,0.25)"
            />

            {/* Context fields */}
            <Text style={[styles.tcSectionTitleSmall, { marginTop: 24 }]}>Where you were</Text>
            {contextFields.map(field => {
              const val = tcContext[field.key as keyof DayContext];
              return (
                <TouchableOpacity
                  key={field.key}
                  style={styles.tcContextRow}
                  onPress={() => { setTcModalText(val || ''); setTcContextField(field.key); }}
                >
                  <Text style={styles.tcContextLabel}>{field.emoji} {field.label}</Text>
                  {val
                    ? <Text style={styles.tcContextValue}>{val}</Text>
                    : <Text style={styles.tcContextEmpty}>Tap to add...</Text>}
                </TouchableOpacity>
              );
            })}

            {/* News feed */}
            <View style={styles.tcNewsHeaderRow}>
              <Text style={styles.tcSectionTitleSmall}>The World That Day</Text>
              <TouchableOpacity onPress={() => { setShowTradingCard(false); router.push('/settings'); }}>
                <Ionicons name="options-outline" size={18} color="rgba(155,114,255,0.6)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.tcNewsSubheader}>
              {tcDate?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>

            {!tcNewsCache ? (
              <ActivityIndicator size="small" color="#9b72ff" style={{ marginVertical: 20 }} />
            ) : (
              <>
                {newsSettings.wiki && tcNewsCache.wikipedia?.events?.map((ev, i) => (
                  <View key={`ev-${i}`} style={styles.tcNewsCard}>
                    <View style={styles.tcNewsTopRow}>
                      <View style={styles.tcNewsYearPill}>
                        <Text style={styles.tcNewsYearPillText}>{ev.year}</Text>
                      </View>
                      <Text style={styles.tcNewsIcon}>📅</Text>
                    </View>
                    <Text style={styles.tcNewsText}>{ev.text}</Text>
                    <Text style={styles.tcNewsSource}>Wikipedia</Text>
                  </View>
                ))}
                {newsSettings.wiki && tcNewsCache.wikipedia?.birth && (
                  <View style={styles.tcNewsCard}>
                    <View style={styles.tcNewsTopRow}>
                      <View style={styles.tcNewsYearPill}>
                        <Text style={styles.tcNewsYearPillText}>{tcNewsCache.wikipedia.birth.year}</Text>
                      </View>
                      <Text style={styles.tcNewsIcon}>🎂</Text>
                    </View>
                    <Text style={styles.tcNewsText}>{tcNewsCache.wikipedia.birth.text}</Text>
                    <Text style={styles.tcNewsSource}>Born on this day · Wikipedia</Text>
                  </View>
                )}

                <View style={styles.tcFootballHeaderRow}>
                  <Text style={styles.tcFootballHeaderText}>⚽ Football</Text>
                  <Switch
                    value={newsSettings.football}
                    onValueChange={toggleFootballFeed}
                    trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(155,114,255,0.6)' }}
                    thumbColor="#ffffff"
                  />
                </View>
                {newsSettings.football && tcNewsCache.football && tcNewsCache.football.length > 0 && tcNewsCache.football.slice(0, 5).map((m: any, i: number) => (
                  <View key={`fb-${i}`} style={styles.tcNewsCard}>
                    <Text style={styles.tcMatchComp}>⚽ {m.competition?.name || 'Football'}</Text>
                    <View style={styles.tcMatchRow}>
                      <Text style={styles.tcMatchTeam} numberOfLines={1}>{m.homeTeam?.shortName || m.homeTeam?.name || 'Home'}</Text>
                      <Text style={styles.tcMatchScore}>{m.score?.fullTime?.home ?? '–'} — {m.score?.fullTime?.away ?? '–'}</Text>
                      <Text style={[styles.tcMatchTeam, { textAlign: 'right' }]} numberOfLines={1}>{m.awayTeam?.shortName || m.awayTeam?.name || 'Away'}</Text>
                    </View>
                    <Text style={styles.tcMatchStatus}>{m.status === 'FINISHED' ? 'FT' : m.status}</Text>
                  </View>
                ))}
                {newsSettings.football && (!tcNewsCache.football || tcNewsCache.football.length === 0) && (
                  <Text style={styles.tcNoPhotosText}>No football results for this day.</Text>
                )}

                {newsSettings.weather && tcWeather && (
                  <View style={styles.tcNewsCard}>
                    <Text style={styles.tcNewsText}>🌤️ The weather that day</Text>
                    <Text style={styles.tcWeatherBig}>{tcWeather.emoji} {tcWeather.max}°C / {tcWeather.min}°C</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Three dot photo menu — nested */}
          <Modal visible={tcPhotoMenuId !== null} animationType="slide" transparent>
            <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setTcPhotoMenuId(null)}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View style={styles.menuBox}>
                <Text style={styles.menuTitle}>Photo options</Text>
                <TouchableOpacity style={styles.menuItem} onPress={() => tcSetCover(tcPhotoMenuId!)}>
                  <Text style={styles.menuItemEmoji}>⭐</Text>
                  <View>
                    <Text style={styles.menuItemText}>Set as cover photo</Text>
                    <Text style={styles.menuItemSub}>Use this as the {tradingCardYear} card thumbnail</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => tcSharePhoto(tcPhotoMenuId!)}>
                  <Text style={styles.menuItemEmoji}>📤</Text>
                  <View>
                    <Text style={styles.menuItemText}>Share photo</Text>
                    <Text style={styles.menuItemSub}>Share this photo or save it elsewhere</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => tcCopyCaption(tcPhotoMenuId!)}>
                  <Text style={styles.menuItemEmoji}>📋</Text>
                  <View>
                    <Text style={styles.menuItemText}>Copy caption</Text>
                    <Text style={styles.menuItemSub}>Copy the caption text to clipboard</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={() => {
                  Alert.alert('Hide photo', 'This photo will be hidden from Chronicle. It stays on your camera roll.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Hide', style: 'destructive', onPress: () => tcHidePhoto(tcPhotoMenuId!) },
                  ]);
                }}>
                  <Text style={styles.menuItemEmoji}>🙈</Text>
                  <View>
                    <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Hide this photo</Text>
                    <Text style={styles.menuItemSub}>Remove from Chronicle — stays on your camera roll</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuCancel} onPress={() => setTcPhotoMenuId(null)}>
                  <Text style={styles.menuCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Fullscreen photo — nested */}
          <Modal visible={tcFullscreenPhoto !== null} animationType="fade">
            <View style={{ flex: 1, backgroundColor: '#000000' }}>
              {tcFullscreenPhoto && (
                <Image source={{ uri: tcFullscreenPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              )}
              <TouchableOpacity style={styles.tcFullscreenClose} onPress={() => setTcFullscreenPhoto(null)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Modal>

          {/* Photo caption ("Add context") — nested */}
          <Modal visible={tcContextModal !== null} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Add context</Text>
                  <Text style={styles.modalSubtitle}>What do you remember about this photo?</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Write something for future you..."
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    multiline
                    value={tcModalText}
                    onChangeText={setTcModalText}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={saveTcCaption}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setTcContextModal(null)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>

          {/* Tag people — nested */}
          <Modal visible={tcTagModal !== null} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Tag people</Text>
                  <Text style={styles.modalSubtitle}>Who&apos;s in this photo?</Text>
                  {[...new Set([...allPeople, ...tcTagSelected])].length > 0 && (
                    <View style={styles.tcTagChipsWrap}>
                      {[...new Set([...allPeople, ...tcTagSelected])].map(name => {
                        const selected = tcTagSelected.includes(name);
                        return (
                          <TouchableOpacity
                            key={name}
                            style={[styles.tcTagChip, selected && styles.tcTagChipActive]}
                            onPress={() => setTcTagSelected(prev =>
                              selected ? prev.filter(n => n !== name) : [...prev, name]
                            )}
                          >
                            <Text style={[styles.tcTagChipText, selected && styles.tcTagChipTextActive]}>{name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <View style={styles.tcTagInputRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1, minHeight: 44, marginBottom: 0 }]}
                      placeholder="Add a new name..."
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={tcTagText}
                      onChangeText={setTcTagText}
                      onSubmitEditing={() => {
                        const name = tcTagText.trim();
                        if (name && !tcTagSelected.includes(name)) setTcTagSelected(prev => [...prev, name]);
                        setTcTagText('');
                      }}
                    />
                    <TouchableOpacity
                      style={styles.tcTagAddBtn}
                      onPress={() => {
                        const name = tcTagText.trim();
                        if (name && !tcTagSelected.includes(name)) setTcTagSelected(prev => [...prev, name]);
                        setTcTagText('');
                      }}
                    >
                      <Ionicons name="add" size={22} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[styles.saveButton, { marginTop: 16 }]} onPress={saveTcTags}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => { setTcTagModal(null); setTcTagText(''); }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>

          {/* Add to place — nested */}
          <Modal visible={tcPlaceModal !== null} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Add to a place</Text>
                  {tcPlaceModal !== 'day' && (
                    <View style={styles.tcScopeRow}>
                      <TouchableOpacity
                        style={[styles.tcScopePill, tcPlaceScope === 'photo' && styles.tcScopePillActive]}
                        onPress={() => setTcPlaceScope('photo')}
                      >
                        <Text style={[styles.tcScopeText, tcPlaceScope === 'photo' && styles.tcScopeTextActive]}>Just this photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tcScopePill, tcPlaceScope === 'day' && styles.tcScopePillActive]}
                        onPress={() => setTcPlaceScope('day')}
                      >
                        <Text style={[styles.tcScopeText, tcPlaceScope === 'day' && styles.tcScopeTextActive]}>The whole day</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {tcNewPlaceMode ? (
                    <>
                      <TextInput
                        style={styles.createPlaceInput}
                        placeholder="Place name..."
                        placeholderTextColor="rgba(255,255,255,0.25)"
                        value={newPlaceName}
                        onChangeText={setNewPlaceName}
                        autoFocus
                      />
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                        {(['home', 'visited', 'meaningful'] as const).map(t => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.createPlaceTypePill, newPlaceType === t && styles.createPlaceTypePillActive]}
                            onPress={() => setNewPlaceType(t)}
                          >
                            <Text style={[styles.createPlaceTypePillText, newPlaceType === t && { color: '#fff' }]}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity style={styles.saveButton} onPress={tcCreatePlaceAndAdd}>
                        <Text style={styles.saveButtonText}>Create & add</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <ScrollView style={{ maxHeight: 260 }}>
                      {places.map(p => (
                        <TouchableOpacity key={p.id} style={styles.addToPlaceRow} onPress={() => tcAddToPlace(p.id)}>
                          <Text style={styles.addToPlaceRowName}>{p.name}</Text>
                          <View style={styles.placeTypePill}>
                            <Text style={styles.placeTypePillText}>{p.type.toUpperCase()}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity style={styles.addToPlaceNewBtn} onPress={() => setTcNewPlaceMode(true)}>
                        <Text style={styles.addToPlaceNewBtnText}>＋ Create new place</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  )}
                  <TouchableOpacity style={styles.cancelButton} onPress={() => { setTcPlaceModal(null); setTcNewPlaceMode(false); }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>

          {/* Day context field editor — nested */}
          <Modal visible={tcContextField !== null} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>{contextFields.find(f => f.key === tcContextField)?.label || ''}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={contextFields.find(f => f.key === tcContextField)?.placeholder || ''}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    multiline
                    value={tcModalText}
                    onChangeText={setTcModalText}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={saveTcContextField}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setTcContextField(null)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </View>
      </Modal>

      {/* ═══ PERSON PROFILE ═══ */}
      <Modal
        visible={showPersonProfile !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPersonProfile(null)}
      >
        <View style={styles.personModal}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            {/* Header */}
            <View style={styles.personHeader}>
              {showPersonProfile && personProfilePhotos[showPersonProfile] ? (
                <Image source={{ uri: personProfilePhotos[showPersonProfile] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(155,114,255,0.15)', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={styles.personHeaderInitial}>{showPersonProfile?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <LinearGradient colors={['transparent', '#17102a']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }} />
              <TouchableOpacity style={styles.personClose} onPress={() => setShowPersonProfile(null)}>
                <Ionicons name="chevron-down" size={26} color="#ffffff" />
              </TouchableOpacity>
              <View style={{ position: 'absolute', bottom: 14, left: 16 }}>
                <Text style={styles.personHeaderName}>{showPersonProfile}</Text>
                <Text style={styles.personHeaderDays}>
                  {showPersonProfile ? (personDaysCount[showPersonProfile] || 0) : 0} day{(showPersonProfile ? (personDaysCount[showPersonProfile] || 0) : 0) === 1 ? '' : 's'} documented together
                </Text>
              </View>
              <TouchableOpacity
                style={styles.personEditPhotoBtn}
                onPress={() => showPersonProfile && savePersonProfilePhoto(showPersonProfile)}
              >
                <Text style={styles.personEditPhotoText}>📷 Edit photo</Text>
              </TouchableOpacity>
            </View>

            {/* About */}
            <Text style={styles.personSectionTitle}>About</Text>
            {personAboutFields.map(field => {
              const val = personAbout[field.key] || '';
              return (
                <TouchableOpacity
                  key={field.key}
                  style={styles.tcContextRow}
                  onPress={() => { setPersonAboutText(val); setPersonAboutField(field.key); }}
                >
                  <Text style={styles.tcContextLabel}>{field.emoji} {field.label}</Text>
                  {val
                    ? <Text style={styles.tcContextValue}>{val}</Text>
                    : <Text style={styles.tcContextEmpty}>Tap to add...</Text>}
                </TouchableOpacity>
              );
            })}

            {/* Days together */}
            <Text style={styles.personSectionTitle}>Days Together</Text>
            <Text style={styles.personCountText}>
              {personDays.length} day{personDays.length === 1 ? '' : 's'} together
            </Text>
            {personDays.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                {personDays.map(d => {
                  const dDate = new Date(d.dateKey + 'T12:00:00');
                  return (
                    <TouchableOpacity
                      key={d.dateKey}
                      style={styles.personDayCard}
                      onPress={() => {
                        setShowPersonProfile(null);
                        setTimeout(() => openTradingCard(d.dateKey, d.dateKey.split('-')[0]), 350);
                      }}
                    >
                      {d.thumbUri
                        ? <Image source={{ uri: d.thumbUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(155,114,255,0.12)' }]} />}
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={[StyleSheet.absoluteFillObject, { top: '50%' }]} />
                      <Text style={styles.personDayDate}>
                        {dDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Photos together */}
            <Text style={styles.personSectionTitle}>Photos Together</Text>
            <Text style={styles.personCountText}>
              {personPhotos.length} photo{personPhotos.length === 1 ? '' : 's'}
            </Text>
            {personPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                {personPhotos.map((photo, i) => (
                  <TouchableOpacity key={i} onPress={() => setPersonFullscreenUri(photo.uri)}>
                    <Image source={{ uri: photo.uri }} style={styles.personPhotoThumb} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </ScrollView>

          {/* About field editor — nested */}
          <Modal visible={personAboutField !== null} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>{personAboutFields.find(f => f.key === personAboutField)?.label || ''}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={personAboutFields.find(f => f.key === personAboutField)?.placeholder || ''}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    multiline
                    value={personAboutText}
                    onChangeText={setPersonAboutText}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={savePersonAboutField}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setPersonAboutField(null)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>

          {/* Fullscreen photo — nested */}
          <Modal visible={personFullscreenUri !== null} animationType="fade">
            <View style={{ flex: 1, backgroundColor: '#000000' }}>
              {personFullscreenUri && (
                <Image source={{ uri: personFullscreenUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              )}
              <TouchableOpacity style={styles.tcFullscreenClose} onPress={() => setPersonFullscreenUri(null)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Modal>
        </View>
      </Modal>

      {/* ═══ PLACE PROFILE ═══ */}
      <Modal
        visible={showPlaceProfile && selectedPlace !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlaceProfile(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#17102a' }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            {/* Cover header */}
            <View style={{ height: 280 }}>
              {selectedPlace?.coverPhotoUri
                ? <Image source={{ uri: selectedPlace.coverPhotoUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(155,114,255,0.08)' }]} />}
              <LinearGradient colors={['transparent', '#17102a']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }} />
              <TouchableOpacity style={styles.placeProfileClose} onPress={() => setShowPlaceProfile(false)}>
                <Ionicons name="chevron-down" size={28} color="#ffffff" />
              </TouchableOpacity>
              <View style={styles.placeTypeBadgeTop}>
                <Text style={styles.placeTypeBadgeText}>{selectedPlace?.type.toUpperCase()}</Text>
              </View>
              <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                <Text style={styles.placeProfileName}>{selectedPlace?.name}</Text>
                {!!selectedPlace?.locationName && <Text style={styles.placeProfileLocation} numberOfLines={1}>{selectedPlace.locationName}</Text>}
                {!!selectedPlace?.startDate && (
                  <Text style={styles.placeProfileDate}>{selectedPlace.startDate}{selectedPlace.endDate ? ` — ${selectedPlace.endDate}` : ''}</Text>
                )}
              </View>
            </View>

            {/* View on map */}
            {selectedPlace?.latitude != null && selectedPlace?.longitude != null && (
              <TouchableOpacity style={styles.placeViewMapBtn} onPress={() => setShowPlaceMapModal(true)}>
                <Ionicons name="map-outline" size={16} color="#9b72ff" />
                <Text style={styles.placeViewMapBtnText}>View on Map</Text>
              </TouchableOpacity>
            )}

            {/* Context fields */}
            <Text style={styles.placeProfileSectionTitle}>About this place</Text>
            {selectedPlace && (placeContextFields[selectedPlace.type] || []).map(field => {
              const val = selectedPlace.context[field.key as keyof PlaceContext] || '';
              return (
                <TouchableOpacity key={field.key} style={styles.tcContextRow} onPress={() => { setPlaceFieldText(val); setEditingPlaceField(field.key); }}>
                  <Text style={styles.tcContextLabel}>{field.emoji} {field.label}</Text>
                  {val ? <Text style={styles.tcContextValue}>{val}</Text> : <Text style={styles.tcContextEmpty}>Tap to add...</Text>}
                </TouchableOpacity>
              );
            })}

            {/* Photos */}
            <Text style={styles.placeProfileSectionTitle}>Photos</Text>
            {(!selectedPlace?.photoUris || selectedPlace.photoUris.length === 0) ? (
              <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                <Text style={styles.placeEmptyText}>No photos added yet.</Text>
                <TouchableOpacity style={styles.placeAddPhotoBtn} onPress={addPhotoToPlace}>
                  <Text style={styles.placeAddPhotoBtnText}>Add photos</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                {selectedPlace.photoUris.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={{ width: 100, height: 130, borderRadius: 8 }} resizeMode="cover" />
                ))}
                <TouchableOpacity onPress={addPhotoToPlace} style={{ width: 100, height: 130, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(155,114,255,0.25)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="add" size={28} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Linked days */}
            <Text style={styles.placeProfileSectionTitle}>Days here</Text>
            {(!selectedPlace?.dayKeys || selectedPlace.dayKeys.length === 0) ? (
              <Text style={[styles.placeEmptyText, { paddingHorizontal: 16 }]}>No days linked yet.</Text>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                {selectedPlace.dayKeys.map(dateKey => {
                  const vd = vaultDays.find(d => d.dateKey === dateKey);
                  const displayDate = vd?.displayDate || new Date(dateKey + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                  return (
                    <TouchableOpacity
                      key={dateKey}
                      style={styles.placeLinkedDayRow}
                      onPress={() => {
                        setShowPlaceProfile(false);
                        setTimeout(() => openTradingCard(dateKey, dateKey.split('-')[0]), 350);
                      }}
                    >
                      {vd?.thumbUri && <Image source={{ uri: vd.thumbUri }} style={styles.placeLinkedDayThumb} />}
                      <Text style={styles.placeLinkedDayDate}>{displayDate}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Context field editor — nested */}
          <Modal visible={editingPlaceField !== null} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>
                    {selectedPlace ? (placeContextFields[selectedPlace.type] || []).find(f => f.key === editingPlaceField)?.label || '' : ''}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={selectedPlace ? (placeContextFields[selectedPlace.type] || []).find(f => f.key === editingPlaceField)?.placeholder || '' : ''}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    multiline
                    value={placeFieldText}
                    onChangeText={setPlaceFieldText}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={() => updatePlaceContext(editingPlaceField!, placeFieldText)}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingPlaceField(null)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>

          {/* View on map — nested */}
          <Modal visible={showPlaceMapModal} animationType="slide" transparent={false}>
            <View style={{ flex: 1, backgroundColor: '#17102a' }}>
              {selectedPlace?.latitude != null && selectedPlace?.longitude != null && (
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  mapType="mutedStandard"
                  initialRegion={{
                    latitude: selectedPlace.latitude,
                    longitude: selectedPlace.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  <Marker coordinate={{ latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={[styles.mapPinBubble, { backgroundColor: PIN_COLOURS[selectedPlace.type] }]}>
                        <Text style={styles.mapPinText}>{selectedPlace.name}</Text>
                      </View>
                      <View style={[styles.mapPinTriangle, { borderTopColor: PIN_COLOURS[selectedPlace.type] }]} />
                    </View>
                  </Marker>
                </MapView>
              )}
              <TouchableOpacity style={styles.tcFullscreenClose} onPress={() => setShowPlaceMapModal(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Modal>
        </View>
      </Modal>

      {/* ═══ CREATE PLACE ═══ */}
      <Modal visible={showCreatePlace} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={[styles.modalBox, { maxHeight: '90%' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.modalTitle}>New Place</Text>
                <TouchableOpacity onPress={() => setShowCreatePlace(false)}>
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.createPlaceLabel}>What kind of place?</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {(['home', 'visited', 'meaningful'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.createPlaceTypePill, newPlaceType === t && styles.createPlaceTypePillActive]} onPress={() => setNewPlaceType(t)}>
                      <Text style={[styles.createPlaceTypePillText, newPlaceType === t && { color: '#fff' }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.createPlaceLabel}>
                  {newPlaceType === 'home' ? 'What did you call this place?' : newPlaceType === 'visited' ? 'Where did you go?' : 'What do you call this place?'}
                </Text>
                <TextInput style={styles.createPlaceInput} placeholder="Place name..." placeholderTextColor="rgba(255,255,255,0.25)" value={newPlaceName} onChangeText={setNewPlaceName} />
                <Text style={styles.createPlaceLabel}>Address or location (optional)</Text>
                <TextInput style={styles.createPlaceInput} placeholder="City, country..." placeholderTextColor="rgba(255,255,255,0.25)" value={newPlaceLocation} onChangeText={setNewPlaceLocation} />
                <Text style={styles.createPlaceLabel}>Cover photo (optional)</Text>
                <TouchableOpacity style={styles.createPlaceCoverBtn} onPress={pickPlaceCover}>
                  {newPlaceCoverUri
                    ? <Image source={{ uri: newPlaceCoverUri }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                    : <>
                        <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.3)" />
                        <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 8, fontSize: 14 }}>Tap to add cover photo</Text>
                      </>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { marginTop: 16 }]} onPress={createPlace}>
                  <Text style={styles.saveButtonText}>Create Place</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#17102a' },
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#17102a' },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: { fontSize: 32, fontFamily: 'Fraunces_800ExtraBold', color: '#ffffff' },
  headerDate: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  headerGear: { padding: 4, marginTop: 6 },
  tabSwitcher: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  tabButtonActive: { backgroundColor: 'rgba(155,114,255,0.18)', borderColor: 'rgba(155,114,255,0.35)' },
  tabButtonText: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.3)' },
  tabButtonTextActive: { color: '#ffffff', fontWeight: '700' },
  centreScreen: { flex: 1, backgroundColor: '#17102a', justifyContent: 'center', alignItems: 'center', padding: 32 },
  permissionTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 16 },
  permissionSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  permissionButton: { backgroundColor: '#9b72ff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  permissionButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  loadingContainer: { paddingTop: 80, alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.35)', marginTop: 16, fontSize: 15 },
  emptyState: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 22 },
  sectionTitle: { fontSize: 22, fontFamily: 'Fraunces_800ExtraBold', color: '#ffffff', marginBottom: 4, letterSpacing: -0.5 },

  // On This Day — year cards
  yearCardsList: { padding: 16, gap: 16, paddingBottom: 100 },
  yearCard: { width: '100%', height: 230, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1e1535', borderWidth: 1.5, borderColor: 'rgba(155,114,255,0.3)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  yearCardBg: { ...StyleSheet.absoluteFillObject, opacity: 0.88 },
  yearGhostWrap: { position: 'absolute', top: -10, right: -6 },
  yearGhost: { fontSize: 108, fontFamily: 'Fraunces_800ExtraBold', color: 'rgba(155,114,255,0.08)' },
  yearBadge: { position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(13,10,20,0.55)', borderWidth: 1, borderColor: 'rgba(155,114,255,0.45)', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 5 },
  yearBadgeText: { fontSize: 14, fontFamily: 'Fraunces_800ExtraBold', color: '#ffffff', letterSpacing: 1.5 },
  yearCardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 12 },
  yearCardDivider: { height: 1, backgroundColor: 'rgba(155,114,255,0.2)', marginHorizontal: 14, marginBottom: 10 },
  yearCardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14 },
  yearDateLabel: { color: '#ffffff', fontSize: 13 },
  yearDateDay: { fontWeight: '700' },
  yearPhotoCount: { color: 'rgba(155,114,255,0.75)', fontSize: 12 },
  yearEmptyRow: { height: 80, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(155,114,255,0.1)', borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  yearEmptyPill: { backgroundColor: 'rgba(155,114,255,0.08)', borderWidth: 1, borderColor: 'rgba(155,114,255,0.15)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  yearEmptyPillText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
  yearEmptyText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontStyle: 'italic' },

  // Vault calendar
  yearPickerStrip: { maxHeight: 56 },
  yearPickerContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  yearPickerItem: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(155,114,255,0.2)' },
  yearPickerItemActive: { backgroundColor: 'rgba(155,114,255,0.25)', borderColor: 'rgba(155,114,255,0.45)' },
  yearPickerText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },
  yearPickerTextActive: { color: '#ffffff' },
  calendarMonth: { paddingHorizontal: 16, marginBottom: 28 },
  calendarMonthTitle: { fontSize: 22, fontFamily: 'Fraunces_600SemiBold', color: '#ffffff', marginBottom: 8 },
  calendarDayHeaders: { flexDirection: 'row', marginBottom: 4 },
  calendarDayHeader: { width: CARD_WIDTH, textAlign: 'center', fontSize: 9, color: '#ffffff', fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calSlot: { width: CARD_WIDTH, alignItems: 'center', marginBottom: 8 },
  calCard: { width: '86%', aspectRatio: 3 / 4, borderRadius: 8, overflow: 'hidden' },
  calCardFilled: { borderWidth: 1.5, borderColor: '#ffffff' },
  calCardEmpty: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  calCardToday: { borderWidth: 2, borderColor: '#ffffff' },
  calDayNumFilled: { position: 'absolute', bottom: 4, left: 5, color: '#ffffff', fontSize: 12, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  calDayNumEmpty: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },

  // People tab
  friendsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  friendCard: { width: '30%', alignItems: 'center', paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(155,114,255,0.15)' },
  friendAvatarWrap: { marginBottom: 8 },
  friendAvatarPhoto: { width: 56, height: 56, borderRadius: 28 },
  friendAvatarInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(155,114,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(155,114,255,0.4)' },
  friendAvatarInitial: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  friendName: { fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: '#ffffff', marginBottom: 2, textAlign: 'center', paddingHorizontal: 4 },
  friendDays: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },

  // Person profile
  personModal: { flex: 1, backgroundColor: '#17102a' },
  personHeader: { height: 220 },
  personHeaderInitial: { fontSize: 72, fontFamily: 'Fraunces_800ExtraBold', color: 'rgba(255,255,255,0.2)' },
  personClose: { position: 'absolute', top: 20, left: 16, padding: 4, zIndex: 2 },
  personHeaderName: { fontSize: 28, fontFamily: 'Fraunces_800ExtraBold', color: '#ffffff' },
  personHeaderDays: { fontSize: 14, color: 'rgba(155,114,255,0.8)', marginTop: 2 },
  personEditPhotoBtn: { position: 'absolute', bottom: 14, right: 16, backgroundColor: 'rgba(13,10,20,0.6)', borderWidth: 1, borderColor: 'rgba(155,114,255,0.35)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  personEditPhotoText: { fontSize: 12, color: '#ffffff' },
  personSectionTitle: { fontSize: 20, fontFamily: 'Fraunces_600SemiBold', color: '#ffffff', marginTop: 24, marginLeft: 16, marginBottom: 4 },
  personCountText: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginLeft: 16, marginBottom: 10 },
  personDayCard: { width: 120, height: 160, borderRadius: 12, overflow: 'hidden' },
  personDayDate: { position: 'absolute', bottom: 8, left: 8, fontSize: 11, fontWeight: '700', color: '#ffffff' },
  personPhotoThumb: { width: 80, height: 80, borderRadius: 8 },

  // Map view
  mapPinBubble: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  mapPinText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  mapPinTriangle: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  mapSearchWrap: { position: 'absolute', top: 60, left: 16, right: 130, zIndex: 10 },
  mapSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(30,21,53,0.95)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(155,114,255,0.25)' },
  mapSearchInput: { flex: 1, color: '#ffffff', fontSize: 15, padding: 0 },
  mapSearchResults: { backgroundColor: 'rgba(30,21,53,0.98)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(155,114,255,0.2)', marginTop: 4 },
  mapSearchResultRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  mapSearchResultName: { fontSize: 14, color: '#ffffff' },
  mapSearchResultCoords: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 },
  mapToggle: { position: 'absolute', top: 60, right: 16, flexDirection: 'row', backgroundColor: 'rgba(30,21,53,0.9)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(155,114,255,0.25)', padding: 3, zIndex: 10 },
  mapToggleSegment: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 17 },
  mapToggleSegmentActive: { backgroundColor: 'rgba(155,114,255,0.3)' },
  mapToggleText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  mapToggleTextActive: { color: '#ffffff' },
  mapBottomCard: { position: 'absolute', bottom: 100, left: 16, right: 16, backgroundColor: '#1e1535', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(155,114,255,0.3)', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  mapBottomCardName: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: '#ffffff' },
  mapBottomCardLocation: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  mapBottomCardClose: { position: 'absolute', top: 8, right: 8, padding: 4, zIndex: 2 },
  placeFab: { position: 'absolute', bottom: 100, right: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: '#9b72ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },

  // Places list
  placesEmptyWrap: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  placesEmptyTitle: { fontSize: 24, fontFamily: 'Fraunces_600SemiBold', color: '#ffffff', marginTop: 16 },
  placesEmptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 8 },
  placeAddButton: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 18, borderWidth: 1 },
  placeAddEmoji: { fontSize: 28 },
  placeAddName: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  placeAddDesc: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  placeSectionHeader: { fontSize: 20, fontFamily: 'Fraunces_600SemiBold', marginTop: 24, marginBottom: 12 },
  placeEmptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
  placeCard: { width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 12, backgroundColor: '#1e1535', borderWidth: 1, borderColor: 'rgba(155,114,255,0.25)' },
  placeCardNoCover: { backgroundColor: 'rgba(255,255,255,0.05)' },
  placeTypeBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(155,114,255,0.45)', backgroundColor: 'rgba(13,10,20,0.55)' },
  placeTypeBadgeTop: { position: 'absolute', top: 20, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(155,114,255,0.45)', backgroundColor: 'rgba(13,10,20,0.55)' },
  placeTypeBadgeText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
  placeCardBottom: { position: 'absolute', bottom: 14, left: 14, right: 90 },
  placeCardName: { fontSize: 20, fontFamily: 'Fraunces_800ExtraBold', color: '#ffffff' },
  placeCardLocation: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  placeCardDate: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  placeCardPhotoCount: { position: 'absolute', bottom: 14, right: 14 },
  placeCardPhotoCountText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // Place profile
  placeProfileClose: { position: 'absolute', top: 20, left: 16, padding: 4, zIndex: 2 },
  placeProfileName: { fontSize: 28, fontFamily: 'Fraunces_800ExtraBold', color: '#ffffff' },
  placeProfileLocation: { fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  placeProfileDate: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  placeProfileSectionTitle: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', color: '#ffffff', marginTop: 24, marginLeft: 16, marginBottom: 8 },
  placeViewMapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, marginHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(155,114,255,0.12)', borderWidth: 1, borderColor: 'rgba(155,114,255,0.3)' },
  placeViewMapBtnText: { color: '#9b72ff', fontSize: 14, fontWeight: '700' },
  placeAddPhotoBtn: { borderWidth: 1, borderColor: 'rgba(155,114,255,0.25)', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  placeAddPhotoBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  placeLinkedDayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  placeLinkedDayThumb: { width: 50, height: 50, borderRadius: 6 },
  placeLinkedDayDate: { fontSize: 15, color: '#ffffff', fontWeight: '600', flex: 1 },

  // Create place modal
  createPlaceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  createPlaceInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 14, color: '#ffffff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(155,114,255,0.2)', marginBottom: 16 },
  createPlaceTypePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(155,114,255,0.25)' },
  createPlaceTypePillActive: { backgroundColor: '#9b72ff', borderColor: '#9b72ff' },
  createPlaceTypePillText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  createPlaceCoverBtn: { borderWidth: 1, borderColor: 'rgba(155,114,255,0.25)', borderStyle: 'dashed', borderRadius: 10, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },

  // Add to place picker
  addToPlaceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  addToPlaceRowName: { fontSize: 16, color: '#ffffff', fontWeight: '600', flex: 1 },
  placeTypePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(155,114,255,0.3)', backgroundColor: 'rgba(155,114,255,0.1)' },
  placeTypePillText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  addToPlaceNewBtn: { paddingVertical: 14, alignItems: 'center' },
  addToPlaceNewBtnText: { color: '#9b72ff', fontWeight: '600', fontSize: 15 },

  // Trading card
  tcContainer: { flex: 1, backgroundColor: '#17102a' },
  tcClose: { position: 'absolute', top: 14, left: 16, zIndex: 10, padding: 4 },
  tcSaveBtn: { position: 'absolute', top: 14, right: 16, zIndex: 10, backgroundColor: '#9b72ff', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 8 },
  tcSaveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  tcDateBlock: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  tcDayOfWeek: { fontSize: 16, fontFamily: 'Fraunces_600SemiBold', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  tcDateBig: { fontSize: 38, fontFamily: 'Fraunces_800ExtraBold', color: '#ffffff', lineHeight: 44, marginTop: 2 },
  tcInfoStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 20 },
  tcPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tcPillText: { fontSize: 13, color: '#ffffff' },
  tcPillTextMuted: { color: 'rgba(255,255,255,0.35)' },
  tcPillInput: { color: '#ffffff', fontSize: 13, minWidth: 130, padding: 0 },
  tcSavedPill: { backgroundColor: 'rgba(155,114,255,0.2)', borderWidth: 1, borderColor: 'rgba(155,114,255,0.4)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tcSavedPillText: { fontSize: 13, color: '#ffffff', fontWeight: '700' },
  tcSectionTitle: { fontSize: 22, fontFamily: 'Fraunces_600SemiBold', color: '#ffffff', paddingHorizontal: 20, marginTop: 8, marginBottom: 12 },
  tcSectionTitleSmall: { fontSize: 20, fontFamily: 'Fraunces_600SemiBold', color: '#ffffff', paddingHorizontal: 20, marginTop: 8, marginBottom: 8 },
  tcNoPhotosText: { fontSize: 14, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', paddingHorizontal: 20, marginBottom: 16 },
  tcPhotoCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1e1535' },
  tcPhotoImage: { width: '100%', aspectRatio: 4 / 3 },
  tcPhotoMenuBtn: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  tcCoverBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(155,114,255,0.8)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  tcCoverBadgeText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
  tcSingleSaveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  tcSingleSaveText: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  tcActionRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  tcActionBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tcActionText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  tcActionTextActive: { color: '#9b72ff' },
  tcCaption: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' },
  tcPeopleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  tcPersonChip: { backgroundColor: 'rgba(155,114,255,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  tcPersonChipText: { fontSize: 12, color: '#9b72ff' },
  tcDescInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, marginHorizontal: 20, paddingHorizontal: 20, paddingVertical: 14, color: '#ffffff', fontSize: 15, lineHeight: 22, minHeight: 80, textAlignVertical: 'top' },
  tcContextRow: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tcContextLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(155,114,255,0.6)', letterSpacing: 1.5 },
  tcContextValue: { fontSize: 15, color: '#ffffff', marginTop: 3 },
  tcContextEmpty: { fontSize: 15, color: 'rgba(255,255,255,0.2)', marginTop: 3 },
  tcNewsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20, marginTop: 28 },
  tcNewsSubheader: { fontSize: 13, color: 'rgba(255,255,255,0.4)', paddingHorizontal: 20, marginBottom: 16 },
  tcNewsCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginHorizontal: 20, marginBottom: 8 },
  tcNewsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tcNewsYearPill: { backgroundColor: 'rgba(155,114,255,0.15)', borderWidth: 1, borderColor: 'rgba(155,114,255,0.3)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  tcNewsYearPillText: { fontSize: 13, fontFamily: 'Fraunces_600SemiBold', color: '#ffffff' },
  tcNewsIcon: { fontSize: 14 },
  tcNewsText: { fontSize: 14, color: '#ffffff', lineHeight: 20 },
  tcNewsSource: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 },
  tcFootballHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
  tcFootballHeaderText: { fontSize: 16, fontFamily: 'Fraunces_600SemiBold', color: '#ffffff' },
  tcMatchComp: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  tcMatchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tcMatchTeam: { flex: 1, fontSize: 14, color: '#ffffff' },
  tcMatchScore: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  tcMatchStatus: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6, textAlign: 'center' },
  tcWeatherBig: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginTop: 8 },
  tcFullscreenClose: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  tcScopeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tcScopePill: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(155,114,255,0.25)', alignItems: 'center' },
  tcScopePillActive: { backgroundColor: 'rgba(155,114,255,0.25)', borderColor: 'rgba(155,114,255,0.45)' },
  tcScopeText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  tcScopeTextActive: { color: '#ffffff' },
  tcTagChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tcTagChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  tcTagChipActive: { backgroundColor: 'rgba(155,114,255,0.25)', borderColor: 'rgba(155,114,255,0.5)' },
  tcTagChipText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  tcTagChipTextActive: { color: '#ffffff', fontWeight: '600' },
  tcTagInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tcTagAddBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#9b72ff', justifyContent: 'center', alignItems: 'center' },

  // Three dot menu
  menuOverlay: { flex: 1, justifyContent: 'flex-end' },
  menuBox: { backgroundColor: 'rgba(24,16,42,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(155,114,255,0.15)' },
  menuTitle: { fontSize: 16, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  menuItemDanger: { borderBottomWidth: 0 },
  menuItemEmoji: { fontSize: 22 },
  menuItemText: { fontSize: 16, color: '#ffffff', fontWeight: '600', marginBottom: 2 },
  menuItemTextDanger: { color: '#ff4444' },
  menuItemSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  menuCancel: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, alignItems: 'center' },
  menuCancelText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },

  // Modals — glass effect
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: 'rgba(24,16,42,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(155,114,255,0.15)' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 6, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 10 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  saveButton: { backgroundColor: '#9b72ff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  cancelButton: { alignItems: 'center', padding: 10 },
  cancelButtonText: { color: 'rgba(255,255,255,0.35)', fontSize: 15 },
});
