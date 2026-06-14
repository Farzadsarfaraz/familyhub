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
import { Text, Button, Input, Divider } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function LoginScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const { login, loading, error, clearError } = useAuthStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim())              e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password)                  e.password = 'Password is required';
    else if (password.length < 6)   e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    clearError();
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)' as any);
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
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text variant="bodyLarge" color={Colors.primary[500]}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.logo}>🏡</Text>
            <Text variant="h1" weight="black" style={{ color: tokens.text }}>
              Welcome back
            </Text>
            <Text variant="body" secondary style={styles.headerSub}>
              Sign in to your FamilyHub account
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.form, { backgroundColor: tokens.card }]}>
            {error && (
              <View style={styles.errorBanner}>
                <Text variant="bodySmall" color={Colors.error[600]}>{error}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
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
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                isPassword
                autoComplete="current-password"
                leftIcon="lock-closed-outline"
                error={errors.password}
              />
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password' as any)}
              style={styles.forgotBtn}
            >
              <Text variant="bodySmall" color={Colors.primary[500]} weight="semibold">
                Forgot password?
              </Text>
            </TouchableOpacity>

            <Button
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="xl"
              style={styles.submitBtn}
            />

            <Divider label="or continue with" my={20} />

            <View style={styles.socialRow}>
              <SocialBtn label="Google" emoji="🔵" onPress={() => {}} />
              <SocialBtn label="Apple"  emoji="⚫" onPress={() => {}} />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text variant="body" secondary>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
              <Text variant="body" color={Colors.primary[500]} weight="semibold">Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function SocialBtn({ label, emoji, onPress }: { label: string; emoji: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.socialBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={{ fontSize: 18, marginRight: 8 }}>{emoji}</Text>
      <Text variant="body" weight="semibold">{label}</Text>
    </TouchableOpacity>
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
  fieldGroup:  { gap: 16, marginBottom: 12 },
  forgotBtn:   { alignSelf: 'flex-end', marginBottom: 24 },
  submitBtn:   { marginBottom: 4 },
  socialRow:   { flexDirection: 'row', gap: 12 },
  socialBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: BorderRadius.lg, borderWidth: 1.5 },
  footer:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
