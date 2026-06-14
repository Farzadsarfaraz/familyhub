import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/hooks/useTheme';
import { Colors, BorderRadius } from '@/constants/theme';

interface Props {
  label:      string;
  selected?:  boolean;
  onPress?:   () => void;
  leftIcon?:  React.ReactNode;
  color?:     string;
}

export function Chip({ label, selected, onPress, leftIcon, color = Colors.primary[500] }: Props) {
  const { tokens, isDark } = useTheme();

  const bg = selected
    ? (isDark ? `${color}33` : `${color}18`)
    : (isDark ? Colors.neutral[800] : Colors.neutral[100]);

  const borderColor = selected ? color : tokens.border;
  const textColor   = selected ? color : tokens.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: bg, borderColor, borderWidth: 1.5 }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
      <Text variant="bodySmall" weight={selected ? 'semibold' : 'medium'} color={textColor}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:     BorderRadius.full,
  },
  icon: { marginRight: 6 },
});
