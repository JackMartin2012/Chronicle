import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0e0808',
          borderTopColor: '#1a1a1a',
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#555555',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'The Past',
          tabBarActiveTintColor: '#9b72ff',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'The Present',
          tabBarActiveTintColor: '#4a90d9',
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