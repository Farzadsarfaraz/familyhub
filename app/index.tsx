import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import { Colors } from '@/constants/theme';

export default function Index() {
  const hydrateAuth    = useAuthStore((s) => s.hydrateAuth);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const user           = useAuthStore((s) => s.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([hydrateAuth(), hydrateSettings()]).finally(() => setReady(true));
  }, [hydrateAuth, hydrateSettings]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0F' }}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  return <Redirect href={(user ? '/(tabs)' : '/(auth)/welcome') as any} />;
}
