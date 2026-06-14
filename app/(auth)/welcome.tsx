import React, { useRef, useState } from 'react';
import {
  View,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button } from '@/components/ui';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🏡',
    title: 'Your Family,\nOne Place',
    subtitle: 'Everything your family needs — calendar, tasks, chat, memories — all beautifully organized.',
    gradient: ['#1A0A2E', '#0A0A1A'] as [string, string],
    accent: Colors.primary[500],
  },
  {
    id: '2',
    emoji: '💬',
    title: 'Stay\nConnected',
    subtitle: 'Real-time family chat with reactions, voice messages, and shared media. Always in sync.',
    gradient: ['#001A2E', '#000A1A'] as [string, string],
    accent: '#0EA5E9',
  },
  {
    id: '3',
    emoji: '📸',
    title: 'Capture\nEvery Moment',
    subtitle: 'Build a beautiful family memory vault — photos, videos, albums, and AI-powered stories.',
    gradient: ['#2E001A', '#1A000A'] as [string, string],
    accent: '#EC4899',
  },
  {
    id: '4',
    emoji: '🤖',
    title: 'AI-Powered\nFamily Hub',
    subtitle: 'Your family AI assistant suggests meals, manages tasks, and tells your unique family story.',
    gradient: ['#0A1A00', '#050F00'] as [string, string],
    accent: '#10B981',
  },
];

export default function WelcomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(0);

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1, animated: true });
    } else {
      router.push('/(auth)/login' as any);
    }
  };

  const onScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrent(idx);
  };

  const slide = SLIDES[current];

  return (
    <LinearGradient colors={slide.gradient} style={styles.container}>
      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.emojiContainer, { backgroundColor: `${item.accent}22` }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text variant="display" weight="black" center style={[styles.title, { color: '#FFFFFF' }]}>
              {item.title}
            </Text>
            <Text variant="bodyLarge" center style={[styles.subtitle, { color: 'rgba(255,255,255,0.65)' }]}>
              {item.subtitle}
            </Text>
          </View>
        )}
      />

      {/* Bottom CTA */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing[6] }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                {
                  width:           i === current ? 24 : 8,
                  backgroundColor: i === current ? slide.accent : 'rgba(255,255,255,0.3)',
                },
              ]}
            />
          ))}
        </View>

        <Button
          label={current === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          size="xl"
          fullWidth
          style={[styles.nextBtn, { backgroundColor: slide.accent }]}
        />

        <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)} style={styles.skipBtn}>
          <Text variant="body" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {current < SLIDES.length - 1 ? 'Skip' : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  slide:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 100 },
  emojiContainer: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  emoji:          { fontSize: 56 },
  title:          { marginBottom: 20, lineHeight: 52 },
  subtitle:       { lineHeight: 26, maxWidth: 320 },
  bottom:         { paddingHorizontal: 24 },
  dots:           { flexDirection: 'row', justifyContent: 'center', marginBottom: 28, gap: 6 },
  dot:            { height: 8, borderRadius: 4 },
  nextBtn:        { borderRadius: BorderRadius['2xl'] },
  skipBtn:        { alignItems: 'center', marginTop: 20 },
});
