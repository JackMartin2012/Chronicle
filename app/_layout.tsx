import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

export default function RootLayout() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const complete = await AsyncStorage.getItem('onboarding_complete');
    setOnboardingComplete(complete === 'true');
  };

  // Wait until we know whether to show onboarding or not
  if (onboardingComplete === null) {
    return <View style={{ flex: 1, backgroundColor: '#0d0d0d' }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {onboardingComplete ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="onboarding" />
      )}
    </Stack>
  );
}