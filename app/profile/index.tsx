import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Switch,
  Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, Card, Avatar, Badge } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

// ── Types ──────────────────────────────────────────────────────────────────
interface LeaderboardEntry { id: string; name: string; points: number; completed: number; }

// ── Screen ──────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const logout  = useAuthStore(s => s.logout);
  const qc      = useQueryClient();

  const enabled = !!user?.familyId;

  // Edit profile modal
  const [editModal,   setEditModal]   = useState(false);
  const [editName,    setEditName]    = useState('');
  const [editAvatar,  setEditAvatar]  = useState('');
  const [savingEdit,  setSavingEdit]  = useState(false);

  // Change password modal
  const [pwModal,     setPwModal]     = useState(false);
  const [currentPw,   setCurrentPw]   = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [savingPw,    setSavingPw]    = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn:  async () => { const r = await api.get('/tasks/leaderboard'); return r.data.data; },
    enabled,
  });

  const { data: completedTasks = [] } = useQuery<any[]>({
    queryKey: ['myCompletedTasks', user?.id],
    queryFn:  async () => {
      const r = await api.get(`/tasks?status=COMPLETED&assignedTo=${user!.id}`);
      return r.data.data;
    },
    enabled: !!user?.id,
  });

  const { data: goals = [] } = useQuery<any[]>({
    queryKey: ['homeGoals'],
    queryFn:  async () => { const r = await api.get('/goals'); return r.data.data; },
    enabled,
  });

  const { data: family } = useQuery<any>({
    queryKey: ['family'],
    queryFn:  async () => { const r = await api.get('/families/me'); return r.data.data; },
    enabled,
    retry: false,
  });

  // Derived stats
  const myLeaderboard   = leaderboard.find(e => e.id === user?.id);
  const myPoints        = myLeaderboard?.points ?? 0;
  const completedGoals  = goals.filter((g: any) => g.status === 'COMPLETED');
  const memberCount     = family?.members?.length ?? 0;

  const STATS = [
    { label: 'Tasks Done', value: String(completedTasks.length), icon: '✅' },
    { label: 'Points',     value: String(myPoints),               icon: '⭐' },
    { label: 'Goals Done', value: String(completedGoals.length),  icon: '🎯' },
    { label: 'Family',     value: memberCount > 0 ? String(memberCount) : '—', icon: '👨‍👩‍👧' },
  ];

  // ── Edit Profile ───────────────────────────────────────────────────────────
  function openEdit() {
    setEditName(user?.name ?? '');
    setEditAvatar((user as any)?.avatar ?? '');
    setEditModal(true);
  }
  function closeEdit() { if (savingEdit) return; setEditModal(false); }

  async function saveProfile() {
    if (!editName.trim()) { Alert.alert('Required', 'Enter your name.'); return; }
    setSavingEdit(true);
    try {
      const { data } = await api.patch('/users/me', {
        name:   editName.trim(),
        avatar: editAvatar.trim() || undefined,
      });
      useAuthStore.setState({ user: data.data });
      qc.invalidateQueries({ queryKey: ['family'] });
      toast.success('Profile updated');
      closeEdit();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingEdit(false); }
  }

  // ── Change Password ────────────────────────────────────────────────────────
  function openPw() { setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwModal(true); }
  function closePw() { if (savingPw) return; setPwModal(false); }

  async function savePassword() {
    if (!currentPw)        { Alert.alert('Required', 'Enter your current password.'); return; }
    if (newPw.length < 8)  { Alert.alert('Too short', 'New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { Alert.alert('Mismatch', 'New passwords do not match.'); return; }
    setSavingPw(true);
    try {
      await api.patch('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      toast.success('Password changed');
      closePw();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingPw(false); }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  function confirmLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ EDIT PROFILE MODAL ══════ */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeEdit} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingEdit && { opacity: 0.35 }]} onPress={closeEdit} disabled={savingEdit}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Edit Profile</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveProfile} disabled={savingEdit}>
              {savingEdit ? <ActivityIndicator size="small" color={Colors.primary[500]} />
                : <Text variant="body" weight="bold" style={{ color: Colors.primary[500] }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Avatar name={editName || user?.name} size="2xl" />
              </View>
              {[
                { label: 'Name',       key: 'name'   as const, value: editName,   setter: setEditName,   icon: 'person-outline',  placeholder: 'Your full name',      secure: false },
                { label: 'Avatar URL', key: 'avatar' as const, value: editAvatar, setter: setEditAvatar, icon: 'image-outline',   placeholder: 'https://… (optional)', secure: false },
              ].map(({ label, key, value, setter, icon, placeholder }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput value={value} onChangeText={setter}
                    placeholder={placeholder} placeholderTextColor={tokens.textTertiary}
                    style={[styles.inlineInput, { color: tokens.text }]} autoCapitalize="none" />
                </View>
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ CHANGE PASSWORD MODAL ══════ */}
      <Modal visible={pwModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closePw} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingPw && { opacity: 0.35 }]} onPress={closePw} disabled={savingPw}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Change Password</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={savePassword} disabled={savingPw}>
              {savingPw ? <ActivityIndicator size="small" color={Colors.primary[500]} />
                : <Text variant="body" weight="bold" style={{ color: Colors.primary[500] }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              {[
                { label: 'Current password', value: currentPw, setter: setCurrentPw, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                { label: 'New password',     value: newPw,     setter: setNewPw,     show: showNew,     toggle: () => setShowNew(v => !v)     },
                { label: 'Confirm password', value: confirmPw, setter: setConfirmPw, show: showNew,     toggle: () => setShowNew(v => !v)     },
              ].map(({ label, value, setter, show, toggle }) => (
                <View key={label} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="lock-closed-outline" size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                    <TextInput value={value} onChangeText={setter}
                      placeholder="••••••••" placeholderTextColor={tokens.textTertiary}
                      secureTextEntry={!show}
                      style={[styles.inlineInput, { color: tokens.text, flex: 1 }]} />
                    <TouchableOpacity onPress={toggle} style={{ paddingLeft: 8 }}>
                      <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={tokens.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <Text variant="caption" secondary style={{ marginTop: 12 }}>
                Minimum 8 characters.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <LinearGradient
          colors={isDark ? ['#0F0A2E', '#0A0A1A'] : ['#EEF4FF', '#F5F7FF']}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-down" size={26} color={isDark ? '#fff' : tokens.text} />
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: isDark ? '#fff' : tokens.text }}>Profile</Text>
            <TouchableOpacity onPress={openEdit}>
              <Ionicons name="create-outline" size={22} color={isDark ? '#fff' : tokens.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Avatar name={user?.name} size="2xl" online />
              <TouchableOpacity style={styles.avatarEditBtn} onPress={openEdit}>
                <Ionicons name="camera" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text variant="h3" weight="black" style={{ color: isDark ? '#fff' : tokens.text, marginTop: 14 }}>
              {user?.name ?? 'Family Member'}
            </Text>
            <Text variant="body" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 2 }}>
              {user?.email ?? ''}
            </Text>
            <Badge label={user?.role ?? 'PARENT'} variant="primary" style={{ marginTop: 10 }} />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {STATS.map(s => (
              <View key={s.label} style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)' }]}>
                <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                <Text variant="h4" weight="black" style={{ color: isDark ? '#fff' : tokens.text, marginTop: 4 }}>{s.value}</Text>
                <Text variant="caption" secondary numberOfLines={1}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: Spacing[4], marginTop: Spacing[5], gap: Spacing[4] }}>

          {/* Achievements — real completed goals */}
          <Text variant="h4" weight="bold">Achievements 🏆</Text>
          {completedGoals.length === 0 ? (
            <Card shadow="sm" style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🎯</Text>
              <Text variant="body" weight="semibold" style={{ color: tokens.text }}>No achievements yet</Text>
              <Text variant="caption" secondary center style={{ marginTop: 4 }}>
                Complete family goals to earn achievements
              </Text>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {completedGoals.slice(0, 8).map((g: any) => (
                <Card key={g.id} style={styles.achieveCard} shadow="sm">
                  <Text style={{ fontSize: 32 }}>{g.emoji ?? '🏅'}</Text>
                  <Text variant="bodySmall" weight="bold" center style={{ marginTop: 8, color: tokens.text }} numberOfLines={2}>{g.title}</Text>
                  <Text variant="caption" secondary center style={{ marginTop: 2 }}>{g.progress}% done</Text>
                </Card>
              ))}
            </ScrollView>
          )}

          {/* Leaderboard position */}
          {leaderboard.length > 1 && (() => {
            const rank = leaderboard.findIndex(e => e.id === user?.id) + 1;
            return rank > 0 ? (
              <Card shadow="sm" style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Text style={{ fontSize: 32 }}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅'}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold" style={{ color: tokens.text }}>Family Leaderboard</Text>
                  <Text variant="caption" secondary>
                    You're #{rank} with {myPoints} points · {completedTasks.length} tasks completed
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(modules)/tasks/' as any)}
                  style={[styles.viewBtn, { backgroundColor: Colors.primary[500] + '18' }]}>
                  <Text variant="caption" weight="bold" style={{ color: Colors.primary[500] }}>View</Text>
                </TouchableOpacity>
              </Card>
            ) : null;
          })()}

          {/* Account settings */}
          <Text variant="h4" weight="bold">Account</Text>
          <Card shadow="sm" padding={0}>
            <SettingRow icon="person-outline"      label="Edit Profile"     onPress={openEdit} />
            <SettingRow icon="lock-closed-outline" label="Change Password"  onPress={openPw}   />
            <SettingRow icon="people-outline"      label="Family Settings"  onPress={() => router.push('/family' as any)} />
            <SettingRow icon="help-circle-outline" label="Help & Support"   onPress={() => {}} last />
          </Card>

          {/* Appearance */}
          <Text variant="h4" weight="bold">Appearance</Text>
          <Card shadow="sm" padding={0}>
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.settingIcon, { backgroundColor: tokens.surfaceAlt }]}>
                <Ionicons name="moon-outline" size={18} color={tokens.textSecondary} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="medium" style={{ color: tokens.text }}>Dark Mode</Text>
                <Text variant="caption" secondary>Follows system setting</Text>
              </View>
              <Badge label={isDark ? 'On' : 'Off'} variant={isDark ? 'primary' : 'neutral'} size="sm" />
            </View>
          </Card>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: Colors.error[50], borderColor: Colors.error[200] }]}
            onPress={confirmLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error[500]} />
            <Text variant="body" weight="bold" style={{ color: Colors.error[500], marginLeft: 10 }}>Log Out</Text>
          </TouchableOpacity>

          <Text variant="caption" secondary center style={{ marginTop: 4 }}>
            FamilyHub · v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
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
      <Text variant="body" weight="medium" style={{ flex: 1, marginLeft: 14, color: tokens.text }}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1 },
  hero:          { paddingHorizontal: Spacing[4], paddingBottom: Spacing[6] },
  heroTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  avatarSection: { alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  avatarEditBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary[500], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  statsRow:      { flexDirection: 'row', gap: 10, marginTop: 20 },
  statItem:      { flex: 1, borderRadius: BorderRadius.xl, padding: 12, alignItems: 'center' },
  achieveCard:   { width: 120, alignItems: 'center', padding: 16 },
  viewBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  settingRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  settingIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: BorderRadius.xl, borderWidth: 1 },
  // Modal
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalBtn:     { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:     { padding: 20, paddingBottom: 60 },
  formRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft:      { flexDirection: 'row', alignItems: 'center' },
  rowLabel:     { marginLeft: 12, fontSize: 15 },
  inlineInput:  { textAlign: 'right', fontSize: 15 },
});
