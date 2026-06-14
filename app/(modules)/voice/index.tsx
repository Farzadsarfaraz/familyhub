import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.voice;

const RECORDINGS = [
  {
    id: '1', title: "Emma's first recital story",
    duration: '3:42', date: 'Today, 7:15 PM', author: 'Mom',
    transcription: 'So Emma walks out on stage and she\'s so nervous, her hands were shaking, but then she started playing and it was just... magic. The whole room went quiet.',
    category: 'memory', emoji: '🎹',
  },
  {
    id: '2', title: 'Grandpa\'s war story',
    duration: '12:08', date: 'Yesterday', author: 'Grandpa Joe',
    transcription: 'It was 1967 and we were stationed outside of Da Nang. The monsoon had been going for three weeks straight. Then one morning, the sun came out...',
    category: 'story', emoji: '📖',
  },
  {
    id: '3', title: 'Family meeting - Italy trip',
    duration: '8:55', date: 'Jun 11', author: 'Dad',
    transcription: 'Okay, so I\'ve been looking at flights and if we leave on the 15th we can get the early-bird rate. Rome for 4 days then Florence for 3 days.',
    category: 'planning', emoji: '✈️',
  },
  {
    id: '4', title: 'Max learning sit command',
    duration: '1:23', date: 'Jun 9', author: 'Emma',
    transcription: 'Max! Sit! Good boy! Look he did it! He finally did it! Dad come look! Max sat on command for the first time ever!',
    category: 'memory', emoji: '🐕',
  },
  {
    id: '5', title: 'Grandma\'s apple pie recipe',
    duration: '5:17', date: 'Jun 7', author: 'Grandma Helen',
    transcription: 'First you need Granny Smith apples, about six of them. Peel them, then slice thin. The secret is a pinch of cardamom — my mother taught me that.',
    category: 'recipe', emoji: '🥧',
  },
];

const CATEGORIES = ['all', 'memory', 'story', 'planning', 'recipe'];

const CATEGORY_COLOR: Record<string, string> = {
  memory:   Colors.primary[500],
  story:    '#8B5CF6',
  planning: Colors.warning[500],
  recipe:   Colors.success[500],
};

export default function VoiceScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [category, setCategory] = useState('all');
  const [playing,  setPlaying]  = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = RECORDINGS.filter((r) => category === 'all' || r.category === category);
  const totalDuration = '31:25';

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? [C.dark, '#0A0A1A'] : [C.light, '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>🎙️ Voice Archive</Text>
        <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
          {RECORDINGS.length} recordings · {totalDuration} total
        </Text>

        {/* Record button */}
        <TouchableOpacity style={styles.recordBtn} activeOpacity={0.85}>
          <LinearGradient colors={[Colors.error[500], Colors.error[400]]} style={styles.recordGradient}>
            <View style={styles.recordRing}>
              <Ionicons name="mic" size={28} color="#fff" />
            </View>
            <Text variant="body" weight="bold" color="#fff" style={{ marginLeft: 14 }}>Tap to Record</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52, borderBottomWidth: 1, borderBottomColor: tokens.border }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(cat)}
            style={[styles.catChip, {
              backgroundColor: category === cat ? C.primary : tokens.card,
              borderColor: category === cat ? C.primary : tokens.border,
            }]}
          >
            <Text variant="caption" weight="semibold" color={category === cat ? '#fff' : tokens.text} style={{ textTransform: 'capitalize' }}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 14, paddingBottom: 100 }}>
        {filtered.map((rec) => {
          const isPlaying  = playing === rec.id;
          const isExpanded = expanded === rec.id;
          const catColor   = CATEGORY_COLOR[rec.category] ?? C.primary;

          return (
            <Card key={rec.id} shadow="sm" style={styles.recCard}>
              {/* Top row */}
              <View style={styles.recTop}>
                <View style={[styles.recEmoji, { backgroundColor: catColor + '18' }]}>
                  <Text style={{ fontSize: 22 }}>{rec.emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="bold" numberOfLines={1}>{rec.title}</Text>
                  <Text variant="caption" secondary>{rec.date} · by {rec.author}</Text>
                </View>
                <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
                  <Text variant="caption" weight="bold" color={catColor} style={{ textTransform: 'capitalize' }}>{rec.category}</Text>
                </View>
              </View>

              {/* Waveform placeholder */}
              <View style={styles.waveRow}>
                <TouchableOpacity
                  onPress={() => setPlaying(isPlaying ? null : rec.id)}
                  style={[styles.playBtn, { backgroundColor: isPlaying ? Colors.error[500] : C.primary }]}
                >
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color="#fff" />
                </TouchableOpacity>
                <View style={styles.waveform}>
                  {Array.from({ length: 32 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          height: 6 + Math.sin(i * 0.8) * 10 + Math.random() * 8,
                          backgroundColor: isPlaying && i < 14 ? C.primary : tokens.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text variant="caption" secondary style={{ marginLeft: 8, minWidth: 36 }}>{rec.duration}</Text>
              </View>

              {/* Transcription */}
              <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : rec.id)} style={styles.transcriptBtn}>
                <Ionicons name="document-text-outline" size={14} color={C.primary} />
                <Text variant="caption" color={C.primary} weight="semibold" style={{ marginLeft: 4 }}>
                  {isExpanded ? 'Hide' : 'Show'} transcript
                </Text>
              </TouchableOpacity>
              {isExpanded && (
                <View style={[styles.transcript, { backgroundColor: tokens.surface }]}>
                  <Text variant="bodySmall" secondary style={{ lineHeight: 20 }}>{rec.transcription}</Text>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  recordBtn:     { marginTop: 20, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  recordGradient:{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: BorderRadius.xl },
  recordRing:    { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  catChip:       { paddingHorizontal: 14, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  recCard:       { padding: 14, gap: 12 },
  recTop:        { flexDirection: 'row', alignItems: 'center' },
  recEmoji:      { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catBadge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, marginLeft: 8 },
  waveRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playBtn:       { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  waveform:      { flex: 1, flexDirection: 'row', alignItems: 'center', height: 32, gap: 2 },
  waveBar:       { flex: 1, borderRadius: 2 },
  transcriptBtn: { flexDirection: 'row', alignItems: 'center' },
  transcript:    { borderRadius: BorderRadius.lg, padding: 12, marginTop: 4 },
});
