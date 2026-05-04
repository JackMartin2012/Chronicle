import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const THUMB_SIZE = Math.floor((width - 32 - 12) / 7);

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

const emptyContext: DayContext = {
  living: '', doing: '', with: '', listening: '', thinking: '',
};

const allPrompts = [
  "Where were you living?",
  "What were you doing with your life?",
  "Who were you spending most of your time with?",
  "What were you most looking forward to?",
  "What was your daily routine like?",
  "What were you worried about?",
  "What made you happy that week?",
  "Where did you spend most of your time?",
  "What was your biggest goal?",
  "Who was most important to you?",
  "What were you learning?",
  "What song was always on?",
];

const getPromptForDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  const seed = parseInt(parts[0]) * 1000 + parseInt(parts[1]) * 31 + parseInt(parts[2]);
  return allPrompts[seed % allPrompts.length];
};

const contextFields = [
  { key: 'living', label: 'WHERE I WAS LIVING', placeholder: 'My flat in Edinburgh...', emoji: '📍' },
  { key: 'doing', label: 'WHAT I WAS DOING', placeholder: 'Working at..., studying...', emoji: '💼' },
  { key: 'with', label: 'WHO I WAS WITH', placeholder: 'Mostly with Alex and...', emoji: '👥' },
  { key: 'listening', label: 'WHAT I WAS LISTENING TO', placeholder: 'Obsessed with...', emoji: '🎵' },
  { key: 'thinking', label: 'WHAT I WAS THINKING ABOUT', placeholder: 'Worried about / excited about...', emoji: '💭' },
];

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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

export default function OnThisDay() {
  const [memoryList, setMemoryList] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [activeTab, setActiveTab] = useState<'today' | 'vault'>('today');

  // Day detail
  const [selectedDayMemories, setSelectedDayMemories] = useState<Memory[] | null>(null);
  const [selectedDayYear, setSelectedDayYear] = useState('');
  const [selectedDayDate, setSelectedDayDate] = useState('');
  const [dayContext, setDayContext] = useState<DayContext>(emptyContext);
  const [activeContextField, setActiveContextField] = useState<string | null>(null);
  const [tempContextText, setTempContextText] = useState('');
  const [daySaved, setDaySaved] = useState(false);

  // Caption
  const [captioningMemory, setCaptioningMemory] = useState<Memory | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [peopleText, setPeopleText] = useState('');

  // Three dot menu
  const [menuMemory, setMenuMemory] = useState<Memory | null>(null);

  // Full screen
  const [fullScreenUri, setFullScreenUri] = useState<string | null>(null);
  const [fullScreenCaption, setFullScreenCaption] = useState('');

  // Vault
  const [vaultDays, setVaultDays] = useState<VaultDay[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [selectedVaultDay, setSelectedVaultDay] = useState<VaultDay | null>(null);
  const [selectedCalYear, setSelectedCalYear] = useState('');

  // Vault editing
  const [editingVaultDate, setEditingVaultDate] = useState('');
  const [editingVaultContext, setEditingVaultContext] = useState<string | null>(null);
  const [vaultEditText, setVaultEditText] = useState('');

  // People
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [personPhotos, setPersonPhotos] = useState<VaultPhoto[]>([]);

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
    if (activeTab === 'vault') loadVault();
  }, [activeTab]);

  const loadMemories = async () => {
    setLoading(true);
    const today = new Date();
    const found: Memory[] = [];

    // Load hidden and cover photo sets
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
          id: asset.id,
          year,
          date: formatDateKey(targetDate),
          caption: savedCaption || '',
          uri,
          mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
          isScreenshot,
          people: savedPeople ? JSON.parse(savedPeople) : [],
          hidden: false,
          isCover,
        });
      }
    }

    // Sort so cover photo comes first in each year group
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
    for (const k of contextKeys) dateKeySet.add(k.replace('day_context_', ''));
    for (const k of savedDayKeys) {
      const val = await AsyncStorage.getItem(k);
      if (val === 'true') dateKeySet.add(k.replace('saved_day_', ''));
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
            id: assetId,
            uri: asset.localUri || asset.uri,
            caption,
            people: savedPeople ? JSON.parse(savedPeople) : [],
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

      const hasContent = context || photos.length > 0 || presentEntry;
      if (!hasContent) continue;

      const date = new Date(dateKey + 'T12:00:00');
      const displayDate = date.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });

      days.push({
        dateKey,
        displayDate,
        context,
        presentEntry,
        photos,
        thumbUri: photos.length > 0 ? photos[0].uri : null,
      });
    }

    days.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    setVaultDays(days);
    if (days.length > 0) setSelectedCalYear(days[0].dateKey.split('-')[0]);
    setVaultLoading(false);
  };

  const openDayDetail = async (memories: Memory[], year: string, date: string) => {
    const enriched = await Promise.all(memories.map(async (m) => {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(m.id);
        return { ...m, uri: info.localUri || m.uri };
      } catch { return m; }
    }));
    setSelectedDayMemories(enriched);
    setSelectedDayYear(year);
    setSelectedDayDate(date);
    const saved = await AsyncStorage.getItem(`day_context_${date}`);
    setDayContext(saved ? JSON.parse(saved) : emptyContext);
    const daySavedFlag = await AsyncStorage.getItem(`saved_day_${date}`);
    setDaySaved(daySavedFlag === 'true');
  };

  const saveDayContext = async (field: string, value: string) => {
    const updated = { ...dayContext, [field]: value };
    setDayContext(updated);
    await AsyncStorage.setItem(`day_context_${selectedDayDate}`, JSON.stringify(updated));
    setActiveContextField(null);
  };

  const saveWholeDay = async () => {
    await AsyncStorage.setItem(`day_context_${selectedDayDate}`, JSON.stringify(dayContext));
    await AsyncStorage.setItem(`saved_day_${selectedDayDate}`, 'true');
    setDaySaved(true);
  };

  const openCaptionModal = (memory: Memory) => {
    setCaptioningMemory(memory);
    setCaptionText(memory.caption);
    setPeopleText(memory.people.join(', '));
  };

  const saveCaption = async () => {
    if (!captioningMemory) return;
    await AsyncStorage.setItem(`caption_${captioningMemory.id}`, captionText);
    const peopleArray = peopleText.split(',').map(p => p.trim()).filter(p => p.length > 0);
    await AsyncStorage.setItem(`people_${captioningMemory.id}`, JSON.stringify(peopleArray));
    const updater = (m: Memory) => m.id === captioningMemory.id
      ? { ...m, caption: captionText, people: peopleArray } : m;
    setMemoryList(prev => prev.map(updater));
    setSelectedDayMemories(prev => prev ? prev.map(updater) : null);
    setCaptioningMemory(null);
  };

  // Three dot menu actions
  const hidePhoto = async (memory: Memory) => {
    const hiddenRaw = await AsyncStorage.getItem('hidden_photos');
    const hidden: string[] = hiddenRaw ? JSON.parse(hiddenRaw) : [];
    hidden.push(memory.id);
    await AsyncStorage.setItem('hidden_photos', JSON.stringify(hidden));
    setSelectedDayMemories(prev => prev ? prev.filter(m => m.id !== memory.id) : null);
    setMemoryList(prev => prev.filter(m => m.id !== memory.id));
    setMenuMemory(null);
  };

  const setAsCover = async (memory: Memory) => {
    const coverRaw = await AsyncStorage.getItem('cover_photos');
    const coverMap = coverRaw ? JSON.parse(coverRaw) : {};
    coverMap[memory.year] = memory.id;
    await AsyncStorage.setItem('cover_photos', JSON.stringify(coverMap));
    setSelectedDayMemories(prev => prev ? prev.map(m => ({ ...m, isCover: m.id === memory.id })) : null);
    setMenuMemory(null);
    Alert.alert('Cover set!', 'This photo will now appear as the card thumbnail for ' + memory.year);
  };

  const sharePhoto = async (memory: Memory) => {
    if (!memory.uri) return;
    try {
      await Share.share({ url: memory.uri, message: memory.caption || 'A memory from Chronicle' });
    } catch { }
    setMenuMemory(null);
  };

  const copyCaption = (memory: Memory) => {
    if (memory.caption) {
      Clipboard.setString(memory.caption);
      Alert.alert('Copied!', 'Caption copied to clipboard.');
    } else {
      Alert.alert('No caption', 'Add a caption to this photo first.');
    }
    setMenuMemory(null);
  };

  const openPersonGallery = (name: string) => {
    const photos = vaultDays.flatMap(d => d.photos.filter(p => p.people.includes(name)));
    setPersonPhotos(photos);
    setSelectedPerson(name);
  };

  const groupedMemories = memoryList.reduce((groups, memory) => {
    if (!groups[memory.year]) groups[memory.year] = [];
    groups[memory.year].push(memory);
    return groups;
  }, {} as Record<string, Memory[]>);

  const sortedYears = Object.keys(groupedMemories).sort((a, b) => b.localeCompare(a));

  const dayMap: Record<string, VaultDay> = {};
  vaultDays.forEach(d => { dayMap[d.dateKey] = d; });

  const vaultYears = [...new Set(vaultDays.map(d => d.dateKey.split('-')[0]))].sort().reverse();

  const monthsInSelectedYear = [...new Set(
    vaultDays
      .filter(d => d.dateKey.startsWith(selectedCalYear))
      .map(d => parseInt(d.dateKey.split('-')[1]) - 1)
  )].sort((a, b) => a - b);

  const allPeople = [...new Set(
    vaultDays.flatMap(d => d.photos.flatMap(p => p.people))
  )].filter(Boolean).sort();

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

  return (
    <View style={styles.outerContainer}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Past</Text>
        <Text style={styles.headerDate}>{dateString}</Text>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'today' && styles.tabButtonActive]}
            onPress={() => setActiveTab('today')}>
            <Text style={[styles.tabButtonText, activeTab === 'today' && styles.tabButtonTextActive]}>
              On This Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'vault' && styles.tabButtonActive]}
            onPress={() => setActiveTab('vault')}>
            <Text style={[styles.tabButtonText, activeTab === 'vault' && styles.tabButtonTextActive]}>
              Your Vault
            </Text>
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
          ) : sortedYears.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📷</Text>
              <Text style={styles.emptyTitle}>No memories found</Text>
              <Text style={styles.emptySubtitle}>
                You don't have any photos from this date in previous years.
              </Text>
            </View>
          ) : (
            <View style={styles.yearCardsList}>
              {sortedYears.map((year) => {
                const memories = groupedMemories[year];
                const firstMemory = memories[0];
                const prompt = getPromptForDate(memories[0].date);
                return (
                  <TouchableOpacity
                    key={year}
                    style={styles.yearCard}
                    onPress={() => openDayDetail(memories, year, memories[0].date)}
                    activeOpacity={0.92}>
                    {firstMemory.uri && (
                      <Image source={{ uri: firstMemory.uri }} style={styles.yearCardBg} resizeMode="cover" />
                    )}
                    <View style={styles.yearCardOverlay}>
                      <View style={styles.yearBadge}>
                        <Text style={styles.yearBadgeText}>{year}</Text>
                      </View>
                      <View style={styles.yearCardBottom}>
                        <View style={styles.yearCardBottomRow}>
                          <Text style={styles.yearMemoryCount}>
                            {memories.length} {memories.length === 1 ? 'photo' : 'photos'}
                          </Text>
                          <Text style={styles.yearCardCta}>Tap to explore →</Text>
                        </View>
                        <Text style={styles.yearPromptTeaser}>{prompt}</Text>
                        <View style={styles.yearPreviewStrip}>
                          {memories.slice(0, 4).map((m, i) => (
                            m.uri ? (
                              <Image
                                key={m.id}
                                source={{ uri: m.uri }}
                                style={[styles.yearPreviewThumb, { marginLeft: i > 0 ? -10 : 0, zIndex: 4 - i }]}
                              />
                            ) : null
                          ))}
                          {memories.length > 4 && (
                            <View style={[styles.yearPreviewMore, { marginLeft: -10 }]}>
                              <Text style={styles.yearPreviewMoreText}>+{memories.length - 4}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
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
              <Text style={styles.emptySubtitle}>
                Open a year card, fill in the context and tap Save Day to Vault.
              </Text>
            </View>
          ) : (
            <>
              {allPeople.length > 0 && (
                <View style={styles.peopleSection}>
                  <Text style={styles.peopleSectionTitle}>People</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.peopleSectionContent}>
                    {allPeople.map(person => (
                      <TouchableOpacity
                        key={person}
                        style={styles.personBubble}
                        onPress={() => openPersonGallery(person)}>
                        <View style={styles.personBubbleAvatar}>
                          <Text style={styles.personBubbleInitial}>
                            {person.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.personBubbleName}>{person}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Fixed year picker */}
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={styles.yearPickerStrip}
                contentContainerStyle={styles.yearPickerContent}>
                {vaultYears.map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.yearPickerItem, selectedCalYear === year && styles.yearPickerItemActive]}
                    onPress={() => setSelectedCalYear(year)}>
                    <Text style={[styles.yearPickerText, selectedCalYear === year && styles.yearPickerTextActive]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Calendar — flex 1 so it doesn't push year picker away */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {monthsInSelectedYear.map(month => {
                  const year = parseInt(selectedCalYear);
                  const daysInMonth = getDaysInMonth(year, month);
                  const firstDay = getFirstDayOfMonth(year, month);
                  const monthName = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long' });

                  return (
                    <View key={month} style={styles.calendarMonth}>
                      <Text style={styles.calendarMonthTitle}>{monthName}</Text>
                      <View style={styles.calendarDayHeaders}>
                        {WEEK_DAYS.map((d, i) => (
                          <Text key={i} style={styles.calendarDayHeader}>{d}</Text>
                        ))}
                      </View>
                      <View style={styles.calendarGrid}>
                        {Array.from({ length: firstDay }).map((_, i) => (
                          <View key={`empty-${i}`} style={styles.calendarCell} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dateKey = `${selectedCalYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const vaultDay = dayMap[dateKey];

                          return (
                            <TouchableOpacity
                              key={day}
                              style={styles.calendarCell}
                              onPress={() => vaultDay ? setSelectedVaultDay(vaultDay) : null}
                              activeOpacity={vaultDay ? 0.8 : 1}>
                              {vaultDay ? (
                                <View style={styles.calendarCellFilled}>
                                  {vaultDay.thumbUri && (
                                    <Image source={{ uri: vaultDay.thumbUri }} style={styles.calendarThumb} />
                                  )}
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

      {/* DAY DETAIL MODAL */}
      <Modal visible={selectedDayMemories !== null} animationType="slide">
        <View style={styles.dayModal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedDayMemories && selectedDayMemories[0]?.uri && (
              <Image source={{ uri: selectedDayMemories[0].uri }} style={styles.dayHeroPhoto} />
            )}
            <View style={styles.dayContent}>
              <View style={styles.dayTitleRow}>
                <View style={styles.dayYearBadge}>
                  <Text style={styles.dayYearBadgeText}>{selectedDayYear}</Text>
                </View>
                <Text style={styles.dayDateText}>
                  {selectedDayDate ? new Date(selectedDayDate + 'T12:00:00').toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  }) : ''}
                </Text>
              </View>

              {/* Save day button */}
              <TouchableOpacity
                style={[styles.saveDayButton, daySaved && styles.saveDayButtonSaved]}
                onPress={saveWholeDay}>
                <Text style={styles.saveDayButtonText}>
                  {daySaved ? '✅ Day Saved to Vault' : '🔒 Save Day to Vault'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Context</Text>
              <Text style={styles.sectionSubtitle}>What was life like around this time?</Text>

              {contextFields.map(field => (
                <TouchableOpacity
                  key={field.key}
                  style={styles.contextCard}
                  onPress={() => {
                    setTempContextText(dayContext[field.key as keyof DayContext]);
                    setActiveContextField(field.key);
                  }}>
                  <Text style={styles.contextLabel}>{field.emoji} {field.label}</Text>
                  {dayContext[field.key as keyof DayContext] ? (
                    <Text style={styles.contextAnswer}>{dayContext[field.key as keyof DayContext]}</Text>
                  ) : (
                    <Text style={styles.contextPlaceholder}>{field.placeholder}</Text>
                  )}
                </TouchableOpacity>
              ))}

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Photos</Text>
              <Text style={styles.sectionSubtitle}>
                Tap a photo to view fullscreen. Add a caption to save to Your Vault.
              </Text>

              {selectedDayMemories?.map((memory) => (
                <View key={memory.id} style={styles.dayPhotoCard}>
                  {/* Three dot menu button */}
                  <TouchableOpacity
                    style={styles.photoMenuButton}
                    onPress={() => setMenuMemory(memory)}>
                    <Text style={styles.photoMenuDots}>•••</Text>
                  </TouchableOpacity>

                  {memory.isCover && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>⭐ Cover</Text>
                    </View>
                  )}

                  <TouchableOpacity onPress={() => {
                    setFullScreenUri(memory.uri);
                    setFullScreenCaption(memory.caption);
                  }}>
                    {memory.uri ? (
                      <Image source={{ uri: memory.uri }} style={styles.dayPhotoImage} />
                    ) : (
                      <View style={[styles.dayPhotoImage, styles.videoPlaceholder]}>
                        <Text style={styles.videoPlaceholderText}>▶ Video</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.dayPhotoInfo}>
                    {memory.isScreenshot && <Text style={styles.dayPhotoType}>📸 Screenshot</Text>}
                    {memory.caption ? (
                      <Text style={styles.dayPhotoCaption}>"{memory.caption}"</Text>
                    ) : null}
                    {memory.people.length > 0 && (
                      <View style={styles.peopleTags}>
                        {memory.people.map(person => (
                          <View key={person} style={styles.personTag}>
                            <Text style={styles.personTagText}>👤 {person}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.addCaptionButton, memory.caption ? styles.addCaptionButtonSaved : null]}
                      onPress={() => openCaptionModal(memory)}>
                      <Text style={styles.addCaptionText}>
                        {memory.caption ? '✅ Saved to Vault · Edit caption' : '🔒 Save photo to Vault'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.dayModalClose}
            onPress={() => setSelectedDayMemories(null)}>
            <Text style={styles.dayModalCloseText}>← Back to The Past</Text>
          </TouchableOpacity>

          {/* Three dot menu modal — inside day detail */}
          <Modal visible={menuMemory !== null} animationType="slide" transparent>
            <TouchableOpacity
              style={styles.menuOverlay}
              activeOpacity={1}
              onPress={() => setMenuMemory(null)}>
              <View style={styles.menuBox}>
                <Text style={styles.menuTitle}>Photo options</Text>

                <TouchableOpacity style={styles.menuItem} onPress={() => setAsCover(menuMemory!)}>
                  <Text style={styles.menuItemEmoji}>⭐</Text>
                  <View>
                    <Text style={styles.menuItemText}>Set as cover</Text>
                    <Text style={styles.menuItemSub}>Use this as the {menuMemory?.year} card thumbnail</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => sharePhoto(menuMemory!)}>
                  <Text style={styles.menuItemEmoji}>📤</Text>
                  <View>
                    <Text style={styles.menuItemText}>Share</Text>
                    <Text style={styles.menuItemSub}>Share this photo or save it elsewhere</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => copyCaption(menuMemory!)}>
                  <Text style={styles.menuItemEmoji}>📋</Text>
                  <View>
                    <Text style={styles.menuItemText}>Copy caption</Text>
                    <Text style={styles.menuItemSub}>Copy the caption text to clipboard</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={() => {
                    Alert.alert(
                      'Hide photo',
                      'This photo will be hidden from Chronicle. It stays on your camera roll.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Hide', style: 'destructive', onPress: () => hidePhoto(menuMemory!) },
                      ]
                    );
                  }}>
                  <Text style={styles.menuItemEmoji}>🙈</Text>
                  <View>
                    <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Hide</Text>
                    <Text style={styles.menuItemSub}>Remove from Chronicle — stays on your camera roll</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuMemory(null)}>
                  <Text style={styles.menuCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Caption modal — inside day detail */}
          <Modal visible={captioningMemory !== null} animationType="slide" transparent>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Save photo to Vault</Text>
                <Text style={styles.modalSubtitle}>What do you remember about this photo?</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Write something for future you..."
                  placeholderTextColor="#555555"
                  multiline
                  value={captionText}
                  onChangeText={setCaptionText}
                  autoFocus
                />
                <Text style={styles.modalSubtitle}>Who were you with?</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 44 }]}
                  placeholder="Alex, Mum... (separate with commas)"
                  placeholderTextColor="#555555"
                  value={peopleText}
                  onChangeText={setPeopleText}
                />
                <TouchableOpacity style={styles.saveButton} onPress={saveCaption}>
                  <Text style={styles.saveButtonText}>Save to Vault</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setCaptioningMemory(null)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Context field modal — inside day detail */}
          <Modal visible={activeContextField !== null} animationType="slide" transparent>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>
                  {contextFields.find(f => f.key === activeContextField)?.label || ''}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={contextFields.find(f => f.key === activeContextField)?.placeholder || ''}
                  placeholderTextColor="#555555"
                  multiline
                  value={tempContextText}
                  onChangeText={setTempContextText}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => saveDayContext(activeContextField!, tempContextText)}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setActiveContextField(null)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Full screen — inside day detail */}
          <Modal visible={fullScreenUri !== null} transparent animationType="fade">
            <TouchableOpacity
              style={styles.fullScreenOverlay}
              activeOpacity={1}
              onPress={() => { setFullScreenUri(null); setFullScreenCaption(''); }}>
              {fullScreenUri && (
                <Image source={{ uri: fullScreenUri }} style={styles.fullScreenImage} resizeMode="contain" />
              )}
              {fullScreenCaption ? (
                <Text style={styles.fullScreenCaption}>"{fullScreenCaption}"</Text>
              ) : null}
              <Text style={styles.fullScreenDismiss}>Tap anywhere to close</Text>
            </TouchableOpacity>
          </Modal>
        </View>
      </Modal>

      {/* VAULT DAY FULL VIEW */}
      <Modal visible={selectedVaultDay !== null} animationType="slide">
        <View style={styles.vaultDayModal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedVaultDay?.thumbUri && (
              <Image source={{ uri: selectedVaultDay.thumbUri }} style={styles.vaultDayHero} />
            )}
            <View style={styles.vaultDayContent}>
              <Text style={styles.vaultDayDate}>{selectedVaultDay?.displayDate}</Text>

              {selectedVaultDay?.presentEntry && (
                <View style={styles.vaultDayChips}>
                  {selectedVaultDay.presentEntry.mood && (
                    <View style={styles.vaultDayChip}>
                      <Text style={styles.vaultDayChipText}>
                        {selectedVaultDay.presentEntry.mood}
                        {selectedVaultDay.presentEntry.dayDescription
                          ? ` — ${selectedVaultDay.presentEntry.dayDescription}` : ''}
                      </Text>
                    </View>
                  )}
                  {selectedVaultDay.presentEntry.weatherEmoji && (
                    <View style={styles.vaultDayChip}>
                      <Text style={styles.vaultDayChipText}>
                        {selectedVaultDay.presentEntry.weatherEmoji} {selectedVaultDay.presentEntry.weatherTemp}°C
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {selectedVaultDay?.context && Object.values(selectedVaultDay.context).some(v => v) && (
                <View style={styles.vaultDaySection}>
                  <Text style={styles.vaultDaySectionTitle}>Context</Text>
                  {contextFields.map(field => {
                    const val = selectedVaultDay.context![field.key as keyof DayContext];
                    if (!val) return null;
                    return (
                      <View key={field.key} style={styles.vaultDayContextRow}>
                        <Text style={styles.vaultDayContextLabel}>{field.emoji} {field.label}</Text>
                        <Text style={styles.vaultDayContextValue}>{val}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {selectedVaultDay?.presentEntry && (
                <View style={styles.vaultDaySection}>
                  {selectedVaultDay.presentEntry.highlight ? (
                    <View style={styles.vaultDayContextRow}>
                      <Text style={styles.vaultDayContextLabel}>✨ HIGHLIGHT</Text>
                      <Text style={styles.vaultDayContextValue}>"{selectedVaultDay.presentEntry.highlight}"</Text>
                    </View>
                  ) : null}
                  {selectedVaultDay.presentEntry.learned ? (
                    <View style={styles.vaultDayContextRow}>
                      <Text style={styles.vaultDayContextLabel}>💡 WHAT I LEARNED</Text>
                      <Text style={styles.vaultDayContextValue}>"{selectedVaultDay.presentEntry.learned}"</Text>
                    </View>
                  ) : null}
                  {selectedVaultDay.presentEntry.songName ? (
                    <View style={styles.vaultDayContextRow}>
                      <Text style={styles.vaultDayContextLabel}>🎵 SONG</Text>
                      <Text style={styles.vaultDayContextValue}>
                        {selectedVaultDay.presentEntry.songName}
                        {selectedVaultDay.presentEntry.songRating > 0
                          ? ` — ${selectedVaultDay.presentEntry.songRating}/10` : ''}
                      </Text>
                    </View>
                  ) : null}
                  {selectedVaultDay.presentEntry.withWho ? (
                    <View style={styles.vaultDayContextRow}>
                      <Text style={styles.vaultDayContextLabel}>👥 WITH</Text>
                      <Text style={styles.vaultDayContextValue}>{selectedVaultDay.presentEntry.withWho}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {selectedVaultDay?.photos && selectedVaultDay.photos.length > 0 && (
                <View style={styles.vaultDaySection}>
                  <Text style={styles.vaultDaySectionTitle}>
                    Photos ({selectedVaultDay.photos.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.vaultDayPhotoStrip}>
                    {selectedVaultDay.photos.map((photo) => (
                      <View key={photo.id} style={styles.vaultDayPhotoItem}>
                        <Image source={{ uri: photo.uri }} style={styles.vaultDayPhotoThumb} />
                        {photo.caption ? (
                          <Text style={styles.vaultDayPhotoCaption} numberOfLines={2}>
                            "{photo.caption}"
                          </Text>
                        ) : null}
                        {photo.people.length > 0 && (
                          <Text style={styles.vaultDayPhotoPeople}>
                            👤 {photo.people.join(', ')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Edit + back buttons */}
          <View style={styles.vaultDayActions}>
            <TouchableOpacity
              style={styles.vaultDayEditButton}
              onPress={() => setEditingVaultDate(selectedVaultDay?.dateKey || '')}>
              <Text style={styles.vaultDayEditButtonText}>✏️ Edit context</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dayModalClose}
              onPress={() => setSelectedVaultDay(null)}>
              <Text style={styles.dayModalCloseText}>← Back to Vault</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Vault context edit modal */}
      <Modal visible={editingVaultDate !== ''} animationType="slide" transparent>
        <View style={styles.vaultEditOverlay}>
          <View style={styles.vaultEditBox}>
            <Text style={styles.vaultEditTitle}>Edit Context</Text>
            <Text style={styles.vaultEditSubtitle}>{selectedVaultDay?.displayDate}</Text>
            <ScrollView>
              {contextFields.map(field => {
                const currentVal = selectedVaultDay?.context?.[field.key as keyof DayContext] || '';
                return (
                  <TouchableOpacity
                    key={field.key}
                    style={styles.vaultEditField}
                    onPress={() => {
                      setEditingVaultContext(field.key);
                      setVaultEditText(currentVal);
                    }}>
                    <Text style={styles.vaultEditLabel}>{field.emoji} {field.label}</Text>
                    {currentVal ? (
                      <Text style={styles.vaultEditValue}>{currentVal}</Text>
                    ) : (
                      <Text style={styles.vaultEditPlaceholder}>{field.placeholder}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.vaultEditClose} onPress={() => setEditingVaultDate('')}>
              <Text style={styles.vaultEditCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Individual field editor */}
        <Modal visible={editingVaultContext !== null} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {contextFields.find(f => f.key === editingVaultContext)?.label || ''}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={contextFields.find(f => f.key === editingVaultContext)?.placeholder || ''}
                placeholderTextColor="#555555"
                multiline
                value={vaultEditText}
                onChangeText={setVaultEditText}
                autoFocus
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={async () => {
                  if (!editingVaultContext || !selectedVaultDay) return;
                  const existing = selectedVaultDay.context || { ...emptyContext };
                  const updated = { ...existing, [editingVaultContext]: vaultEditText };
                  await AsyncStorage.setItem(`day_context_${selectedVaultDay.dateKey}`, JSON.stringify(updated));
                  setSelectedVaultDay({ ...selectedVaultDay, context: updated });
                  setEditingVaultContext(null);
                }}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingVaultContext(null)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Modal>

      {/* Person gallery */}
      <Modal visible={selectedPerson !== null} animationType="slide">
        <View style={styles.personModal}>
          <View style={styles.personModalHeader}>
            <Text style={styles.personModalTitle}>Memories with {selectedPerson}</Text>
            <Text style={styles.personModalCount}>
              {personPhotos.length} {personPhotos.length === 1 ? 'photo' : 'photos'}
            </Text>
          </View>
          <ScrollView contentContainerStyle={styles.personGalleryGrid}>
            {personPhotos.map((photo, i) => (
              <View key={i} style={styles.personGalleryItem}>
                <Image source={{ uri: photo.uri }} style={styles.personGalleryThumb} />
                {photo.caption ? (
                  <Text style={styles.personGalleryCaption} numberOfLines={2}>"{photo.caption}"</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.dayModalClose} onPress={() => setSelectedPerson(null)}>
            <Text style={styles.dayModalCloseText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#0d0d0d' },
  container: { flex: 1 },
  header: {
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 12,
    backgroundColor: '#0d0d0d',
  },
  headerTitle: { fontSize: 34, fontWeight: 'bold', color: '#ffffff', marginBottom: 2 },
  headerDate: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 16 },
  tabSwitcher: {
    flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 4,
  },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#9b72ff' },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: '#555555' },
  tabButtonTextActive: { color: '#ffffff' },
  centreScreen: {
    flex: 1, backgroundColor: '#0d0d0d',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  permissionTitle: {
    fontSize: 24, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 16,
  },
  permissionSubtitle: {
    fontSize: 15, color: '#666666', textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32,
  },
  permissionButtonText: { color: '#000000', fontWeight: '600', fontSize: 16 },
  loadingContainer: { paddingTop: 80, alignItems: 'center' },
  loadingText: { color: '#666666', marginTop: 16, fontSize: 15 },
  emptyState: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#666666', textAlign: 'center', lineHeight: 22 },
  yearCardsList: { padding: 16, gap: 16, paddingBottom: 40 },
  yearCard: {
    width: '100%', height: height * 0.45,
    borderRadius: 20, overflow: 'hidden', backgroundColor: '#1a1a1a',
    borderWidth: 1.5, borderColor: '#9b72ff',
  },
  yearCardBg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  yearCardOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'space-between', padding: 18,
  },
  yearBadge: {
    alignSelf: 'flex-start', backgroundColor: '#9b72ff',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 16,
  },
  yearBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  yearCardBottom: { gap: 10 },
  yearCardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  yearMemoryCount: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  yearCardCta: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  yearPromptTeaser: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  yearPreviewStrip: { flexDirection: 'row', alignItems: 'center' },
  yearPreviewThumb: {
    width: 44, height: 44, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(0,0,0,0.5)',
  },
  yearPreviewMore: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: 'rgba(155,114,255,0.7)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.5)',
  },
  yearPreviewMoreText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  peopleSection: { paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 },
  peopleSectionTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  peopleSectionContent: { gap: 16 },
  personBubble: { alignItems: 'center', width: 60 },
  personBubbleAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#9b72ff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  personBubbleInitial: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  personBubbleName: { color: '#cccccc', fontSize: 11, textAlign: 'center' },
  yearPickerStrip: { maxHeight: 56 },
  yearPickerContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  yearPickerItem: {
    paddingHorizontal: 24, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  yearPickerItemActive: { backgroundColor: '#9b72ff', borderColor: '#9b72ff' },
  yearPickerText: { fontSize: 16, fontWeight: '700', color: '#555555' },
  yearPickerTextActive: { color: '#ffffff' },
  calendarMonth: { paddingHorizontal: 16, marginBottom: 32 },
  calendarMonthTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  calendarDayHeaders: { flexDirection: 'row', marginBottom: 6 },
  calendarDayHeader: {
    width: THUMB_SIZE, textAlign: 'center', fontSize: 11, color: '#555555', fontWeight: '600',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: THUMB_SIZE, height: THUMB_SIZE, padding: 2 },
  calendarCellFilled: { flex: 1, borderRadius: 6, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  calendarThumb: { width: '100%', height: '100%', position: 'absolute' },
  calendarDayNumber: {
    position: 'absolute', bottom: 2, right: 3,
    fontSize: 11, color: '#9b72ff', fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
  calendarCellEmpty: {
    flex: 1, borderRadius: 6, backgroundColor: '#111111',
    justifyContent: 'center', alignItems: 'center',
  },
  calendarDayNumberEmpty: { fontSize: 11, color: '#2a2a2a' },
  saveDayButton: {
    backgroundColor: 'rgba(155,114,255,0.15)',
    borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(155,114,255,0.4)', marginBottom: 20,
  },
  saveDayButtonSaved: { backgroundColor: 'rgba(155,114,255,0.25)', borderColor: '#9b72ff' },
  saveDayButtonText: { color: '#9b72ff', fontWeight: '700', fontSize: 15 },
  dayModal: { flex: 1, backgroundColor: '#0d0d0d' },
  dayHeroPhoto: { width: '100%', height: 280 },
  dayContent: { padding: 20, paddingBottom: 100 },
  dayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dayYearBadge: {
    backgroundColor: '#9b72ff', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 16,
  },
  dayYearBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  dayDateText: { fontSize: 18, fontWeight: '700', color: '#ffffff', flex: 1, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#555555', marginBottom: 16, fontStyle: 'italic' },
  contextCard: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  contextLabel: { fontSize: 10, color: '#9b72ff', fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  contextAnswer: { fontSize: 15, color: '#ffffff', lineHeight: 22 },
  contextPlaceholder: { fontSize: 14, color: '#333333', fontStyle: 'italic' },
  dayPhotoCard: { marginBottom: 16, backgroundColor: '#1a1a1a', borderRadius: 16, overflow: 'hidden' },
  photoMenuButton: {
    position: 'absolute', top: 10, right: 10, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  photoMenuDots: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  coverBadge: {
    position: 'absolute', top: 10, left: 10, zIndex: 10,
    backgroundColor: 'rgba(155,114,255,0.8)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  coverBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  dayPhotoImage: { width: '100%', height: 220 },
  videoPlaceholder: { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  videoPlaceholderText: { color: '#ffffff', fontSize: 18 },
  dayPhotoInfo: { padding: 14 },
  dayPhotoType: { fontSize: 12, color: '#666666', marginBottom: 6 },
  dayPhotoCaption: { fontSize: 15, color: '#ffffff', fontStyle: 'italic', marginBottom: 10, lineHeight: 22 },
  peopleTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  personTag: {
    backgroundColor: 'rgba(155,114,255,0.15)',
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(155,114,255,0.3)',
  },
  personTagText: { color: '#9b72ff', fontSize: 12, fontWeight: '600' },
  addCaptionButton: {
    borderWidth: 1, borderColor: '#333333', borderRadius: 10, padding: 10, alignItems: 'center',
  },
  addCaptionButtonSaved: { borderColor: 'rgba(155,114,255,0.4)', backgroundColor: 'rgba(155,114,255,0.1)' },
  addCaptionText: { color: '#666666', fontSize: 14 },
  dayModalClose: {
    margin: 16, backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, alignItems: 'center',
  },
  dayModalCloseText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },

  // Three dot menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  menuBox: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  menuTitle: { fontSize: 16, color: '#666666', fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  menuItemDanger: { borderBottomWidth: 0 },
  menuItemEmoji: { fontSize: 22 },
  menuItemText: { fontSize: 16, color: '#ffffff', fontWeight: '600', marginBottom: 2 },
  menuItemTextDanger: { color: '#ff4444' },
  menuItemSub: { fontSize: 12, color: '#555555' },
  menuCancel: {
    marginTop: 12, backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  menuCancelText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: '#666666', marginBottom: 10 },
  textInput: {
    backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, color: '#ffffff',
    fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#9b72ff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10,
  },
  saveButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  cancelButton: { alignItems: 'center', padding: 10 },
  cancelButtonText: { color: '#555555', fontSize: 15 },
  fullScreenOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center',
  },
  fullScreenImage: { width: '100%', height: '72%' },
  fullScreenCaption: {
    color: '#ffffff', fontSize: 15, fontStyle: 'italic',
    textAlign: 'center', lineHeight: 22, marginTop: 8, paddingHorizontal: 32,
  },
  fullScreenDismiss: { color: '#555555', fontSize: 13, marginTop: 12 },

  // Vault day full view
  vaultDayModal: { flex: 1, backgroundColor: '#0d0d0d' },
  vaultDayHero: { width: '100%', height: 280 },
  vaultDayContent: { padding: 20, paddingBottom: 160 },
  vaultDayDate: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 12 },
  vaultDayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  vaultDayChip: {
    backgroundColor: 'rgba(155,114,255,0.15)', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(155,114,255,0.3)',
  },
  vaultDayChipText: { color: '#9b72ff', fontSize: 14, fontWeight: '600' },
  vaultDaySection: {
    marginBottom: 24, borderTopWidth: 1, borderTopColor: '#1a1a1a', paddingTop: 16,
  },
  vaultDaySectionTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  vaultDayContextRow: { marginBottom: 12 },
  vaultDayContextLabel: {
    fontSize: 10, color: '#9b72ff', fontWeight: '700', letterSpacing: 1.5, marginBottom: 4,
  },
  vaultDayContextValue: { fontSize: 15, color: '#ffffff', lineHeight: 22 },
  vaultDayPhotoStrip: { gap: 12, paddingRight: 16 },
  vaultDayPhotoItem: { width: 220 },
  vaultDayPhotoThumb: { width: 220, height: 220, borderRadius: 14, marginBottom: 8 },
  vaultDayPhotoCaption: { fontSize: 13, color: '#cccccc', fontStyle: 'italic', lineHeight: 18 },
  vaultDayPhotoPeople: { fontSize: 12, color: '#9b72ff', marginTop: 4 },
  vaultDayActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, gap: 10, backgroundColor: '#0d0d0d',
    borderTopWidth: 1, borderTopColor: '#1a1a1a',
  },
  vaultDayEditButton: {
    backgroundColor: 'rgba(155,114,255,0.15)',
    borderRadius: 14, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(155,114,255,0.4)',
  },
  vaultDayEditButtonText: { color: '#9b72ff', fontWeight: '700', fontSize: 15 },

  // Vault context editing
  vaultEditOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  vaultEditBox: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48, maxHeight: '80%',
  },
  vaultEditTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  vaultEditSubtitle: { fontSize: 13, color: '#666666', marginBottom: 20 },
  vaultEditField: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14, marginBottom: 10 },
  vaultEditLabel: { fontSize: 10, color: '#9b72ff', fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  vaultEditValue: { fontSize: 15, color: '#ffffff', lineHeight: 22 },
  vaultEditPlaceholder: { fontSize: 14, color: '#333333', fontStyle: 'italic' },
  vaultEditClose: {
    backgroundColor: '#9b72ff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8,
  },
  vaultEditCloseText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },

  // Person gallery
  personModal: { flex: 1, backgroundColor: '#0d0d0d' },
  personModalHeader: { padding: 24, paddingTop: 60 },
  personModalTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  personModalCount: { fontSize: 15, color: '#666666' },
  personGalleryGrid: {
    paddingHorizontal: 16, paddingBottom: 100,
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  personGalleryItem: { width: '47%' },
  personGalleryThumb: { width: '100%', height: 160, borderRadius: 12, marginBottom: 4 },
  personGalleryCaption: { fontSize: 11, color: '#888888', textAlign: 'center', fontStyle: 'italic' },
  personGalleryDate: { fontSize: 11, color: '#666666', textAlign: 'center' },
});