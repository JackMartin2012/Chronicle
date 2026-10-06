import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Keyboard, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  /** Only rendered while true — the caller decides that from its own keyboard state. */
  visible: boolean;
  color?: string;
};

/**
 * Local "hide keyboard" chevron — a workaround for screens where the shared
 * KeyboardDismissBar (InputAccessoryView) doesn't reliably appear. First built
 * for CameraRollEditor.tsx (cause unknown there — see 09_CODE_NOTES.md); pulled
 * out here so NewsEditor.tsx can use the same thing without duplicating it.
 * CameraRollEditor.tsx itself still has its own inline copy — not switched over
 * to this yet.
 *
 * Right-aligned, 44pt tap target, calls Keyboard.dismiss() directly. The caller
 * is responsible for knowing when the keyboard is up (it already tracks that
 * for its own sheet sizing) — this component just renders or doesn't.
 */
export default function KeyboardHideButton({ visible, color = 'rgba(255,255,255,0.6)' }: Props) {
  if (!visible) return null;
  return (
    <TouchableOpacity
      onPress={Keyboard.dismiss}
      style={styles.btn}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Hide keyboard"
    >
      <Ionicons name="chevron-down" size={22} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'flex-end',
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
