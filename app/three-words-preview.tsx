import PreviewHarness from '@/components/today/PreviewHarness';
import ThreeWordsEditor from '@/components/today/ThreeWordsEditor';

// Throwaway route for checking the three-words editor. Not part of the app flow.
export default function ThreeWordsPreview() {
  return (
    <PreviewHarness
      title="Three words"
      render={(onClose) => <ThreeWordsEditor world="present" onClose={onClose} />}
      summarise={(day) => [
        {
          label: 'Words',
          value: day.threeWords.words.map((w) => w.word).join(' · '),
        },
        {
          label: 'Reasons',
          value: day.threeWords.words
            .filter((w) => w.why)
            .map((w) => `${w.word}: ${w.why}`)
            .join('\n'),
        },
        { label: 'Mood', value: day.threeWords.mood },
      ]}
    />
  );
}
