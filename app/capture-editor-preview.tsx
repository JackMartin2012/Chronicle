import CaptureEditor from '@/components/today/editors/CaptureEditor';

// Throwaway screen for visually checking the Capture editor. Not part of the app flow.
export default function CaptureEditorPreview() {
  return <CaptureEditor onClose={() => {}} />;
}
