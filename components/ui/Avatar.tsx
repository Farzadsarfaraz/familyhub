import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { Colors, BorderRadius } from '@/constants/theme';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface Props {
  uri?:    string;
  name?:   string;
  size?:   Size;
  online?: boolean;
  color?:  string;
}

const sizeMap: Record<Size, number> = {
  xs:  24, sm:  32, md: 40, lg: 52, xl: 64, '2xl': 80,
};

const fontSizes: Record<Size, number> = {
  xs: 9, sm: 12, md: 15, lg: 20, xl: 24, '2xl': 30,
};

const avatarColors = [
  Colors.primary[500], '#6366F1', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#0EA5E9', '#8B5CF6',
];

function getColor(name?: string): string {
  if (!name) return Colors.primary[500];
  const idx = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[idx];
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function Avatar({ uri, name, size = 'md', online, color }: Props) {
  const dim    = sizeMap[size];
  const fs     = fontSizes[size];
  const bg     = color ?? getColor(name);
  const radius = dim / 2;

  return (
    <View style={{ width: dim, height: dim }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: dim, height: dim, borderRadius: radius }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.placeholder, { width: dim, height: dim, borderRadius: radius, backgroundColor: bg }]}>
          <Text style={[styles.initials, { fontSize: fs }]}>{getInitials(name)}</Text>
        </View>
      )}
      {online && (
        <View
          style={[
            styles.badge,
            {
              width:  dim * 0.27,
              height: dim * 0.27,
              borderRadius: dim * 0.135,
              borderWidth: dim * 0.06,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initials:    { color: '#fff', fontWeight: '700' },
  badge: {
    position:    'absolute',
    bottom:      0,
    right:       0,
    backgroundColor: '#22C55E',
    borderColor: '#fff',
  },
});
