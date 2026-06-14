import React from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Text, Card, Badge } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import api from '@/lib/api';
import { toast } from '@/store/toast.store';

interface Notification {
  id:        string;
  type:      'EVENT' | 'TASK' | 'CHAT' | 'BIRTHDAY' | 'REMINDER';
  title:     string;
  body:      string;
  read:      boolean;
  createdAt: string;
}

const TYPE_META: Record<Notification['type'], { icon: string; color: string }> = {
  EVENT:    { icon: '📅', color: Colors.primary[500]  },
  TASK:     { icon: '✅', color: '#10B981'             },
  CHAT:     { icon: '💬', color: '#6366F1'             },
  BIRTHDAY: { icon: '🎂', color: '#F59E0B'             },
  REMINDER: { icon: '🔔', color: '#EF4444'             },
};

function groupByDay(items: Notification[]) {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today',     items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier',   items: [] },
  ];

  for (const n of items) {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
    if      (d.getTime() === today.getTime())     groups[0].items.push(n);
    else if (d.getTime() === yesterday.getTime()) groups[1].items.push(n);
    else                                          groups[2].items.push(n);
  }

  return groups.filter(g => g.items.length > 0);
}

export default function NotificationsScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { tokens } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn:  async () => { const r = await api.get('/notifications'); return r.data.data; },
    enabled:  !!user?.id,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('All notifications marked as read'); },
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const groups      = groupByDay(notifications);

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={tokens.text} />
        </TouchableOpacity>
        <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Notifications</Text>
        <TouchableOpacity
          onPress={() => markAll.mutate()}
          disabled={unreadCount === 0 || markAll.isPending}
          style={[styles.markAllBtn, (unreadCount === 0 || markAll.isPending) && { opacity: 0.35 }]}
        >
          <Text variant="bodySmall" weight="semibold" style={{ color: Colors.primary[500] }}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {unreadCount > 0 && (
        <View style={[styles.unreadBanner, { backgroundColor: Colors.primary[50] }]}>
          <Text variant="bodySmall" weight="semibold" style={{ color: Colors.primary[600] }}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary[500]} /></View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 52 }}>🔔</Text>
          <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>All caught up!</Text>
          <Text variant="body" secondary center style={{ marginTop: 8 }}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60, gap: Spacing[5] }} showsVerticalScrollIndicator={false}>
          {groups.map(group => (
            <View key={group.label}>
              <Text variant="label" secondary weight="semibold" style={styles.groupLabel}>{group.label.toUpperCase()}</Text>
              <Card shadow="sm" padding={0}>
                {group.items.map((n, i) => {
                  const meta = TYPE_META[n.type] ?? { icon: '🔔', color: Colors.primary[500] };
                  return (
                    <TouchableOpacity
                      key={n.id}
                      style={[
                        styles.notifRow,
                        { borderBottomColor: tokens.border },
                        i < group.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
                        !n.read && { backgroundColor: Colors.primary[50] + (tokens === tokens ? '22' : '11') },
                      ]}
                      onPress={() => { if (!n.read) markRead.mutate(n.id); }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.notifIcon, { backgroundColor: `${meta.color}18` }]}>
                        <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text variant="body" weight={n.read ? 'regular' : 'bold'} style={{ flex: 1, color: tokens.text }} numberOfLines={1}>
                            {n.title}
                          </Text>
                          {!n.read && <View style={[styles.unreadDot, { backgroundColor: Colors.primary[500] }]} />}
                        </View>
                        <Text variant="bodySmall" secondary numberOfLines={2} style={{ marginTop: 2 }}>{n.body}</Text>
                        <Text variant="caption" secondary style={{ marginTop: 4 }}>
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  markAllBtn:   { paddingHorizontal: 8, paddingVertical: 4 },
  unreadBanner: { paddingHorizontal: 16, paddingVertical: 8 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  groupLabel:   { marginBottom: 10, letterSpacing: 0.8 },
  notifRow:     { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  notifIcon:    { width: 44, height: 44, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  unreadDot:    { width: 8, height: 8, borderRadius: 4 },
});
