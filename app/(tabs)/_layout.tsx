import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: 'rgba(255,255,255,0.1)',
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
        ),
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarActiveTintColor: '#9b72ff',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={[styles.pill, focused && styles.pillActive]}>
              <Ionicons name="time-outline" size={size} color={color} />
              <Text style={[styles.label, { color }]}>The Past</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarActiveTintColor: '#4a90d9',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={[styles.pill, focused && styles.pillActive]}>
              <Ionicons name="today-outline" size={size} color={color} />
              <Text style={[styles.label, { color }]}>The Present</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="selfie"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pillActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
