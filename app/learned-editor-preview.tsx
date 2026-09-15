import LearnedEditor from '@/components/today/editors/LearnedEditor';
import PreviewHarness from '@/components/today/PreviewHarness';

// Throwaway route for checking the Learned editor. Not part of the app flow.
export default function LearnedEditorPreview() {
  return (
    <PreviewHarness
      title="Something you learned"
      render={(onClose) => <LearnedEditor onClose={onClose} />}
      summarise={(day) => [{ label: 'Learned', value: day.learned }]}
    />
  );
}
