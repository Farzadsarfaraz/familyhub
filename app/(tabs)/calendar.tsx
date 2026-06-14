import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, Spacing, BorderRadius } from '@/constants/theme';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from 'date-fns';

const { width } = Dimensions.get('window');
const CELL = (width - 48) / 7;

const MOCK_EVENTS = [
  { id: '1', date: new Date(), title: 'Family dinner',      color: ModuleColors.calendar.primary, time: '7:00 PM' },
  { id: '2', date: new Date(), title: "Emma's Piano",       color: ModuleColors.health.primary,   time: '4:30 PM' },
  { id: '3', date: new Date(Date.now() + 86400000 * 2), title: 'Dentist appt.', color: ModuleColors.health.primary, time: '10:00 AM' },
  { id: '4', date: new Date(Date.now() + 86400000 * 5), title: "Emma's Birthday 🎂",  color: Colors.accent[500],           time: 'All day'  },
  { id: '5', date: new Date(Date.now() + 86400000 * 7), title: 'Italy Trip ✈️',  color: ModuleColors.travel.primary,   time: 'All day'  },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [current,  setCurrent]  = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [view,     setView]     = useState<'month' | 'week'>('month');

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay   = getDay(monthStart);

  const eventsForDay = (d: Date) => MOCK_EVENTS.filter((e) => isSameDay(e.date, d));
  const selectedEvents = eventsForDay(selected);

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#0A0820', '#0A0A1A'] : ['#EEF4FF', '#F5F7FF']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => setCurrent(subMonths(current, 1))}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
          <Text variant="h3" weight="bold" style={{ color: isDark ? '#fff' : tokens.text }}>
            {format(current, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={() => setCurrent(addMonths(current, 1))}>
            <Ionicons name="chevron-forward" size={24} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
        </View>

        {/* Day Labels */}
        <View style={styles.dayRow}>
          {DAYS.map((d) => (
            <View key={d} style={[styles.cell, { width: CELL }]}>
              <Text variant="caption" weight="semibold" secondary center>{d}</Text>
            </View>
          ))}
        </View>

        {/* Date Grid */}
        <View style={styles.grid}>
          {Array.from({ length: startDay }).map((_, i) => (
            <View key={`empty-${i}`} style={[styles.cell, { width: CELL, height: CELL }]} />
          ))}
          {days.map((day) => {
            const events  = eventsForDay(day);
            const isSel   = isSameDay(day, selected);
            const today   = isToday(day);
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[styles.cell, { width: CELL, height: CELL }]}
                onPress={() => setSelected(day)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.dateBubble,
                    isSel  && { backgroundColor: Colors.primary[500] },
                    today && !isSel && { borderWidth: 2, borderColor: Colors.primary[500] },
                  ]}
                >
                  <Text
                    variant="bodySmall"
                    weight={today || isSel ? 'bold' : 'regular'}
                    color={isSel ? '#fff' : today ? Colors.primary[500] : undefined}
                    center
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
                {events.length > 0 && (
                  <View style={styles.dotRow}>
                    {events.slice(0, 3).map((e) => (
                      <View key={e.id} style={[styles.eventDot, { backgroundColor: e.color }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Selected Day Events */}
      <ScrollView style={styles.events} contentContainerStyle={{ padding: Spacing[4], paddingBottom: 100 }}>
        <View style={styles.dayHeader}>
          <Text variant="h4" weight="bold">
            {isToday(selected) ? "Today" : format(selected, 'EEEE, MMM d')}
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: Colors.primary[500] }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text variant="bodySmall" weight="semibold" color="#fff" style={{ marginLeft: 4 }}>Add Event</Text>
          </TouchableOpacity>
        </View>

        {selectedEvents.length === 0 ? (
          <View style={[styles.emptyDay, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
            <Text style={{ fontSize: 32 }}>☀️</Text>
            <Text variant="body" secondary center style={{ marginTop: 8 }}>No events — free day!</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {selectedEvents.map((ev) => (
              <Card key={ev.id} style={styles.eventCard} shadow="sm" onPress={() => {}}>
                <View style={[styles.eventAccent, { backgroundColor: ev.color }]} />
                <View style={{ flex: 1, paddingLeft: 14 }}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>{ev.title}</Text>
                  <Text variant="caption" secondary style={{ marginTop: 2 }}>{ev.time}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
              </Card>
            ))}
          </View>
        )}

        {/* Upcoming */}
        <Text variant="h4" weight="bold" style={{ marginTop: 28, marginBottom: 12 }}>Upcoming</Text>
        <View style={{ gap: 10 }}>
          {MOCK_EVENTS.filter((e) => e.date > new Date()).slice(0, 4).map((ev) => (
            <Card key={ev.id} style={styles.upcomingCard} shadow="sm" onPress={() => {}}>
              <View style={[styles.upcomingDate, { backgroundColor: `${ev.color}18` }]}>
                <Text variant="caption" weight="bold" color={ev.color}>{format(ev.date, 'MMM')}</Text>
                <Text variant="h3" weight="black" color={ev.color}>{format(ev.date, 'd')}</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 14 }}>
                <Text variant="body" weight="semibold" numberOfLines={1}>{ev.title}</Text>
                <Text variant="caption" secondary>{ev.time}</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { paddingHorizontal: 20, paddingBottom: 12 },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  dayRow:      { flexDirection: 'row', marginBottom: 4 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap' },
  cell:        { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  dateBubble:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dotRow:      { flexDirection: 'row', gap: 3, marginTop: 2 },
  eventDot:    { width: 5, height: 5, borderRadius: 2.5 },
  events:      { flex: 1 },
  dayHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full },
  emptyDay:    { borderRadius: BorderRadius.xl, padding: 32, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  eventCard:   { flexDirection: 'row', alignItems: 'center', padding: 14 },
  eventAccent: { width: 4, height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  upcomingCard:  { flexDirection: 'row', alignItems: 'center', padding: 14 },
  upcomingDate:  { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
