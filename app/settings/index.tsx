import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Card, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { toast } from '@/store/toast.store';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function SettingsScreen() {
  const insets     = useSafeAreaInsets();
  const router     = useRouter();
  const { tokens, isDark } = useTheme();

  // Local preference toggles (stored in AsyncStorage)
  const [compactMode,   setCompactMode]   = useState(false);
  const [soundEnabled,  setSoundEnabled]  = useState(true);
  const [haptics,       setHaptics]       = useState(true);
  const [autoRefresh,   setAutoRefresh]   = useState(true);

  async function clearCache() {
    Alert.alert('Clear Cache', 'This will clear locally cached data. You will need to reload app data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            const toRemove = keys.filter(k => k.startsWith('cache_') || k.startsWith('query_'));
            if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
            toast.success('Cache cleared');
          } catch {
            toast.error('Failed to clear cache');
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={tokens.text} />
        </TouchableOpacity>
        <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60, gap: Spacing[5] }} showsVerticalScrollIndicator={false}>

        {/* Appearance */}
        <SectionLabel label="APPEARANCE" />
        <Card shadow="sm" padding={0}>
          <SettingRow icon="moon-outline" label="Dark Mode" tokens={tokens}>
            <Badge label={isDark ? 'System (On)' : 'System (Off)'} variant={isDark ? 'primary' : 'neutral'} size="sm" />
          </SettingRow>
          <SettingRow icon="resize-outline" label="Compact Mode" tokens={tokens} last>
            <Switch
              value={compactMode}
              onValueChange={setCompactMode}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </SettingRow>
        </Card>

        {/* Notifications */}
        <SectionLabel label="NOTIFICATIONS" />
        <Card shadow="sm" padding={0}>
          <SettingRow icon="volume-high-outline" label="Sound" tokens={tokens}>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </SettingRow>
          <SettingRow icon="phone-portrait-outline" label="Haptic Feedback" tokens={tokens}>
            <Switch
              value={haptics}
              onValueChange={setHaptics}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </SettingRow>
          <SettingRow icon="notifications-outline" label="Notification Preferences" tokens={tokens} onPress={() => router.push('/notifications' as any)} last />
        </Card>

        {/* Data */}
        <SectionLabel label="DATA & SYNC" />
        <Card shadow="sm" padding={0}>
          <SettingRow icon="refresh-outline" label="Auto Refresh" tokens={tokens}>
            <Switch
              value={autoRefresh}
              onValueChange={setAutoRefresh}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </SettingRow>
          <SettingRow icon="cloud-download-outline" label="Refresh Interval" tokens={tokens}>
            <Text variant="bodySmall" secondary>30 seconds</Text>
          </SettingRow>
          <SettingRow icon="trash-outline" label="Clear Cache" tokens={tokens} onPress={clearCache} last>
            <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
          </SettingRow>
        </Card>

        {/* About */}
        <SectionLabel label="ABOUT" />
        <Card shadow="sm" padding={0}>
          <SettingRow icon="information-circle-outline" label="Version" tokens={tokens}>
            <Text variant="bodySmall" secondary>1.0.0 (1)</Text>
          </SettingRow>
          <SettingRow icon="code-outline" label="Build" tokens={tokens}>
            <Text variant="bodySmall" secondary>Expo SDK 54</Text>
          </SettingRow>
          <SettingRow icon="globe-outline" label="API Server" tokens={tokens} last>
            <Text variant="bodySmall" secondary numberOfLines={1} style={{ maxWidth: 160 }}>
              {process.env.EXPO_PUBLIC_API_URL ?? 'localhost:3000'}
            </Text>
          </SettingRow>
        </Card>

      </ScrollView>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { tokens } = useTheme();
  return (
    <Text variant="label" secondary weight="semibold" style={{ letterSpacing: 0.8, marginBottom: -8 }}>
      {label}
    </Text>
  );
}

function SettingRow({
  icon, label, tokens, onPress, last, children,
}: {
  icon: IoniconName; label: string; tokens: any;
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
      <Text variant="body" weight="medium" style={{ flex: 1, marginLeft: 14, color: tokens.text }}>{label}</Text>
      {children ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} /> : null)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
