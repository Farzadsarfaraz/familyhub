import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, ToastType } from '@/store/toast.store';
import { Text } from './Text';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

const CONFIG: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#0F2A1A', border: Colors.success[500], icon: '✓' },
  error:   { bg: '#2A0F0F', border: Colors.error[500],   icon: '✕' },
  warning: { bg: '#2A1E0F', border: Colors.warning[500], icon: '!' },
  info:    { bg: '#0F1A2A', border: Colors.primary[500], icon: 'i' },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} type={t.type} message={t.message} title={t.title} />
      ))}
    </View>
  );
}

function ToastItem({ id, type, message, title }: { id: string; type: ToastType; message: string; title?: string }) {
  const hide       = useToastStore((s) => s.hide);
  const cfg        = CONFIG[type];
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => dismiss(), 4000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => hide(id));
  };

  return (
    <Animated.View style={[styles.toast, { backgroundColor: cfg.bg, borderLeftColor: cfg.border, transform: [{ translateY }], opacity }]}>
      <View style={[styles.iconWrap, { backgroundColor: cfg.border + '33' }]}>
        <Text style={[styles.icon, { color: cfg.border }]}>{cfg.icon}</Text>
      </View>
      <View style={styles.body}>
        {title && <Text variant="label" weight="bold" style={{ color: cfg.border }}>{title}</Text>}
        <Text variant="bodySmall" style={styles.msg}>{message}</Text>
      </View>
      <Pressable onPress={dismiss} hitSlop={12} style={styles.close}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 16, right: 16, zIndex: 9999, gap: 8 },
  toast: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: BorderRadius.xl, borderLeftWidth: 4,
    padding: Spacing[3], gap: 12,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  iconWrap:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  icon:      { fontSize: 14, fontWeight: '700' },
  body:      { flex: 1, gap: 2 },
  msg:       { color: '#D1D5DB', lineHeight: 18 },
  close:     { padding: 4 },
  closeText: { color: '#6B7280', fontSize: 20, lineHeight: 20 },
});
