import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
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

import { getWorld, palette, radius, space, type } from '@/constants/chronicleTheme';
import { fetchHeadlines, getNewsSettings, type Headline } from '@/components/newsFeed';
import { formatDateKey } from '@/lib/dayEntry';
import { addFavourite, removeFavourite, updateFavouriteNote } from '@/lib/favouritesStore';
import { emptyHeadlineState, headlineId, loadNewsSelection, saveNewsSelection, type HeadlineState } from '@/lib/newsStore';
import KeyboardDismissBar, { KEYBOARD_ACCESSORY_ID } from '../KeyboardDismissBar';
import KeyboardHideButton from '../KeyboardHideButton';

const w = getWorld('present');
const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.92);

const W60 = 'rgba(255,255,255,0.6)';
const W50 = 'rgba(255,255,255,0.5)';
const W20 = 'rgba(255,255,255,0.2)';
const INPUT_BG = '#16233d';
const BACKDROP = 'rgba(0,0,0,0.55)';
const MAIN_STORY_BLUE = 'rgba(74,144,217,0.9)';
// A separate amber from `capsuleGold` in chronicleTheme.ts on purpose — that
// token is reserved for Future Capsules only. This is the star's own colour,
// chosen to read clearly as gold/amber against blue without borrowing that one.
const STAR_GOLD = '#e0a862';

type Item = {
  headline: Headline;
  id: string;
  state: HeadlineState;
};

export default function NewsEditor({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const dateKey = formatDateKey(new Date());
  const dismiss = onClose ?? (() => {});

  // ROOT CAUSE (found by diffing against PlacesEditor.tsx, which is confirmed
  // working on device): every other editor in this codebase tracks keyboard
  // height and shrinks its sheet to fit ABOVE the keyboard. This file never
  // did — its sheet stayed a constant 92% of the screen regardless, so once
  // the keyboard opened, the sheet's own bottom portion (exactly where cards
  // 4/5 and the footer live) sat BEHIND the keyboard rather than in a
  // correctly-sized, still-scrollable region above it. Matching the
  // established pattern here fixes that structurally, not by tuning a number.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const keyboardUp = keyboardHeight > 0;
  const restHeight = Math.min(SHEET_HEIGHT, SCREEN_H - insets.top - space.base);
  const sheetHeight = keyboardUp
    ? Math.min(restHeight, SCREEN_H - keyboardHeight - insets.top - space.sm)
    : restHeight;

  // 'failed' = the fetch itself failed (null — rate-limited or otherwise) AND
  // nothing is saved for today, so there's genuinely nothing to show; distinct
  // from 'empty', which means GDELT answered with a valid, empty list.
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'failed' | 'error'>('loading');
  const [items, setItems] = useState<Item[]>([]);
  // World headlines (settings.news) off: GDELT is never called, only whatever's
  // already saved for today is shown, with a banner explaining why.
  const [headlinesOff, setHeadlinesOff] = useState(false);

  // Guards every setState below against firing after unmount — shared by the
  // initial load AND the "Try again" button, so both can use the same function.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = async () => {
    setStatus('loading');
    try {
      const settings = await getNewsSettings();
      const [freshHeadlines, selection] = await Promise.all([
        settings.news ? fetchHeadlines(dateKey) : Promise.resolve(null),
        loadNewsSelection(dateKey),
      ]);
      if (!mountedRef.current) return;

      // MERGE: every headline already saved today is always shown, from its
      // own snapshot, even if the live feed no longer returns it — a saved
      // headline is never dropped to make room for a fresh one.
      const savedEntries = Object.entries(selection);
      const savedIds = new Set(savedEntries.map(([id]) => id));
      // Nothing saved yet today → this is the first open; fresh headlines
      // start selected. Once something's saved, later opens treat anything
      // NOT already known as newly added, so it starts unselected (the user
      // opts in) rather than silently changing what's on today's page.
      const isFirstOpenToday = savedEntries.length === 0;

      const savedItems: Item[] = savedEntries
        .filter(([, st]) => !!st.headline)
        .map(([id, st]) => ({ id, headline: st.headline!, state: st }));

      const freshOnly = (freshHeadlines ?? []).filter((h) => !savedIds.has(headlineId(h.title)));
      const room = Math.max(0, 5 - savedItems.length);
      const newItems: Item[] = freshOnly.slice(0, room).map((h) => {
        const id = headlineId(h.title);
        const state: HeadlineState = { ...emptyHeadlineState, selected: isFirstOpenToday, headline: h };
        return { id, headline: h, state };
      });

      const combined = [...savedItems, ...newItems];
      // Only a genuine attempt (settings.news on) that came back null counts as
      // a failure — settings off deliberately skips the fetch and is never "failed".
      const fetchFailed = settings.news && freshHeadlines === null;
      setHeadlinesOff(!settings.news);
      setItems(combined);
      if (combined.length === 0) {
        setStatus(fetchFailed ? 'failed' : 'empty');
      } else {
        setStatus('ready');
      }
      // Persist the merged list immediately, even before any edit — this is
      // what makes "nothing saved yet" a one-time state: the NEXT open sees
      // these as already-known, so only a genuinely new headline (not these)
      // would start unselected.
      if (combined.length > 0) persist(combined);
    } catch {
      if (mountedRef.current) setStatus('error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (next: Item[]) => {
    const selection: Record<string, HeadlineState> = {};
    next.forEach((it) => {
      selection[it.id] = it.state;
    });
    saveNewsSelection(dateKey, selection);
  };

  const updateItem = (id: string, patch: Partial<HeadlineState>) => {
    setItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, state: { ...it.state, ...patch } } : it));
      persist(next);
      return next;
    });
  };

  const toggleSelected = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (it) updateItem(id, { selected: !it.state.selected });
  };

  // Tapping the CURRENT main story's star turns it off, leaving no main story
  // (so the next comment elsewhere can auto-promote again). Tapping any other
  // star moves the badge to it, same as before.
  const setMainStory = (id: string) => {
    setItems((prev) => {
      const turningOff = prev.find((it) => it.id === id)?.state.isMainStory ?? false;
      const next = prev.map((it) => ({
        ...it,
        state: { ...it.state, isMainStory: turningOff ? false : it.id === id },
      }));
      persist(next);
      return next;
    });
  };

  // Auto-promotion: writing a comment on a headline promotes it to main story
  // ONLY while nothing is currently the main story. Once any headline is
  // starred — by this auto-promotion or an explicit tap — only another
  // explicit star tap changes it; commenting elsewhere never steals it back.
  const onCommentChange = (id: string, text: string) => {
    let favIdToSync: string | null = null;
    setItems((prev) => {
      const hasMainStory = prev.some((it) => it.state.isMainStory);
      const shouldPromote = !hasMainStory && text.trim().length > 0;
      const next = prev.map((it) => {
        if (it.id !== id) return it;
        favIdToSync = it.state.favouriteId;
        return { ...it, state: { ...it.state, comment: text, isMainStory: shouldPromote ? true : it.state.isMainStory } };
      });
      persist(next);
      return next;
    });
    // keep an already-favourited headline's note in sync with its comment
    if (favIdToSync) updateFavouriteNote(favIdToSync, text);
  };

  const toggleFavourite = async (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (it.state.favouriteId) {
      const favId = it.state.favouriteId;
      updateItem(id, { favouriteId: null });
      await removeFavourite(favId);
    } else {
      const displayDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const fav = await addFavourite({
        category: 'article',
        name: it.headline.title,
        rating: 0,
        note: it.state.comment,
        photoUri: '',
        dateKey,
        displayDate,
      });
      updateItem(id, { favouriteId: fav.id });
    }
  };

  const selectedCount = items.filter((it) => it.state.selected).length;

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={dismiss} />

      <View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            marginBottom: keyboardHeight,
            paddingBottom: keyboardUp ? 12 : insets.bottom + 12,
          },
        ]}
      >
        {/* Plain View, not a Pressable with onPress={Keyboard.dismiss} — that
            wrapped the WHOLE sheet, including the ScrollView below, and on iOS
            an ancestor touch responder with onPress can swallow the first pan
            gesture a ScrollView would otherwise claim (PlacesEditor.tsx has the
            identical wrapper and scrolls fine, so the wrapper alone isn't
            PROVEN to be the cause here — but removing its responder entirely
            rules it out, rather than guessing). Keyboard-dismiss-by-touch now
            comes from the ScrollView's own keyboardDismissMode="on-drag"
            below, plus the explicit KeyboardHideButton. */}
        <View style={styles.sheetInner}>
          <View style={styles.grabber} />

          <View style={styles.topRow}>
            <TouchableOpacity onPress={dismiss} hitSlop={10}>
              <Ionicons name="chevron-down" size={24} color={W60} />
            </TouchableOpacity>
            {/* nothing to save in a batch — every toggle/comment already saved itself */}
            <TouchableOpacity onPress={dismiss} hitSlop={10}>
              <Text style={styles.topDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Today&apos;s headlines</Text>
          <Text style={styles.subtitle}>Pick what mattered today</Text>

          {/* Local workaround — the shared KeyboardDismissBar doesn't appear on
              this screen either (same unresolved cause as CameraRollEditor.tsx). */}
          <View style={styles.hideKeyboardRow}>
            <KeyboardHideButton visible={keyboardUp} />
          </View>

          {headlinesOff && (
            <View style={styles.offBanner}>
              <Ionicons name="information-circle-outline" size={16} color={W50} />
              <Text style={styles.offBannerText}>
                Headlines are turned off in Settings — showing what you already saved today.
              </Text>
            </View>
          )}

          {status === 'loading' && (
            <View style={styles.centred}>
              <Text style={styles.stateText}>Loading today&apos;s headlines…</Text>
            </View>
          )}
          {status === 'empty' && (
            <View style={styles.centred}>
              <Ionicons name="newspaper-outline" size={32} color={palette.ringSubtle} />
              <Text style={styles.stateText}>
                {headlinesOff ? 'Nothing saved for today yet.' : 'No headlines found for today.'}
              </Text>
            </View>
          )}
          {status === 'failed' && (
            <View style={styles.centred}>
              <Ionicons name="cloud-offline-outline" size={32} color={palette.ringSubtle} />
              <Text style={styles.stateText}>Couldn&apos;t load headlines right now.</Text>
              <TouchableOpacity onPress={load} style={styles.retryBtn} hitSlop={8}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
          {status === 'error' && (
            <View style={styles.centred}>
              <Text style={styles.stateText}>Couldn&apos;t load today&apos;s headlines.</Text>
            </View>
          )}

          {status === 'ready' && (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {items.map((it) => (
                <HeadlineCard
                  key={it.id}
                  item={it}
                  onToggleSelected={() => toggleSelected(it.id)}
                  onSetMainStory={() => setMainStory(it.id)}
                  onToggleFavourite={() => toggleFavourite(it.id)}
                  onCommentChange={(text) => onCommentChange(it.id, text)}
                />
              ))}
            </ScrollView>
          )}

          {status === 'ready' && (
            <View style={styles.footer}>
              <View style={styles.footerDivider} />
              <Text style={styles.footerCaption}>
                {selectedCount} selected {selectedCount === 1 ? 'headline' : 'headlines'} join today&apos;s page
              </Text>
            </View>
          )}
        </View>
      </View>
      <KeyboardDismissBar />
    </View>
  );
}

function HeadlineCard({
  item,
  onToggleSelected,
  onSetMainStory,
  onToggleFavourite,
  onCommentChange,
}: {
  item: Item;
  onToggleSelected: () => void;
  onSetMainStory: () => void;
  onToggleFavourite: () => void;
  onCommentChange: (text: string) => void;
}) {
  const { headline, state } = item;
  const [commentFocused, setCommentFocused] = useState(false);
  const expanded = commentFocused || state.comment.trim().length > 0;

  return (
    <View style={styles.card}>
      {state.isMainStory && (
        <View style={styles.mainStoryPill}>
          <Text style={styles.mainStoryPillText}>MAIN STORY</Text>
        </View>
      )}

      {/* GDELT's artlist endpoint gives no per-article time, only the source domain
          — no fake time is shown rather than inventing one (see summary/notes). */}
      <Text style={styles.sourceLine} numberOfLines={1}>
        {headline.domain}
      </Text>

      <Text style={styles.headlineText}>{headline.title}</Text>

      <View style={styles.commentField}>
        <Ionicons name="pencil-outline" size={14} color={W50} style={styles.commentIcon} />
        <TextInput
          inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
          style={[styles.commentInput, expanded && styles.commentInputExpanded]}
          value={state.comment}
          onChangeText={onCommentChange}
          onFocus={() => setCommentFocused(true)}
          onBlur={() => setCommentFocused(false)}
          placeholder="Add a comment…"
          placeholderTextColor={palette.textMuted}
          multiline
        />
      </View>

      <View style={styles.iconRow}>
        <TouchableOpacity onPress={onToggleFavourite} hitSlop={8} style={styles.iconBtn}>
          <Ionicons
            name={state.favouriteId ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={state.favouriteId ? w.accent : W50}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onSetMainStory} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name={state.isMainStory ? 'star' : 'star-outline'} size={20} color={state.isMainStory ? STAR_GOLD : W50} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleSelected} hitSlop={8} style={styles.iconBtn}>
          <View style={[styles.checkCircle, state.selected && styles.checkCircleOn]}>
            {state.selected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: w.bg },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: BACKDROP },

  sheet: { backgroundColor: w.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
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
  title: {
    marginTop: space.lg,
    paddingHorizontal: space.xl,
    textAlign: 'left',
    fontFamily: w.fontMedium,
    fontSize: 22,
    color: palette.textPrimary,
  },
  subtitle: {
    marginTop: space.xs,
    paddingHorizontal: space.xl,
    fontFamily: w.fontRegular,
    fontSize: type.bodySmall.fontSize,
    color: W50,
  },

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  stateText: { marginTop: space.md, fontFamily: w.fontRegular, fontSize: 14, color: W50, textAlign: 'center' },
  retryBtn: {
    marginTop: space.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: INPUT_BG,
  },
  retryBtnText: { fontFamily: w.fontMedium, fontSize: type.bodySmall.fontSize, color: w.accent },

  hideKeyboardRow: { paddingHorizontal: space.xl },

  offBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: space.md,
    marginHorizontal: space.xl,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: INPUT_BG,
  },
  offBannerText: {
    flex: 1,
    marginLeft: 8,
    fontFamily: w.fontRegular,
    fontSize: type.caption.fontSize,
    color: W50,
  },

  body: { flex: 1, marginTop: space.md },
  bodyContent: { paddingHorizontal: space.xl, paddingBottom: space.lg },

  card: {
    backgroundColor: INPUT_BG,
    borderRadius: radius.lg,
    padding: space.base,
    marginBottom: space.md,
  },
  mainStoryPill: {
    position: 'absolute',
    top: space.base,
    right: space.base,
    backgroundColor: MAIN_STORY_BLUE,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mainStoryPillText: {
    fontFamily: w.fontMedium,
    fontSize: 10,
    letterSpacing: 0.5,
    color: '#ffffff',
  },
  sourceLine: {
    fontFamily: w.fontRegular,
    fontSize: type.caption.fontSize,
    color: palette.textMuted,
    marginRight: 90, // clears the MAIN STORY pill when present
  },
  headlineText: {
    marginTop: space.xs,
    fontFamily: w.fontMedium,
    fontSize: type.bodySmall.fontSize,
    lineHeight: 21,
    color: palette.textPrimary,
  },

  commentField: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: space.md,
  },
  commentIcon: { marginTop: 3, marginRight: 8 },
  commentInput: {
    flex: 1,
    padding: 0,
    fontFamily: w.fontRegular,
    fontSize: type.bodySmall.fontSize,
    color: palette.textPrimary,
  },
  commentInputExpanded: { minHeight: 40 },

  iconRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: space.md,
  },
  iconBtn: { marginLeft: space.lg, padding: 2 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: W50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleOn: { backgroundColor: w.accent, borderColor: w.accent },

  footer: {},
  footerDivider: { height: 1, backgroundColor: palette.hairline },
  footerCaption: {
    textAlign: 'center',
    paddingVertical: space.md,
    fontFamily: w.fontRegular,
    fontSize: type.caption.fontSize,
    color: palette.textMuted,
  },
});
