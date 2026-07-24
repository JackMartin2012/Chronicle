import SlideCover from '@/components/daycard/SlideCover';

// Throwaway screen for visually checking SlideCover. Not part of the app flow.
export default function Preview() {
  return (
    <SlideCover
      world="present"
      date={new Date()}
      weatherTemp={30}
      mood="😊"
      photoCount={12}
      people={[{ name: 'Alex' }, { name: 'Sam' }, { name: 'Mum' }]}
      onDismiss={() => {}}
      onShare={() => {}}
    />
  );
}
