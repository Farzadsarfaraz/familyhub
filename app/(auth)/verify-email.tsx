import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();

  return (
    <LinearGradient
      colors={isDark ? ['#0A0A0F', '#0F0F1A'] : ['#F5F7FF', '#FAFAFA']}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.emoji}>📧</Text>
        <Text variant="h1" weight="black" center style={{ color: tokens.text, marginBottom: 12 }}>
          Verify your email
        </Text>
        <Text variant="body" secondary center style={styles.subtitle}>
          We've sent a verification link to your email address. Please check your inbox and verify your account.
        </Text>

        <View style={[styles.infoCard, { backgroundColor: Colors.primary[50] }]}>
          <Text variant="bodySmall" color={Colors.primary[700]} center>
            Can't find the email? Check your spam folder or request a new one.
          </Text>
        </View>

        <View style={styles.buttons}>
          <Button
            label="I've Verified — Sign In"
            onPress={() => router.replace('/(auth)/login' as any)}
            fullWidth
            size="xl"
          />
          <Button
            label="Resend Email"
            variant="outline"
            onPress={() => {}}
            fullWidth
            size="xl"
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emoji:     { fontSize: 72, marginBottom: 24 },
  subtitle:  { lineHeight: 26, marginBottom: 28, maxWidth: 300 },
  infoCard:  { borderRadius: 14, padding: 16, marginBottom: 40, width: '100%' },
  buttons:   { width: '100%' },
});
