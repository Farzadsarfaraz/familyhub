import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';

interface Props {
  label?: string;
  my?:    number;
}

export function Divider({ label, my = 16 }: Props) {
  const { tokens } = useTheme();

  if (label) {
    return (
      <View style={[styles.row, { marginVertical: my }]}>
        <View style={[styles.line, { backgroundColor: tokens.border }]} />
        <Text variant="caption" secondary style={styles.label}>{label}</Text>
        <View style={[styles.line, { backgroundColor: tokens.border }]} />
      </View>
    );
  }

  return <View style={[styles.solid, { marginVertical: my, backgroundColor: tokens.border }]} />;
}

const styles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center' },
  line:   { flex: 1, height: 1 },
  label:  { marginHorizontal: 12 },
  solid:  { height: 1 },
});
