import { NativeTabs } from 'expo-router/unstable-native-tabs'

export default function TabLayout() {
  return (
    <NativeTabs
      blurEffect="systemMaterialDark"
      backgroundColor="rgba(10, 10, 12, 0.85)"
      iconColor={{ default: 'rgba(255,255,255,0.35)', selected: '#ffd369' }}
      labelStyle={{
        default: { color: 'rgba(255,255,255,0.35)' },
        selected: { color: '#ffd369' },
      }}
    >
      <NativeTabs.Trigger name="home" title="Home">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="demos" title="Demos">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bug-fixes" title="Bug Fixes">
        <NativeTabs.Trigger.Icon sf={{ default: 'ladybug', selected: 'ladybug.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tools" title="Tools">
        <NativeTabs.Trigger.Icon sf={{ default: 'wrench.and.screwdriver', selected: 'wrench.and.screwdriver.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat" hidden />
    </NativeTabs>
  )
}
