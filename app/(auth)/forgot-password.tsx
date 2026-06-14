import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button, Input } from '@/components/ui';
import api from '@/lib/api';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function ForgotPasswordScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();

  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Something went wrong');
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

          {sent ? (
            <View style={styles.sentContainer}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.success[100] }]}>
                <Ionicons name="mail-outline" size={40} color={Colors.success[600]} />
              </View>
              <Text variant="h2" weight="bold" center style={{ color: tokens.text, marginBottom: 12 }}>
                Check your email
              </Text>
              <Text variant="body" secondary center style={{ marginBottom: 32, lineHeight: 24 }}>
                We sent a password reset link to{'\n'}
                <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{email}</Text>
              </Text>
              <Button label="Back to Sign In" onPress={() => router.replace('/(auth)/login' as any)} fullWidth size="xl" />
              <TouchableOpacity onPress={() => setSent(false)} style={styles.resendBtn}>
                <Text variant="body" color={Colors.primary[500]} weight="semibold">Resend email</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.logo}>🔑</Text>
                <Text variant="h1" weight="black" style={{ color: tokens.text }}>Forgot password?</Text>
                <Text variant="body" secondary center style={styles.headerSub}>
                  Enter your email and we'll send you a reset link
                </Text>
              </View>

              <View style={[styles.form, { backgroundColor: tokens.card }]}>
                <Input
                  label="Email address"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                  error={error}
                />
                <Button
                  label="Send Reset Link"
                  onPress={handleSubmit}
                  loading={loading}
                  fullWidth
                  size="xl"
                  style={{ marginTop: 8 }}
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
  logo:           { fontSize: 56, marginBottom: 16 },
  headerSub:      { marginTop: 8, textAlign: 'center' },
  form:           { borderRadius: BorderRadius['2xl'], padding: Spacing[5], gap: 16 },
  sentContainer:  { alignItems: 'center', paddingTop: 60 },
  iconCircle:     { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  resendBtn:      { marginTop: 20 },
});
