import StoryEditor from '@/components/today/editors/StoryEditor';
import PreviewHarness from '@/components/today/PreviewHarness';

// Throwaway route for checking the Story editor. Not part of the app flow.
export default function StoryEditorPreview() {
  return (
    <PreviewHarness
      title="Your day"
      render={(onClose) => <StoryEditor onClose={onClose} />}
      summarise={(day) => [
        { label: 'Page', value: day.story.text },
        { label: 'Voice note', value: day.story.voiceNoteUri },
        {
          label: 'Duration',
          value: day.story.voiceNoteDuration
            ? `${Math.round(day.story.voiceNoteDuration / 1000)}s`
            : '',
        },
      ]}
    />
  );
}
