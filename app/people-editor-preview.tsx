import PeopleEditor from '@/components/today/editors/PeopleEditor';

// Throwaway screen for visually checking the People editor. Not part of the app flow.
export default function PeopleEditorPreview() {
  return <PeopleEditor onClose={() => {}} />;
}
