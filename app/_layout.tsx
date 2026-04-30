import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

export default function RootLayout() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (onboardingComplete === null) return;
    if (onboardingComplete) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  }, [onboardingComplete]);

  const checkOnboarding = async () => {
    const complete = await AsyncStorage.getItem('onboarding_complete');
    setOnboardingComplete(complete === 'true');
  };

  if (onboardingComplete === null) {
    return <View style={{ flex: 1, backgroundColor: '#0d0d0d' }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}