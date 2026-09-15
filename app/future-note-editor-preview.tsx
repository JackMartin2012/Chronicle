import FutureNoteEditor from '@/components/today/editors/FutureNoteEditor';
import PreviewHarness from '@/components/today/PreviewHarness';

// Throwaway route for checking the Future Note editor. Not part of the app flow.
// A sample surfacedNote so both halves render — the note from the past and the
// compose field. Nothing surfaces for real until the note vault is built.
export default function FutureNoteEditorPreview() {
  return (
    <PreviewHarness
      title="For future you"
      render={(onClose) => (
        <FutureNoteEditor
          onClose={onClose}
          surfacedNote={{
            text: 'I hope by now the flat feels like home. Did it work out?',
            writtenAgo: 'You wrote this a year ago',
            date: '12 March 2025',
          }}
        />
      )}
      summarise={(day) => [
        { label: 'Note', value: day.futureNote.note },
        { label: 'When', value: day.futureNote.when },
        { label: 'Surfaces on', value: day.futureNote.surfaceKey },
        { label: 'Is a question', value: String(day.futureNote.isQuestion) },
        { label: 'Reply to past you', value: day.futureNote.reply },
      ]}
    />
  );
}
