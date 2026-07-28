import SoundEditor from '@/components/today/editors/SoundEditor';

// Throwaway screen for visually checking the Sound editor. Not part of the app flow.
export default function SoundEditorPreview() {
  return <SoundEditor onClose={() => {}} />;
}
