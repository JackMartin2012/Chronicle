import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: 'rgba(255,255,255,0.1)',
          elevation: 0,
          height: 88,
          paddingTop: 12,
          paddingBottom: 28,
        },
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'The Past',
          tabBarActiveTintColor: '#9b72ff',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{
              backgroundColor: focused ? 'rgba(0,0,0,0.5)' : 'transparent',
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 36,
              minWidth: 36,
            }}>
              <Ionicons name="time-outline" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'The Present',
          tabBarActiveTintColor: '#4a90d9',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{
              backgroundColor: focused ? 'rgba(0,0,0,0.5)' : 'transparent',
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 36,
              minWidth: 36,
            }}>
              <Ionicons name="today-outline" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="selfie" options={{ href: null }} />
    </Tabs>
  );
}
