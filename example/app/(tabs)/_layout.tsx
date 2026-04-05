import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF' }}>
      <Tabs.Screen name="chat" options={{ title: 'AI Chat' }} />
      <Tabs.Screen name="demos" options={{ title: 'Demos' }} />
      <Tabs.Screen name="accuracy" options={{ title: 'Accuracy' }} />
    </Tabs>
  )
}
