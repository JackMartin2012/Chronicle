import FutureNoteEditor from '@/components/today/editors/FutureNoteEditor';

// Throwaway screen for visually checking the Future Note editor. Not part of the app flow.
// Sample surfacedNote so both parts (the note from the past + compose) show.
export default function FutureNoteEditorPreview() {
  return (
    <FutureNoteEditor
      onClose={() => {}}
      surfacedNote={{
        text: 'I hope by now the flat feels like home. Did it work out?',
        writtenAgo: 'You wrote this a year ago',
        date: '12 March 2025',
      }}
    />
  );
}
