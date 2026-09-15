import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWorld, motion, palette, space, type } from '@/constants/chronicleTheme';
import KeyboardDismissBar, { KEYBOARD_ACCESSORY_ID } from '../KeyboardDismissBar';
import { countFilledInputs, formatDateKey, loadDayEntry, saveDayEntry } from '@/lib/dayEntry';

const w = getWorld('present');
const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.78);

// ---- colours with no chronicleTheme token for their exact value ----
const W60 = 'rgba(255,255,255,0.6)';
const W30 = 'rgba(255,255,255,0.3)';
const W20 = 'rgba(255,255,255,0.2)';
const INPUT_BG = '#16233d';
const BACKDROP = 'rgba(0,0,0,0.55)';


const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type Person = { id: string; name: string; photoUri?: string };

// TODO: real known people; sample data (pravatar placeholders) for now.
const KNOWN: Person[] = [
  { id: 'ella', name: 'Ella', photoUri: 'https://i.pravatar.cc/150?img=1' },
  { id: 'tom', name: 'Tom', photoUri: 'https://i.pravatar.cc/150?img=2' },
  { id: 'marcus', name: 'Marcus' },
  { id: 'sophie', name: 'Sophie', photoUri: 'https://i.pravatar.cc/150?img=3' },
  { id: 'ben', name: 'Ben' },
  { id: 'amara', name: 'Amara' },
  { id: 'joe', name: 'Joe', photoUri: 'https://i.pravatar.cc/150?img=4' },
];
const RECENT_IDS = ['ella', 'tom', 'marcus', 'sophie'];

// canonical AnimatedCard (per CLAUDE.md), parameterised by motion tokens
const AnimatedCard = ({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: motion.pressScale, useNativeDriver: true, speed: motion.springSpeed, bounciness: motion.springBounciness }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: motion.springSpeed, bounciness: motion.springBounciness }).start();
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1} style={{ flex: 1 }}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// photo, or the first initial in an accent-tinted circle
const Avatar = ({ person, size }: { person: Person; size: number }) => {
  if (person.photoUri) {
    return <Image source={{ uri: person.photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: withAlpha(w.accent, 0.2),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: w.fontMedium, fontSize: Math.round(size * 0.4), color: w.accent }}>
        {person.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

export default function PeopleEditor({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const dismiss = onClose ?? (() => {});

  const [tagged, setTagged] = useState<Person[]>([]);
  const [completed, setCompleted] = useState(0);

  // Seed from today's record so reopening shows who you already tagged.
  useEffect(() => {
    let active = true;
    loadDayEntry(formatDateKey(new Date())).then((day) => {
      if (!active) return;
      setTagged(day.people);
      setCompleted(countFilledInputs(day));
    });
    return () => {
      active = false;
    };
  }, []);
  const [query, setQuery] = useState('');

  const q = query.trim();
  const isTagged = (id: string) => tagged.some((t) => t.id === id);

  const tag = (person: Person) => {
    if (!isTagged(person.id)) setTagged((prev) => [...prev, person]);
  };
  const tagAndClear = (person: Person) => {
    tag(person);
    setQuery('');
  };
  const untag = (id: string) => setTagged((prev) => prev.filter((t) => t.id !== id));
  const addNew = () => {
    if (!q) return;
    setTagged((prev) => [...prev, { id: `new-${Date.now()}`, name: q }]);
    setQuery('');
  };

  const handleDone = () => {
    if (tagged.length > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // fire-and-forget: dismissal shouldn't wait on a write, and saveDayEntry
    // merges a partial so nothing else on the day is touched
    saveDayEntry(formatDateKey(new Date()), { people: tagged });
    dismiss();
  };

  const recents = RECENT_IDS.map((id) => KNOWN.find((p) => p.id === id)!).filter((p) => !isTagged(p.id));
  const matches = KNOWN.filter((p) => !isTagged(p.id) && p.name.toLowerCase().includes(q.toLowerCase()));
  const showAddNew = q !== '' && !KNOWN.some((p) => p.name.toLowerCase() === q.toLowerCase());

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <Pressable style={styles.backdrop} onPress={dismiss} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.sheetInner} onPress={Keyboard.dismiss} accessible={false}>
          {/* grabber */}
          <View style={styles.grabber} />

          {/* top row */}
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); dismiss(); }} hitSlop={10}>
              <Ionicons name="chevron-down" size={24} color={W60} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); handleDone(); }} hitSlop={10}>
              <Text style={styles.topDone}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* title */}
          <Text style={styles.title}>Who were you with?</Text>

          {/* middle */}
          <ScrollView
            style={styles.middle}
            contentContainerStyle={styles.middleContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* tagged row */}
            {tagged.length > 0 && (
              <View style={styles.taggedRow}>
                {tagged.map((p) => (
                  <View key={p.id} style={styles.taggedItem}>
                    <View style={styles.avatarWrap}>
                      <Avatar person={p} size={56} />
                      <TouchableOpacity style={styles.removeBadge} onPress={() => untag(p.id)} hitSlop={6}>
                        <Ionicons name="close" size={11} color={W60} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.taggedName} numberOfLines={1}>{p.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* search field */}
            <View style={styles.searchField}>
              <Ionicons name="search-outline" size={18} color={palette.textMuted} />
              <TextInput
                inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Add someone…"
                placeholderTextColor={palette.textMuted}
                autoCorrect={false}
              />
            </View>

            {q === '' ? (
              recents.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.sectionLabel}>Recent</Text>
                  <View style={styles.recentRow}>
                    {recents.map((p) => (
                      <TouchableOpacity key={p.id} style={styles.recentItem} onPress={() => tag(p)} activeOpacity={0.8}>
                        <Avatar person={p} size={48} />
                        <Text style={styles.recentName} numberOfLines={1}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )
            ) : (
              <View style={styles.resultsList}>
                {matches.map((p, i) => (
                  <AnimatedCard
                    key={p.id}
                    onPress={() => tagAndClear(p)}
                    style={[styles.resultRow, (i < matches.length - 1 || showAddNew) && styles.resultDivider]}
                  >
                    <View style={styles.resultInner}>
                      <Avatar person={p} size={40} />
                      <Text style={styles.resultName}>{p.name}</Text>
                    </View>
                  </AnimatedCard>
                ))}
                {showAddNew && (
                  <AnimatedCard onPress={addNew} style={styles.resultRow}>
                    <View style={styles.resultInner}>
                      <View style={styles.addCircle}>
                        <Ionicons name="add" size={20} color={w.accent} />
                      </View>
                      <View style={styles.addTextWrap}>
                        <Text style={styles.resultName}>Add &quot;{q}&quot; as someone new</Text>
                        <Text style={styles.addSub}>You can add their photo later</Text>
                      </View>
                    </View>
                  </AnimatedCard>
                )}
              </View>
            )}
          </ScrollView>

          {/* footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerNote}>This builds your people</Text>
            <View style={styles.progressRow}>
              {Array.from({ length: 8 }, (_, i) => (
                <View key={i} style={[styles.progressDot, { backgroundColor: i < completed ? w.accent : palette.ringSubtle }]} />
              ))}
              <Text style={styles.progressText}>{completed} of 8 filled in today</Text>
            </View>
            <TouchableOpacity
              activeOpacity={tagged.length > 0 ? 0.85 : 1}
              onPress={tagged.length > 0 ? handleDone : undefined}
              style={[styles.doneButton, { backgroundColor: tagged.length > 0 ? w.accent : palette.hairline }]}
            >
              <Text style={[styles.doneButtonText, { color: tagged.length > 0 ? palette.textPrimary : W30 }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
      <KeyboardDismissBar />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: w.bg },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: BACKDROP },
  sheet: { height: SHEET_HEIGHT, backgroundColor: w.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetInner: { flex: 1 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: W20, alignSelf: 'center', marginTop: space.sm },

  topRow: {
    marginTop: space.base,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topDone: { fontFamily: w.fontMedium, fontSize: type.body.fontSize, color: w.accent },
  title: { marginTop: space.lg, paddingHorizontal: space.xl, textAlign: 'left', fontFamily: w.fontMedium, fontSize: 22, color: palette.textPrimary },

  middle: { flex: 1 },
  middleContent: { paddingBottom: space.lg },

  // tagged row
  taggedRow: { marginTop: space.lg, paddingHorizontal: space.xl, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  taggedItem: { alignItems: 'center', width: 64 },
  avatarWrap: { width: 56, height: 56 },
  removeBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: w.surface,
    borderWidth: 1,
    borderColor: W20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taggedName: { marginTop: 6, fontFamily: w.fontRegular, fontSize: 12, color: palette.textSecondary, textAlign: 'center' },

  // search
  searchField: {
    marginTop: space.lg,
    marginHorizontal: space.xl,
    height: 48,
    borderRadius: 14,
    backgroundColor: INPUT_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, marginLeft: 10, fontFamily: w.fontRegular, fontSize: type.body.fontSize, color: palette.textPrimary },

  // recent
  recentSection: { marginTop: space.xl, paddingHorizontal: space.xl },
  sectionLabel: { fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: palette.textMuted },
  recentRow: { marginTop: space.md, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  recentItem: { alignItems: 'center', width: 56 },
  recentName: { marginTop: 6, fontFamily: w.fontRegular, fontSize: 11, color: palette.textSecondary, textAlign: 'center' },

  // results
  resultsList: { marginTop: space.sm },
  resultRow: { height: 60, paddingHorizontal: space.xl },
  resultDivider: { borderBottomWidth: 1, borderBottomColor: palette.hairline },
  resultInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  resultName: { fontFamily: w.fontRegular, fontSize: type.bodySmall.fontSize, color: palette.textPrimary },
  addCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: withAlpha(w.accent, 0.15), alignItems: 'center', justifyContent: 'center' },
  addTextWrap: { flex: 1 },
  addSub: { fontFamily: w.fontRegular, fontSize: 12, color: palette.textMuted, marginTop: 2 },

  // footer
  footer: {},
  footerDivider: { height: 1, backgroundColor: palette.hairline, marginTop: space.lg },
  footerNote: { marginTop: 14, textAlign: 'center', fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: palette.textMuted },
  progressRow: { marginTop: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  progressDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 6 },
  progressText: { marginLeft: 4, fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: palette.textMuted },
  doneButton: { marginTop: space.md, marginHorizontal: space.xl, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  doneButtonText: { fontFamily: w.fontMedium, fontSize: type.body.fontSize },
});
