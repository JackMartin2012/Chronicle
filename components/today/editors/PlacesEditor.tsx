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
  Switch,
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
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.92); // taller than the other editors (78%)

// ---- colours with no chronicleTheme token for their exact value ----
const W60 = 'rgba(255,255,255,0.6)';
const W50 = 'rgba(255,255,255,0.5)';
const W45 = 'rgba(255,255,255,0.45)';
const W30 = 'rgba(255,255,255,0.3)';
const W20 = 'rgba(255,255,255,0.2)';
const W10 = 'rgba(255,255,255,0.1)';
const INPUT_BG = '#16233d';
const BACKDROP = 'rgba(0,0,0,0.55)';
const PIN_BG = 'rgba(0,0,0,0.6)';


const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type PlaceCategory = 'home' | 'someones' | 'work' | 'food' | 'outdoors' | 'sport' | 'travel' | 'other';
type Place = { id: string; name: string; category: PlaceCategory; meaningful: boolean; mergedIntoId?: string };
type Suggestion = { id: string; name: string; detail: string; photoUri: string };

const CATEGORIES: { key: PlaceCategory; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'home', icon: 'home-outline', label: 'Home' },
  { key: 'someones', icon: 'people-outline', label: "Someone's place" },
  { key: 'work', icon: 'briefcase-outline', label: 'Work or study' },
  { key: 'food', icon: 'restaurant-outline', label: 'Food & drink' },
  { key: 'outdoors', icon: 'leaf-outline', label: 'Outdoors' },
  { key: 'sport', icon: 'football-outline', label: 'Sport' },
  { key: 'travel', icon: 'airplane-outline', label: 'Travel' },
  { key: 'other', icon: 'ellipsis-horizontal', label: 'Other' },
];
const CATEGORY_ICON: Record<PlaceCategory, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  someones: 'people-outline',
  work: 'briefcase-outline',
  food: 'restaurant-outline',
  outdoors: 'leaf-outline',
  sport: 'football-outline',
  travel: 'airplane-outline',
  other: 'ellipsis-horizontal',
};

// TODO: real place search wires to a geo API later; sample list is the source for now.
const KNOWN: { id: string; name: string; category: PlaceCategory }[] = [
  { id: 'home', name: 'Home', category: 'home' },
  { id: 'rocca', name: 'The Rocca', category: 'food' },
  { id: 'signal', name: 'Signal Hill', category: 'outdoors' },
  { id: 'museum', name: 'Otago Museum', category: 'other' },
  { id: 'union', name: 'Union Street', category: 'other' },
  { id: 'port', name: 'Port Chalmers', category: 'travel' },
  { id: 'bog', name: 'The Bog', category: 'food' },
];
const RECENT = ['Home', 'The Rocca', 'Signal Hill'];
const INITIAL_SUGGESTIONS: Suggestion[] = [
  { id: 's1', name: 'Signal Hill', detail: '3 photos near here · 16:45', photoUri: 'https://picsum.photos/300/180?random=1' },
  { id: 's2', name: 'Union Street', detail: '1 photo near here · 12:10', photoUri: 'https://picsum.photos/300/180?random=2' },
  { id: 's3', name: 'Port Chalmers', detail: '6 photos near here · 18:20', photoUri: 'https://picsum.photos/300/180?random=3' },
];

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

export default function PlacesEditor({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const dismiss = onClose ?? (() => {});

  const [tagged, setTagged] = useState<Place[]>([]);
  const [completed, setCompleted] = useState(0);

  // Seed from today's record so reopening shows the places you already tagged.
  useEffect(() => {
    let active = true;
    loadDayEntry(formatDateKey(new Date())).then((day) => {
      if (!active) return;
      setTagged(day.places);
      setCompleted(countFilledInputs(day));
    });
    return () => {
      active = false;
    };
  }, []);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>(INITIAL_SUGGESTIONS);
  // a place awaiting the picker (opened from a suggestion, recent, result, or add-new)
  const [pending, setPending] = useState<{ name: string; suggestionId?: string } | null>(null);
  const [pendingCategory, setPendingCategory] = useState<PlaceCategory | null>(null);
  const [pendingMeaningful, setPendingMeaningful] = useState(false);

  const q = query.trim();
  const taggedPills = tagged.filter((p) => !p.mergedIntoId);
  const hasPlaces = taggedPills.length > 0;
  const isTaggedName = (name: string) => taggedPills.some((p) => p.name.toLowerCase() === name.toLowerCase());

  // all previously tagged or known places (deduped by name) — merge targets
  const existingPlaces = (() => {
    const map = new Map<string, { id: string; name: string; category: PlaceCategory }>();
    KNOWN.forEach((k) => map.set(k.name.toLowerCase(), { id: k.id, name: k.name, category: k.category }));
    taggedPills.forEach((p) => map.set(p.name.toLowerCase(), { id: p.id, name: p.name, category: p.category }));
    return Array.from(map.values());
  })();

  const openPicker = (name: string, suggestionId?: string) => {
    setPending({ name, suggestionId });
    setPendingCategory(null);
    setPendingMeaningful(false);
    setQuery('');
  };
  const cancelPicker = () => {
    setPending(null);
    setPendingCategory(null);
    setPendingMeaningful(false);
  };
  const confirmTag = () => {
    if (!pending || !pendingCategory) return;
    if (!isTaggedName(pending.name)) {
      setTagged((prev) => [...prev, { id: `p-${Date.now()}`, name: pending.name, category: pendingCategory, meaningful: pendingMeaningful }]);
    }
    if (pending.suggestionId) setSuggestions((prev) => prev.filter((s) => s.id !== pending.suggestionId));
    cancelPicker();
  };
  const mergeInto = (targetId: string, targetCategory: PlaceCategory) => {
    if (!pending) return;
    // record the detected place as merged into an existing one — no new visible place
    setTagged((prev) => [...prev, { id: `m-${Date.now()}`, name: pending.name, category: targetCategory, meaningful: false, mergedIntoId: targetId }]);
    if (pending.suggestionId) setSuggestions((prev) => prev.filter((s) => s.id !== pending.suggestionId));
    cancelPicker();
  };

  const untag = (id: string) => setTagged((prev) => prev.filter((p) => p.id !== id));

  const handleDone = () => {
    if (hasPlaces) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // the full tagged list, merged-away entries included — the day still
    // records you were there, they just don't render as their own pill
    saveDayEntry(formatDateKey(new Date()), { places: tagged });
    dismiss();
  };

  const recents = RECENT.filter((name) => !isTaggedName(name));
  const matches = KNOWN.filter((k) => !isTaggedName(k.name) && k.name.toLowerCase().includes(q.toLowerCase()));
  const showAddNew = q !== '' && !KNOWN.some((k) => k.name.toLowerCase() === q.toLowerCase());

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <Pressable style={styles.backdrop} onPress={dismiss} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.sheetInner} onPress={Keyboard.dismiss} accessible={false}>
          {/* FIXED CHROME — grabber, top row, title (never scroll) */}
          <View style={styles.grabber} />

          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); dismiss(); }} hitSlop={10}>
              <Ionicons name="chevron-down" size={24} color={W60} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); handleDone(); }} hitSlop={10}>
              <Text style={styles.topDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Where did today take you?</Text>

          {/* SCROLLING CONTENT — starts below the fixed title */}
          <ScrollView
            style={styles.middle}
            contentContainerStyle={styles.middleContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* tagged pills */}
            {taggedPills.length > 0 && (
              <View style={styles.pillsRow}>
                {taggedPills.map((p) => (
                  <View key={p.id} style={styles.pill}>
                    <Ionicons name={CATEGORY_ICON[p.category]} size={14} color={w.accent} />
                    <Text style={styles.pillName}>{p.name}</Text>
                    {p.meaningful && <Ionicons name="star" size={11} color={w.accent} />}
                    <TouchableOpacity onPress={() => untag(p.id)} hitSlop={6}>
                      <Ionicons name="close" size={14} color={W50} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* FROM TODAY'S PHOTOS */}
            {suggestions.length > 0 && (
              <View style={styles.suggSection}>
                <Text style={styles.sectionLabel}>From today&apos;s photos</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggScroll}
                  contentContainerStyle={styles.suggScrollContent}
                >
                  {suggestions.map((s) => (
                    <View key={s.id} style={styles.suggCard}>
                      <View style={styles.suggThumbWrap}>
                        <Image source={{ uri: s.photoUri }} style={styles.suggThumb} />
                        <View style={styles.pinBadge}>
                          <Ionicons name="location" size={12} color={palette.textPrimary} />
                        </View>
                      </View>
                      <View style={styles.suggBody}>
                        <Text style={styles.suggName} numberOfLines={1}>{s.name}</Text>
                        <Text style={styles.suggDetail} numberOfLines={1}>{s.detail}</Text>
                        <TouchableOpacity onPress={() => openPicker(s.name, s.id)} hitSlop={8}>
                          <Text style={styles.suggAdd}>+ Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* PICKER — only while adding a place */}
            {pending && (
              <View style={styles.picker}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={cancelPicker} hitSlop={8}>
                    <Ionicons name="close" size={18} color={W50} />
                  </TouchableOpacity>
                </View>

                {/* MERGE — is this somewhere you already have? */}
                {existingPlaces.length > 0 && (
                  <>
                    <Text style={styles.mergeLabel}>Or is this somewhere you already have?</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      style={styles.mergeScroll}
                      contentContainerStyle={styles.mergeScrollContent}
                    >
                      {existingPlaces.map((ep) => (
                        <TouchableOpacity key={ep.id} style={styles.recentPill} activeOpacity={0.85} onPress={() => mergeInto(ep.id, ep.category)}>
                          <Text style={styles.recentPillName}>{ep.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {/* CATEGORY */}
                <Text style={styles.categoryLabel}>What kind of place?</Text>
                <View style={styles.categoryChips}>
                  {CATEGORIES.map((c) => {
                    const selected = pendingCategory === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        activeOpacity={0.85}
                        onPress={() => setPendingCategory(c.key)}
                        style={[
                          styles.categoryChip,
                          selected
                            ? { backgroundColor: withAlpha(w.accent, 0.18), borderColor: w.accent }
                            : { borderColor: palette.ringSubtle },
                        ]}
                      >
                        <Ionicons name={c.icon} size={13} color={selected ? w.accent : W60} />
                        <Text style={[styles.categoryChipText, { color: selected ? w.accent : W60 }]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* MEANINGFUL toggle */}
                <View style={styles.meaningfulRow}>
                  <Ionicons name={pendingMeaningful ? 'star' : 'star-outline'} size={16} color={pendingMeaningful ? w.accent : W50} />
                  <Text style={styles.meaningfulLabel}>This place means something to me</Text>
                  <Switch
                    value={pendingMeaningful}
                    onValueChange={setPendingMeaningful}
                    trackColor={{ false: W10, true: w.accent }}
                    ios_backgroundColor={W10}
                  />
                </View>

                {/* ADD PLACE */}
                <TouchableOpacity
                  activeOpacity={pendingCategory ? 0.85 : 1}
                  disabled={!pendingCategory}
                  onPress={confirmTag}
                  style={[styles.addPlaceBtn, { backgroundColor: pendingCategory ? w.accent : palette.hairline }]}
                >
                  <Text style={[styles.addPlaceText, { color: pendingCategory ? palette.textPrimary : W30 }]}>Add place</Text>
                </TouchableOpacity>
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
                placeholder="Add a place…"
                placeholderTextColor={palette.textMuted}
                autoCorrect={false}
              />
            </View>

            {q === '' ? (
              recents.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.sectionLabel}>Recent</Text>
                  <View style={styles.recentRow}>
                    {recents.map((name) => (
                      <TouchableOpacity key={name} style={styles.recentPill} activeOpacity={0.85} onPress={() => openPicker(name)}>
                        <Text style={styles.recentPillName}>{name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )
            ) : (
              <View style={styles.resultsList}>
                {matches.map((k, i) => (
                  <AnimatedCard
                    key={k.id}
                    onPress={() => openPicker(k.name)}
                    style={[styles.resultRow, (i < matches.length - 1 || showAddNew) && styles.resultDivider]}
                  >
                    <View style={styles.resultInner}>
                      <Ionicons name="location-outline" size={18} color={W60} />
                      <Text style={styles.resultName}>{k.name}</Text>
                    </View>
                  </AnimatedCard>
                ))}
                {showAddNew && (
                  <AnimatedCard onPress={() => openPicker(q)} style={styles.resultRow}>
                    <View style={styles.resultInner}>
                      <View style={styles.addCircle}>
                        <Ionicons name="add" size={20} color={w.accent} />
                      </View>
                      <View style={styles.addTextWrap}>
                        <Text style={styles.resultName}>Add &quot;{q}&quot; as a new place</Text>
                        <Text style={styles.addSub}>You can set the type next</Text>
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
            <Text style={styles.footerNote}>This maps your days</Text>
            <View style={styles.progressRow}>
              {Array.from({ length: 8 }, (_, i) => (
                <View key={i} style={[styles.progressDot, { backgroundColor: i < completed ? w.accent : palette.ringSubtle }]} />
              ))}
              <Text style={styles.progressText}>{completed} of 8 filled in today</Text>
            </View>
            <TouchableOpacity
              activeOpacity={hasPlaces ? 0.85 : 1}
              onPress={hasPlaces ? handleDone : undefined}
              style={[styles.doneButton, { backgroundColor: hasPlaces ? w.accent : palette.hairline }]}
            >
              <Text style={[styles.doneButtonText, { color: hasPlaces ? palette.textPrimary : W30 }]}>Done</Text>
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

  // fixed gap below the title so scrolling content never butts against it
  middle: { flex: 1, marginTop: space.sm },
  middleContent: { paddingBottom: space.lg },

  // tagged pills
  pillsRow: { marginTop: space.lg, paddingHorizontal: space.xl, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    backgroundColor: withAlpha(w.accent, 0.15),
    borderWidth: 1,
    borderColor: withAlpha(w.accent, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillName: { fontFamily: w.fontRegular, fontSize: 14, color: palette.textPrimary },

  // section label (shared)
  sectionLabel: { fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: palette.textMuted, paddingHorizontal: space.xl },

  // from today's photos
  suggSection: { marginTop: space.xl },
  suggScroll: { marginTop: space.md },
  suggScrollContent: { paddingHorizontal: space.xl, gap: 12 },
  suggCard: { width: 150, borderRadius: 14, backgroundColor: INPUT_BG, overflow: 'hidden' },
  suggThumbWrap: { width: 150, height: 90 },
  suggThumb: { width: 150, height: 90 },
  pinBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PIN_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggBody: { padding: 10 },
  suggName: { fontFamily: w.fontMedium, fontSize: 14, color: palette.textPrimary },
  suggDetail: { marginTop: 2, fontFamily: w.fontRegular, fontSize: 11, color: W45 },
  suggAdd: { marginTop: space.sm, fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: w.accent },

  // picker
  picker: { marginTop: space.md },
  pickerHeader: { paddingHorizontal: space.xl, flexDirection: 'row', justifyContent: 'flex-end' },
  mergeLabel: { marginTop: space.sm, paddingHorizontal: space.xl, fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: W50 },
  mergeScroll: { marginTop: space.sm },
  mergeScrollContent: { paddingHorizontal: space.xl, gap: 8 },
  categoryLabel: { marginTop: space.md, paddingHorizontal: space.xl, fontFamily: w.fontRegular, fontSize: type.label.fontSize, color: W50 },
  categoryChips: { marginTop: space.md, paddingHorizontal: space.xl, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { height: 34, borderRadius: 17, paddingHorizontal: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryChipText: { fontFamily: w.fontRegular, fontSize: type.label.fontSize },
  meaningfulRow: { marginTop: 14, paddingHorizontal: space.xl, flexDirection: 'row', alignItems: 'center', gap: 8 },
  meaningfulLabel: { flex: 1, fontFamily: w.fontRegular, fontSize: 14, color: palette.textPrimary },
  addPlaceBtn: { marginTop: space.md, marginHorizontal: space.xl, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addPlaceText: { fontFamily: w.fontMedium, fontSize: 14 },

  // search
  searchField: {
    marginTop: space.xl,
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
  recentSection: { marginTop: space.xl },
  recentRow: { marginTop: space.md, paddingHorizontal: space.xl, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentPill: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.ringSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentPillName: { fontFamily: w.fontRegular, fontSize: 14, color: palette.textPrimary },

  // results
  resultsList: { marginTop: space.sm },
  resultRow: { height: 56, paddingHorizontal: space.xl },
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
