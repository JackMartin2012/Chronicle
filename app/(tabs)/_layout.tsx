import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d0d0d',
          borderTopColor: '#1a1a1a',
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#555555',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'The Past',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'The Present',
        }}
      />
    </Tabs>
  );
}
