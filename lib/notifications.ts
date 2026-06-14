import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = (id: string) => `event_notif_${id}`;

// ── Android channel (call once at app start) ──────────────────────────────
export async function setupNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('familyhub-reminders', {
    name: 'Event Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3B6EFF',
    sound: 'default',
  });
}

// ── Permission ────────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: asked } = await Notifications.requestPermissionsAsync();
  return asked === 'granted';
}

// ── Helpers ───────────────────────────────────────────────────────────────
function reminderBody(title: string, min: number): string {
  if (min === 0) return `"${title}" is starting now`;
  if (min < 60)    return `"${title}" starts in ${min} minute${min > 1 ? 's' : ''}`;
  if (min < 1440)  { const h = min / 60; return `"${title}" starts in ${h} hour${h > 1 ? 's' : ''}`; }
  if (min < 10080) { const d = min / 1440; return `"${title}" starts in ${d} day${d > 1 ? 's' : ''}`; }
  const w = min / 10080;
  return `"${title}" starts in ${w} week${w > 1 ? 's' : ''}`;
}

// ── Schedule ──────────────────────────────────────────────────────────────
export async function scheduleEventNotifications(
  eventId: string,
  title: string,
  startDate: Date,
  reminders: number[], // minutes before event
): Promise<void> {
  await cancelEventNotifications(eventId);

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const now = Date.now();
  const ids: string[] = [];

  for (const minutesBefore of reminders) {
    const fireAt = new Date(startDate.getTime() - minutesBefore * 60_000);
    if (fireAt.getTime() <= now) continue; // skip already-past triggers

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🗓️ FamilyHub',
          body: reminderBody(title, minutesBefore),
          data: { eventId },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          channelId: 'familyhub-reminders',
        },
      });
      ids.push(id);
    } catch {
      // skip if individual trigger fails (e.g. past date edge case)
    }
  }

  if (ids.length) {
    await AsyncStorage.setItem(KEY(eventId), JSON.stringify(ids));
  }
}

// ── Cancel ────────────────────────────────────────────────────────────────
export async function cancelEventNotifications(eventId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY(eventId));
    if (!raw) return;
    const ids: string[] = JSON.parse(raw);
    await Promise.allSettled(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    await AsyncStorage.removeItem(KEY(eventId));
  } catch {
    // ignore storage errors
  }
}
