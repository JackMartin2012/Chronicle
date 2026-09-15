import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { countFilledInputs, formatDateKey, loadDayEntry } from '@/lib/dayEntry';
import type { DayEntry } from '@/lib/types';

// Throwaway scaffolding for the *-preview routes. Delete with them.
//
// An editor calls onClose on Done. In the real app that dismisses the sheet
// back to the Today screen; in a preview route there is nothing behind it, so
// Done appeared to do nothing at all and the save was invisible.
//
// This wraps an editor so Done lands on a small results screen reading back
// what actually reached storage, with a button to go round again — which makes
// "fill it in, close it, reopen it" one tap instead of an app reload.

export type SummaryRow = { label: string; value: string };

type Props = {
  /** Shown at the top of the results screen. */
  title: string;
  /** The editor, handed the onClose that triggers the read-back. */
  render: (onClose: () => void) => React.ReactNode;
  /** What to show from the reloaded record. */
  summarise: (day: DayEntry) => SummaryRow[];
};

export default function PreviewHarness({ title, render, summarise }: Props) {
  const [editorOpen, setEditorOpen] = useState(true);
  const [saved, setSaved] = useState<DayEntry | null>(null);

  const handleClose = async () => {
    setEditorOpen(false);
    setSaved(await loadDayEntry(formatDateKey(new Date())));
  };

  if (editorOpen) return <>{render(handleClose)}</>;

  const rows = saved ? summarise(saved) : [];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>
          {formatDateKey(new Date())} · {saved ? countFilledInputs(saved) : 0} of 8 filled in
        </Text>

        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={[styles.value, !row.value && styles.empty]}>
              {row.value || '(empty)'}
            </Text>
          </View>
        ))}

        <Pressable style={styles.button} onPress={() => setEditorOpen(true)}>
          <Text style={styles.buttonText}>Reopen editor</Text>
        </Pressable>

        <Text style={styles.hint}>
          Reopening reads from storage, so what you see above should be what the editor
          shows when it comes back.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1526' },
  content: { padding: 20 },
  title: { fontSize: 22, color: '#fff', fontWeight: '600' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2, marginBottom: 20 },
  row: { marginBottom: 16 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 },
  value: { fontSize: 15, color: '#fff', lineHeight: 21 },
  empty: { color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' },
  button: {
    backgroundColor: '#4a90d9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.4)', marginTop: 16 },
});
