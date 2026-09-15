import PlacesEditor from '@/components/today/editors/PlacesEditor';
import PreviewHarness from '@/components/today/PreviewHarness';

// Throwaway route for checking the Places editor. Not part of the app flow.
export default function PlacesEditorPreview() {
  return (
    <PreviewHarness
      title="Where today took you"
      render={(onClose) => <PlacesEditor onClose={onClose} />}
      summarise={(day) => [
        {
          label: `Tagged (${day.places.filter((p) => !p.mergedIntoId).length})`,
          value: day.places
            .filter((p) => !p.mergedIntoId)
            .map((p) => `${p.name} — ${p.category}${p.meaningful ? ' ★' : ''}`)
            .join('\n'),
        },
        {
          label: 'Merged away',
          value: day.places
            .filter((p) => p.mergedIntoId)
            .map((p) => `${p.name} → ${p.mergedIntoId}`)
            .join('\n'),
        },
      ]}
    />
  );
}
