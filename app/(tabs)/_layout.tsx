import { Tabs } from 'expo-router';
import { BarChart3, Car, MoreHorizontal, PlusCircle, Search } from 'lucide-react-native';
import { Platform } from 'react-native';

import { colors, layout } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0,
        },
        tabBarStyle: {
          alignSelf: Platform.select({ web: 'center', default: undefined }),
          width: Platform.select({ web: '100%', default: undefined }),
          maxWidth: Platform.select({ web: layout.maxContentWidth, default: undefined }),
          minHeight: 76,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingBottom: 10,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="search"
        options={{
          title: 'Axtarış',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: 'Yeni',
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: 'Gəlir',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Avtomobillər',
          tabBarIcon: ({ color, size }) => <Car color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Daha çox',
          tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
