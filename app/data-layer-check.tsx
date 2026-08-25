import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  countFilledInputs,
  formatDateKey,
  loadDayEntry,
  normaliseDayEntry,
  parseDateKey,
  saveDayEntry,
} from '@/lib/dayEntry';

// Throwaway screen that exercises lib/dayEntry against real AsyncStorage and
// reports pass/fail. Not part of the app flow — delete with the other preview
// routes. Uses its own scratch date keys so it can never touch a real day.

const SCRATCH = '1999-01-0';

type Result = { name: string; pass: boolean; detail?: string };

export default function DataLayerCheck() {
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    run().then((r) => {
      setResults(r);
      setDone(true);
    });
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Data layer check</Text>
        {!done && <Text style={styles.pending}>Running…</Text>}

        {results.map((r) => (
          <View key={r.name} style={styles.row}>
            <Text style={[styles.badge, r.pass ? styles.pass : styles.fail]}>
              {r.pass ? 'PASS' : 'FAIL'}
            </Text>
            <View style={styles.rowBody}>
              <Text style={styles.name}>{r.name}</Text>
              {r.detail ? <Text style={styles.detail}>{r.detail}</Text> : null}
            </View>
          </View>
        ))}

        {done && (
          <Text style={styles.summary}>
            {results.filter((r) => r.pass).length} / {results.length} passed
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

async function run(): Promise<Result[]> {
  const out: Result[] = [];
  const check = (name: string, pass: boolean, detail?: string) =>
    out.push({ name, pass, detail });

  // ---- date keys ----
  const d = new Date(2026, 0, 5, 23, 30); // 5 Jan, late evening local
  check('formatDateKey uses local time', formatDateKey(d) === '2026-01-05', formatDateKey(d));

  const parsed = parseDateKey('2026-01-05');
  check(
    'parseDateKey anchors at midday',
    parsed.getFullYear() === 2026 && parsed.getMonth() === 0 && parsed.getDate() === 5,
    parsed.toString().slice(0, 21)
  );

  // ---- empty load ----
  const emptyKey = `${SCRATCH}1`;
  await AsyncStorage.removeItem(`day_entry_${emptyKey}`);
  const empty = await loadDayEntry(emptyKey);
  check(
    'missing record loads a safe empty one',
    empty.people.length === 0 && empty.learned === '' && empty.sound.listen === null
  );
  check('empty record counts 0 inputs', countFilledInputs(empty) === 0, `${countFilledInputs(empty)}`);

  // ---- save then load ----
  const roundKey = `${SCRATCH}2`;
  await AsyncStorage.removeItem(`day_entry_${roundKey}`);
  await saveDayEntry(roundKey, { learned: 'Petrichor is the oil plants release.' });
  const loaded = await loadDayEntry(roundKey);
  check('save then load round-trips', loaded.learned.startsWith('Petrichor'), loaded.learned);

  // ---- partial merge does not clobber siblings ----
  await saveDayEntry(roundKey, { capture: { mainPhotoUri: 'file://main.jpg' } });
  await saveDayEntry(roundKey, { capture: { selfieUri: 'file://selfie.jpg' } });
  const merged = await loadDayEntry(roundKey);
  check(
    'partial group merge keeps siblings',
    merged.capture.mainPhotoUri === 'file://main.jpg' &&
      merged.capture.selfieUri === 'file://selfie.jpg',
    `main=${merged.capture.mainPhotoUri || '(empty)'} selfie=${merged.capture.selfieUri || '(empty)'}`
  );
  check('earlier field survives a later save', merged.learned.startsWith('Petrichor'));

  // ---- arrays replace wholesale ----
  await saveDayEntry(roundKey, { people: [{ id: 'a', name: 'Alex' }] });
  await saveDayEntry(roundKey, { people: [{ id: 'b', name: 'Sam' }] });
  const replaced = await loadDayEntry(roundKey);
  check(
    'arrays replace, not append',
    replaced.people.length === 1 && replaced.people[0].name === 'Sam',
    replaced.people.map((p) => p.name).join(', ')
  );

  // ---- unknown legacy fields survive a write ----
  const legacyKey = `${SCRATCH}3`;
  await AsyncStorage.setItem(
    `day_entry_${legacyKey}`,
    JSON.stringify({ sealedCapsules: [{ id: 'cap1' }], weatherEmoji: '🌧', mood: '😌' })
  );
  await saveDayEntry(legacyKey, { learned: 'something new' });
  const rawAfter = JSON.parse((await AsyncStorage.getItem(`day_entry_${legacyKey}`)) ?? '{}');
  check(
    'unknown legacy fields survive a write',
    Array.isArray(rawAfter.sealedCapsules) && rawAfter.weatherEmoji === '🌧',
    `capsules=${Array.isArray(rawAfter.sealedCapsules)} weather=${rawAfter.weatherEmoji}`
  );
  check('legacy threeWords array not overwritten', rawAfter.threeWords === undefined);

  // ---- legacy record reads forward ----
  const oldRecord = {
    photoUri: 'file://old.jpg',
    pairSelfieUri: 'file://oldselfie.jpg',
    mood: '😌',
    threeWords: ['Warm', 'Unhurried'],
    dayDescription: 'It rained at six.',
    voiceMemoUri: 'file://memo.m4a',
    songName: 'Glittering Horizon',
    songRating: 8,
    songMeaning: 'stuck with me',
    watched: 'Arrival',
    taggedPeople: ['Alex', 'Sam'],
    locations: [{ name: 'Signal Hill' }],
    learned: 'petrichor',
  };
  const forward = normaliseDayEntry(oldRecord, '2026-07-24');
  check('legacy photo + selfie map forward', forward.capture.mainPhotoUri === 'file://old.jpg' && forward.capture.selfieUri === 'file://oldselfie.jpg');
  check(
    'legacy threeWords map to word+why',
    forward.threeWords.words.length === 2 && forward.threeWords.words[0].word === 'Warm',
    forward.threeWords.words.map((w) => w.word).join(' · ')
  );
  check('legacy story + voice map forward', forward.story.text === 'It rained at six.' && forward.story.voiceNoteUri === 'file://memo.m4a');
  check(
    'legacy song maps to the listen slot',
    forward.sound.listen?.title === 'Glittering Horizon' && forward.sound.listen?.rating === 8,
    forward.sound.listen?.title
  );
  check('legacy watched maps to the watch slot', forward.sound.watch?.title === 'Arrival');
  check(
    'legacy names map to Person records',
    forward.people.length === 2 && forward.people[1].name === 'Sam',
    forward.people.map((p) => p.name).join(', ')
  );
  check('legacy locations map to Place records', forward.places.length === 1 && forward.places[0].name === 'Signal Hill');
  check(
    'a full legacy record counts 7 of 8',
    countFilledInputs(forward) === 7,
    `got ${countFilledInputs(forward)} — 7 is right, legacy records have no future note`
  );

  // ---- garbage in ----
  check('null parses to empty', countFilledInputs(normaliseDayEntry(null, 'x')) === 0);
  check('a string parses to empty', countFilledInputs(normaliseDayEntry('nonsense', 'x')) === 0);
  check(
    'wrong-typed fields are ignored',
    countFilledInputs(normaliseDayEntry({ learned: 42, taggedPeople: 'Alex' }, 'x')) === 0
  );

  // ---- merged places do not count ----
  const mergedPlaces = normaliseDayEntry(
    { chronicle: { places: [{ id: 'a', name: 'Home', category: 'home', meaningful: false, mergedIntoId: 'b' }] } },
    'x'
  );
  check('a merged-away place does not count as an input', countFilledInputs(mergedPlaces) === 0);

  // ---- clean up ----
  await AsyncStorage.multiRemove([
    `day_entry_${SCRATCH}1`,
    `day_entry_${SCRATCH}2`,
    `day_entry_${SCRATCH}3`,
  ]);

  return out;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1526' },
  content: { padding: 20 },
  title: { fontSize: 22, color: '#fff', marginBottom: 16, fontWeight: '600' },
  pending: { color: 'rgba(255,255,255,0.5)' },
  row: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  badge: { fontSize: 11, fontWeight: '700', width: 42, marginTop: 2 },
  pass: { color: '#4ad991' },
  fail: { color: '#ff5c5c' },
  rowBody: { flex: 1 },
  name: { color: '#fff', fontSize: 14 },
  detail: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 },
  summary: { color: '#fff', fontSize: 16, marginTop: 16, fontWeight: '600' },
});
