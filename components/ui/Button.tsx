import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  View,
  StyleSheet,
  TouchableOpacityProps,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Text } from './Text';
import { useTheme } from '@/hooks/useTheme';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size    = 'sm' | 'md' | 'lg' | 'xl';

interface Props extends TouchableOpacityProps {
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  label:      string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const sizeMap = {
  sm: { height: 36, px: Spacing[3],  fontSize: 13 as const },
  md: { height: 44, px: Spacing[4],  fontSize: 15 as const },
  lg: { height: 52, px: Spacing[5],  fontSize: 16 as const },
  xl: { height: 60, px: Spacing[6],  fontSize: 17 as const },
};

export function Button({
  variant   = 'primary',
  size      = 'lg',
  loading   = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  label,
  style,
  disabled,
  onPress,
  ...rest
}: Props) {
  const { tokens, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn  = () => { scale.value = withSpring(0.97, { stiffness: 400 }); };
  const handlePressOut = () => { scale.value = withSpring(1.0,  { stiffness: 400 }); };

  const { height, px, fontSize } = sizeMap[size];

  const getStyles = () => {
    const base = {
      height,
      paddingHorizontal: px,
      borderRadius:      BorderRadius.xl,
      opacity:           disabled || loading ? 0.55 : 1,
    };
    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: Colors.primary[500],
          shadowColor:     Colors.primary[500],
          shadowOffset:    { width: 0, height: 4 },
          shadowOpacity:   0.35,
          shadowRadius:    12,
          elevation:       6,
        };
      case 'secondary':
        return { ...base, backgroundColor: isDark ? Colors.neutral[800] : Colors.neutral[100] };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth:     1.5,
          borderColor:     Colors.primary[500],
        };
      case 'ghost':
        return { ...base, backgroundColor: 'transparent' };
      case 'danger':
        return {
          ...base,
          backgroundColor: Colors.error[500],
          shadowColor:     Colors.error[500],
          shadowOffset:    { width: 0, height: 4 },
          shadowOpacity:   0.3,
          shadowRadius:    10,
          elevation:       5,
        };
      case 'success':
        return {
          ...base,
          backgroundColor: Colors.success[500],
          shadowColor:     Colors.success[500],
          shadowOffset:    { width: 0, height: 4 },
          shadowOpacity:   0.3,
          shadowRadius:    10,
          elevation:       5,
        };
    }
  };

  const getLabelColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'success':
        return '#FFFFFF';
      case 'outline':
        return Colors.primary[500];
      case 'ghost':
        return Colors.primary[500];
      case 'secondary':
        return tokens.text;
    }
  };

  return (
    <AnimatedTouchable
      style={[styles.base, getStyles(), fullWidth && styles.fullWidth, animStyle, style]}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={getLabelColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text
            variant="label"
            weight="semibold"
            color={getLabelColor()}
            style={{ fontSize }}
          >
            {label}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base:      { alignItems: 'center', justifyContent: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  content:   { flexDirection: 'row', alignItems: 'center' },
  leftIcon:  { marginRight: 8 },
  rightIcon: { marginLeft: 8 },
});
