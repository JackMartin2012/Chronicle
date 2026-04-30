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

export default function OnThisDay() {
  const [memoryList, setMemoryList] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullScreenMemory, setFullScreenMemory] = useState<Memory | null>(null);
  const [permission, requestPermission] = MediaLibrary.usePermissions();

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
        first: 1,
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      if (result.assets.length > 0) {
        const asset = result.assets[0];
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

  if (loading) {
    return (
      <View style={styles.centreScreen}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Finding your memories...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>On This Day</Text>
        <Text style={styles.headerDate}>{dateString}</Text>
      </View>

      {memoryList.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📷</Text>
          <Text style={styles.emptyTitle}>No memories found</Text>
          <Text style={styles.emptySubtitle}>
            You don't have any photos or videos from this date in previous years.
            Check back as you build your library!
          </Text>
        </View>
      ) : (
        memoryList.map((memory) => (
          <View key={memory.id} style={styles.memoryCard}>
            <TouchableOpacity onPress={() => setFullScreenMemory(memory)}>
              {memory.mediaType === 'video' ? (
                <View style={styles.videoThumbnail}>
                  <Text style={styles.videoIcon}>▶</Text>
                  <Text style={styles.videoLabel}>Video memory</Text>
                </View>
              ) : memory.uri ? (
                <View>
                  <Image source={{ uri: memory.uri }} style={styles.memoryImage} />
                  {memory.isScreenshot && (
                    <View style={styles.screenshotBanner}>
                      <Text style={styles.screenshotBannerText}>📸 Screenshot</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>📷</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.memoryInfo}>
              <Text style={styles.yearTag}>
                {memory.year} · {getMediaLabel(memory)}
              </Text>
              {memory.caption ? (
                <Text style={styles.captionText}>"{memory.caption}"</Text>
              ) : (
                <Text style={styles.captionPrompt}>
                  What was happening this day in {memory.year}?
                </Text>
              )}
              <TouchableOpacity
                style={styles.addCaptionButton}
                onPress={() => openCaption(memory.id)}>
                <Text style={styles.addCaptionText}>
                  {memory.caption ? '✏️ Edit caption' : '+ Add caption'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
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

      {/* Full screen viewer — fixed */}
      <Modal visible={fullScreenMemory !== null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.fullScreenOverlay}
          onPress={() => setFullScreenMemory(null)}
          activeOpacity={1}>
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: { paddingTop: 70, paddingHorizontal: 24, paddingBottom: 24 },
  headerTitle: { fontSize: 34, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  headerDate: { fontSize: 16, color: '#888888' },
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
  loadingText: { color: '#666666', marginTop: 16, fontSize: 15 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#666666', textAlign: 'center', lineHeight: 22 },
  memoryCard: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: '#1a1a1a', borderRadius: 16, overflow: 'hidden',
  },
  memoryImage: { width: '100%', height: 280 },
  screenshotBanner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6, paddingHorizontal: 12,
  },
  screenshotBannerText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  videoThumbnail: {
    width: '100%', height: 280, backgroundColor: '#1a1a2e',
    justifyContent: 'center', alignItems: 'center',
  },
  videoIcon: { fontSize: 48, color: '#ffffff', marginBottom: 8 },
  videoLabel: { fontSize: 14, color: '#888888' },
  imagePlaceholder: {
    width: '100%', height: 240, backgroundColor: '#2a2a2a',
    justifyContent: 'center', alignItems: 'center',
  },
  imagePlaceholderText: { fontSize: 48 },
  memoryInfo: { padding: 16 },
  yearTag: {
    fontSize: 13, color: '#888888', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  captionPrompt: { fontSize: 16, color: '#cccccc', marginBottom: 12 },
  captionText: { fontSize: 16, color: '#ffffff', marginBottom: 12, fontStyle: 'italic' },
  addCaptionButton: {
    borderWidth: 1, borderColor: '#333333', borderRadius: 8,
    padding: 10, alignItems: 'center',
  },
  addCaptionText: { color: '#888888', fontSize: 14 },
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
  fullScreenImage: { width: '100%', height: '85%' },
  fullScreenLabel: { color: '#888888', fontSize: 13, marginTop: 8 },
  fullScreenDismiss: { color: '#555555', fontSize: 13, marginTop: 4 },
});