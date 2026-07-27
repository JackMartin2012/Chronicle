import DayCardCarousel, { SampleDay } from '@/components/daycard/DayCardCarousel';

// Throwaway screen for visually checking the day card carousel. Not part of the app flow.
const SAMPLE_DAY: SampleDay = {
  date: new Date(2025, 6, 24), // Thursday 24 July 2025
  weatherTemp: 21,
  mood: '😌',
  photoCount: 12,
  people: [{ name: 'Alex' }, { name: 'Sam' }, { name: 'Mum' }],
  captureTime: '18:04',
};

export default function Preview() {
  return <DayCardCarousel world="present" day={SAMPLE_DAY} />;
}
