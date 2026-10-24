import {Tabs} from 'expo-router';
import {AnimatedTabBar} from '../../src/components/AnimatedTabBar';
import {useLanguage} from '../../src/i18n';
import {C} from '../../src/theme';

export default function TabsLayout() {
  const {t} = useLanguage();
  return (
    <Tabs
      tabBar={props => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: {backgroundColor: C.bg},
      }}
    >
      <Tabs.Screen name="index" options={{title: t('home'), tabBarLabel: t('tabHome')}} />
      <Tabs.Screen name="inventory" options={{title: t('inventory'), tabBarLabel: t('inventory')}} />
      <Tabs.Screen name="checkout" options={{title: t('checkout'), tabBarLabel: t('checkout')}} />
      <Tabs.Screen name="sales" options={{title: t('sales'), tabBarLabel: t('sales')}} />
      <Tabs.Screen name="settings" options={{title: t('settings'), tabBarLabel: t('settings')}} />
    </Tabs>
  );
}
