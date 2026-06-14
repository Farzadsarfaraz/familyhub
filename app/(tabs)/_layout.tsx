import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Typography } from '@/constants/theme';
import { Text } from '@/components/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused, color, label }: { name: IoniconName; focused: boolean; color: string; label: string }) {
  return (
    <View style={tabStyles.iconWrapper}>
      <Ionicons name={focused ? name : `${name}-outline` as IoniconName} size={24} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { tokens, isDark } = useTheme();
  const insets             = useSafeAreaInsets();

  const tabBarBackground = () =>
    Platform.OS === 'ios' ? (
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
    ) : (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.tabBar }]} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown:       false,
        tabBarShowLabel:   true,
        tabBarActiveTintColor:   Colors.primary[500],
        tabBarInactiveTintColor: tokens.textTertiary,
        tabBarLabelStyle:  {
          fontSize:   Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.semibold,
          marginTop:  -2,
          marginBottom: 2,
        },
        tabBarStyle: {
          position:       'absolute',
          borderTopWidth: 0.5,
          borderTopColor: tokens.tabBarBorder,
          height:         56 + insets.bottom,
          paddingBottom:  insets.bottom,
          elevation:      0,
        },
        tabBarBackground,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} label="Home" />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused, color }) => <TabIcon name="calendar" focused={focused} color={color} label="Calendar" />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused, color }) => <TabIcon name="chatbubbles" focused={focused} color={color} label="Chat" />,
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          title: 'Memories',
          tabBarIcon: ({ focused, color }) => <TabIcon name="images" focused={focused} color={color} label="Memories" />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused, color }) => <TabIcon name="grid" focused={focused} color={color} label="More" />,
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  iconWrapper: { alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
