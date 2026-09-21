import AsyncStorage from '@react-native-async-storage/async-storage';
import { Caveat_400Regular } from '@expo-google-fonts/caveat';
import { Fraunces_300Light, Fraunces_400Regular, Fraunces_600SemiBold, Fraunces_700Bold, Fraunces_800ExtraBold } from '@expo-google-fonts/fraunces';
import { SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_300Light,
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_800ExtraBold,
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Caveat_400Regular,
  });
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (onboardingComplete === null || !fontsLoaded) return;
    if (onboardingComplete) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  }, [onboardingComplete, fontsLoaded]);

  const checkOnboarding = async () => {
    const complete = await AsyncStorage.getItem('onboarding_complete');
    setOnboardingComplete(complete === 'true');
  };

  if (onboardingComplete === null || !fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#0d0d0d' }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
