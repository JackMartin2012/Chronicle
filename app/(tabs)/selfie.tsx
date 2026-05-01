import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

type SelfieEntry = {
  date: string;
  uri: string;
};

export default function DailySelfie() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [selfies, setSelfies] = useState<SelfieEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullScreenUri, setFullScreenUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];
  const dateString = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  useEffect(() => {
    loadSelfies();
  }, []);

  const loadSelfies = async () => {
    setLoading(true);
    const keys = await AsyncStorage.getAllKeys();
    const selfieKeys = keys.filter(k => k.startsWith('selfie_'));
    const entries: SelfieEntry[] = [];

    for (const key of selfieKeys) {
      const uri = await AsyncStorage.getItem(key);
      if (uri) {
        const date = key.replace('selfie_', '');
        entries.push({ date, uri });
      }
    }

    entries.sort((a, b) => b.date.localeCompare(a.date));
    setSelfies(entries);
    setLoading(false);
  };

  const takeSelfie = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        mirror: true,
      });

      if (photo?.uri) {
        if (mediaPermission?.granted) {
          await MediaLibrary.saveToLibraryAsync(photo.uri);
        }
        await AsyncStorage.setItem(`selfie_${todayKey}`, photo.uri);
        setCameraOpen(false);
        loadSelfies();
      }
    } catch (e) {
      console.log('Camera error:', e);
    } finally {
      setCapturing(false);
    }
  };

  const flipCamera = () => {
    setFacing(prev => prev === 'front' ? 'back' : 'front');
  };

  const hasTodaySelfie = selfies.some(s => s.date === todayKey);

  if (!permission?.granted) {
    return (
      <View style={styles.centreScreen}>
        <Text style={styles.permissionTitle}>Chronicle needs your camera</Text>
        <Text style={styles.permissionSubtitle}>
          To take your daily selfie, Chronicle needs access to your camera.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Give access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Daily Selfie</Text>
          <Text style={styles.headerDate}>{dateString}</Text>
          <Text style={styles.headerSubtitle}>
            One photo a day. See how much you change.
          </Text>
        </View>

        {/* Today's selfie card */}
        {hasTodaySelfie ? (
          <View style={styles.todayDoneCard}>
            {/* Show today's selfie as the card background */}
            <Image
              source={{ uri: selfies.find(s => s.date === todayKey)?.uri }}
              style={styles.todayDoneImage}
            />
            <View style={styles.todayDoneOverlay}>
              <Text style={styles.todayDoneEmoji}>✅</Text>
              <Text style={styles.todayDoneTitle}>Today's selfie saved!</Text>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => setCameraOpen(true)}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.takeSelfieButton}
            onPress={() => setCameraOpen(true)}>
            <Text style={styles.takeSelfieEmoji}>🤳</Text>
            <Text style={styles.takeSelfieTitle}>Take today's selfie</Text>
            <Text style={styles.takeSelfieSubtitle}>You haven't taken one yet today</Text>
          </TouchableOpacity>
        )}

        {/* Selfie grid */}
        {loading ? (
          <ActivityIndicator color="#4a90d9" style={{ marginTop: 40 }} />
        ) : selfies.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your selfie timeline</Text>
            <View style={styles.grid}>
              {selfies.map((selfie) => (
                <TouchableOpacity
                  key={selfie.date}
                  style={styles.gridItem}
                  onPress={() => setFullScreenUri(selfie.uri)}>
                  <Image source={{ uri: selfie.uri }} style={styles.gridImage} />
                  <Text style={styles.gridDate}>
                    {new Date(selfie.date).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short',
                    })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptySubtitle}>
              Your selfie timeline will build up here over time.
              The longer you use Chronicle, the more powerful this becomes.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Snapchat-style full screen camera */}
      <Modal visible={cameraOpen} animationType="slide" statusBarTranslucent>
        <View style={styles.cameraContainer}>

          {/* Full screen camera view */}
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          />

          {/* Top controls */}
          <View style={styles.cameraTop}>
            <TouchableOpacity
              style={styles.cameraTopButton}
              onPress={() => setCameraOpen(false)}>
              <Text style={styles.cameraTopButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom controls */}
          <View style={styles.cameraBottom}>

            {/* Flip button left */}
            <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
              <Text style={styles.flipButtonText}>⟳</Text>
            </TouchableOpacity>

            {/* Shutter button centre */}
            <TouchableOpacity
              style={[styles.shutterButton, capturing && styles.shutterButtonCapturing]}
              onPress={takeSelfie}
              activeOpacity={0.8}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            {/* Empty right side to balance layout */}
            <View style={styles.flipButton} />
          </View>

        </View>
      </Modal>

      {/* Full screen selfie viewer */}
      <Modal visible={fullScreenUri !== null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.fullScreenOverlay}
          activeOpacity={1}
          onPress={() => setFullScreenUri(null)}>
          {fullScreenUri ? (
            <Image
              source={{ uri: fullScreenUri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          ) : null}
          <Text style={styles.fullScreenDismiss}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
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
  header: { paddingTop: 70, paddingHorizontal: 24, paddingBottom: 24 },
  headerTitle: { fontSize: 34, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  headerDate: { fontSize: 16, color: '#888888', marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: '#555555', fontStyle: 'italic' },

  // Today done card — shows today's selfie as background
  todayDoneCard: {
    marginHorizontal: 16, marginBottom: 24,
    borderRadius: 20, overflow: 'hidden', height: 280,
  },
  todayDoneImage: {
    width: '100%', height: '100%', position: 'absolute',
  },
  todayDoneOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  todayDoneEmoji: { fontSize: 36, marginBottom: 8 },
  todayDoneTitle: {
    fontSize: 20, fontWeight: 'bold', color: '#ffffff',
    marginBottom: 16, textAlign: 'center',
  },
  retakeButton: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 24,
  },
  retakeText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  takeSelfieButton: {
    marginHorizontal: 16, marginBottom: 24, backgroundColor: '#1a1a1a',
    borderRadius: 16, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  takeSelfieEmoji: { fontSize: 48, marginBottom: 12 },
  takeSelfieTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  takeSelfieSubtitle: { fontSize: 14, color: '#666666' },

  section: { paddingHorizontal: 16, marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { width: '31%', alignItems: 'center' },
  gridImage: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#2a2a2a' },
  gridDate: { fontSize: 11, color: '#666666', marginTop: 4, textAlign: 'center' },

  emptyState: { paddingHorizontal: 32, paddingTop: 16 },
  emptySubtitle: { fontSize: 15, color: '#555555', textAlign: 'center', lineHeight: 22 },

  // Snapchat style camera
  cameraContainer: {
    flex: 1, backgroundColor: '#000000',
  },
  camera: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  cameraTop: {
    position: 'absolute',
    top: 60, left: 0, right: 0,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  cameraTopButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraTopButtonText: {
    color: '#ffffff', fontSize: 18, fontWeight: '600',
  },
  cameraBottom: {
    position: 'absolute',
    bottom: 60, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  flipButton: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  flipButtonText: {
    color: '#ffffff', fontSize: 26, fontWeight: '300',
  },
  shutterButton: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 4, borderColor: '#ffffff',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterButtonCapturing: {
    opacity: 0.6,
  },
  shutterInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#ffffff',
  },

  fullScreenOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullScreenImage: { width: '100%', height: '85%' },
  fullScreenDismiss: { color: '#555555', fontSize: 13, marginTop: 16 },
});