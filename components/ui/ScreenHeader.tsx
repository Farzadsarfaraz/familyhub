import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  title:       string;
  subtitle?:   string;
  showBack?:   boolean;
  rightSlot?:  React.ReactNode;
  onBack?:     () => void;
  transparent?: boolean;
}

export function ScreenHeader({ title, subtitle, showBack = false, rightSlot, onBack, transparent }: Props) {
  const { tokens } = useTheme();
  const insets     = useSafeAreaInsets();
  const router     = useRouter();

  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop:      insets.top + 8,
          backgroundColor: transparent ? 'transparent' : tokens.background,
          borderBottomColor: transparent ? 'transparent' : tokens.borderSubtle,
        },
      ]}
    >
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={tokens.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.center}>
        <Text variant="h4" weight="bold" numberOfLines={1}>{title}</Text>
        {subtitle && <Text variant="caption" secondary numberOfLines={1}>{subtitle}</Text>}
      </View>

      <View style={styles.right}>
        {rightSlot}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header:  {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 16,
    paddingBottom:   12,
    borderBottomWidth: 1,
  },
  left:    { width: 48, alignItems: 'flex-start' },
  center:  { flex: 1, alignItems: 'center' },
  right:   { width: 48, alignItems: 'flex-end' },
  backBtn: {},
});
