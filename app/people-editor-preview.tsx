import PeopleEditor from '@/components/today/editors/PeopleEditor';
import PreviewHarness from '@/components/today/PreviewHarness';

// Throwaway route for checking the People editor. Not part of the app flow.
export default function PeopleEditorPreview() {
  return (
    <PreviewHarness
      title="Who you were with"
      render={(onClose) => <PeopleEditor onClose={onClose} />}
      summarise={(day) => [
        { label: `Tagged (${day.people.length})`, value: day.people.map((p) => p.name).join(', ') },
        { label: 'Ids', value: day.people.map((p) => p.id).join(', ') },
      ]}
    />
  );
}
