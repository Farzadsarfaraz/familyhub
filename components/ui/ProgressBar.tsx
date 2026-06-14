import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface Props {
  progress:    number;   // 0-100
  color?:      string;
  trackColor?: string;
  height?:     number;
  style?:      ViewStyle;
  animated?:   boolean;
}

export function ProgressBar({
  progress,
  color      = Colors.primary[500],
  trackColor,
  height     = 6,
  style,
  animated   = true,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clamped = Math.min(100, Math.max(0, progress));
    if (animated) {
      Animated.spring(anim, {
        toValue:         clamped,
        useNativeDriver: false,
        stiffness:       120,
        damping:         14,
      }).start();
    } else {
      anim.setValue(clamped);
    }
  }, [progress, anim, animated]);

  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height, backgroundColor: trackColor ?? '#E5E7EB' },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { width, height, borderRadius: height, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
  fill:  {},
});
