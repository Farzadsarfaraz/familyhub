import 'react-native-reanimated';
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';
import { ToastContainer } from '@/components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

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
            <Stack.Screen name="profile/index" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="family/index"  options={{ animation: 'slide_from_right' }} />
          </Stack>
          <ToastContainer />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
