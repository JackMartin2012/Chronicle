import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Fraunces_600SemiBold, Fraunces_800ExtraBold, useFonts } from '@expo-google-fonts/fraunces';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function Settings() {
  const [fontsLoaded] = useFonts({ Fraunces_600SemiBold, Fraunces_800ExtraBold });
  const router = useRouter();

  const [footballFeed, setFootballFeed] = useState(false);
  const [wikipediaFeed, setWikipediaFeed] = useState(true);
  const [weatherFeed, setWeatherFeed] = useState(true);
  const [newsFeed, setNewsFeed] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const football = await AsyncStorage.getItem('show_football_feed');
    setFootballFeed(football === 'true');
    const wikipedia = await AsyncStorage.getItem('show_wikipedia_feed');
    setWikipediaFeed(wikipedia !== 'false');
    const weather = await AsyncStorage.getItem('show_weather_feed');
    setWeatherFeed(weather !== 'false');
    const news = await AsyncStorage.getItem('show_news_feed');
    setNewsFeed(news !== 'false');
  };

  const saveToggle = async (key: string, value: boolean) => {
    await AsyncStorage.setItem(key, value ? 'true' : 'false');
  };

  if (!fontsLoaded) return <View style={styles.container} />;

  const rows: { label: string; value: boolean; onChange: (v: boolean) => void }[] = [
    {
      label: 'Football results',
      value: footballFeed,
      onChange: (v) => { setFootballFeed(v); saveToggle('show_football_feed', v); },
    },
    {
      label: 'Wikipedia events',
      value: wikipediaFeed,
      onChange: (v) => { setWikipediaFeed(v); saveToggle('show_wikipedia_feed', v); },
    },
    {
      label: 'Historical weather',
      value: weatherFeed,
      onChange: (v) => { setWeatherFeed(v); saveToggle('show_weather_feed', v); },
    },
    {
      label: 'World headlines',
      value: newsFeed,
      onChange: (v) => { setNewsFeed(v); saveToggle('show_news_feed', v); },
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>News Feed</Text>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Switch
              value={row.value}
              onValueChange={row.onChange}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(155,114,255,0.6)' }}
              thumbColor="#ffffff"
            />
          </View>
        ))}

        <Text style={styles.sectionHeader}>Display</Text>
        <View style={styles.row}>
          <Text style={styles.placeholderText}>More settings coming soon</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#17102a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 64, paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 28, fontFamily: 'Fraunces_800ExtraBold', color: '#ffffff' },
  sectionHeader: { fontSize: 16, fontFamily: 'Fraunces_600SemiBold', color: 'rgba(155,114,255,0.7)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 24, marginLeft: 16 },
  row: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  rowLabel: { fontSize: 15, color: '#ffffff' },
  placeholderText: { fontSize: 14, color: 'rgba(255,255,255,0.3)' },
});
