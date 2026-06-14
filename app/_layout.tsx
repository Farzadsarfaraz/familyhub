import 'react-native-reanimated';
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useColorScheme } from 'react-native';
import { ToastContainer } from '@/components/ui/Toast';
import * as Notifications from 'expo-notifications';
import { setupNotificationChannel } from '@/lib/notifications';

// Show notifications even when app is in foreground (SDK 54 API)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Set up Android notification channel once at startup
setupNotificationChannel();

export default function RootLayout() {
  const scheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>

            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)"    options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)"    options={{ animation: 'fade' }} />
            <Stack.Screen name="(modules)" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="profile/index"       options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="family/index"        options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="settings/index"      options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="notifications/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="privacy/index"        options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="help/index"          options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="privacy-policy/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="terms/index"          options={{ animation: 'slide_from_right' }} />
          </Stack>
          <ToastContainer />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
