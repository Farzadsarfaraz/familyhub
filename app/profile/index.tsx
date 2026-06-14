import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Avatar, Badge, Button } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(isDark);

  const STATS = [
    { label: 'Tasks Done', value: '124', icon: '✅' },
    { label: 'Memories',   value: '47',  icon: '📸' },
    { label: 'Events',     value: '38',  icon: '📅' },
    { label: 'Points',     value: '890', icon: '⭐' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={isDark ? ['#0F0A2E', '#0A0A1A'] : ['#EEF4FF', '#F5F7FF']}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-down" size={26} color={isDark ? '#fff' : tokens.text} />
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: isDark ? '#fff' : tokens.text }}>Profile</Text>
            <TouchableOpacity>
              <Ionicons name="create-outline" size={22} color={isDark ? '#fff' : tokens.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Avatar name={user?.name} size="2xl" online />
              <TouchableOpacity style={styles.avatarEditBtn}>
                <Ionicons name="camera" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text variant="h3" weight="black" style={{ color: isDark ? '#fff' : tokens.text, marginTop: 14 }}>
              {user?.name ?? 'Family Member'}
            </Text>
            <Text variant="body" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 2 }}>
              {user?.email ?? 'member@familyhub.app'}
            </Text>
            <Badge label={user?.role ?? 'PARENT'} variant="primary" style={{ marginTop: 10 }} />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {STATS.map((s) => (
              <View key={s.label} style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)' }]}>
                <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                <Text variant="h4" weight="black" style={{ color: isDark ? '#fff' : tokens.text, marginTop: 4 }}>{s.value}</Text>
                <Text variant="caption" secondary numberOfLines={1}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: Spacing[4], marginTop: Spacing[5], gap: Spacing[4] }}>
          {/* Recent Activity */}
          <Text variant="h4" weight="bold">Recent Achievements 🏆</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {[
              { badge: '🥇', label: 'Top Tasker',  desc: 'Completed 10 tasks' },
              { badge: '📸', label: 'Photographer', desc: 'Added 5 memories'   },
              { badge: '💬', label: 'Connector',    desc: '50 chat messages'   },
              { badge: '💰', label: 'Saver',        desc: 'Met savings goal'   },
            ].map((a) => (
              <Card key={a.label} style={styles.achieveCard} shadow="sm">
                <Text style={{ fontSize: 32 }}>{a.badge}</Text>
                <Text variant="bodySmall" weight="bold" center style={{ marginTop: 8 }}>{a.label}</Text>
                <Text variant="caption" secondary center style={{ marginTop: 2 }}>{a.desc}</Text>
              </Card>
            ))}
          </ScrollView>

          {/* Settings */}
          <Text variant="h4" weight="bold">Preferences</Text>
          <Card shadow="sm" padding={0}>
            <SettingRow
              icon="notifications-outline"
              label="Push Notifications"
              right={<Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: Colors.primary[500] }} />}
            />
            <SettingRow
              icon="moon-outline"
              label="Dark Mode"
              right={<Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: Colors.primary[500] }} />}
            />
            <SettingRow icon="language-outline" label="Language" right={<Text variant="bodySmall" secondary>English</Text>} last />
          </Card>

          <Text variant="h4" weight="bold">Account</Text>
          <Card shadow="sm" padding={0}>
            <SettingRow icon="person-outline"        label="Edit Profile"         onPress={() => {}} />
            <SettingRow icon="lock-closed-outline"   label="Change Password"       onPress={() => {}} />
            <SettingRow icon="shield-outline"        label="Privacy Settings"      onPress={() => {}} />
            <SettingRow icon="help-circle-outline"   label="Help & Support"        onPress={() => {}} />
            <SettingRow icon="information-circle-outline" label="About FamilyHub" onPress={() => {}} last />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon, label, right, onPress, last,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; right?: React.ReactNode; onPress?: () => void; last?: boolean }) {
  const { tokens } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.settingRow, !last && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: tokens.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={tokens.textSecondary} />
      </View>
      <Text variant="body" weight="medium" style={{ flex: 1, marginLeft: 14 }}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  hero:         { paddingHorizontal: Spacing[4], paddingBottom: Spacing[6] },
  heroTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  avatarSection: { alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  avatarEditBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary[500], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  statsRow:     { flexDirection: 'row', gap: 10, marginTop: 20 },
  statItem:     { flex: 1, borderRadius: BorderRadius.xl, padding: 12, alignItems: 'center' },
  achieveCard:  { width: 120, alignItems: 'center', padding: 16 },
  settingRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  settingIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
