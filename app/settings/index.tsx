import React from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '@/lib/queryClient';
import { Text, Card, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/settings.store';
import { Colors, Spacing } from '@/constants/theme';
import { toast } from '@/store/toast.store';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function SettingsScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { tokens, isDark } = useTheme();

  const { compactMode, soundEnabled, hapticsEnabled, autoRefresh, update } = useSettingsStore();

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function toggleSound(val: boolean) {
    await update({ soundEnabled: val });
    // Update the in-app notification handler immediately
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner:  true,
        shouldShowList:    true,
        shouldPlaySound:   val,
        shouldSetBadge:    true,
      }),
    });
  }

  async function toggleHaptics(val: boolean) {
    await update({ hapticsEnabled: val });
    if (val) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function toggleCompact(val: boolean) {
    await update({ compactMode: val });
  }

  async function toggleAutoRefresh(val: boolean) {
    await update({ autoRefresh: val });
    queryClient.setDefaultOptions({
      queries: { retry: 1, staleTime: 30_000, refetchInterval: val ? 30_000 : false },
    });
  }

  async function clearCache() {
    Alert.alert(
      'Clear Cache',
      'This clears all locally cached app data. Screens will reload fresh from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            try {
              // Clear React Query in-memory cache
              queryClient.clear();
              // Remove any AsyncStorage cache keys (not auth/settings)
              const keys = await AsyncStorage.getAllKeys();
              const toRemove = keys.filter(k =>
                !['accessToken', 'refreshToken', 'user', 'app_settings'].includes(k)
              );
              if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
              toast.success('Cache cleared — data will reload automatically');
            } catch {
              toast.error('Failed to clear cache');
            }
          },
        },
      ],
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={tokens.text} />
        </TouchableOpacity>
        <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60, gap: Spacing[5] }} showsVerticalScrollIndicator={false}>

        {/* Appearance */}
        <SectionLabel label="APPEARANCE" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <Row icon="moon-outline" label="Dark Mode" tokens={tokens}>
            <Badge label={isDark ? 'System (On)' : 'System (Off)'} variant={isDark ? 'primary' : 'neutral'} size="sm" />
          </Row>
          <Row icon="resize-outline" label="Compact Mode" tokens={tokens} last>
            <Switch
              value={compactMode}
              onValueChange={toggleCompact}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </Row>
        </Card>

        {/* Notifications */}
        <SectionLabel label="NOTIFICATIONS" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <Row icon="volume-high-outline" label="Sound" tokens={tokens}
            sub={soundEnabled ? 'Plays sound for incoming alerts' : 'Silent mode'}>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </Row>
          <Row icon="phone-portrait-outline" label="Haptic Feedback" tokens={tokens}
            sub={hapticsEnabled ? 'Vibration on interactions' : 'No vibration'}>
            <Switch
              value={hapticsEnabled}
              onValueChange={toggleHaptics}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </Row>
          <Row icon="notifications-outline" label="Notification Preferences" tokens={tokens}
            sub="View and manage notifications" onPress={() => router.push('/notifications' as any)} last />
        </Card>

        {/* Data & Sync */}
        <SectionLabel label="DATA & SYNC" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <Row icon="refresh-outline" label="Auto Refresh" tokens={tokens}
            sub={autoRefresh ? 'Data updates every 30 seconds' : 'Manual refresh only'}>
            <Switch
              value={autoRefresh}
              onValueChange={toggleAutoRefresh}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </Row>
          <Row icon="trash-outline" label="Clear Cache" tokens={tokens}
            sub="Free up space and reload fresh data"
            onPress={clearCache} last />
        </Card>

        {/* About */}
        <SectionLabel label="ABOUT" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <Row icon="information-circle-outline" label="Version" tokens={tokens}>
            <Text variant="bodySmall" secondary>1.0.0 (1)</Text>
          </Row>
          <Row icon="code-outline" label="Build" tokens={tokens}>
            <Text variant="bodySmall" secondary>Expo SDK 54</Text>
          </Row>
          <Row icon="globe-outline" label="API Server" tokens={tokens} last>
            <Text variant="bodySmall" secondary numberOfLines={1} style={{ maxWidth: 160 }}>
              {process.env.EXPO_PUBLIC_API_URL ?? 'localhost:3000'}
            </Text>
          </Row>
        </Card>

      </ScrollView>
    </View>
  );
}

function SectionLabel({ label, tokens }: { label: string; tokens: any }) {
  return (
    <Text variant="label" secondary weight="semibold" style={{ letterSpacing: 0.8, marginBottom: -8 }}>
      {label}
    </Text>
  );
}

function Row({
  icon, label, sub, tokens, onPress, last, children,
}: {
  icon: IoniconName; label: string; sub?: string; tokens: any;
  onPress?: () => void; last?: boolean; children?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tokens.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={tokens.textSecondary} />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text variant="body" weight="medium" style={{ color: tokens.text }}>{label}</Text>
        {sub && <Text variant="caption" secondary style={{ marginTop: 1 }}>{sub}</Text>}
      </View>
      {children ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} /> : null)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
