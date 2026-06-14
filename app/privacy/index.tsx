import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, Modal,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing } from '@/constants/theme';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function PrivacyScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { tokens } = useTheme();
  const logout  = useAuthStore(s => s.logout);

  const { profilePublic, shareActivity, update } = useSettingsStore();

  // Change password modal
  const [pwModal,   setPwModal]   = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw,  setSavingPw]  = useState(false);
  const [showPw,    setShowPw]    = useState(false);

  // Delete account modal
  const [deleteModal,    setDeleteModal]    = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // ── Change Password ────────────────────────────────────────────────────────
  function openPw() { setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwModal(true); }
  function closePw() { if (savingPw) return; setPwModal(false); }

  async function savePassword() {
    if (!currentPw)          { Alert.alert('Required', 'Enter your current password.'); return; }
    if (newPw.length < 8)    { Alert.alert('Too short', 'New password must be at least 8 characters.'); return; }
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

  // ── Delete Account ─────────────────────────────────────────────────────────
  function openDelete() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your personal data. This action cannot be undone.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => { setDeletePassword(''); setDeleteModal(true); } },
      ],
    );
  }
  function closeDelete() { if (deletingAccount) return; setDeleteModal(false); }

  async function confirmDelete() {
    if (!deletePassword) { Alert.alert('Required', 'Enter your password to confirm.'); return; }
    setDeletingAccount(true);
    try {
      // Verify password first via change-password with same value (server validates current)
      await api.delete('/users/me', { data: { password: deletePassword } });
      toast.success('Account deleted');
      closeDelete();
      logout();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setDeletingAccount(false); }
  }

  // ── Sign Out All ───────────────────────────────────────────────────────────
  function signOutAll() {
    Alert.alert(
      'Sign Out All Devices',
      'This will invalidate all sessions including this one. You will need to log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out All', style: 'destructive', onPress: () => logout() },
      ],
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ── Change Password Modal ── */}
      <Modal visible={pwModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closePw} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingPw && { opacity: 0.35 }]} onPress={closePw} disabled={savingPw}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Change Password</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={savePassword} disabled={savingPw}>
              {savingPw
                ? <ActivityIndicator size="small" color={Colors.primary[500]} />
                : <Text variant="body" weight="bold" style={{ color: Colors.primary[500] }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="always">
              {([
                { label: 'Current password', value: currentPw, setter: setCurrentPw },
                { label: 'New password',     value: newPw,     setter: setNewPw     },
                { label: 'Confirm password', value: confirmPw, setter: setConfirmPw },
              ] as const).map(({ label, value, setter }) => (
                <View key={label} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="lock-closed-outline" size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={{ marginLeft: 12, color: tokens.text }}>{label}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      value={value} onChangeText={setter as any}
                      placeholder="••••••••" placeholderTextColor={tokens.textTertiary}
                      secureTextEntry={!showPw}
                      style={{ color: tokens.text, fontSize: 15, textAlign: 'right', minWidth: 80 }}
                    />
                    <TouchableOpacity onPress={() => setShowPw(v => !v)}>
                      <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={tokens.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <Text variant="caption" secondary style={{ marginTop: 12 }}>Minimum 8 characters.</Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Delete Account Modal ── */}
      <Modal visible={deleteModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeDelete} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, deletingAccount && { opacity: 0.35 }]} onPress={closeDelete} disabled={deletingAccount}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: Colors.error[500] }}>Delete Account</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={confirmDelete} disabled={deletingAccount}>
              {deletingAccount
                ? <ActivityIndicator size="small" color={Colors.error[500]} />
                : <Text variant="body" weight="bold" style={{ color: Colors.error[500] }}>Delete</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="always">
              <View style={[styles.deleteWarning, { backgroundColor: Colors.error[50], borderColor: Colors.error[200] }]}>
                <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 10 }}>⚠️</Text>
                <Text variant="body" weight="bold" style={{ color: Colors.error[600], textAlign: 'center' }}>
                  This cannot be undone
                </Text>
                <Text variant="bodySmall" style={{ color: Colors.error[500], textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                  All your personal data, tasks, events, and profile will be permanently deleted. Family content created by other members will remain.
                </Text>
              </View>
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="lock-closed-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={{ marginLeft: 12, color: tokens.text }}>Confirm password</Text>
                </View>
                <TextInput
                  value={deletePassword} onChangeText={setDeletePassword}
                  placeholder="Your password" placeholderTextColor={tokens.textTertiary}
                  secureTextEntry
                  style={{ color: tokens.text, fontSize: 15, textAlign: 'right', minWidth: 100 }}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={tokens.text} />
        </TouchableOpacity>
        <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60, gap: Spacing[5] }} showsVerticalScrollIndicator={false}>

        {/* Security */}
        <SectionLabel label="SECURITY" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <Row icon="lock-closed-outline"  label="Change Password"  tokens={tokens} onPress={openPw} />
          <Row icon="finger-print-outline" label="Biometric Login"  tokens={tokens} last>
            <Text variant="bodySmall" secondary>Coming soon</Text>
          </Row>
        </Card>

        {/* Privacy */}
        <SectionLabel label="PRIVACY" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <Row icon="person-circle-outline" label="Profile visible to family" sub="Other family members can see your profile" tokens={tokens}>
            <Switch
              value={profilePublic}
              onValueChange={v => update({ profilePublic: v })}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </Row>
          <Row icon="stats-chart-outline" label="Share activity with family" sub="Show completed tasks and goals to family" tokens={tokens} last>
            <Switch
              value={shareActivity}
              onValueChange={v => update({ shareActivity: v })}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </Row>
        </Card>

        {/* Sessions */}
        <SectionLabel label="SESSIONS" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <Row icon="phone-portrait-outline" label="Current Device" tokens={tokens}>
            <Text variant="bodySmall" weight="semibold" style={{ color: Colors.success[500] }}>Active</Text>
          </Row>
          <Row icon="log-out-outline" label="Sign Out All Devices" tokens={tokens} onPress={signOutAll} last />
        </Card>

        {/* Legal */}
        <SectionLabel label="LEGAL" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <Row icon="document-text-outline" label="Privacy Policy"   tokens={tokens} onPress={() => router.push('/privacy-policy' as any)} />
          <Row icon="reader-outline"        label="Terms of Service" tokens={tokens} onPress={() => router.push('/terms' as any)} last />
        </Card>

        {/* Contact */}
        <SectionLabel label="DATA REQUESTS" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <Row icon="mail-outline" label="Request My Data" sub="Get a copy of your personal data" tokens={tokens}
            onPress={() => Linking.openURL('mailto:privacy@familyhub.app?subject=Data%20Request')} />
          <Row icon="shield-checkmark-outline" label="Report a Privacy Issue" sub="privacy@familyhub.app" tokens={tokens}
            onPress={() => Linking.openURL('mailto:privacy@familyhub.app?subject=Privacy%20Issue')} last />
        </Card>

        {/* Danger zone */}
        <SectionLabel label="DANGER ZONE" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <TouchableOpacity style={styles.dangerRow} onPress={openDelete} activeOpacity={0.75}>
            <View style={[styles.rowIcon, { backgroundColor: Colors.error[50] }]}>
              <Ionicons name="trash-outline" size={18} color={Colors.error[500]} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text variant="body" weight="medium" style={{ color: Colors.error[500] }}>Delete Account</Text>
              <Text variant="caption" style={{ color: Colors.error[400], marginTop: 1 }}>Permanently delete your account and data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.error[300]} />
          </TouchableOpacity>
        </Card>

      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tokens.surfaceAlt }]}>
        <Ionicons name={icon as any} size={18} color={tokens.textSecondary} />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text variant="body" weight="medium" style={{ color: tokens.text }}>{label}</Text>
        {sub && <Text variant="caption" secondary style={{ marginTop: 1 }}>{sub}</Text>}
      </View>
      {children ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} /> : null)}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:       { width: 40, height: 40, justifyContent: 'center' },
  row:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  dangerRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalBtn:      { minWidth: 64, height: 36, justifyContent: 'center' },
  formRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  deleteWarning: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 24 },
});
