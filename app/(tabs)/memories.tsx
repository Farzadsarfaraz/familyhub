import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Chip, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');
const COL_SIZE  = (width - 48 - 8) / 3;

const ALBUMS = [
  { id: '1', name: 'Italy 2024 ✈️', count: 47, cover: 'https://picsum.photos/seed/italy/400/300' },
  { id: '2', name: "Emma's Birthday", count: 23, cover: 'https://picsum.photos/seed/birthday/400/300' },
  { id: '3', name: 'Christmas',        count: 61, cover: 'https://picsum.photos/seed/christmas/400/300' },
  { id: '4', name: 'Summer BBQ',       count: 18, cover: 'https://picsum.photos/seed/bbq/400/300' },
];

const PHOTOS = Array.from({ length: 18 }, (_, i) => ({
  id: String(i + 1),
  uri: `https://picsum.photos/seed/${i + 10}/400/400`,
  likes: Math.floor(Math.random() * 20),
}));

type Tab = 'timeline' | 'albums' | 'people';

export default function MemoriesScreen() {
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [tab,   setTab]   = useState<Tab>('timeline');

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#2E001A', '#0A0A1A'] : ['#FDF2F8', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Memories</Text>
            <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : tokens.textSecondary }}>
              149 photos • 23 videos
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
              <Ionicons name="search-outline" size={20} color={isDark ? '#fff' : tokens.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: ModuleColors.memories.primary, marginLeft: 8 }]}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['timeline', 'albums', 'people'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabItem, tab === t && { borderBottomColor: ModuleColors.memories.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t)}
            >
              <Text
                variant="body"
                weight={tab === t ? 'semibold' : 'regular'}
                color={tab === t ? ModuleColors.memories.primary : tokens.textSecondary}
                style={{ textTransform: 'capitalize' }}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {tab === 'timeline' && (
          <View style={styles.grid}>
            {PHOTOS.map((photo, index) => (
              <TouchableOpacity key={photo.id} activeOpacity={0.9} style={{ position: 'relative' }}>
                <Image
                  source={{ uri: photo.uri }}
                  style={[
                    styles.gridPhoto,
                    index % 7 === 0 && styles.gridPhotoLarge,
                  ]}
                  contentFit="cover"
                  transition={300}
                />
                {photo.likes > 10 && (
                  <View style={styles.photoLikes}>
                    <Ionicons name="heart" size={10} color="#fff" />
                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600', marginLeft: 2 }}>{photo.likes}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'albums' && (
          <View style={styles.albumsGrid}>
            {/* Highlighted album */}
            <View style={styles.heroAlbum}>
              <Image source={{ uri: ALBUMS[0].cover }} style={styles.heroAlbumImage} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.heroAlbumOverlay}
              >
                <Badge label="Latest" variant="error" />
                <Text variant="h3" weight="bold" color="#fff" style={{ marginTop: 8 }}>{ALBUMS[0].name}</Text>
                <Text variant="bodySmall" color="rgba(255,255,255,0.7)">{ALBUMS[0].count} memories</Text>
              </LinearGradient>
            </View>

            {/* Other albums */}
            <View style={styles.albumsRow}>
              {ALBUMS.slice(1).map((album) => (
                <TouchableOpacity key={album.id} style={styles.albumCard} activeOpacity={0.85}>
                  <Image source={{ uri: album.cover }} style={styles.albumThumb} contentFit="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.albumInfo}>
                    <Text variant="bodySmall" weight="bold" color="#fff" numberOfLines={1}>{album.name}</Text>
                    <Text variant="caption" color="rgba(255,255,255,0.7)">{album.count}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {tab === 'people' && (
          <View style={styles.peoplePad}>
            <Text variant="h4" weight="bold" style={{ marginBottom: 20 }}>Tagged People</Text>
            {['Dad', 'Mom', 'Emma', 'Grandma', 'Grandpa'].map((name, i) => (
              <TouchableOpacity key={name} style={[styles.personRow, { borderBottomColor: tokens.border }]}>
                <Image
                  source={{ uri: `https://picsum.photos/seed/${name}/200/200` }}
                  style={styles.personAvatar}
                  contentFit="cover"
                />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text variant="body" weight="semibold">{name}</Text>
                  <Text variant="caption" secondary>{(i + 1) * 12} photos</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={tokens.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1 },
  header:           { paddingHorizontal: Spacing[4], paddingBottom: 0 },
  headerTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerActions:    { flexDirection: 'row' },
  iconBtn:          { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tabs:             { flexDirection: 'row' },
  tabItem:          { flex: 1, alignItems: 'center', paddingVertical: 12 },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 4 },
  gridPhoto:        { width: COL_SIZE, height: COL_SIZE, borderRadius: 8 },
  gridPhotoLarge:   { width: COL_SIZE * 2 + 4, height: COL_SIZE * 2 + 4 },
  photoLikes:       { position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 3 },
  albumsGrid:       { padding: 16, gap: 12 },
  heroAlbum:        { borderRadius: 20, overflow: 'hidden', height: 220, position: 'relative' },
  heroAlbumImage:   { ...StyleSheet.absoluteFillObject },
  heroAlbumOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  albumsRow:        { flexDirection: 'row', gap: 10 },
  albumCard:        { flex: 1, height: 130, borderRadius: 16, overflow: 'hidden' },
  albumThumb:       { ...StyleSheet.absoluteFillObject },
  albumInfo:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  peoplePad:        { padding: 20 },
  personRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  personAvatar:     { width: 52, height: 52, borderRadius: 26 },
});
