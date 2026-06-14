import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Text, Button, Input, Divider } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import api from '@/lib/api';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export default function LoginScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const { login, setAuth, loading, error, clearError } = useAuthStore();

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [errors,        setErrors]        = useState<{ email?: string; password?: string }>({});
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  // ─── Google OAuth (web-browser flow, no platform-specific hook) ────────────
  async function handleGooglePress() {
    if (!GOOGLE_CLIENT_ID) {
      Alert.alert('Not configured', 'Google Sign-In client ID is missing.');
      return;
    }

    setSocialLoading('google');
    try {
      // Build redirect URI from the current environment (Expo Go vs standalone)
      const redirectUri = Linking.createURL('auth/google');

      const authUrl =
        'https://accounts.google.com/o/oauth2/v2/auth' +
        `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent('openid email profile')}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success') {
        // Token comes back in the URL fragment (#access_token=...)
        const fragment = result.url.split('#')[1] ?? '';
        const params: Record<string, string> = {};
        fragment.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
        });

        if (params['access_token']) {
          await handleGoogleToken(params['access_token']);
          return;
        }
      }

      if (result.type !== 'cancel' && result.type !== 'dismiss') {
        Alert.alert(
          'Google Sign-In',
          `Could not complete sign-in.\n\nMake sure "${redirectUri}" is added to the Authorized redirect URIs in Google Cloud Console.`,
        );
      }
    } catch (e: any) {
      Alert.alert('Google Sign-In Failed', e?.message ?? 'Something went wrong.');
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleGoogleToken(accessToken: string) {
    const res = await api.post('/auth/google', { accessToken });
    const { user, accessToken: jwt, refreshToken } = res.data.data;
    await setAuth(user, jwt, refreshToken);
    router.replace('/(tabs)' as any);
  }

  // ─── Apple Sign-In ─────────────────────────────────────────────────────────
  async function handleApplePress() {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Sign-In', 'Apple Sign-In is only available on iOS.');
      return;
    }

    setSocialLoading('apple');
    try {
      const AppleAuth = await import('expo-apple-authentication');

      const available = await AppleAuth.isAvailableAsync();
      if (!available) {
        Alert.alert('Apple Sign-In', 'Apple Sign-In is not available on this device.');
        return;
      }

      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Apple Sign-In', 'No identity token received from Apple.');
        return;
      }

      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : undefined;

      const res = await api.post('/auth/apple', {
        identityToken: credential.identityToken,
        fullName,
      });

      const { user, accessToken, refreshToken } = res.data.data;
      await setAuth(user, accessToken, refreshToken);
      router.replace('/(tabs)' as any);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In Failed', e?.response?.data?.message ?? 'Something went wrong.');
      }
    } finally {
      setSocialLoading(null);
    }
  }

  // ─── Email / Password ──────────────────────────────────────────────────────
  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim())                    e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Enter a valid email';
    if (!password)                        e.password = 'Password is required';
    else if (password.length < 6)         e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    clearError();
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)' as any);
    } catch { /* error shown via store */ }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            <Text style={styles.logo}>🏡</Text>
            <Text variant="h1" weight="black" style={{ color: tokens.text }}>Welcome back</Text>
            <Text variant="body" secondary style={styles.headerSub}>Sign in to your FamilyHub account</Text>
          </View>

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
              <Text variant="bodySmall" color={Colors.primary[500]} weight="semibold">Forgot password?</Text>
            </TouchableOpacity>

            <Button label="Sign In" onPress={handleLogin} loading={loading} fullWidth size="xl" style={styles.submitBtn} />

            <Divider label="or continue with" my={20} />

            <View style={styles.socialRow}>
              <SocialBtn
                label="Google"
                emoji="🔵"
                loading={socialLoading === 'google'}
                disabled={socialLoading !== null}
                onPress={handleGooglePress}
              />
              <SocialBtn
                label="Apple"
                emoji="⚫"
                loading={socialLoading === 'apple'}
                disabled={socialLoading !== null}
                onPress={handleApplePress}
              />
            </View>
          </View>

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

function SocialBtn({
  label, emoji, onPress, loading: isLoading, disabled,
}: {
  label: string; emoji: string; onPress: () => void; loading?: boolean; disabled?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.socialBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={disabled || isLoading}
    >
      {isLoading
        ? <ActivityIndicator size="small" color={Colors.primary[500]} style={{ marginRight: 8 }} />
        : <Text style={{ fontSize: 18, marginRight: 8 }}>{emoji}</Text>}
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
