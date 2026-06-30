import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
        tabBarActiveBackgroundColor: 'rgba(255,255,255,0.18)',
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 4, marginVertical: 6 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'The Past',
          tabBarActiveTintColor: '#9b72ff',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'The Present',
          tabBarActiveTintColor: '#4a90d9',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" size={size} color={color} />
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
