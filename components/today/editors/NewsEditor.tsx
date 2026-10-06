import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { fetchCurrentEvents } from '@/lib/currentEvents';
import { formatDateKey } from '@/lib/dayEntry';
import { addFavourite, removeFavourite, updateFavouriteNote } from '@/lib/favouritesStore';
import {
  emptyHeadlineState,
  headlineId,
  loadNewsSelection,
  loadOtherNews,
  saveNewsSelection,
  saveOtherNews,
  type HeadlineState,
} from '@/lib/newsStore';
import type { Headline } from '@/components/newsFeed';
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
// token is reserved for Future Capsules only. The favourite star's own colour.
const STAR_GOLD = '#e0a862';

const MAX_SELECTED = 3; // the newspaper page holds at most 3 stories
const MAX_CANDIDATES = 5; // "the first event of each category", capped

type Item = {
  headline: Headline;
  id: string;
  state: HeadlineState;
};

export default function NewsEditor({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const dateKey = formatDateKey(new Date());
  const dismiss = onClose ?? (() => {});

  // Every other editor in this codebase tracks keyboard height and shrinks its
  // sheet to fit ABOVE the keyboard; this file follows the same pattern.
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

  // 'failed' = the Wikipedia fetch itself failed (network/parse) AND nothing is
  // saved for today — distinct from a successful-but-thin result, which still
  // allows adding a link story or writing "In other news" (see render below).
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed' | 'error'>('loading');
  const [items, setItems] = useState<Item[]>([]);
  const [eventCount, setEventCount] = useState(0); // from the fetch itself, not the merged `items`
  const [showingMore, setShowingMore] = useState(false);
  const [otherNews, setOtherNews] = useState('');

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Scrolls whichever field is currently focused fully into view above the
  // keyboard — same approach as SoundEditor.tsx's note box: positions are
  // measured via onLayout, and the scroll fires on keyboardDidShow (which
  // runs after the keyboard animation AND this sheet's own resize have
  // settled), never on a fixed timer.
  const scrollRef = useRef<ScrollView>(null);
  const contentH = useRef(0);
  const viewH = useRef(0);
  // ROOT CAUSE of the original bug: onLayout's layout.y is relative to the
  // element's IMMEDIATE PARENT only (documented RN behaviour), never to any
  // ancestor further up — so a comment field's onLayout y was just "how far
  // down inside THIS CARD" (~50-70pt on every card alike), and the link/other
  // fields' y was offset from their own section, missing everything stacked
  // above that section in the actual scroll content. Neither was ever the
  // field's true position in the ScrollView's content, so the scroll target
  // always clamped near 0 regardless of which field was focused.
  //
  // Fix: measure fresh, at focus time, with the field's own ref via
  // measureLayout against the ScrollView's INNER CONTENT node (not the
  // ScrollView's outer viewport) — that's the one call that returns a
  // position already in the same coordinate space scrollTo() expects.
  // `scrollRef.current.getInnerViewNode()` isn't a valid measureLayout target
  // in this RN/Expo version — it threw "ref.measureLayout must be called with
  // a ref to a native component". A plain <View> we hold our own ref to is a
  // real native component, so it works as the measurement target instead.
  const contentRef = useRef<View>(null);
  const focusedFieldRef = useRef<React.RefObject<View | null> | null>(null);
  const FOCUS_LEAD = 100; // ~100pt of space above the focused field

  const scrollToField = (fieldRef: React.RefObject<View | null>) => {
    const contentNode = contentRef.current;
    const field = fieldRef.current;
    if (!contentNode || !field) return;
    try {
      field.measureLayout(
        contentNode,
        (_x: number, y: number, _width: number, height: number) => {
          const max = Math.max(0, contentH.current - viewH.current);
          // aim for FOCUS_LEAD of space above the field...
          let target = y - FOCUS_LEAD;
          // ...but push further if that wouldn't also clear the field's own
          // bottom edge above the (soon-to-appear) keyboard
          target = Math.max(target, y + height - viewH.current);
          // never scroll above the top or past the end of the content
          target = Math.min(Math.max(target, 0), max);
          scrollRef.current?.scrollTo({ y: target, animated: true });
        },
        () => {} // measurement failed — nothing to scroll to, not fatal
      );
    } catch {
      // measureLayout must never be able to crash the editor
    }
  };

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => {
      if (focusedFieldRef.current) scrollToField(focusedFieldRef.current);
    });
    return () => shown.remove();
  }, []);

  // A field calls this from its own onFocus, passing its OWN ref. If the
  // keyboard is already up (e.g. switching focus straight from one field to
  // another), scroll immediately rather than waiting for a keyboardDidShow
  // that won't fire again.
  const onFieldFocus = (fieldRef: React.RefObject<View | null>) => {
    focusedFieldRef.current = fieldRef;
    if (keyboardUp) scrollToField(fieldRef);
  };

  const load = async () => {
    setStatus('loading');
    try {
      const [fresh, selection, savedOtherNews] = await Promise.all([
        fetchCurrentEvents(dateKey),
        loadNewsSelection(dateKey),
        loadOtherNews(dateKey),
      ]);
      if (!mountedRef.current) return;
      setOtherNews(savedOtherNews);

      // MERGE: every story already saved today (event, or a pasted link) is
      // always shown from its own snapshot, even if a fresh fetch no longer
      // returns it — never dropped to make room for something new.
      const savedEntries = Object.entries(selection);
      const savedIds = new Set(savedEntries.map(([id]) => id));
      const isFirstOpenToday = savedEntries.length === 0;

      const savedItems: Item[] = savedEntries
        .filter(([, st]) => !!st.headline)
        .map(([id, st]) => ({ id, headline: st.headline!, state: st }));

      // Candidates: the first fresh event of each category (fresh ones not
      // already saved), in the order categories first appear on the page.
      const freshEvents = (fresh ?? []).filter((h) => !savedIds.has(headlineId(h.title)));
      const seenCategory = new Set<string>();
      const candidates: Headline[] = [];
      const more: Headline[] = [];
      for (const h of freshEvents) {
        const cat = h.category ?? 'Other';
        if (!seenCategory.has(cat) && candidates.length < MAX_CANDIDATES) {
          seenCategory.add(cat);
          candidates.push(h);
        } else {
          more.push(h);
        }
      }

      const alreadySelected = savedItems.filter((it) => it.state.selected).length;
      let selectedSoFar = alreadySelected;
      const toItem = (h: Headline, select: boolean): Item => {
        const id = headlineId(h.title);
        const state: HeadlineState = { ...emptyHeadlineState, selected: select, headline: h };
        if (select) selectedSoFar += 1;
        return { id, headline: h, state };
      };

      // First open today: the first 3 candidates start selected. Any later
      // open treats a fresh-only item as new, so it starts UNSELECTED — the
      // user opts in rather than the page changing under them.
      const candidateItems = candidates.map((h) =>
        toItem(h, isFirstOpenToday && selectedSoFar < MAX_SELECTED)
      );
      const moreItems = more.map((h) => toItem(h, false));

      const combined = [...savedItems, ...candidateItems, ...moreItems];
      setItems(combined);
      setEventCount((fresh ?? []).length);
      setShowingMore(false);
      setStatus(fresh === null && savedItems.length === 0 ? 'failed' : 'ready');
      // Persist the merged list immediately, even before any edit, so the
      // NEXT open's "first open today" check and "new vs already-known"
      // distinction are based on what was actually shown, not just on edits.
      persist(combined);
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

  const selectedCount = items.filter((it) => it.state.selected).length;

  const toggleSelected = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (!it.state.selected && selectedCount >= MAX_SELECTED) {
      Alert.alert('Only 3 stories today', 'Deselect one before adding another.');
      return;
    }
    updateItem(id, { selected: !it.state.selected });
  };

  // Tapping the CURRENT main story's pin turns it off, leaving no main story.
  // Tapping a different pin moves the badge to it. If no pin is set, the
  // Newspaper slide falls back to the first selected story — this editor
  // doesn't need to compute that itself.
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

  const onCommentChange = (id: string, text: string) => {
    let favIdToSync: string | null = null;
    setItems((prev) => {
      const next = prev.map((it) => {
        if (it.id !== id) return it;
        favIdToSync = it.state.favouriteId;
        return { ...it, state: { ...it.state, comment: text } };
      });
      persist(next);
      return next;
    });
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

  // ---- "Add a story from a link" ----
  // Positions for the three NewsEditor-level focusable boxes (HeadlineCard's
  // comment field has its own copy of these, local to each card instance).
  const linkFieldRef = useRef<View>(null);
  const linkDraftRef = useRef<View>(null);
  const otherBoxRef = useRef<View>(null);

  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitleDraft, setLinkTitleDraft] = useState<string | null>(null); // non-null once a fetch attempt has run
  const [linkLoading, setLinkLoading] = useState(false);

  const submitLink = async () => {
    const url = linkUrl.trim();
    if (!url) return;
    setLinkLoading(true);
    let title = '';
    try {
      const res = await fetch(url);
      const html = await res.text();
      const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)
        ?? /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(html);
      const titleTag = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
      title = (og?.[1] ?? titleTag?.[1] ?? '').trim();
    } catch {
      // network error, CORS-ish block, or a site that 403s a plain fetch —
      // leave title blank, the user types it themselves below
    }
    if (mountedRef.current) {
      setLinkTitleDraft(title);
      setLinkLoading(false);
    }
  };

  const addLinkStory = (titleOverride: string) => {
    const title = titleOverride.trim();
    const url = linkUrl.trim();
    if (!title || !url) return;
    let domain = 'Link';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      // keep the fallback
    }
    const headline: Headline = { title, domain, url, kind: 'link' };
    const id = headlineId(title);
    const canSelect = selectedCount < MAX_SELECTED;
    if (!canSelect) Alert.alert('Only 3 stories today', 'This link was added but not selected — deselect one first.');
    const state: HeadlineState = { ...emptyHeadlineState, selected: canSelect, headline };
    setItems((prev) => {
      const next = [...prev, { id, headline, state }];
      persist(next);
      return next;
    });
    setLinkUrl('');
    setLinkTitleDraft(null);
  };

  // ---- "In other news" ----
  const onOtherNewsChange = (text: string) => {
    setOtherNews(text);
    saveOtherNews(dateKey, text);
  };

  const visibleEventItems = (() => {
    // "more" events are everything past MAX_CANDIDATES that came from THIS
    // load's fresh fetch — simplest robust signal: once `showingMore` is on,
    // show every non-link item; otherwise show only the first MAX_CANDIDATES
    // non-link items (saved items always count first, so they're never hidden).
    const nonLink = items.filter((it) => it.headline.kind !== 'link');
    return showingMore ? nonLink : nonLink.slice(0, MAX_CANDIDATES);
  })();
  const hiddenMoreCount = items.filter((it) => it.headline.kind !== 'link').length - visibleEventItems.length;
  const linkItems = items.filter((it) => it.headline.kind === 'link');

  const isThin = status === 'ready' && eventCount < 2;

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
        <View style={styles.sheetInner}>
          <View style={styles.grabber} />

          <View style={styles.topRow}>
            <TouchableOpacity onPress={dismiss} hitSlop={10}>
              <Ionicons name="chevron-down" size={24} color={W60} />
            </TouchableOpacity>
            {/* Dismisses the keyboard first if it's up; only closes the editor
                once the keyboard is already down. The chevron always closes. */}
            <TouchableOpacity
              onPress={() => (keyboardUp ? Keyboard.dismiss() : dismiss())}
              hitSlop={10}
            >
              <Text style={styles.topDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Today&apos;s headlines</Text>
          <Text style={styles.subtitle}>Pick what mattered today</Text>

          <View style={styles.hideKeyboardRow}>
            <KeyboardHideButton visible={keyboardUp} />
          </View>

          {status === 'loading' && (
            <View style={styles.centred}>
              <Text style={styles.stateText}>Loading today&apos;s events…</Text>
            </View>
          )}
          {status === 'failed' && (
            <View style={styles.centred}>
              <Ionicons name="cloud-offline-outline" size={32} color={palette.ringSubtle} />
              <Text style={styles.stateText}>Couldn&apos;t load today&apos;s events right now.</Text>
              <TouchableOpacity onPress={load} style={styles.retryBtn} hitSlop={8}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
          {status === 'error' && (
            <View style={styles.centred}>
              <Text style={styles.stateText}>Couldn&apos;t load today&apos;s events.</Text>
            </View>
          )}

          {(status === 'ready' || status === 'failed') && (
            <ScrollView
              ref={scrollRef}
              style={styles.body}
              onLayout={(e) => {
                viewH.current = e.nativeEvent.layout.height;
              }}
              onContentSizeChange={(_, h) => {
                contentH.current = h;
              }}
              contentContainerStyle={styles.bodyContent}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View ref={contentRef}>
              {isThin && (
                <View style={styles.thinBanner}>
                  <Ionicons name="time-outline" size={16} color={W50} />
                  <Text style={styles.thinBannerText}>
                    Wikipedia&apos;s page for today is still filling in — you can still add a link or write about your day below.
                  </Text>
                </View>
              )}

              {visibleEventItems.map((it) => (
                <HeadlineCard
                  key={it.id}
                  item={it}
                  onToggleSelected={() => toggleSelected(it.id)}
                  onSetMainStory={() => setMainStory(it.id)}
                  onToggleFavourite={() => toggleFavourite(it.id)}
                  onCommentChange={(text) => onCommentChange(it.id, text)}
                  onFocusField={onFieldFocus}
                />
              ))}

              {!showingMore && hiddenMoreCount > 0 && (
                <TouchableOpacity onPress={() => setShowingMore(true)} style={styles.showMoreRow}>
                  <Text style={styles.showMoreText}>Show {hiddenMoreCount} more events</Text>
                  <Ionicons name="chevron-down" size={16} color={w.accent} />
                </TouchableOpacity>
              )}

              {linkItems.map((it) => (
                <HeadlineCard
                  key={it.id}
                  item={it}
                  onToggleSelected={() => toggleSelected(it.id)}
                  onSetMainStory={() => setMainStory(it.id)}
                  onToggleFavourite={() => toggleFavourite(it.id)}
                  onCommentChange={(text) => onCommentChange(it.id, text)}
                  onFocusField={onFieldFocus}
                />
              ))}

              {/* ADD A STORY FROM A LINK — always available, even on a thin/failed day */}
              <View style={styles.linkSection}>
                <Text style={styles.sectionLabel}>Add a story from a link</Text>
                <View ref={linkFieldRef} style={styles.linkField}>
                  <Ionicons name="link-outline" size={16} color={W50} style={styles.linkFieldIcon} />
                  <TextInput
                    inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
                    style={styles.linkInput}
                    value={linkUrl}
                    onChangeText={(t) => {
                      setLinkUrl(t);
                      setLinkTitleDraft(null);
                    }}
                    onFocus={() => onFieldFocus(linkFieldRef)}
                    placeholder="Paste a link…"
                    placeholderTextColor={palette.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="go"
                    onSubmitEditing={submitLink}
                  />
                  {linkUrl.trim().length > 0 && linkTitleDraft === null && (
                    <TouchableOpacity onPress={submitLink} disabled={linkLoading} style={styles.linkGoBtn}>
                      <Text style={styles.linkGoText}>{linkLoading ? '…' : 'Go'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {linkTitleDraft !== null && (
                  <View ref={linkDraftRef} style={styles.linkDraftRow}>
                    <TextInput
                      inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
                      style={styles.linkDraftInput}
                      value={linkTitleDraft}
                      onChangeText={setLinkTitleDraft}
                      onFocus={() => onFieldFocus(linkDraftRef)}
                      placeholder="Couldn't read a title — type one…"
                      placeholderTextColor={palette.textMuted}
                    />
                    <TouchableOpacity
                      onPress={() => addLinkStory(linkTitleDraft)}
                      style={styles.linkAddBtn}
                      disabled={linkTitleDraft.trim().length === 0}
                    >
                      <Text style={styles.linkAddText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* IN OTHER NEWS — a per-day note, not counted toward the 3 stories */}
              <View style={styles.otherSection}>
                <Text style={styles.sectionLabel}>In other news</Text>
                <View ref={otherBoxRef} style={styles.otherBox}>
                  <TextInput
                    inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
                    style={styles.otherInput}
                    value={otherNews}
                    onChangeText={onOtherNewsChange}
                    onFocus={() => onFieldFocus(otherBoxRef)}
                    placeholder="Anything else that mattered today…"
                    placeholderTextColor={palette.textMuted}
                    multiline
                  />
                </View>
              </View>
              </View>
            </ScrollView>
          )}

          {(status === 'ready' || status === 'failed') && (
            <View style={styles.footer}>
              <View style={styles.footerDivider} />
              <Text style={styles.footerCaption}>
                {selectedCount} of {MAX_SELECTED} stories selected for today&apos;s page
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
  onFocusField,
}: {
  item: Item;
  onToggleSelected: () => void;
  onSetMainStory: () => void;
  onToggleFavourite: () => void;
  onCommentChange: (text: string) => void;
  onFocusField: (fieldRef: React.RefObject<View | null>) => void;
}) {
  const { headline, state } = item;
  const [commentFocused, setCommentFocused] = useState(false);
  const expanded = commentFocused || state.comment.trim().length > 0;
  // Local to this card instance — each card (including the last one) tracks
  // its OWN comment box position, so scroll-into-view works per-card.
  const commentBoxRef = useRef<View>(null);

  return (
    <View style={styles.card}>
      {state.isMainStory && (
        <View style={styles.mainStoryPill}>
          <Text style={styles.mainStoryPillText}>MAIN STORY</Text>
        </View>
      )}

      <Text style={styles.sourceLine} numberOfLines={1}>
        {headline.domain}
      </Text>

      <Text style={styles.headlineText}>{headline.title}</Text>

      <View ref={commentBoxRef} style={styles.commentField}>
        <Ionicons name="pencil-outline" size={14} color={W50} style={styles.commentIcon} />
        <TextInput
          inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
          style={[styles.commentInput, expanded && styles.commentInputExpanded]}
          value={state.comment}
          onChangeText={onCommentChange}
          onFocus={() => {
            setCommentFocused(true);
            onFocusField(commentBoxRef);
          }}
          onBlur={() => setCommentFocused(false)}
          placeholder="Add a comment…"
          placeholderTextColor={palette.textMuted}
          multiline
        />
      </View>

      <View style={styles.iconRow}>
        <TouchableOpacity onPress={onToggleFavourite} hitSlop={8} style={styles.iconBtn}>
          <Ionicons
            name={state.favouriteId ? 'star' : 'star-outline'}
            size={20}
            color={state.favouriteId ? STAR_GOLD : W50}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onSetMainStory} hitSlop={8} style={styles.iconBtn}>
          {/* a proper push-pin/thumbtack, not Ionicons' map-marker-shaped "pin" */}
          <MaterialCommunityIcons
            name={state.isMainStory ? 'pin' : 'pin-outline'}
            size={20}
            color={state.isMainStory ? w.accent : W50}
          />
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

  thinBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: INPUT_BG,
  },
  thinBannerText: {
    flex: 1,
    marginLeft: 8,
    fontFamily: w.fontRegular,
    fontSize: type.caption.fontSize,
    color: W50,
  },

  body: { flex: 1, marginTop: space.md },
  // extra space below the last box — without it, the scroll-into-view math
  // for a box near the bottom has nowhere left to scroll TO
  bodyContent: { paddingHorizontal: space.xl, paddingBottom: 280 },

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

  showMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.sm,
    marginBottom: space.md,
  },
  showMoreText: { fontFamily: w.fontMedium, fontSize: type.bodySmall.fontSize, color: w.accent, marginRight: 4 },

  sectionLabel: {
    fontFamily: w.fontMedium,
    fontSize: type.bodySmall.fontSize,
    color: palette.textPrimary,
    marginBottom: space.sm,
  },

  linkSection: { marginTop: space.sm, marginBottom: space.lg },
  linkField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    paddingHorizontal: space.md,
  },
  linkFieldIcon: { marginRight: 8 },
  linkInput: { flex: 1, padding: 0, fontFamily: w.fontRegular, fontSize: type.bodySmall.fontSize, color: palette.textPrimary },
  linkGoBtn: { marginLeft: space.sm, paddingHorizontal: space.sm, paddingVertical: 4 },
  linkGoText: { fontFamily: w.fontMedium, fontSize: type.bodySmall.fontSize, color: w.accent },
  linkDraftRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  linkDraftInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: INPUT_BG,
    paddingHorizontal: space.md,
    fontFamily: w.fontRegular,
    fontSize: type.bodySmall.fontSize,
    color: palette.textPrimary,
  },
  linkAddBtn: {
    marginLeft: space.sm,
    height: 40,
    paddingHorizontal: space.md,
    borderRadius: 10,
    backgroundColor: w.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkAddText: { fontFamily: w.fontMedium, fontSize: type.bodySmall.fontSize, color: '#ffffff' },

  otherSection: { marginBottom: space.sm },
  otherBox: {
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    overflow: 'hidden',
  },
  otherInput: {
    minHeight: 64,
    padding: space.md,
    fontFamily: w.fontRegular,
    fontSize: type.bodySmall.fontSize,
    color: palette.textPrimary,
  },

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
