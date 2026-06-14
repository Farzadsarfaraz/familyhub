import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Colors, BorderRadius } from '@/constants/theme';

type Variant = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';
type Size    = 'sm' | 'md' | 'lg';

interface Props {
  label:    string;
  variant?: Variant;
  size?:    Size;
  dot?:     boolean;
  style?:   ViewStyle;
}

const variantColors: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: Colors.primary[100], text: Colors.primary[700] },
  success: { bg: Colors.success[100], text: Colors.success[700] },
  warning: { bg: Colors.warning[100], text: Colors.warning[700] },
  error:   { bg: Colors.error[100],   text: Colors.error[700]   },
  neutral: { bg: Colors.neutral[100], text: Colors.neutral[700] },
  info:    { bg: '#E0F2FE',           text: '#0369A1'           },
};

const sizeMap: Record<Size, { px: number; py: number; fs: number }> = {
  sm: { px: 6,  py: 2, fs: 10 },
  md: { px: 8,  py: 3, fs: 11 },
  lg: { px: 12, py: 4, fs: 12 },
};

export function Badge({ label, variant = 'primary', size = 'md', dot, style }: Props) {
  const { bg, text } = variantColors[variant];
  const { px, py, fs } = sizeMap[size];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, paddingHorizontal: px, paddingVertical: py, borderRadius: BorderRadius.full },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: text }]} />}
      <Text variant="caption" weight="semibold" color={text} style={{ fontSize: fs }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  dot:   { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
});
