import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/store/settings.store';

export function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (useSettingsStore.getState().hapticsEnabled) {
    Haptics.impactAsync(style).catch(() => {});
  }
}

export function notify(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) {
  if (useSettingsStore.getState().hapticsEnabled) {
    Haptics.notificationAsync(type).catch(() => {});
  }
}
