import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as MediaLibrary from 'expo-media-library';
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
import { enableFootballAndMerge, loadNewsForDay, NewsCache, NewsSettings } from './newsFeed';

const { width } = Dimensions.get('window');

type Accent = 'past' | 'present';

const ACCENTS = {
  past: {
    bg: '#17102a',
    card: '#1e1535',
    hex: '#9b72ff',
    rgb: '155,114,255',
    font800: 'Fraunces_800ExtraBold',
    font600: 'Fraunces_600SemiBold',
  },
  present: {
    bg: '#08090f',
    card: '#0d1220',
    hex: '#4a90d9',
    rgb: '74,144,217',
    font800: 'SpaceGrotesk_700Bold',
    font600: 'SpaceGrotesk_600SemiBold',
  },
};

type TcPhoto = { id: string; uri: string; mediaType: 'photo' | 'video' };

type DayContext = {
  living?: string; doing?: string; with?: string; listening?: string; thinking?: string;
};

type Place = {
  id: string;
  type: 'home' | 'visited' | 'meaningful';
  name: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
  pinEmoji?: string;
  startDate?: string;
  endDate?: string;
  coverPhotoUri: string;
  photoUris: string[];
  dayKeys: string[];
  context: any;
};

const contextFields = [
  { key: 'living', label: 'WHERE I WAS LIVING', placeholder: 'My flat in Edinburgh...', emoji: '📍' },
  { key: 'doing', label: 'WHAT I WAS DOING', placeholder: 'Working at..., studying...', emoji: '💼' },
  { key: 'with', label: 'WHO I WAS WITH', placeholder: 'Mostly with Alex and...', emoji: '👥' },
  { key: 'listening', label: 'WHAT I WAS LISTENING TO', placeholder: 'Obsessed with...', emoji: '🎵' },
  { key: 'thinking', label: 'WHAT I WAS THINKING ABOUT', placeholder: 'Worried about / excited about...', emoji: '💭' },
];

const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

type DayCardProps = {
  dateKey: string;
  accent: Accent;
  visible: boolean;
  onClose: () => void;
  onOpenDate?: (dateKey: string) => void;
};

export default function DayCard({ dateKey, accent, visible, onClose, onOpenDate }: DayCardProps) {
  const A = ACCENTS[accent];
  const year = dateKey ? dateKey.split('-')[0] : '';
  const date = dateKey ? new Date(dateKey + 'T12:00:00') : null;

  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [entry, setEntry] = useState<any | null>(null);
  const [tcDescription, setTcDescription] = useState('');
  const [tcLocation, setTcLocation] = useState('');
  const [dayContext, setDayContext] = useState<DayContext>({});
  const [saved, setSaved] = useState(false);
  const [photos, setPhotos] = useState<TcPhoto[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [peopleTags, setPeopleTags] = useState<Record<string, string[]>>({});
  const [hiddenPhotos, setHiddenPhotos] = useState<string[]>([]);
  const [coverId, setCoverId] = useState('');
  const [focusedPhotoId, setFocusedPhotoId] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [knownPeople, setKnownPeople] = useState<string[]>([]);
  const [news, setNews] = useState<NewsCache | null>(null);
  const [newsSettings, setNewsSettings] = useState<NewsSettings>({ wiki: true, football: false, weather: true });
  const [lastYear, setLastYear] = useState<{ dateKey: string; thumbUri: string | null; mood: string; threeWords: string[] } | null>(null);
  const [pairSwapped, setPairSwapped] = useState(false);

  // Nested modal state
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);
  const [photoMenuId, setPhotoMenuId] = useState<string | null>(null);
  const [captionModalId, setCaptionModalId] = useState<string | null>(null);
  const [tagModalId, setTagModalId] = useState<string | null>(null);
  const [tagSelected, setTagSelected] = useState<string[]>([]);
  const [tagText, setTagText] = useState('');
  const [placeModalTarget, setPlaceModalTarget] = useState<string | null>(null);
  const [placeScope, setPlaceScope] = useState<'photo' | 'day'>('photo');
  const [newPlaceMode, setNewPlaceMode] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceType, setNewPlaceType] = useState<'home' | 'visited' | 'meaningful'>('home');
  const [editingField, setEditingField] = useState<{ key: string; label: string; placeholder?: string } | null>(null);
  const [fieldText, setFieldText] = useState('');

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<any>(null);

  useEffect(() => {
    if (visible && dateKey) {
      loadAll();
    } else {
      setEditMode(false);
      setPairSwapped(false);
      setNews(null);
      if (sound) { sound.unloadAsync(); setSound(null); setIsPlaying(false); }
    }
  }, [visible, dateKey]);

  useEffect(() => () => { if (sound) sound.unloadAsync(); }, [sound]);

  const loadAll = async () => {
    setLoading(true);
    scrollX.setValue(0);
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });

    const entryRaw = await AsyncStorage.getItem(`day_entry_${dateKey}`);
    setEntry(entryRaw ? JSON.parse(entryRaw) : null);
    setTcDescription((await AsyncStorage.getItem(`tc_description_${dateKey}`)) || '');
    setTcLocation((await AsyncStorage.getItem(`tc_location_${dateKey}`)) || '');
    const ctxRaw = await AsyncStorage.getItem(`day_context_${dateKey}`);
    setDayContext(ctxRaw ? JSON.parse(ctxRaw) : {});
    setSaved((await AsyncStorage.getItem(`saved_day_${dateKey}`)) === 'true');
    const hiddenRaw = await AsyncStorage.getItem('hidden_photos');
    setHiddenPhotos(hiddenRaw ? JSON.parse(hiddenRaw) : []);
    const coverRaw = await AsyncStorage.getItem('cover_photos');
    const coverMap = coverRaw ? JSON.parse(coverRaw) : {};
    setCoverId(coverMap[year] || '');
    const placesRaw = await AsyncStorage.getItem('places');
    setPlaces(placesRaw ? JSON.parse(placesRaw) : []);
    setLoading(false);

    loadPhotos();
    loadKnownPeople();
    loadNews();
    loadLastYear();
  };

  const loadPhotos = async () => {
    try {
      const day = new Date(dateKey + 'T12:00:00');
      const start = new Date(day); start.setHours(0, 0, 0, 0);
      const end = new Date(day); end.setHours(23, 59, 59, 999);
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        createdAfter: start.getTime(),
        createdBefore: end.getTime(),
        first: 30,
        sortBy: MediaLibrary.SortBy.creationTime,
      });
      const found: TcPhoto[] = [];
      const caps: Record<string, string> = {};
      const ppl: Record<string, string[]> = {};
      for (const asset of result.assets) {
        let uri = asset.uri;
        try {
          const info = await MediaLibrary.getAssetInfoAsync(asset.id);
          uri = info.localUri || asset.uri;
        } catch { }
        const cap = await AsyncStorage.getItem(`caption_${asset.id}`);
        if (cap) caps[asset.id] = cap;
        const p = await AsyncStorage.getItem(`people_${asset.id}`);
        if (p) ppl[asset.id] = JSON.parse(p);
        found.push({ id: asset.id, uri, mediaType: asset.mediaType === 'video' ? 'video' : 'photo' });
      }
      setPhotos(found);
      setCaptions(caps);
      setPeopleTags(ppl);
      setFocusedPhotoId('');
    } catch {
      setPhotos([]);
    }
  };

  const loadKnownPeople = async () => {
    try {
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
    } catch { }
  };

  const loadNews = async () => {
    const { cache, settings } = await loadNewsForDay(dateKey);
    setNews(cache);
    setNewsSettings(settings);
  };

  const loadLastYear = async () => {
    try {
      const d = new Date(dateKey + 'T12:00:00');
      d.setFullYear(d.getFullYear() - 1);
      const lyKey = formatDateKey(d);
      const lyEntryRaw = await AsyncStorage.getItem(`day_entry_${lyKey}`);
      const lyEntry = lyEntryRaw ? JSON.parse(lyEntryRaw) : null;
      const lySaved = (await AsyncStorage.getItem(`saved_day_${lyKey}`)) === 'true';

      let thumb: string | null = lyEntry?.photoUri || null;
      if (!thumb) {
        const thumbId = (await AsyncStorage.getItem(`tc_single_photo_${lyKey}`))
          || (await AsyncStorage.getItem(`tc_thumb_${lyKey}`));
        if (thumbId) {
          try {
            const asset = await MediaLibrary.getAssetInfoAsync(thumbId);
            thumb = asset.localUri || asset.uri;
          } catch { }
        }
      }
      let hasMediaPhotos = false;
      if (!thumb) {
        try {
          const start = new Date(d); start.setHours(0, 0, 0, 0);
          const end = new Date(d); end.setHours(23, 59, 59, 999);
          const result = await MediaLibrary.getAssetsAsync({
            mediaType: ['photo'], createdAfter: start.getTime(), createdBefore: end.getTime(),
            first: 1, sortBy: MediaLibrary.SortBy.creationTime,
          });
          if (result.assets[0]) {
            hasMediaPhotos = true;
            const asset = await MediaLibrary.getAssetInfoAsync(result.assets[0].id);
            thumb = asset.localUri || asset.uri;
          }
        } catch { }
      }

      if (lyEntry || lySaved || thumb || hasMediaPhotos) {
        setLastYear({
          dateKey: lyKey,
          thumbUri: thumb,
          mood: lyEntry?.mood || '',
          threeWords: lyEntry?.threeWords || [],
        });
      } else {
        setLastYear(null);
      }
    } catch {
      setLastYear(null);
    }
  };

  // ── SAVE / EDIT HANDLERS ─────────────────────────────────────────────────

  const updateEntry = async (patch: Record<string, any>) => {
    const updated = { ...(entry || {}), ...patch };
    setEntry(updated);
    await AsyncStorage.setItem(`day_entry_${dateKey}`, JSON.stringify(updated));
  };

  const saveDay = async () => {
    await AsyncStorage.setItem(`saved_day_${dateKey}`, 'true');
    await AsyncStorage.setItem(`tc_description_${dateKey}`, tcDescription);
    await AsyncStorage.setItem(`tc_location_${dateKey}`, tcLocation);
    const visible = photos.filter(p => !hiddenPhotos.includes(p.id));
    const thumb = visible.find(p => p.id === coverId) || visible[0];
    if (thumb) await AsyncStorage.setItem(`tc_thumb_${dateKey}`, thumb.id);
    setSaved(true);
  };

  const openFieldEditor = (key: string, label: string, current: string, placeholder?: string) => {
    setFieldText(current);
    setEditingField({ key, label, placeholder });
  };

  const saveField = async () => {
    if (!editingField) return;
    const key = editingField.key;
    const text = fieldText;
    if (key === 'description') {
      if (entry) await updateEntry({ dayDescription: text });
      setTcDescription(text);
      await AsyncStorage.setItem(`tc_description_${dateKey}`, text);
    } else if (key === 'location') {
      setTcLocation(text);
      await AsyncStorage.setItem(`tc_location_${dateKey}`, text);
    } else if (['living', 'doing', 'with', 'listening', 'thinking'].includes(key)) {
      const updated = { ...dayContext, [key]: text };
      setDayContext(updated);
      await AsyncStorage.setItem(`day_context_${dateKey}`, JSON.stringify(updated));
    } else {
      await updateEntry({ [key]: text });
    }
    setEditingField(null);
  };

  // ── PHOTO ACTIONS ────────────────────────────────────────────────────────

  const setCoverPhoto = async (assetId: string) => {
    const coverRaw = await AsyncStorage.getItem('cover_photos');
    const coverMap = coverRaw ? JSON.parse(coverRaw) : {};
    coverMap[year] = assetId;
    await AsyncStorage.setItem('cover_photos', JSON.stringify(coverMap));
    setCoverId(assetId);
    setPhotoMenuId(null);
  };

  const hidePhoto = async (assetId: string) => {
    const hiddenRaw = await AsyncStorage.getItem('hidden_photos');
    const hidden: string[] = hiddenRaw ? JSON.parse(hiddenRaw) : [];
    hidden.push(assetId);
    await AsyncStorage.setItem('hidden_photos', JSON.stringify(hidden));
    setHiddenPhotos(hidden);
    setPhotoMenuId(null);
    if (focusedPhotoId === assetId) setFocusedPhotoId('');
  };

  const sharePhoto = async (assetId: string) => {
    const photo = photos.find(p => p.id === assetId);
    if (photo) {
      try {
        await Share.share({ url: photo.uri, message: captions[assetId] || 'A memory from Chronicle' });
      } catch { }
    }
    setPhotoMenuId(null);
  };

  const copyCaption = (assetId: string) => {
    const caption = captions[assetId];
    if (caption) {
      Clipboard.setString(caption);
      Alert.alert('Copied!', 'Caption copied to clipboard.');
    } else {
      Alert.alert('No caption', 'Add context to this photo first.');
    }
    setPhotoMenuId(null);
  };

  const saveCaption = async () => {
    if (!captionModalId) return;
    await AsyncStorage.setItem(`caption_${captionModalId}`, fieldText);
    setCaptions(prev => ({ ...prev, [captionModalId]: fieldText }));
    setCaptionModalId(null);
  };

  const saveTags = async () => {
    if (!tagModalId) return;
    const assetId = tagModalId;
    let selected = tagSelected;
    const pending = tagText.trim();
    if (pending && !selected.includes(pending)) selected = [...selected, pending];

    const doSave = async (finalNames: string[]) => {
      await AsyncStorage.setItem(`people_${assetId}`, JSON.stringify(finalNames));
      setPeopleTags(prev => ({ ...prev, [assetId]: finalNames }));
      setKnownPeople(prev => [...new Set([...prev, ...finalNames])].sort());
      setTagModalId(null);
      setTagText('');
    };

    const newNames = selected.filter(n => !knownPeople.includes(n));
    if (newNames.length > 0) {
      Alert.alert(
        newNames.length === 1 ? 'New person' : 'New people',
        `Add ${newNames.join(', ')} to your People?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add', onPress: () => doSave(selected) },
        ]
      );
    } else {
      await doSave(selected);
    }
  };

  const savePlacesList = async (updated: Place[]) => {
    setPlaces(updated);
    await AsyncStorage.setItem('places', JSON.stringify(updated));
  };

  const addToPlace = async (placeId: string) => {
    const updated = places.map(p => {
      if (p.id !== placeId) return p;
      if (placeScope === 'day') {
        const dayKeys = p.dayKeys.includes(dateKey) ? p.dayKeys : [...p.dayKeys, dateKey];
        return { ...p, dayKeys };
      }
      const photo = photos.find(ph => ph.id === placeModalTarget);
      if (!photo) return p;
      const photoUris = p.photoUris.includes(photo.uri) ? p.photoUris : [...p.photoUris, photo.uri];
      return { ...p, photoUris };
    });
    await savePlacesList(updated);
    setPlaceModalTarget(null);
    setNewPlaceMode(false);
  };

  const createPlaceAndAdd = async () => {
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
    if (placeScope === 'day') {
      newPlace.dayKeys = [dateKey];
    } else {
      const photo = photos.find(ph => ph.id === placeModalTarget);
      if (photo) newPlace.photoUris = [photo.uri];
    }
    await savePlacesList([...places, newPlace]);
    setNewPlaceName('');
    setNewPlaceType('home');
    setNewPlaceMode(false);
    setPlaceModalTarget(null);
  };

  const toggleFootball = async (value: boolean) => {
    setNewsSettings(prev => ({ ...prev, football: value }));
    if (value) {
      const merged = await enableFootballAndMerge(dateKey, news);
      setNews(merged);
    } else {
      await AsyncStorage.setItem('show_football_feed', 'false');
    }
  };

  const playVoiceMemo = async () => {
    if (!entry?.voiceMemoUri) return;
    if (isPlaying && sound) { await sound.stopAsync(); setIsPlaying(false); return; }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: entry.voiceMemoUri });
      setSound(newSound);
      setIsPlaying(true);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
      });
    } catch { }
  };

  // ── DERIVED ──────────────────────────────────────────────────────────────

  const visiblePhotos = photos
    .filter(p => !hiddenPhotos.includes(p.id))
    .sort((a, b) => (a.id === coverId ? -1 : b.id === coverId ? 1 : 0));
  const focusedPhoto = visiblePhotos.find(p => p.id === focusedPhotoId) || visiblePhotos[0];
  const entryExtraPhotos: string[] = entry?.extraPhotos || [];
  const hasEntryPair = !!entry?.photoUri;
  const hasPhotos = hasEntryPair || entryExtraPhotos.length > 0 || visiblePhotos.length > 0;

  const description = entry?.dayDescription || tcDescription;
  const anyContext = Object.values(dayContext).some(v => v);
  const threeWords: string[] = (entry?.threeWords || []).filter(Boolean);
  const locations: { name: string; withWho?: string }[] = entry?.locations || [];
  const headlineLocation = locations[0]?.name || tcLocation;

  const hasYourDay = !!(
    description || entry?.voiceMemoUri || entry?.dailyAnswer || entry?.reflectionAnswer ||
    entry?.songName || entry?.watched || entry?.cookedDish || entry?.taggedPeople?.length ||
    entry?.highlight || entry?.learned || anyContext
  );
  const anyNewsOn = newsSettings.wiki || newsSettings.football || newsSettings.weather;

  const slides: string[] = ['cover'];
  if (hasPhotos) slides.push('photos');
  if (hasYourDay || editMode) slides.push('day');
  if (locations.length >= 2) slides.push('locations');
  if (anyNewsOn && (accent === 'past' || saved)) slides.push('world');
  if (lastYear) slides.push('lastYear');

  const weatherPill = entry?.weatherEmoji
    ? `${entry.weatherEmoji} ${entry.weatherTemp}°C`
    : news?.weather ? `${news.weather.emoji} ${news.weather.max}°C` : '';

  const wikiEvents = (news?.wikipedia?.events || []).filter(ev => ev.year === parseInt(year));
  const wikiBirth = news?.wikipedia?.birth && news.wikipedia.birth.year === parseInt(year) ? news.wikipedia.birth : null;

  // ── SLIDE RENDERERS ──────────────────────────────────────────────────────

  const renderCover = () => (
    <ScrollView style={{ width }} contentContainerStyle={styles.slideContent} showsVerticalScrollIndicator={false}>
      {entry?.mood ? (
        <View pointerEvents="none" style={styles.ghostWrap}>
          <Text style={styles.ghostEmoji}>{entry.mood}</Text>
        </View>
      ) : null}
      <Text style={[styles.trackedCaps, { color: A.hex }]}>
        {date?.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase()}
      </Text>
      <Text style={[styles.coverDate, { fontFamily: A.font800 }]}>
        {date?.getDate()} {date?.toLocaleDateString('en-GB', { month: 'long' })}{'\n'}{year}
      </Text>
      <View style={styles.pillRow}>
        {!!weatherPill && (
          <View style={styles.pill}><Text style={styles.pillText}>{weatherPill}</Text></View>
        )}
        {(!!headlineLocation || editMode) && (
          <TouchableOpacity
            style={styles.pill}
            disabled={!editMode}
            onPress={() => openFieldEditor('location', 'Where were you?', tcLocation)}
          >
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={[styles.pillText, !headlineLocation && styles.pillTextMuted]}>
              {headlineLocation || 'Add location'}
            </Text>
          </TouchableOpacity>
        )}
        {!!entry?.mood && (
          <View style={styles.pill}><Text style={styles.pillText}>{entry.mood}</Text></View>
        )}
        {saved && (
          <View style={[styles.pill, { backgroundColor: `rgba(${A.rgb},0.2)`, borderColor: `rgba(${A.rgb},0.4)` }]}>
            <Text style={[styles.pillText, { fontWeight: '700' }]}>In Vault</Text>
          </View>
        )}
      </View>
      {threeWords.length > 0 && (
        <Text style={styles.threeWords}>{threeWords.join(' · ')}</Text>
      )}
      {slides.length > 1 && (
        <Text style={styles.swipeHint}>Swipe →</Text>
      )}
    </ScrollView>
  );

  const renderPhotos = () => (
    <ScrollView style={{ width }} contentContainerStyle={styles.slideContentTight} showsVerticalScrollIndicator={false}>
      {hasEntryPair ? (
        <View style={[styles.pairCard, { backgroundColor: A.card }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setFullscreenUri(pairSwapped && entry?.pairSelfieUri ? entry.pairSelfieUri : entry.photoUri)}>
            <Image
              source={{ uri: pairSwapped && entry?.pairSelfieUri ? entry.pairSelfieUri : entry.photoUri }}
              style={styles.pairMain}
              resizeMode="cover"
            />
          </TouchableOpacity>
          {!!entry?.pairSelfieUri && (
            <TouchableOpacity style={styles.pairInset} onPress={() => setPairSwapped(s => !s)} activeOpacity={0.9}>
              <Image
                source={{ uri: pairSwapped ? entry.photoUri : entry.pairSelfieUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
        </View>
      ) : focusedPhoto ? (
        <View style={[styles.pairCard, { backgroundColor: A.card }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setFullscreenUri(focusedPhoto.uri)}>
            <Image source={{ uri: focusedPhoto.uri }} style={styles.pairMain} resizeMode="cover" />
          </TouchableOpacity>
          {focusedPhoto.id === coverId && (
            <View style={[styles.coverBadge, { backgroundColor: `rgba(${A.rgb},0.85)` }]}>
              <Text style={styles.coverBadgeText}>Cover</Text>
            </View>
          )}
          {editMode && (
            <TouchableOpacity style={styles.photoMenuBtn} onPress={() => setPhotoMenuId(focusedPhoto.id)}>
              <Ionicons name="ellipsis-horizontal" size={16} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {!hasEntryPair && focusedPhoto && editMode && (
        <View style={[styles.actionRow, { backgroundColor: A.card }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setFieldText(captions[focusedPhoto.id] || ''); setCaptionModalId(focusedPhoto.id); }}>
            <Ionicons name="chatbubble-outline" size={16} color={captions[focusedPhoto.id] ? A.hex : 'rgba(255,255,255,0.4)'} />
            <Text style={[styles.actionText, captions[focusedPhoto.id] ? { color: A.hex } : null]}>Add context</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setTagSelected(peopleTags[focusedPhoto.id] || []); setTagText(''); setTagModalId(focusedPhoto.id); }}>
            <Ionicons name="people-outline" size={16} color={peopleTags[focusedPhoto.id]?.length ? A.hex : 'rgba(255,255,255,0.4)'} />
            <Text style={[styles.actionText, peopleTags[focusedPhoto.id]?.length ? { color: A.hex } : null]}>Tag people</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setPlaceScope('photo'); setNewPlaceMode(false); setPlaceModalTarget(focusedPhoto.id); }}>
            <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.4)" />
            <Text style={styles.actionText}>Add to place</Text>
          </TouchableOpacity>
        </View>
      )}
      {!hasEntryPair && focusedPhoto && captions[focusedPhoto.id] ? (
        <Text style={styles.captionText}>{`"${captions[focusedPhoto.id]}"`}</Text>
      ) : null}
      {!hasEntryPair && focusedPhoto && peopleTags[focusedPhoto.id]?.length ? (
        <View style={styles.chipRow}>
          {peopleTags[focusedPhoto.id].map(name => (
            <View key={name} style={[styles.chip, { backgroundColor: `rgba(${A.rgb},0.15)` }]}>
              <Text style={[styles.chipText, { color: A.hex }]}>{name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {(entryExtraPhotos.length > 0 || visiblePhotos.length > (hasEntryPair ? 0 : 1)) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbStrip}>
          {entryExtraPhotos.map((uri, i) => (
            <TouchableOpacity key={`e-${i}`} onPress={() => setFullscreenUri(uri)}>
              <Image source={{ uri }} style={styles.thumb} />
            </TouchableOpacity>
          ))}
          {visiblePhotos.filter(p => hasEntryPair || p.id !== focusedPhoto?.id).map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => hasEntryPair ? setFullscreenUri(p.uri) : setFocusedPhotoId(p.id)}
            >
              <Image source={{ uri: p.uri }} style={styles.thumb} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </ScrollView>
  );

  const dayBlock = (label: string, value: string, fieldKey: string | null, glow = false, extra?: React.ReactNode) => {
    if (!value && !(editMode && fieldKey)) return null;
    const inner = (
      <View
        key={label}
        style={[
          styles.dayBlock,
          { backgroundColor: A.card, borderColor: `rgba(${A.rgb},0.2)` },
          glow && { borderColor: `rgba(${A.rgb},0.35)`, shadowColor: A.hex, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
        ]}
      >
        <Text style={[styles.trackedCapsSmall, { color: A.hex }]}>{label}</Text>
        {value
          ? <Text style={styles.dayBlockValue}>{value}</Text>
          : <Text style={styles.dayBlockEmpty}>Tap to add...</Text>}
        {extra}
      </View>
    );
    if (editMode && fieldKey) {
      return (
        <TouchableOpacity key={label} onPress={() => openFieldEditor(fieldKey, label, value)}>
          {inner}
        </TouchableOpacity>
      );
    }
    return inner;
  };

  const renderDay = () => (
    <ScrollView style={{ width }} contentContainerStyle={styles.slideContentTight} showsVerticalScrollIndicator={false}>
      {(description || editMode) && (
        editMode ? (
          <TouchableOpacity onPress={() => openFieldEditor('description', 'What were you doing?', description)}>
            <Text style={description ? styles.pullQuote : styles.pullQuoteEmpty}>
              {description ? `"${description}"` : 'Describe this day...'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.pullQuote}>{`"${description}"`}</Text>
        )
      )}

      {!!entry?.voiceMemoUri && (
        <TouchableOpacity
          style={[styles.voiceRow, { backgroundColor: A.card, borderColor: `rgba(${A.rgb},0.25)` }]}
          onPress={playVoiceMemo}
        >
          <Ionicons name={isPlaying ? 'stop' : 'play'} size={18} color={A.hex} />
          <Text style={styles.voiceRowText}>{isPlaying ? 'Playing voice memo...' : 'Play voice memo'}</Text>
        </TouchableOpacity>
      )}

      {(entry?.dailyQuestion || entry?.dailyAnswer) &&
        dayBlock(entry?.dailyQuestion || "TODAY'S QUESTION", entry?.dailyAnswer || '', entry ? 'dailyAnswer' : null)}
      {(entry?.reflectionQuestion || entry?.reflectionAnswer) &&
        dayBlock(entry?.reflectionQuestion || 'FOR FUTURE YOU', entry?.reflectionAnswer || '', entry ? 'reflectionAnswer' : null, true)}
      {!!entry?.highlight && dayBlock('HIGHLIGHT', entry.highlight, entry ? 'highlight' : null)}
      {!!entry?.learned && dayBlock('WHAT I LEARNED', entry.learned, entry ? 'learned' : null)}
      {!!entry?.songName && dayBlock('THE SOUNDTRACK', `🎵 ${entry.songName}${entry.songRating > 0 ? ` — ${entry.songRating}/10` : ''}`, entry ? 'songName' : null)}
      {!!entry?.watched && dayBlock('WHAT I WATCHED', entry.watched, entry ? 'watched' : null)}
      {(!!entry?.cookedDish) && dayBlock('WHAT I COOKED', entry.cookedDish, entry ? 'cookedDish' : null,
        false,
        entry?.cookedPhotoUri ? (
          <TouchableOpacity onPress={() => setFullscreenUri(entry.cookedPhotoUri)}>
            <Image source={{ uri: entry.cookedPhotoUri }} style={styles.cookedThumb} />
          </TouchableOpacity>
        ) : undefined
      )}
      {(entry?.taggedPeople?.length > 0) && (
        <View style={[styles.dayBlock, { backgroundColor: A.card, borderColor: `rgba(${A.rgb},0.2)` }]}>
          <Text style={[styles.trackedCapsSmall, { color: A.hex }]}>WHO MADE TODAY BETTER</Text>
          <View style={styles.chipRow}>
            {entry.taggedPeople.map((name: string) => (
              <View key={name} style={[styles.chip, { backgroundColor: `rgba(${A.rgb},0.15)` }]}>
                <Text style={[styles.chipText, { color: A.hex }]}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {(anyContext || editMode) && contextFields.map(f => {
        const val = (dayContext as any)[f.key] || '';
        if (!val && !editMode) return null;
        return dayBlock(`${f.emoji} ${f.label}`, val, f.key);
      })}
    </ScrollView>
  );

  const renderLocations = () => (
    <ScrollView style={{ width }} contentContainerStyle={styles.slideContentTight} showsVerticalScrollIndicator={false}>
      <Text style={[styles.trackedCaps, { color: A.hex, marginBottom: 20 }]}>WHERE TODAY TOOK YOU</Text>
      {locations.map((loc, i) => (
        <View key={i} style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: A.hex }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationName}>{loc.name}</Text>
            {!!loc.withWho && <Text style={styles.locationWith}>with {loc.withWho}</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderWorld = () => (
    <ScrollView style={{ width }} contentContainerStyle={styles.slideContentTight} showsVerticalScrollIndicator={false}>
      <Text style={[styles.trackedCaps, { color: A.hex, marginBottom: 4 }]}>THE WORLD THAT DAY</Text>
      <Text style={styles.worldSubheader}>
        {date?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </Text>
      {!news ? (
        <ActivityIndicator size="small" color={A.hex} style={{ marginVertical: 24 }} />
      ) : (
        <>
          {newsSettings.wiki && wikiEvents.map((ev, i) => (
            <View key={`ev-${i}`} style={[styles.newsCard, { backgroundColor: A.card }]}>
              <View style={styles.newsTopRow}>
                <View style={[styles.newsYearPill, { backgroundColor: `rgba(${A.rgb},0.15)`, borderColor: `rgba(${A.rgb},0.3)` }]}>
                  <Text style={[styles.newsYearText, { fontFamily: A.font600 }]}>{ev.year}</Text>
                </View>
                <Text style={styles.newsIcon}>📅</Text>
              </View>
              <Text style={styles.newsText}>{ev.text}</Text>
              <Text style={styles.newsSource}>Wikipedia</Text>
            </View>
          ))}
          {newsSettings.wiki && wikiBirth && (
            <View style={[styles.newsCard, { backgroundColor: A.card }]}>
              <View style={styles.newsTopRow}>
                <View style={[styles.newsYearPill, { backgroundColor: `rgba(${A.rgb},0.15)`, borderColor: `rgba(${A.rgb},0.3)` }]}>
                  <Text style={[styles.newsYearText, { fontFamily: A.font600 }]}>{wikiBirth.year}</Text>
                </View>
                <Text style={styles.newsIcon}>🎂</Text>
              </View>
              <Text style={styles.newsText}>{wikiBirth.text}</Text>
              <Text style={styles.newsSource}>Born on this day · Wikipedia</Text>
            </View>
          )}
          <View style={styles.footballHeaderRow}>
            <Text style={[styles.footballHeaderText, { fontFamily: A.font600 }]}>⚽ Football</Text>
            <Switch
              value={newsSettings.football}
              onValueChange={toggleFootball}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: `rgba(${A.rgb},0.6)` }}
              thumbColor="#ffffff"
            />
          </View>
          {newsSettings.football && (news.football || []).slice(0, 5).map((m: any, i: number) => (
            <View key={`fb-${i}`} style={[styles.newsCard, { backgroundColor: A.card }]}>
              <Text style={styles.matchComp}>⚽ {m.competition?.name || 'Football'}</Text>
              <View style={styles.matchRow}>
                <Text style={styles.matchTeam} numberOfLines={1}>{m.homeTeam?.shortName || m.homeTeam?.name || 'Home'}</Text>
                <Text style={styles.matchScore}>{m.score?.fullTime?.home ?? '–'} — {m.score?.fullTime?.away ?? '–'}</Text>
                <Text style={[styles.matchTeam, { textAlign: 'right' }]} numberOfLines={1}>{m.awayTeam?.shortName || m.awayTeam?.name || 'Away'}</Text>
              </View>
              <Text style={styles.matchStatus}>{m.status === 'FINISHED' ? 'FT' : m.status}</Text>
            </View>
          ))}
          {newsSettings.football && (!news.football || news.football.length === 0) && (
            <Text style={styles.mutedNote}>No football results for this day.</Text>
          )}
          {newsSettings.weather && news.weather && (
            <View style={[styles.newsCard, { backgroundColor: A.card }]}>
              <Text style={styles.newsText}>🌤️ The weather that day</Text>
              <Text style={styles.weatherBig}>{news.weather.emoji} {news.weather.max}°C / {news.weather.min}°C</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderLastYear = () => {
    if (!lastYear) return <View style={{ width }} />;
    const lyDate = new Date(lastYear.dateKey + 'T12:00:00');
    const lyWords = (lastYear.threeWords || []).filter(Boolean);
    return (
      <View style={[{ width }, styles.slideContent]}>
        <Text style={[styles.trackedCaps, { color: A.hex, marginBottom: 20 }]}>ONE YEAR AGO TODAY</Text>
        {lastYear.thumbUri ? (
          <Image source={{ uri: lastYear.thumbUri }} style={styles.lastYearThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.lastYearThumb, { backgroundColor: `rgba(${A.rgb},0.1)`, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 40 }}>{lastYear.mood || '📖'}</Text>
          </View>
        )}
        {lyWords.length > 0 ? (
          <Text style={styles.threeWords}>{lyWords.join(' · ')}</Text>
        ) : lastYear.mood ? (
          <Text style={{ fontSize: 32, marginTop: 16 }}>{lastYear.mood}</Text>
        ) : null}
        <Text style={styles.lastYearDate}>
          {lyDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity
          style={[styles.lastYearBtn, { backgroundColor: A.hex }]}
          onPress={() => onOpenDate && onOpenDate(lastYear.dateKey)}
        >
          <Text style={styles.lastYearBtnText}>Open that day</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSlide = ({ item }: { item: string }) => {
    switch (item) {
      case 'cover': return renderCover();
      case 'photos': return renderPhotos();
      case 'day': return renderDay();
      case 'locations': return renderLocations();
      case 'world': return renderWorld();
      case 'lastYear': return renderLastYear();
      default: return <View style={{ width }} />;
    }
  };

  // ── MAIN RENDER ──────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: A.bg }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="chevron-down" size={26} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {accent === 'past' && !saved && (
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: A.hex }]} onPress={saveDay}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.editBtn, { borderColor: `rgba(${A.rgb},0.45)` }, editMode && { backgroundColor: `rgba(${A.rgb},0.25)` }]}
            onPress={() => setEditMode(e => !e)}
          >
            <Text style={styles.editBtnText}>{editMode ? 'Done' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={A.hex} style={{ marginTop: 120 }} />
        ) : (
          <>
            <Animated.FlatList
              ref={listRef}
              data={slides}
              key={slides.join('-')}
              keyExtractor={item => item}
              renderItem={renderSlide}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
            />
            <View style={styles.dotsRow}>
              {slides.map((_, i) => {
                const dotWidth = scrollX.interpolate({
                  inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                  outputRange: [8, 20, 8],
                  extrapolate: 'clamp',
                });
                const dotOpacity = scrollX.interpolate({
                  inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });
                return (
                  <Animated.View
                    key={i}
                    style={[styles.dot, { width: dotWidth, opacity: dotOpacity, backgroundColor: A.hex }]}
                  />
                );
              })}
            </View>
          </>
        )}

        {/* Fullscreen photo — nested */}
        <Modal visible={fullscreenUri !== null} animationType="fade">
          <View style={{ flex: 1, backgroundColor: '#000000' }}>
            {fullscreenUri && (
              <Image source={{ uri: fullscreenUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            )}
            <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenUri(null)}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Photo menu — nested */}
        <Modal visible={photoMenuId !== null} animationType="slide" transparent>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setPhotoMenuId(null)}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={[styles.menuBox, { borderColor: `rgba(${A.rgb},0.15)` }]}>
              <Text style={styles.menuTitle}>Photo options</Text>
              <TouchableOpacity style={styles.menuItem} onPress={() => setCoverPhoto(photoMenuId!)}>
                <Text style={styles.menuItemEmoji}>⭐</Text>
                <Text style={styles.menuItemText}>Set as cover photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => sharePhoto(photoMenuId!)}>
                <Text style={styles.menuItemEmoji}>📤</Text>
                <Text style={styles.menuItemText}>Share photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => copyCaption(photoMenuId!)}>
                <Text style={styles.menuItemEmoji}>📋</Text>
                <Text style={styles.menuItemText}>Copy caption</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => {
                Alert.alert('Hide photo', 'This photo will be hidden from Chronicle. It stays on your camera roll.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Hide', style: 'destructive', onPress: () => hidePhoto(photoMenuId!) },
                ]);
              }}>
                <Text style={styles.menuItemEmoji}>🙈</Text>
                <Text style={[styles.menuItemText, { color: '#ff4444' }]}>Hide this photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuCancel} onPress={() => setPhotoMenuId(null)}>
                <Text style={styles.menuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Caption editor — nested */}
        <Modal visible={captionModalId !== null} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <View style={[styles.modalBox, { borderColor: `rgba(${A.rgb},0.15)` }]}>
                <Text style={styles.modalTitle}>Add context</Text>
                <Text style={styles.modalSubtitle}>What do you remember about this photo?</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Write something for future you..."
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  value={fieldText}
                  onChangeText={setFieldText}
                  autoFocus
                />
                <TouchableOpacity style={[styles.modalSave, { backgroundColor: A.hex }]} onPress={saveCaption}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setCaptionModalId(null)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Tag people — nested */}
        <Modal visible={tagModalId !== null} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <View style={[styles.modalBox, { borderColor: `rgba(${A.rgb},0.15)` }]}>
                <Text style={styles.modalTitle}>Tag people</Text>
                {[...new Set([...knownPeople, ...tagSelected])].length > 0 && (
                  <View style={styles.chipRow}>
                    {[...new Set([...knownPeople, ...tagSelected])].map(name => {
                      const isSel = tagSelected.includes(name);
                      return (
                        <TouchableOpacity
                          key={name}
                          style={[styles.tagChip, isSel && { backgroundColor: `rgba(${A.rgb},0.25)`, borderColor: `rgba(${A.rgb},0.5)` }]}
                          onPress={() => setTagSelected(prev => isSel ? prev.filter(n => n !== name) : [...prev, name])}
                        >
                          <Text style={[styles.tagChipText, isSel && { color: '#ffffff', fontWeight: '600' }]}>{name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, minHeight: 44, marginBottom: 0 }]}
                    placeholder="Add a new name..."
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={tagText}
                    onChangeText={setTagText}
                    onSubmitEditing={() => {
                      const name = tagText.trim();
                      if (name && !tagSelected.includes(name)) setTagSelected(prev => [...prev, name]);
                      setTagText('');
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.tagAddBtn, { backgroundColor: A.hex }]}
                    onPress={() => {
                      const name = tagText.trim();
                      if (name && !tagSelected.includes(name)) setTagSelected(prev => [...prev, name]);
                      setTagText('');
                    }}
                  >
                    <Ionicons name="add" size={22} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.modalSave, { backgroundColor: A.hex, marginTop: 16 }]} onPress={saveTags}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setTagModalId(null); setTagText(''); }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Add to place — nested */}
        <Modal visible={placeModalTarget !== null} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <View style={[styles.modalBox, { borderColor: `rgba(${A.rgb},0.15)` }]}>
                <Text style={styles.modalTitle}>Add to a place</Text>
                <View style={styles.scopeRow}>
                  {(['photo', 'day'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.scopePill, { borderColor: `rgba(${A.rgb},0.25)` }, placeScope === s && { backgroundColor: `rgba(${A.rgb},0.25)`, borderColor: `rgba(${A.rgb},0.45)` }]}
                      onPress={() => setPlaceScope(s)}
                    >
                      <Text style={[styles.scopeText, placeScope === s && { color: '#ffffff' }]}>
                        {s === 'photo' ? 'Just this photo' : 'The whole day'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {newPlaceMode ? (
                  <>
                    <TextInput
                      style={styles.textInput}
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
                          style={[styles.scopePill, { borderColor: `rgba(${A.rgb},0.25)` }, newPlaceType === t && { backgroundColor: A.hex, borderColor: A.hex }]}
                          onPress={() => setNewPlaceType(t)}
                        >
                          <Text style={[styles.scopeText, newPlaceType === t && { color: '#ffffff' }]}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity style={[styles.modalSave, { backgroundColor: A.hex }]} onPress={createPlaceAndAdd}>
                      <Text style={styles.modalSaveText}>Create & add</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <ScrollView style={{ maxHeight: 260 }}>
                    {places.map(p => (
                      <TouchableOpacity key={p.id} style={styles.placeRow} onPress={() => addToPlace(p.id)}>
                        <Text style={styles.placeRowName}>{p.name}</Text>
                        <Text style={styles.placeRowType}>{p.type.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.newPlaceBtn} onPress={() => setNewPlaceMode(true)}>
                      <Text style={[styles.newPlaceBtnText, { color: A.hex }]}>＋ Create new place</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setPlaceModalTarget(null); setNewPlaceMode(false); }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Generic field editor — nested */}
        <Modal visible={editingField !== null} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <View style={[styles.modalBox, { borderColor: `rgba(${A.rgb},0.15)` }]}>
                <Text style={styles.modalTitle}>{editingField?.label || ''}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={editingField?.placeholder || 'Write something...'}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  value={fieldText}
                  onChangeText={setFieldText}
                  autoFocus
                />
                <TouchableOpacity style={[styles.modalSave, { backgroundColor: A.hex }]} onPress={saveField}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setEditingField(null)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { position: 'absolute', top: 14, left: 16, zIndex: 10, padding: 4 },
  headerRight: { position: 'absolute', top: 14, right: 16, zIndex: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  saveBtn: { borderRadius: 18, paddingHorizontal: 18, paddingVertical: 8 },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  editBtn: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
  editBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 18 },
  dot: { height: 8, borderRadius: 4 },

  // Slides
  slideContent: { paddingTop: 90, paddingHorizontal: 24, paddingBottom: 40, alignItems: 'flex-start' },
  slideContentTight: { paddingTop: 70, paddingHorizontal: 20, paddingBottom: 40 },
  ghostWrap: { position: 'absolute', top: 40, right: -10 },
  ghostEmoji: { fontSize: 110, opacity: 0.1 },
  trackedCaps: { fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  trackedCapsSmall: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  coverDate: { fontSize: 42, fontWeight: '800', color: '#ffffff', lineHeight: 48, marginTop: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 13, color: '#ffffff' },
  pillTextMuted: { color: 'rgba(255,255,255,0.35)' },
  threeWords: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginTop: 24, lineHeight: 28 },
  swipeHint: { fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 40 },

  // Photos slide
  pairCard: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  pairMain: { width: '100%', aspectRatio: 3 / 4 },
  pairInset: { position: 'absolute', top: 12, left: 12, width: 100, height: 133, borderRadius: 12, borderWidth: 2, borderColor: '#ffffff', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  coverBadge: { position: 'absolute', top: 10, right: 52, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  coverBadgeText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
  photoMenuBtn: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  actionRow: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  actionText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  captionText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', marginBottom: 10, paddingHorizontal: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 12 },
  thumbStrip: { gap: 8, paddingVertical: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10 },

  // Your day slide
  pullQuote: { fontSize: 20, color: '#ffffff', fontStyle: 'italic', lineHeight: 29, marginBottom: 20 },
  pullQuoteEmpty: { fontSize: 18, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', marginBottom: 20 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  voiceRowText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  dayBlock: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  dayBlockValue: { fontSize: 15, color: '#ffffff', lineHeight: 22 },
  dayBlockEmpty: { fontSize: 15, color: 'rgba(255,255,255,0.2)' },
  cookedThumb: { width: 80, height: 80, borderRadius: 10, marginTop: 10 },

  // Locations slide
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  locationDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  locationName: { fontSize: 17, color: '#ffffff', fontWeight: '600' },
  locationWith: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  // World slide
  worldSubheader: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16, marginTop: 4 },
  newsCard: { borderRadius: 12, padding: 14, marginBottom: 8 },
  newsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  newsYearPill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  newsYearText: { fontSize: 13, color: '#ffffff' },
  newsIcon: { fontSize: 14 },
  newsText: { fontSize: 14, color: '#ffffff', lineHeight: 20 },
  newsSource: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 },
  footballHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  footballHeaderText: { fontSize: 16, color: '#ffffff' },
  matchComp: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  matchTeam: { flex: 1, fontSize: 14, color: '#ffffff' },
  matchScore: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  matchStatus: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6, textAlign: 'center' },
  mutedNote: { fontSize: 14, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: 12 },
  weatherBig: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginTop: 8 },

  // One year ago slide
  lastYearThumb: { width: 160, height: 213, borderRadius: 14, marginBottom: 8 },
  lastYearDate: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 12 },
  lastYearBtn: { borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13, marginTop: 20 },
  lastYearBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },

  // Fullscreen
  fullscreenClose: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },

  // Menus
  menuOverlay: { flex: 1, justifyContent: 'flex-end' },
  menuBox: { backgroundColor: 'rgba(13,13,20,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderWidth: 1 },
  menuTitle: { fontSize: 16, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  menuItemEmoji: { fontSize: 22 },
  menuItemText: { fontSize: 16, color: '#ffffff', fontWeight: '600' },
  menuCancel: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, alignItems: 'center' },
  menuCancelText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },

  // BlurView modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: 'rgba(13,13,20,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 6, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 10 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  modalSave: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  modalSaveText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  modalCancel: { alignItems: 'center', padding: 10 },
  modalCancelText: { color: 'rgba(255,255,255,0.35)', fontSize: 15 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  tagChipText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  tagInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tagAddBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  scopePill: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  scopeText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  placeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  placeRowName: { fontSize: 16, color: '#ffffff', fontWeight: '600', flex: 1 },
  placeRowType: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  newPlaceBtn: { paddingVertical: 14, alignItems: 'center' },
  newPlaceBtnText: { fontWeight: '600', fontSize: 15 },
});
