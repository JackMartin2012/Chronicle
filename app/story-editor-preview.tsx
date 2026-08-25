import StoryEditor from '@/components/today/editors/StoryEditor';

// Throwaway screen for visually checking the Story editor. Not part of the app flow.
export default function StoryEditorPreview() {
  return <StoryEditor onClose={() => {}} />;
}
