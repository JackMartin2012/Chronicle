import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

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
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
        ),
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'The Past',
          tabBarActiveTintColor: '#9b72ff',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.pill, focused && styles.pillActive]}>
              <Ionicons name="time-outline" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'The Present',
          tabBarActiveTintColor: '#4a90d9',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.pill, focused && styles.pillActive]}>
              <Ionicons name="today-outline" size={24} color={color} />
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
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 36,
  },
  pillActive: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
