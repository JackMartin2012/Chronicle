import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isPast = pathname === '/' || pathname === '/index';
  const isPresent = pathname === '/explore';

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 16 }]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
      <TouchableOpacity style={styles.tab} onPress={() => router.push('/')}>
        <View style={[styles.pill, isPast && styles.pillActive]}>
          <Ionicons name="time-outline" size={26} color={isPast ? '#9b72ff' : 'rgba(255,255,255,0.4)'} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={() => router.push('/explore')}>
        <View style={[styles.pill, isPresent && styles.pillActive]}>
          <Ionicons name="today-outline" size={26} color={isPresent ? '#4a90d9' : 'rgba(255,255,255,0.4)'} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillActive: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});

export default function TabLayout() {
  return (
    <Tabs tabBar={() => <CustomTabBar />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'The Past' }} />
      <Tabs.Screen name="explore" options={{ title: 'The Present' }} />
      <Tabs.Screen name="selfie" options={{ href: null }} />
    </Tabs>
  );
}
