import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button, Input } from '@/components/ui';
import api from '@/lib/api';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function ResetPasswordScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!password)              e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Minimum 8 characters';
    if (password !== confirm)   e.confirm  = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
    } catch (e: any) {
      setErrors({ password: e.response?.data?.message ?? 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0F0F1A'] : ['#F5F7FF', '#FAFAFA']}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text variant="bodyLarge" color={Colors.primary[500]}>← Back</Text>
          </TouchableOpacity>

          {done ? (
            <View style={styles.doneContainer}>
              <Text style={styles.emoji}>✅</Text>
              <Text variant="h2" weight="bold" center style={{ color: tokens.text, marginBottom: 12 }}>
                Password reset!
              </Text>
              <Text variant="body" secondary center style={{ marginBottom: 32 }}>
                Your password has been updated. You can now sign in with your new password.
              </Text>
              <Button
                label="Sign In"
                onPress={() => router.replace('/(auth)/login' as any)}
                fullWidth
                size="xl"
              />
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.emoji}>🔒</Text>
                <Text variant="h1" weight="black" style={{ color: tokens.text }}>New password</Text>
                <Text variant="body" secondary center style={styles.subtitle}>
                  Choose a strong password for your account
                </Text>
              </View>

              <View style={[styles.form, { backgroundColor: tokens.card }]}>
                <View style={{ gap: 16 }}>
                  <Input
                    label="New password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChangeText={setPassword}
                    isPassword
                    leftIcon="lock-closed-outline"
                    error={errors.password}
                  />
                  <Input
                    label="Confirm password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChangeText={setConfirm}
                    isPassword
                    leftIcon="checkmark-circle-outline"
                    error={errors.confirm}
                  />
                </View>
                <Button
                  label="Reset Password"
                  onPress={handleSubmit}
                  loading={loading}
                  fullWidth
                  size="xl"
                  style={{ marginTop: 24 }}
                />
              </View>
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:         { paddingHorizontal: 20 },
  backBtn:        { marginBottom: 20 },
  header:         { alignItems: 'center', marginBottom: 32 },
  emoji:          { fontSize: 56, marginBottom: 16 },
  subtitle:       { marginTop: 8, textAlign: 'center' },
  form:           { borderRadius: BorderRadius['2xl'], padding: Spacing[5] },
  doneContainer:  { alignItems: 'center', paddingTop: 60 },
});
