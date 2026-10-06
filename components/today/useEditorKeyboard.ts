// Chronicle — shared keyboard-height tracking and sheet-shrink math for the
// bottom-sheet editors (components/today/editors/*.tsx + ThreeWordsEditor.tsx).
//
// Every editor's sheet is FIXED-HEIGHT and bottom-anchored, so wrapping it in
// a KeyboardAvoidingView (behavior="padding") translates the whole sheet
// upward and pushes the title/chevron/Done row off the top of the screen.
// Tracking the keyboard height directly instead — top edge stays put, bottom
// sits on the keyboard via marginBottom, sheetHeight shrinks to fit above it
// — was ported editor to editor by hand (see 09_CODE_NOTES.md, "ALL EDITORS
// — shared chrome, keyboard behaviour"). This is that one copy.
//
// This hook does NOT decide the hide-keyboard control (KeyboardDismissBar vs
// the local KeyboardHideButton) or scroll-to-field behaviour — see
// CLAUDE.md's "Keyboard handling for new editors" for which to use and why.

import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

import { space } from '@/constants/chronicleTheme';

export type EditorKeyboard = {
  keyboardHeight: number;
  keyboardUp: boolean;
  /** Never taller than the space left above the keyboard; `sheetHeightBase`
   * (the editor's own resting height, e.g. 78%/92% of screen) otherwise. */
  sheetHeight: number;
  insets: EdgeInsets;
};

export function useEditorKeyboard(sheetHeightBase: number): EditorKeyboard {
  const insets = useSafeAreaInsets();
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
  const { height: SCREEN_H } = Dimensions.get('window');
  const sheetHeight = keyboardUp
    ? Math.min(sheetHeightBase, SCREEN_H - keyboardHeight - insets.top - space.sm)
    : sheetHeightBase;

  return { keyboardHeight, keyboardUp, sheetHeight, insets };
}
