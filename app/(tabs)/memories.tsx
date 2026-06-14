import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { ModuleColors, Spacing } from '@/constants/theme';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';
import { useAuthStore } from '@/store/auth.store';

const { width } = Dimensions.get('window');
const COL_SIZE  = (width - 48 - 8) / 3;

type Tab = 'timeline' | 'albums' | 'people';

interface Memory {
  id: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  title?: string;
  mediaType: 'PHOTO' | 'VIDEO';
  likes: { userId: string }[];
  uploader: { id: string; name: string; avatar?: string };
  createdAt: string;
}

interface Album {
  id: string;
  name: string;
  coverUrl?: string;
  memories: { mediaUrl: string; thumbnailUrl?: string }[];
}

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
}

export default function MemoriesScreen() {
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [tab, setTab]          = useState<Tab>('timeline');
  const [uploading, setUploading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const user = useAuthStore(s => s.user);
  const qc   = useQueryClient();

  const hasFamilyId = !!user?.familyId;

  const { data: memoriesData, isLoading: loadingMemories } = useQuery({
    queryKey: ['memories'],
    queryFn:  async () => {
      const { data } = await api.get('/memories');
      return data.data as Memory[];
    },
    enabled: hasFamilyId,
  });

  const { data: albumsData, isLoading: loadingAlbums } = useQuery({
    queryKey: ['albums'],
    queryFn:  async () => {
      const { data } = await api.get('/memories/albums');
      return data.data as Album[];
    },
    enabled: hasFamilyId,
  });

  const { data: familyData } = useQuery({
    queryKey: ['family-me'],
    queryFn:  async () => {
      const { data } = await api.get('/families/me');
      return data.data;
    },
    enabled: hasFamilyId,
  });

  const memories = memoriesData ?? [];
  const albums   = albumsData   ?? [];
  const members: FamilyMember[] = familyData?.members ?? [];
  const photos   = memories.filter(m => m.mediaType === 'PHOTO');

  // ── Upload helpers ────────────────────────────────────────────────────────

  async function pickAndUpload(source: 'camera' | 'library') {
    setPickerVisible(false);

    // Request permissions
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to upload memories.');
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: source === 'library',
      quality: 0.85,
      allowsEditing: source === 'camera',
    };

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    let successCount = 0;

    for (const asset of result.assets) {
      try {
        const formData = new FormData();
        const fileName = asset.fileName ?? `memory_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
        const mimeType = asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');

        formData.append('file', {
          uri:  asset.uri,
          name: fileName,
          type: mimeType,
        } as any);

        await api.post('/memories/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        });
        successCount++;
      } catch (err) {
        toast.error(parseApiError(err));
      }
    }

    setUploading(false);

    if (successCount > 0) {
      qc.invalidateQueries({ queryKey: ['memories'] });
      toast.success(successCount === 1 ? 'Memory uploaded!' : `${successCount} memories uploaded!`);
    }
  }

  function getAlbumCover(album: Album) {
    return album.coverUrl ?? album.memories[0]?.thumbnailUrl ?? album.memories[0]?.mediaUrl;
  }

  function handleLongPress(photo: Memory) {
    const likeCount  = photo.likes?.length ?? 0;
    const isMyPhoto  = photo.uploader?.id === user?.id;
    const buttons: any[] = [
      {
        text: `❤️ Like${likeCount > 0 ? ` (${likeCount})` : ''}`,
        onPress: () => api.post(`/memories/${photo.id}/like`).then(() => qc.invalidateQueries({ queryKey: ['memories'] })),
      },
    ];
    if (isMyPhoto) {
      buttons.push({
        text: '🗑️ Delete',
        style: 'destructive' as const,
        onPress: () => {
          Alert.alert('Delete Memory', 'This photo will be permanently deleted.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete', style: 'destructive',
              onPress: async () => {
                try {
                  await api.delete(`/memories/${photo.id}`);
                  qc.invalidateQueries({ queryKey: ['memories'] });
                  toast.success('Memory deleted');
                } catch (err) {
                  toast.error(parseApiError(err));
                }
              },
            },
          ]);
        },
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(
      photo.title ?? 'Memory',
      `Uploaded by ${photo.uploader?.name ?? 'unknown'}`,
      buttons,
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* Upload source picker modal */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: tokens.surface }]}>
            <View style={[styles.pickerHandle, { backgroundColor: tokens.border }]} />
            <Text variant="h4" weight="bold" style={{ marginBottom: 20, color: tokens.text }}>Add Memory</Text>

            <TouchableOpacity style={[styles.pickerOption, { backgroundColor: ModuleColors.memories.light }]} onPress={() => pickAndUpload('camera')}>
              <View style={[styles.pickerIcon, { backgroundColor: ModuleColors.memories.primary }]}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="semibold" style={{ color: tokens.text }}>Take Photo or Video</Text>
                <Text variant="caption" style={{ color: tokens.textSecondary }}>Use your camera</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tokens.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.pickerOption, { backgroundColor: tokens.surfaceAlt, marginTop: 10 }]} onPress={() => pickAndUpload('library')}>
              <View style={[styles.pickerIcon, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="images" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="semibold" style={{ color: tokens.text }}>Choose from Library</Text>
                <Text variant="caption" style={{ color: tokens.textSecondary }}>Pick multiple photos or videos</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tokens.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.cancelBtn, { borderColor: tokens.border }]} onPress={() => setPickerVisible(false)}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#2E001A', '#0A0A1A'] : ['#FDF2F8', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Memories</Text>
            <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : tokens.textSecondary }}>
              {!hasFamilyId
                ? 'Join a family to share memories'
                : loadingMemories
                ? 'Loading…'
                : `${photos.length} photos • ${memories.filter(m => m.mediaType === 'VIDEO').length} videos`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: uploading ? tokens.border : ModuleColors.memories.primary }]}
            onPress={() => {
              if (uploading) return;
              if (!hasFamilyId) {
                toast.error('Create or join a family first before uploading memories.');
                return;
              }
              setPickerVisible(true);
            }}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="add" size={22} color="#fff" />}
          </TouchableOpacity>
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

        {/* ── Timeline ── */}
        {tab === 'timeline' && (
          loadingMemories ? (
            <View style={styles.center}><ActivityIndicator color={ModuleColors.memories.primary} size="large" /></View>
          ) : photos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={64} color={tokens.textTertiary} />
              <Text variant="h4" weight="bold" style={{ marginTop: 16, color: tokens.text }}>No photos yet</Text>
              <Text variant="body" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 8 }}>
                {hasFamilyId ? 'Tap + to upload your first family memory' : 'Join or create a family to start sharing photos'}
              </Text>
              {hasFamilyId && (
                <TouchableOpacity style={[styles.uploadCta, { backgroundColor: ModuleColors.memories.primary }]} onPress={() => setPickerVisible(true)}>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text variant="body" weight="semibold" color="#fff" style={{ marginLeft: 8 }}>Upload Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.grid}>
              {photos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id}
                  activeOpacity={0.9}
                  style={{ position: 'relative' }}
                  onLongPress={() => handleLongPress(photo)}
                >
                  <Image
                    source={{ uri: photo.thumbnailUrl ?? photo.mediaUrl }}
                    style={[styles.gridPhoto, index % 7 === 0 && styles.gridPhotoLarge]}
                    contentFit="cover"
                    transition={300}
                  />
                  {(photo.likes?.length ?? 0) > 0 && (
                    <View style={styles.photoLikes}>
                      <Ionicons name="heart" size={10} color="#fff" />
                      <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600', marginLeft: 2 }}>{photo.likes.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* ── Albums ── */}
        {tab === 'albums' && (
          loadingAlbums ? (
            <View style={styles.center}><ActivityIndicator color={ModuleColors.memories.primary} size="large" /></View>
          ) : albums.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color={tokens.textTertiary} />
              <Text variant="h4" weight="bold" style={{ marginTop: 16, color: tokens.text }}>No albums yet</Text>
              <Text variant="body" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 8 }}>
                Albums will appear here once you create them
              </Text>
            </View>
          ) : (
            <View style={styles.albumsGrid}>
              {albums[0] && (
                <View style={styles.heroAlbum}>
                  {getAlbumCover(albums[0]) ? (
                    <Image source={{ uri: getAlbumCover(albums[0]) }} style={styles.heroAlbumBg} contentFit="cover" />
                  ) : (
                    <View style={[styles.heroAlbumBg, { backgroundColor: ModuleColors.memories.light }]} />
                  )}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.heroAlbumOverlay}>
                    <Badge label="Latest" variant="error" />
                    <Text variant="h3" weight="bold" color="#fff" style={{ marginTop: 8 }}>{albums[0].name}</Text>
                    <Text variant="bodySmall" color="rgba(255,255,255,0.7)">{albums[0].memories.length} memories</Text>
                  </LinearGradient>
                </View>
              )}
              {albums.length > 1 && (
                <View style={styles.albumsRow}>
                  {albums.slice(1).map(album => (
                    <TouchableOpacity key={album.id} style={styles.albumCard} activeOpacity={0.85}>
                      {getAlbumCover(album)
                        ? <Image source={{ uri: getAlbumCover(album) }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                        : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: ModuleColors.memories.light }]} />
                      }
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />
                      <View style={styles.albumInfo}>
                        <Text variant="bodySmall" weight="bold" color="#fff" numberOfLines={1}>{album.name}</Text>
                        <Text variant="caption" color="rgba(255,255,255,0.7)">{album.memories.length}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )
        )}

        {/* ── People ── */}
        {tab === 'people' && (
          <View style={styles.peoplePad}>
            <Text variant="h4" weight="bold" style={{ marginBottom: 20 }}>Family Members</Text>
            {members.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={tokens.textTertiary} />
                <Text variant="body" style={{ color: tokens.textSecondary, marginTop: 12, textAlign: 'center' }}>
                  {hasFamilyId ? 'No family members found' : 'Join a family first'}
                </Text>
              </View>
            ) : (
              members.map(member => {
                const count = memories.filter(m => m.uploader?.id === member.id).length;
                return (
                  <TouchableOpacity key={member.id} style={[styles.personRow, { borderBottomColor: tokens.border }]}>
                    {member.avatar ? (
                      <Image source={{ uri: member.avatar }} style={styles.personAvatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.personAvatar, { backgroundColor: ModuleColors.memories.primary, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{member.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text variant="body" weight="semibold">{member.name}</Text>
                      <Text variant="caption" secondary>{count} photos</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={tokens.textTertiary} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1 },
  header:          { paddingHorizontal: Spacing[4], paddingBottom: 0 },
  headerTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  addBtn:          { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabs:            { flexDirection: 'row' },
  tabItem:         { flex: 1, alignItems: 'center', paddingVertical: 12 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 4 },
  gridPhoto:       { width: COL_SIZE, height: COL_SIZE, borderRadius: 8 },
  gridPhotoLarge:  { width: COL_SIZE * 2 + 4, height: COL_SIZE * 2 + 4 },
  photoLikes:      { position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 3 },
  albumsGrid:      { padding: 16, gap: 12 },
  heroAlbum:       { borderRadius: 20, overflow: 'hidden', height: 220, position: 'relative' },
  heroAlbumBg:     { ...StyleSheet.absoluteFillObject },
  heroAlbumOverlay:{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  albumsRow:       { flexDirection: 'row', gap: 10 },
  albumCard:       { flex: 1, height: 130, borderRadius: 16, overflow: 'hidden' },
  albumInfo:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  peoplePad:       { padding: 20 },
  personRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  personAvatar:    { width: 52, height: 52, borderRadius: 26 },
  center:          { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyState:      { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40 },
  uploadCta:       { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  modalBackdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  pickerHandle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  pickerOption:    { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  pickerIcon:      { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelBtn:       { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
});
