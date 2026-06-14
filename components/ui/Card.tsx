import React from 'react';
import { View, ViewProps, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';

interface Props extends ViewProps {
  onPress?:  () => void;
  padding?:  number;
  shadow?:   'sm' | 'md' | 'lg' | 'xl' | 'none';
  radius?:   number;
}

export function Card({ onPress, padding = Spacing[4], shadow = 'md', radius = BorderRadius.xl, style, children, ...rest }: Props) {
  const { tokens } = useTheme();

  const shadowStyle = shadow === 'none' ? {} : Shadows[shadow];
  const cardStyle = [
    styles.card,
    { backgroundColor: tokens.card, borderRadius: radius, padding, ...shadowStyle },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.8} {...rest as any}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
});
