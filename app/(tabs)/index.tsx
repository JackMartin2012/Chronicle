import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Memory = {
  id: string;
  year: string;
  caption: string;
  uri: string | null;
  mediaType: 'photo' | 'video';
  isScreenshot: boolean;
};

type VaultEntry = {
  id: string;
  uri: string;
  caption: string;
  year: string;
  date: string;
};

export default function OnThisDay() {
  const [memoryList, setMemoryList] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullScreenMemory, setFullScreenMemory] = useState<Memory | null>(null);
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [activeTab, setActiveTab] = useState<'today' | 'vault'>('today');
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [fullScreenVault, setFullScreenVault] = useState<VaultEntry | null>(null);

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
    if (activeTab === 'vault') {
      loadVault();
    }
  }, [activeTab]);

  const loadMemories = async () => {
    setLoading(true);
    const today = new Date();
    const yearsToCheck = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const found: Memory[] = [];

    for (const yearsAgo of yearsToCheck) {
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
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        const savedCaption = await AsyncStorage.getItem(`caption_${asset.id}`);

        const isScreenshot =
          (info as any).mediaSubtypes?.includes('screenshot') ||
          (asset.filename?.toLowerCase().includes('screenshot') ?? false);

        found.push({
          id: asset.id,
          year: String(today.getFullYear() - yearsAgo),
          caption: savedCaption || '',
          uri: info.localUri || asset.uri,
          mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
          isScreenshot,
        });
      }
    }

    setMemoryList(found);
    setLoading(false);
  };

  const loadVault = async () => {
    setVaultLoading(true);
    const keys = await AsyncStorage.getAllKeys();
    const captionKeys = keys.filter(k => k.startsWith('caption_'));
    const entries: VaultEntry[] = [];

    for (const key of captionKeys) {
      const caption = await AsyncStorage.getItem(key);
      if (!caption) continue;

      const assetId = key.replace('caption_', '');

      try {
        const asset = await MediaLibrary.getAssetInfoAsync(assetId);
        if (asset) {
          const date = new Date(asset.creationTime);
          entries.push({
            id: assetId,
            uri: asset.localUri || asset.uri,
            caption,
            year: String(date.getFullYear()),
            date: date.toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric'
            }),
          });
        }
      } catch {
        // Asset no longer exists on device — skip it
      }
    }

    entries.sort((a, b) => b.year.localeCompare(a.year));
    setVaultEntries(entries);
    setVaultLoading(false);
  };

  const openCaption = (id: string) => {
    const memory = memoryList.find(m => m.id === id);
    setCaptionText(memory?.caption || '');
    setSelectedMemory(id);
  };

  const saveCaption = async () => {
    if (selectedMemory) {
      await AsyncStorage.setItem(`caption_${selectedMemory}`, captionText);
      setMemoryList(prev =>
        prev.map(m => m.id === selectedMemory ? { ...m, caption: captionText } : m)
      );
    }
    setSelectedMemory(null);
  };

  const getMediaLabel = (memory: Memory) => {
    if (memory.mediaType === 'video') return '🎥 Video';
    if (memory.isScreenshot) return '📸 Screenshot';
    return '📷 Photo';
  };

  const vaultYears = [...new Set(vaultEntries.map(e => e.year))].sort((a, b) => b.localeCompare(a));
  const filteredVault = selectedYear
    ? vaultEntries.filter(e => e.year === selectedYear)
    : vaultEntries;

  // Group memories by year for the horizontal strip display
  const groupedMemories = memoryList.reduce((groups, memory) => {
    if (!groups[memory.year]) groups[memory.year] = [];
    groups[memory.year].push(memory);
    return groups;
  }, {} as Record<string, Memory[]>);

  const sortedYears = Object.keys(groupedMemories).sort((a, b) => b.localeCompare(a));

  if (!permission?.granted) {
    return (
      <View style={styles.centreScreen}>
        <Text style={styles.permissionTitle}>Chronicle needs your photos</Text>
        <Text style={styles.permissionSubtitle}>
          To show your memories, Chronicle needs access to your camera roll.
          Your photos never leave your device.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Give access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>

      {/* Fixed header with tab switcher */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Past</Text>
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
        <ScrollView style={styles.container}>
          <View style={styles.subHeader}>
            <Text style={styles.headerDate}>{dateString}</Text>
          </View>

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
                You don't have any photos or videos from this date in previous years.
                Check back as you build your library!
              </Text>
            </View>
          ) : (
            sortedYears.map((year) => {
              const memories = groupedMemories[year];
              return (
                <View key={year} style={styles.yearGroup}>
                  <Text style={styles.yearGroupTitle}>{year}</Text>

                  {/* Horizontal photo strip */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.photoStrip}>
                    {memories.map((memory) => (
                      <TouchableOpacity
                        key={memory.id}
                        style={styles.photoStripItem}
                        onPress={() => setFullScreenMemory(memory)}>
                        {memory.mediaType === 'video' ? (
                          <View style={styles.videoThumb}>
                            <Text style={styles.videoThumbIcon}>▶</Text>
                          </View>
                        ) : memory.uri ? (
                          <View>
                            <Image source={{ uri: memory.uri }} style={styles.photoStripImage} />
                            {memory.isScreenshot && (
                              <View style={styles.screenshotBanner}>
                                <Text style={styles.screenshotBannerText}>📸</Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <View style={styles.videoThumb}>
                            <Text style={styles.videoThumbIcon}>📷</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Caption section below the strip */}
                  <View style={styles.memoryInfo}>
                    <Text style={styles.yearTag}>
                      {memories.length} {memories.length === 1 ? 'memory' : 'memories'} this day
                      {memories.length > 1 ? ' · swipe to see all' : ''}
                    </Text>
                    {memories[0].caption ? (
                      <Text style={styles.captionText}>"{memories[0].caption}"</Text>
                    ) : (
                      <Text style={styles.captionPrompt}>
                        What was happening this day in {year}?
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.addCaptionButton}
                      onPress={() => openCaption(memories[0].id)}>
                      <Text style={styles.addCaptionText}>
                        {memories[0].caption ? '✏️ Edit caption' : '+ Add caption'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* YOUR VAULT */}
      {activeTab === 'vault' && (
        <ScrollView style={styles.container}>
          <View style={styles.subHeader}>
            <Text style={styles.vaultSubtitle}>
              Every photo you've captioned — your life, documented.
            </Text>
          </View>

          {vaultLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9b72ff" />
              <Text style={styles.loadingText}>Loading your vault...</Text>
            </View>
          ) : vaultEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔒</Text>
              <Text style={styles.emptyTitle}>Your Vault is empty</Text>
              <Text style={styles.emptySubtitle}>
                Head to On This Day and add captions to your photos.
                Every captioned photo lives here forever.
              </Text>
            </View>
          ) : (
            <>
              {/* Year filter pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.yearFilter}
                contentContainerStyle={styles.yearFilterContent}>
                <TouchableOpacity
                  style={[styles.yearPill, selectedYear === null && styles.yearPillActive]}
                  onPress={() => setSelectedYear(null)}>
                  <Text style={[styles.yearPillText, selectedYear === null && styles.yearPillTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                {vaultYears.map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.yearPill, selectedYear === year && styles.yearPillActive]}
                    onPress={() => setSelectedYear(year === selectedYear ? null : year)}>
                    <Text style={[styles.yearPillText, selectedYear === year && styles.yearPillTextActive]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Vault grid */}
              <View style={styles.vaultGrid}>
                {filteredVault.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.vaultItem}
                    onPress={() => setFullScreenVault(entry)}>
                    <Image source={{ uri: entry.uri }} style={styles.vaultImage} />
                    <View style={styles.vaultOverlay}>
                      <Text style={styles.vaultCaption} numberOfLines={2}>
                        "{entry.caption}"
                      </Text>
                      <Text style={styles.vaultDate}>{entry.date}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Caption modal */}
      <Modal visible={selectedMemory !== null} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add a caption</Text>
            <Text style={styles.modalSubtitle}>What do you remember about this day?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Write something for future you..."
              placeholderTextColor="#555555"
              multiline
              value={captionText}
              onChangeText={setCaptionText}
              autoFocus
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveCaption}>
              <Text style={styles.saveButtonText}>Save caption</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedMemory(null)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full screen viewer - On This Day */}
      <Modal visible={fullScreenMemory !== null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.fullScreenOverlay}
          activeOpacity={1}
          onPress={() => setFullScreenMemory(null)}>
          {fullScreenMemory?.uri ? (
            <Image
              source={{ uri: fullScreenMemory.uri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          ) : null}
          {fullScreenMemory?.isScreenshot && (
            <Text style={styles.fullScreenLabel}>📸 Screenshot</Text>
          )}
          <Text style={styles.fullScreenDismiss}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>

      {/* Full screen viewer - Vault */}
      <Modal visible={fullScreenVault !== null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.fullScreenOverlay}
          activeOpacity={1}
          onPress={() => setFullScreenVault(null)}>
          {fullScreenVault?.uri ? (
            <Image
              source={{ uri: fullScreenVault.uri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          ) : null}
          <View style={styles.fullScreenCaptionBox}>
            <Text style={styles.fullScreenCaptionText}>"{fullScreenVault?.caption}"</Text>
            <Text style={styles.fullScreenCaptionDate}>{fullScreenVault?.date}</Text>
          </View>
          <Text style={styles.fullScreenDismiss}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#0d0d0d' },
  container: { flex: 1 },
  header: {
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 0,
    backgroundColor: '#0d0d0d',
  },
  headerTitle: { fontSize: 34, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  tabSwitcher: {
    flexDirection: 'row', backgroundColor: '#1a1a1a',
    borderRadius: 12, padding: 4, marginBottom: 8,
  },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#9b72ff' },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: '#555555' },
  tabButtonTextActive: { color: '#ffffff' },
  subHeader: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  headerDate: { fontSize: 16, color: '#888888' },
  vaultSubtitle: { fontSize: 14, color: '#555555', fontStyle: 'italic' },
  centreScreen: {
    flex: 1, backgroundColor: '#0d0d0d',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  permissionTitle: {
    fontSize: 24, fontWeight: 'bold', color: '#ffffff',
    textAlign: 'center', marginBottom: 16,
  },
  permissionSubtitle: {
    fontSize: 15, color: '#666666', textAlign: 'center',
    lineHeight: 22, marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#ffffff', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  permissionButtonText: { color: '#000000', fontWeight: '600', fontSize: 16 },
  loadingContainer: {
    paddingTop: 80, alignItems: 'center',
  },
  loadingText: { color: '#666666', marginTop: 16, fontSize: 15 },
  emptyState: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#666666', textAlign: 'center', lineHeight: 22 },
  yearGroup: {
    marginHorizontal: 16, marginBottom: 24,
    backgroundColor: '#1a1a1a', borderRadius: 16, overflow: 'hidden',
  },
  yearGroupTitle: {
    fontSize: 13, color: '#9b72ff', fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  photoStrip: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  photoStripItem: { borderRadius: 10, overflow: 'hidden' },
  photoStripImage: { width: 220, height: 220, borderRadius: 10 },
  videoThumb: {
    width: 220, height: 220, backgroundColor: '#1a1a2e',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  videoThumbIcon: { fontSize: 36, color: '#ffffff' },
  screenshotBanner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4, paddingHorizontal: 8,
  },
  screenshotBannerText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  memoryInfo: { padding: 16 },
  yearTag: {
    fontSize: 12, color: '#666666', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  captionPrompt: { fontSize: 16, color: '#cccccc', marginBottom: 12 },
  captionText: { fontSize: 16, color: '#ffffff', marginBottom: 12, fontStyle: 'italic' },
  addCaptionButton: {
    borderWidth: 1, borderColor: '#333333', borderRadius: 8,
    padding: 10, alignItems: 'center',
  },
  addCaptionText: { color: '#888888', fontSize: 14 },
  yearFilter: { marginBottom: 8 },
  yearFilterContent: { paddingHorizontal: 16, gap: 8 },
  yearPill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#1a1a1a',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  yearPillActive: { backgroundColor: '#9b72ff', borderColor: '#9b72ff' },
  yearPillText: { fontSize: 14, color: '#666666', fontWeight: '600' },
  yearPillTextActive: { color: '#ffffff' },
  vaultGrid: {
    paddingHorizontal: 16, paddingBottom: 40,
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  vaultItem: {
    width: '47%', borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  vaultImage: { width: '100%', height: 160 },
  vaultOverlay: { padding: 10, backgroundColor: '#1a1a1a' },
  vaultCaption: {
    fontSize: 12, color: '#ffffff', fontStyle: 'italic',
    marginBottom: 4, lineHeight: 16,
  },
  vaultDate: { fontSize: 11, color: '#555555' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: '#666666', marginBottom: 20 },
  textInput: {
    backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16,
    color: '#ffffff', fontSize: 16, minHeight: 120,
    textAlignVertical: 'top', marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 10,
  },
  saveButtonText: { color: '#000000', fontWeight: '600', fontSize: 16 },
  cancelButton: { alignItems: 'center', padding: 10 },
  cancelButtonText: { color: '#555555', fontSize: 15 },
  fullScreenOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullScreenImage: { width: '100%', height: '70%' },
  fullScreenLabel: { color: '#888888', fontSize: 13, marginTop: 8 },
  fullScreenCaptionBox: {
    paddingHorizontal: 32, paddingTop: 16, alignItems: 'center',
  },
  fullScreenCaptionText: {
    color: '#ffffff', fontSize: 16, fontStyle: 'italic',
    textAlign: 'center', lineHeight: 24, marginBottom: 6,
  },
  fullScreenCaptionDate: { color: '#555555', fontSize: 13 },
  fullScreenDismiss: { color: '#555555', fontSize: 13, marginTop: 12 },
});