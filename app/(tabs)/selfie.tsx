import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SelfieEntry = {
  date: string;
  uri: string;
};

export default function DailySelfie() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selfies, setSelfies] = useState<SelfieEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullScreenUri, setFullScreenUri] = useState<string | null>(null);
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
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
    });

    if (photo?.uri) {
      if (mediaPermission?.granted) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }
      await AsyncStorage.setItem(`selfie_${todayKey}`, photo.uri);
      setCameraOpen(false);
      loadSelfies();
    }
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
            <Text style={styles.todayDoneEmoji}>✅</Text>
            <Text style={styles.todayDoneTitle}>Today's selfie saved!</Text>
            <Text style={styles.todayDoneSubtitle}>Come back tomorrow for your next one.</Text>
            {/* Retake button */}
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => setCameraOpen(true)}>
              <Text style={styles.retakeText}>Retake today's selfie</Text>
            </TouchableOpacity>
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
          <ActivityIndicator color="#ffffff" style={{ marginTop: 40 }} />
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

      {/* Camera modal */}
      <Modal visible={cameraOpen} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          />
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cancelCameraButton}
              onPress={() => setCameraOpen(false)}>
              <Text style={styles.cancelCameraText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutterButton} onPress={takeSelfie}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
            <View style={{ width: 80 }} />
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
  takeSelfieButton: {
    marginHorizontal: 16, marginBottom: 24, backgroundColor: '#1a1a1a',
    borderRadius: 16, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  takeSelfieEmoji: { fontSize: 48, marginBottom: 12 },
  takeSelfieTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  takeSelfieSubtitle: { fontSize: 14, color: '#666666' },
  todayDoneCard: {
    marginHorizontal: 16, marginBottom: 24, backgroundColor: '#1a1a2e',
    borderRadius: 16, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a4a',
  },
  todayDoneEmoji: { fontSize: 48, marginBottom: 12 },
  todayDoneTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  todayDoneSubtitle: { fontSize: 14, color: '#666666', marginBottom: 4 },
  retakeButton: {
    marginTop: 16, borderWidth: 1, borderColor: '#2a2a4a',
    borderRadius: 10, padding: 12, alignItems: 'center', width: '100%',
  },
  retakeText: { color: '#666666', fontSize: 14 },
  section: { paddingHorizontal: 16, marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { width: '31%', alignItems: 'center' },
  gridImage: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#2a2a2a' },
  gridDate: { fontSize: 11, color: '#666666', marginTop: 4, textAlign: 'center' },
  emptyState: { paddingHorizontal: 32, paddingTop: 16 },
  emptySubtitle: { fontSize: 15, color: '#555555', textAlign: 'center', lineHeight: 22 },
  cameraContainer: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1 },
  cameraControls: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 40,
  },
  cancelCameraButton: { width: 80 },
  cancelCameraText: { color: '#ffffff', fontSize: 16 },
  shutterButton: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'transparent', borderWidth: 4, borderColor: '#ffffff',
    justifyContent: 'center', alignItems: 'center',
  },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ffffff' },
  fullScreenOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullScreenImage: { width: '100%', height: '85%' },
  fullScreenDismiss: { color: '#555555', fontSize: 13, marginTop: 16 },
});