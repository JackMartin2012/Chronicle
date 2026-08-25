import { File } from 'expo-file-system';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CaptureEditor from '@/components/today/editors/CaptureEditor';
import { formatDateKey, loadDayEntry } from '@/lib/dayEntry';
import type { DayEntry } from '@/lib/types';

// Throwaway screen for checking the Capture editor. Not part of the app flow.
//
// The editor calls onClose on Done. In the real app that dismisses the sheet
// back to the Today screen; here there is nothing behind it, so this harness
// shows what actually landed in storage instead — including whether the copied
// files are really on disk, which is the point of the persistence step.

export default function CaptureEditorPreview() {
  const [editorOpen, setEditorOpen] = useState(true);
  const [saved, setSaved] = useState<DayEntry | null>(null);

  const handleClose = async () => {
    setEditorOpen(false);
    setSaved(await loadDayEntry(formatDateKey(new Date())));
  };

  if (editorOpen) return <CaptureEditor onClose={handleClose} />;

  const { mainPhotoUri, selfieUri, selfieIsBig } = saved?.capture ?? {
    mainPhotoUri: '',
    selfieUri: '',
    selfieIsBig: false,
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Saved to today&apos;s record</Text>
        <Text style={styles.sub}>{formatDateKey(new Date())}</Text>

        <Slot label="Main photo" uri={mainPhotoUri} />
        <Slot label="Selfie" uri={selfieUri} />

        <Text style={styles.meta}>selfieIsBig: {String(selfieIsBig)}</Text>

        <Pressable style={styles.button} onPress={() => setEditorOpen(true)}>
          <Text style={styles.buttonText}>Reopen editor</Text>
        </Pressable>

        <Text style={styles.hint}>
          Force-quit and reopen the app, then come straight back here — the paths and
          the “on disk” checks should be unchanged. The editor itself still opens
          empty; reading back into it is step 3.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Slot({ label, uri }: { label: string; uri: string }) {
  // does the file the record points at actually exist?
  let onDisk = false;
  try {
    onDisk = uri ? new File(uri).exists : false;
  } catch {
    onDisk = false;
  }

  const permanent = uri.includes('/Documents/');

  return (
    <View style={styles.slot}>
      <Text style={styles.slotLabel}>{label}</Text>
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
          <Text style={[styles.badge, onDisk ? styles.ok : styles.bad]}>
            {onDisk ? 'on disk ✓' : 'MISSING FROM DISK ✗'}
          </Text>
          <Text style={[styles.badge, permanent ? styles.ok : styles.bad]}>
            {permanent ? 'in documentDirectory ✓' : 'NOT in documentDirectory ✗'}
          </Text>
          <Text style={styles.path}>{uri}</Text>
        </>
      ) : (
        <Text style={styles.empty}>(empty — nothing saved for this slot)</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1526' },
  content: { padding: 20 },
  title: { fontSize: 22, color: '#fff', fontWeight: '600' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2, marginBottom: 20 },
  slot: { marginBottom: 24 },
  slotLabel: { fontSize: 15, color: '#fff', marginBottom: 8 },
  thumb: { width: 120, height: 160, borderRadius: 8, backgroundColor: '#16233d' },
  badge: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  ok: { color: '#4ad991' },
  bad: { color: '#ff5c5c' },
  path: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 6 },
  empty: { fontSize: 13, color: 'rgba(255,255,255,0.35)' },
  meta: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 20 },
  button: {
    backgroundColor: '#4a90d9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 16,
  },
});
