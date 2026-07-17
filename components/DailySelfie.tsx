import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

type SelfieEntry = {
  date: string;
  uri: string;
};

export default function DailySelfie({ standalone = false }: { standalone?: boolean }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission] = MediaLibrary.usePermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [selfies, setSelfies] = useState<SelfieEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullScreenUri, setFullScreenUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [sortOldFirst, setSortOldFirst] = useState(false);
  const [stripView, setStripView] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Animated shutter button
  const shutterScale = useRef(new Animated.Value(1)).current;
  const onShutterPressIn = () => Animated.spring(shutterScale, {
    toValue: 0.88, useNativeDriver: true, speed: 40,
  }).start();
  const onShutterPressOut = () => Animated.spring(shutterScale, {
    toValue: 1, useNativeDriver: true, speed: 40, bounciness: 14,
  }).start();

  const today = new Date();
  const todayKey = formatDateKey(today);

  const displaySelfies = sortOldFirst ? [...selfies].reverse() : selfies;
  const slideshowSelfies = [...selfies].reverse();

  useEffect(() => {
    loadSelfies();
  }, []);

  useEffect(() => {
    if (!slideshowPlaying || !stripView) return;
    if (slideshowSelfies.length === 0) return;
    const interval = setInterval(() => {
      setSlideshowIndex(prev => {
        if (prev >= slideshowSelfies.length - 1) {
          setSlideshowPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [slideshowPlaying, stripView, slideshowSelfies.length]);

  const loadSelfies = async () => {
    setLoading(true);
    const keys = await AsyncStorage.getAllKeys();
    const selfieKeys = keys.filter(k => k.startsWith('selfie_'));
    const entries: SelfieEntry[] = [];
    for (const key of selfieKeys) {
      const uri = await AsyncStorage.getItem(key);
      if (uri) entries.push({ date: key.replace('selfie_', ''), uri });
    }
    entries.sort((a, b) => b.date.localeCompare(a.date));
    setSelfies(entries);
    setLoading(false);
  };

  const takeSelfie = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      if (photo?.uri) {
        const flipped = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ flip: ImageManipulator.FlipType.Horizontal }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
        );
        if (mediaPermission?.granted) await MediaLibrary.saveToLibraryAsync(flipped.uri);
        await AsyncStorage.setItem(`selfie_${todayKey}`, flipped.uri);
        setCameraOpen(false);
        loadSelfies();
      }
    } catch (e) { console.log('Camera error:', e); }
    finally { setCapturing(false); }
  };

  const archiveSelfie = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      await AsyncStorage.setItem(`selfie_${todayKey}`, result.assets[0].uri);
      loadSelfies();
    }
  };

  const flipCamera = () => setFacing(prev => prev === 'front' ? 'back' : 'front');

  const hasTodaySelfie = selfies.some(s => s.date === todayKey);
  const todaySelfieUri = selfies.find(s => s.date === todayKey)?.uri;

  if (!permission?.granted) {
    return (
      <View style={[styles.centreScreen, standalone && { paddingTop: 70 }]}>
        <Text style={styles.permissionTitle}>Chronicle needs your camera</Text>
        <Text style={styles.permissionSubtitle}>To take your daily selfie, Chronicle needs access to your camera.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Give access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.explainerWrap, standalone && { paddingTop: 70 }]}>
          <Text style={styles.explainerText}>One photo a day, same position every time. Watch yourself change.</Text>
        </View>

        {hasTodaySelfie ? (
          <View style={styles.todayDoneCard}>
            <Image source={{ uri: todaySelfieUri }} style={styles.todayDoneImage} />
            <View style={styles.todayDoneOverlay}>
              <Text style={styles.todayDoneEmoji}>✅</Text>
              <Text style={styles.todayDoneTitle}>Today&apos;s selfie saved!</Text>
              <TouchableOpacity style={styles.retakeButton} onPress={() => setCameraOpen(true)}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.takeSelfieOptions}>
            <TouchableOpacity style={styles.takeSelfieButtonHalf} onPress={() => setCameraOpen(true)}>
              <Text style={styles.takeSelfieEmoji}>📸</Text>
              <Text style={styles.takeSelfieButtonTitle}>Take selfie</Text>
              <Text style={styles.takeSelfieButtonSubtitle}>Open camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.takeSelfieButtonHalf} onPress={archiveSelfie}>
              <Text style={styles.takeSelfieEmoji}>🖼️</Text>
              <Text style={styles.takeSelfieButtonTitle}>Archive one</Text>
              <Text style={styles.takeSelfieButtonSubtitle}>Choose from library</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color="#4a90d9" style={{ marginTop: 40 }} />
        ) : selfies.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Your selfie timeline</Text>
              <View style={styles.viewToggleRow}>
                <TouchableOpacity style={styles.sortToggle} onPress={() => setSortOldFirst(prev => !prev)}>
                  <Text style={styles.sortToggleText}>{sortOldFirst ? '↑ Oldest' : '↓ Newest'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortToggle, stripView && styles.sortToggleActive]}
                  onPress={() => {
                    setSlideshowIndex(0);
                    setSlideshowPlaying(false);
                    setStripView(prev => !prev);
                  }}>
                  <Text style={[styles.sortToggleText, stripView && styles.sortToggleTextActive]}>
                    {stripView ? 'Grid' : 'Slideshow'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {stripView ? (
              <View style={styles.slideshowContainer}>
                {slideshowSelfies.length > 0 && (
                  <>
                    <TouchableOpacity
                      style={styles.slideshowPhotoWrap}
                      onPress={() => setFullScreenUri(slideshowSelfies[slideshowIndex]?.uri)}
                      activeOpacity={0.95}>
                      <Image
                        source={{ uri: slideshowSelfies[slideshowIndex]?.uri }}
                        style={styles.slideshowPhoto}
                        resizeMode="cover"
                      />
                      <View style={styles.slideshowDateBadge}>
                        <Text style={styles.slideshowDate}>
                          {slideshowSelfies[slideshowIndex]?.date
                            ? new Date(slideshowSelfies[slideshowIndex].date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                            : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.slideshowControls}>
                      <TouchableOpacity
                        style={styles.slideshowNavButton}
                        onPress={() => { setSlideshowPlaying(false); setSlideshowIndex(prev => Math.max(0, prev - 1)); }}>
                        <Text style={styles.slideshowNavText}>‹</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.slideshowPlayButton}
                        onPress={() => setSlideshowPlaying(prev => !prev)}>
                        <Text style={styles.slideshowPlayText}>{slideshowPlaying ? '⏸' : '▶'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.slideshowNavButton}
                        onPress={() => { setSlideshowPlaying(false); setSlideshowIndex(prev => Math.min(slideshowSelfies.length - 1, prev + 1)); }}>
                        <Text style={styles.slideshowNavText}>›</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.slideshowCounter}>
                      {slideshowIndex + 1} of {slideshowSelfies.length}
                    </Text>

                    <View style={styles.slideshowProgressBar}>
                      <View style={[styles.slideshowProgress, { width: `${((slideshowIndex + 1) / slideshowSelfies.length) * 100}%` as any }]} />
                    </View>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.grid}>
                {displaySelfies.map(selfie => (
                  <TouchableOpacity key={selfie.date} style={styles.gridItem} onPress={() => setFullScreenUri(selfie.uri)}>
                    <Image source={{ uri: selfie.uri }} style={styles.gridImage} />
                    <Text style={styles.gridDate}>
                      {new Date(selfie.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptySubtitle}>
              Your selfie timeline will build up here over time.
              The longer you use Chronicle, the more powerful this becomes.
            </Text>
          </View>
        )}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Camera */}
      <Modal visible={cameraOpen} animationType="slide" statusBarTranslucent>
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
          <View style={styles.cameraTop}>
            <TouchableOpacity style={styles.cameraTopButton} onPress={() => setCameraOpen(false)}>
              <Text style={styles.cameraTopButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cameraBottom}>
            <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
              <Text style={styles.flipButtonText}>⟳</Text>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: shutterScale }] }}>
              <TouchableOpacity
                style={[styles.shutterButton, capturing && styles.shutterButtonCapturing]}
                onPress={takeSelfie}
                onPressIn={onShutterPressIn}
                onPressOut={onShutterPressOut}
                activeOpacity={1}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.flipButton} />
          </View>
        </View>
      </Modal>

      {/* Full screen viewer */}
      <Modal visible={fullScreenUri !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.fullScreenOverlay} activeOpacity={1} onPress={() => setFullScreenUri(null)}>
          {fullScreenUri ? <Image source={{ uri: fullScreenUri }} style={styles.fullScreenImage} resizeMode="contain" /> : null}
          <Text style={styles.fullScreenDismiss}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1526' },
  centreScreen: { flex: 1, backgroundColor: '#0b1526', justifyContent: 'center', alignItems: 'center', padding: 32 },
  permissionTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 16 },
  permissionSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  permissionButton: { backgroundColor: '#4a90d9', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  permissionButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  explainerWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  explainerText: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },
  todayDoneCard: { marginHorizontal: 16, marginBottom: 24, borderRadius: 20, overflow: 'hidden', height: 280, borderWidth: 1, borderColor: 'rgba(74,144,217,0.22)' },
  todayDoneImage: { width: '100%', height: '100%', position: 'absolute' },
  todayDoneOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  todayDoneEmoji: { fontSize: 36, marginBottom: 8 },
  todayDoneTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 16, textAlign: 'center' },
  retakeButton: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 24 },
  retakeText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  takeSelfieOptions: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 24, gap: 12 },
  takeSelfieButtonHalf: { flex: 1, backgroundColor: '#101c33', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,144,217,0.22)' },
  takeSelfieEmoji: { fontSize: 36, marginBottom: 10 },
  takeSelfieButtonTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  takeSelfieButtonSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 40 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  viewToggleRow: { flexDirection: 'row', gap: 8 },
  sortToggle: { backgroundColor: '#101c33', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(74,144,217,0.22)' },
  sortToggleText: { color: '#4a90d9', fontSize: 13, fontWeight: '600' },
  sortToggleActive: { backgroundColor: '#4a90d9', borderColor: '#4a90d9' },
  sortToggleTextActive: { color: '#ffffff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { width: '31%', alignItems: 'center' },
  gridImage: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#101c33' },
  gridDate: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, textAlign: 'center' },
  emptyState: { paddingHorizontal: 32, paddingTop: 16 },
  emptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 22 },
  cameraContainer: { flex: 1, backgroundColor: '#000000' },
  camera: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cameraTop: { position: 'absolute', top: 60, left: 0, right: 0, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'flex-start' },
  cameraTopButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  cameraTopButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  cameraBottom: { position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 48 },
  flipButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  flipButtonText: { color: '#ffffff', fontSize: 26, fontWeight: '300' },
  shutterButton: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#ffffff', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  shutterButtonCapturing: { opacity: 0.6 },
  shutterInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#ffffff' },
  fullScreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: '100%', height: '85%' },
  fullScreenDismiss: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 16 },
  slideshowContainer: { paddingBottom: 16 },
  slideshowPhotoWrap: { borderRadius: 20, overflow: 'hidden', height: 420, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(74,144,217,0.22)' },
  slideshowPhoto: { width: '100%', height: '100%' },
  slideshowDateBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', padding: 16 },
  slideshowDate: { color: '#ffffff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  slideshowControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 10 },
  slideshowNavButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#101c33', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,144,217,0.22)' },
  slideshowNavText: { color: '#ffffff', fontSize: 28, fontWeight: '300' },
  slideshowPlayButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#4a90d9', justifyContent: 'center', alignItems: 'center' },
  slideshowPlayText: { color: '#ffffff', fontSize: 28 },
  slideshowCounter: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  slideshowProgressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  slideshowProgress: { height: 3, backgroundColor: '#4a90d9', borderRadius: 2 },
});
