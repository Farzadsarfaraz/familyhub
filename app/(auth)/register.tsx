import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function RegisterScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const { register, loading, error, clearError } = useAuthStore();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())            e.name     = 'Name is required';
    if (!email.trim())           e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password)               e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Minimum 8 characters';
    if (password !== confirm)    e.confirm  = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    clearError();
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      router.replace('/(auth)/verify-email' as any);
    } catch { /* error is in store */ }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0F0F1A'] : ['#F5F7FF', '#FAFAFA']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text variant="bodyLarge" color={Colors.primary[500]}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.logo}>👨‍👩‍👧‍👦</Text>
            <Text variant="h1" weight="black" style={{ color: tokens.text }}>
              Create account
            </Text>
            <Text variant="body" secondary style={styles.headerSub}>
              Start your family's digital home today
            </Text>
          </View>

          <View style={[styles.form, { backgroundColor: tokens.card }]}>
            {error && (
              <View style={styles.errorBanner}>
                <Text variant="bodySmall" color={Colors.error[600]}>{error}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Input
                label="Full name"
                placeholder="Jane Smith"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                leftIcon="person-outline"
                error={errors.name}
              />
              <Input
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon="mail-outline"
                error={errors.email}
              />
              <Input
                label="Password"
                placeholder="Min. 8 characters"
                value={password}
                onChangeText={setPassword}
                isPassword
                autoComplete="new-password"
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

            <Text variant="caption" secondary style={styles.terms}>
              By creating an account you agree to our{' '}
              <Text variant="caption" color={Colors.primary[500]}>Terms of Service</Text>
              {' '}and{' '}
              <Text variant="caption" color={Colors.primary[500]}>Privacy Policy</Text>.
            </Text>

            <Button
              label="Create Account"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              size="xl"
              style={styles.submitBtn}
            />
          </View>

          <View style={styles.footer}>
            <Text variant="body" secondary>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
              <Text variant="body" color={Colors.primary[500]} weight="semibold">Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient:    { flex: 1 },
  scroll:      { paddingHorizontal: 20 },
  backBtn:     { marginBottom: 20 },
  header:      { alignItems: 'center', marginBottom: 32 },
  logo:        { fontSize: 56, marginBottom: 16 },
  headerSub:   { marginTop: 8, textAlign: 'center' },
  form:        { borderRadius: BorderRadius['2xl'], padding: Spacing[5], marginBottom: 24 },
  errorBanner: { backgroundColor: Colors.error[50], borderRadius: BorderRadius.lg, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: Colors.error[500] },
  fieldGroup:  { gap: 16, marginBottom: 16 },
  terms:       { marginBottom: 24, lineHeight: 18 },
  submitBtn:   {},
  footer:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
