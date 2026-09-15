import SoundEditor from '@/components/today/editors/SoundEditor';
import PreviewHarness from '@/components/today/PreviewHarness';

// Throwaway route for checking the Sound editor. Not part of the app flow.
export default function SoundEditorPreview() {
  return (
    <PreviewHarness
      title="Sound & screen"
      render={(onClose) => <SoundEditor onClose={onClose} />}
      summarise={(day) => {
        const describe = (slot: typeof day.sound.listen) =>
          slot
            ? `${slot.title}${slot.subtitle ? ` · ${slot.subtitle}` : ''} (${slot.mediaType})` +
              `${slot.rating ? ` — ${slot.rating}/10` : ''}${slot.note ? `\n“${slot.note}”` : ''}`
            : '';
        return [
          { label: 'Listen', value: describe(day.sound.listen) },
          { label: 'Watch', value: describe(day.sound.watch) },
        ];
      }}
    />
  );
}
