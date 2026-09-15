import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

// A visible way out of the keyboard, sitting directly above it.
//
// Tapping outside an input and swiping the content already dismiss it, but
// neither is discoverable — with a full-height sheet and the keyboard up, there
// is often nothing obvious left to tap, so the keyboard reads as a trap.
//
// Deliberately NOT labelled "Done". Every editor already has two Done controls
// (top-right and the footer button) and both of those SAVE. This one only
// closes the keyboard, so it gets an icon that means exactly that and nothing
// more.

/** Shared id — put this on every TextInput's `inputAccessoryViewID`. */
export const KEYBOARD_ACCESSORY_ID = 'chronicleKeyboardDismissBar';

export default function KeyboardDismissBar() {
  // InputAccessoryView is iOS-only. On Android the keyboard has a system back
  // affordance, so there's nothing to replace it with.
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={Keyboard.dismiss}
          activeOpacity={0.7}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel="Hide keyboard"
        >
          <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    backgroundColor: '#16233d', // the shared input surface
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)', // the shared hairline
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 6,
  },
  // 44pt target, so the icon itself can stay small
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
