import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const EMAIL = 'j.w.d.m@icloud.com';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>Chronicle · Last updated July 2026</Text>

        <Text style={styles.heading}>The short version</Text>
        <Text style={styles.body}>Everything you put into Chronicle stays on your phone. No servers, no accounts, no cloud. Your life is yours.</Text>

        <Text style={styles.heading}>What Chronicle stores</Text>
        <Text style={styles.body}>All content — photos, captions, journal entries, voice memos, people, places, capsules, favourites, and settings — is stored locally on your device only. Deleting the app deletes this data.</Text>

        <Text style={styles.heading}>Photo library access</Text>
        <Text style={styles.body}>Used to show your own photos from this date in previous years and to attach private notes to them. Your photos are never uploaded, transmitted, or analysed off your device.</Text>

        <Text style={styles.heading}>Camera &amp; microphone</Text>
        <Text style={styles.body}>Used only when you choose to take a photo, daily selfie, or record a voice memo. Everything is saved on your device only.</Text>

        <Text style={styles.heading}>Location</Text>
        <Text style={styles.body}>Used to fetch the weather for your day and to help you search for places. Coordinates are sent anonymously to public APIs and are never stored or linked to your identity.</Text>

        <Text style={styles.heading}>Anonymous requests</Text>
        <Text style={styles.body}>To enrich your days, Chronicle makes anonymous requests to public services. None include your name, photos, or journal content: Open-Meteo for weather, Wikipedia for historical events, GDELT for headlines, Football-Data.org for match results (optional, off by default), and Nominatim for place search.</Text>

        <Text style={styles.heading}>Analytics &amp; tracking</Text>
        <Text style={styles.body}>Chronicle contains no analytics, no advertising SDKs, and no tracking of any kind.</Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.body}>
          Questions about this policy? Email{' '}
          <Text style={styles.emailLink} onPress={() => Linking.openURL(`mailto:${EMAIL}`)}>
            {EMAIL}
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#17102a' },
  content: { paddingHorizontal: 24, paddingBottom: 80 },
  backRow: { paddingTop: 56, paddingBottom: 16 },
  title: { fontFamily: 'Fraunces_700Bold', fontSize: 32, color: '#ffffff' },
  subtitle: { fontFamily: 'Fraunces_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 36 },
  heading: { fontFamily: 'Fraunces_700Bold', fontSize: 18, color: '#ffffff', marginBottom: 8 },
  body: { fontFamily: 'Fraunces_400Regular', fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 24, marginBottom: 28 },
  emailLink: { fontFamily: 'Fraunces_400Regular', fontSize: 15, color: '#ffffff', textDecorationLine: 'underline' },
});
