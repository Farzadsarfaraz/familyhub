import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/hooks/useTheme';
import { Colors, BorderRadius, Typography } from '@/constants/theme';

interface Props extends TextInputProps {
  label?:       string;
  error?:       string;
  hint?:        string;
  leftIcon?:    keyof typeof Ionicons.glyphMap;
  rightIcon?:   keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  variant?:     'default' | 'filled' | 'underline';
  isPassword?:  boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant  = 'filled',
  isPassword,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const { tokens, isDark } = useTheme();
  const [focused, setFocused]   = useState(false);
  const [secure,  setSecure]    = useState(isPassword ?? false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? Colors.error[500] : tokens.border, error ? Colors.error[500] : Colors.primary[500]],
  });

  const bgColor = isDark ? Colors.neutral[900] : Colors.neutral[50];

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text variant="label" weight="medium" style={[styles.label, { color: tokens.textSecondary }]}>
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          styles.container,
          { backgroundColor: bgColor, borderColor },
          variant === 'filled' && styles.filled,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={focused ? Colors.primary[500] : tokens.textTertiary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[
            styles.input,
            { color: tokens.text, fontSize: Typography.fontSize.base },
            style,
          ]}
          placeholderTextColor={tokens.textTertiary}
          secureTextEntry={secure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={Colors.primary[500]}
          {...rest}
        />

        {(isPassword || rightIcon) && (
          <TouchableOpacity
            onPress={isPassword ? () => setSecure(!secure) : onRightIconPress}
            style={styles.rightIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isPassword
                ? (secure ? 'eye-off-outline' : 'eye-outline')
                : (rightIcon ?? 'chevron-forward')}
              size={20}
              color={tokens.textTertiary}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {(error || hint) && (
        <Text
          variant="caption"
          style={[styles.helper, { color: error ? Colors.error[500] : tokens.textTertiary }]}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:   { marginBottom: 4 },
  label:     { marginBottom: 6 },
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    borderWidth:    1.5,
    borderRadius:   BorderRadius.lg,
    paddingHorizontal: 14,
    minHeight:      50,
  },
  filled:    {},
  input:     { flex: 1, paddingVertical: 12 },
  leftIcon:  { marginRight: 10 },
  rightIcon: { padding: 4, marginLeft: 8 },
  helper:    { marginTop: 4, marginLeft: 2 },
});
