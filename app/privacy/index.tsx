import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, Modal,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
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

  // Change password modal
  const [pwModal,     setPwModal]     = useState(false);
  const [currentPw,   setCurrentPw]   = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [savingPw,    setSavingPw]    = useState(false);
  const [showPw,      setShowPw]      = useState(false);

  // Privacy toggles (UI-only, no backend currently)
  const [profilePublic, setProfilePublic] = useState(true);
  const [shareActivity, setShareActivity] = useState(true);

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

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account', style: 'destructive',
          onPress: () => Alert.alert('Coming Soon', 'Account deletion will be available in a future update.'),
        },
      ],
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* Change Password Modal */}
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
              {[
                { label: 'Current password', value: currentPw, setter: setCurrentPw },
                { label: 'New password',     value: newPw,     setter: setNewPw     },
                { label: 'Confirm password', value: confirmPw, setter: setConfirmPw },
              ].map(({ label, value, setter }) => (
                <View key={label} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="lock-closed-outline" size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={{ marginLeft: 12, color: tokens.text }}>{label}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      value={value} onChangeText={setter}
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
          <SettingRow icon="lock-closed-outline" label="Change Password" tokens={tokens} onPress={openPw} />
          <SettingRow icon="finger-print-outline" label="Biometric Login" tokens={tokens} last>
            <Text variant="bodySmall" secondary>Coming soon</Text>
          </SettingRow>
        </Card>

        {/* Privacy */}
        <SectionLabel label="PRIVACY" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <SettingRow icon="person-circle-outline" label="Profile visible to family" tokens={tokens}>
            <Switch
              value={profilePublic}
              onValueChange={setProfilePublic}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </SettingRow>
          <SettingRow icon="stats-chart-outline" label="Share activity with family" tokens={tokens} last>
            <Switch
              value={shareActivity}
              onValueChange={setShareActivity}
              trackColor={{ false: tokens.border, true: Colors.primary[400] }}
              thumbColor="#fff"
            />
          </SettingRow>
        </Card>

        {/* Active sessions */}
        <SectionLabel label="SESSIONS" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <SettingRow icon="phone-portrait-outline" label="Current Device" tokens={tokens}>
            <Text variant="bodySmall" style={{ color: Colors.success[500] }} weight="semibold">Active</Text>
          </SettingRow>
          <SettingRow icon="log-out-outline" label="Sign Out All Devices" tokens={tokens} onPress={() => {
            Alert.alert('Sign Out All Devices', 'This will invalidate all sessions. You will need to log in again.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out All', style: 'destructive', onPress: () => logout() },
            ]);
          }} last />
        </Card>

        {/* Legal */}
        <SectionLabel label="LEGAL" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <SettingRow icon="document-text-outline" label="Privacy Policy"    tokens={tokens} onPress={() => {}} />
          <SettingRow icon="reader-outline"        label="Terms of Service"  tokens={tokens} onPress={() => {}} last />
        </Card>

        {/* Danger zone */}
        <SectionLabel label="DANGER ZONE" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          <TouchableOpacity
            style={[styles.dangerRow]}
            onPress={confirmDeleteAccount}
            activeOpacity={0.75}
          >
            <View style={[styles.rowIcon, { backgroundColor: Colors.error[50] }]}>
              <Ionicons name="trash-outline" size={18} color={Colors.error[500]} />
            </View>
            <Text variant="body" weight="medium" style={{ flex: 1, marginLeft: 14, color: Colors.error[500] }}>
              Delete Account
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.error[300]} />
          </TouchableOpacity>
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
        <Ionicons name={icon as any} size={18} color={tokens.textSecondary} />
      </View>
      <Text variant="body" weight="medium" style={{ flex: 1, marginLeft: 14, color: tokens.text }}>{label}</Text>
      {children ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} /> : null)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  dangerRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalBtn:    { minWidth: 64, height: 36, justifyContent: 'center' },
  formRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
