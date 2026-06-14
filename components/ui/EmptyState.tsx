import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { Colors } from '@/constants/theme';

interface Props {
  icon:    keyof typeof Ionicons.glyphMap;
  title:   string;
  message: string;
  actionLabel?: string;
  onAction?:    () => void;
  color?:       string;
}

export function EmptyState({ icon, title, message, actionLabel, onAction, color = Colors.primary[500] }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconBg, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={36} color={color} />
      </View>
      <Text variant="h4" weight="bold" center style={styles.title}>{title}</Text>
      <Text variant="body" secondary center style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} size="md" style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconBg:    { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:     { marginBottom: 8 },
  message:   { marginBottom: 24, maxWidth: 260 },
  action:    {},
});
