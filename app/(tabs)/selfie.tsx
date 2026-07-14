import DailySelfie from '../../components/DailySelfie';

// The Daily Selfie now lives as a tab inside Your Present (components/DailySelfie.tsx).
// This route is kept so old navigation links still work.
export default function SelfieScreen() {
  return <DailySelfie standalone />;
}
