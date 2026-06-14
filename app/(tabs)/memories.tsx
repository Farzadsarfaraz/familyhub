import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Modal,
  Dimensions, ActivityIndicator, Alert, FlatList, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { ModuleColors, Spacing } from '@/constants/theme';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';
import { useAuthStore } from '@/store/auth.store';

const { width, height } = Dimensions.get('window');
const COL_SIZE = (width - 48 - 8) / 3;

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
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [tab, setTab]           = useState<Tab>('timeline');
  const [uploading, setUploading] = useState(false);
  // Timeline photo viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex]     = useState(0);
  // Album detail
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  // Album photo viewer (separate modal to avoid nesting)
  const [albumViewerVisible, setAlbumViewerVisible] = useState(false);
  const [albumViewerIndex, setAlbumViewerIndex]     = useState(0);
  // Album creation
  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const [newAlbumName, setNewAlbumName]           = useState('');
  const [creatingAlbum, setCreatingAlbum]         = useState(false);

  const user = useAuthStore(s => s.user);
  const qc   = useQueryClient();
  const hasFamilyId = !!user?.familyId;

  const { data: memoriesData, isLoading: loadingMemories } = useQuery({
    queryKey: ['memories'],
    queryFn:  async () => { const { data } = await api.get('/memories'); return data.data as Memory[]; },
    enabled:  hasFamilyId,
  });

  const { data: albumsData, isLoading: loadingAlbums } = useQuery({
    queryKey: ['albums'],
    queryFn:  async () => { const { data } = await api.get('/memories/albums'); return data.data as Album[]; },
    enabled:  hasFamilyId,
  });

  const { data: familyData } = useQuery({
    queryKey: ['family-me'],
    queryFn:  async () => { const { data } = await api.get('/families/me'); return data.data; },
    enabled:  hasFamilyId,
  });

  const { data: albumPhotosData, isLoading: loadingAlbumPhotos } = useQuery({
    queryKey: ['memories', 'album', selectedAlbum?.id],
    queryFn:  async () => {
      const { data } = await api.get(`/memories?albumId=${selectedAlbum!.id}`);
      return data.data as Memory[];
    },
    enabled: !!selectedAlbum,
  });

  const memories    = memoriesData ?? [];
  const albums      = albumsData   ?? [];
  const albumPhotos = albumPhotosData ?? [];
  const members: FamilyMember[] = familyData?.members ?? [];
  const photos   = memories.filter(m => m.mediaType === 'PHOTO');

  // ── Upload ────────────────────────────────────────────────────────────────

  function showUploadOptions() {
    if (!hasFamilyId) { toast.error('Create or join a family first.'); return; }
    Alert.alert('Add Memory', 'Choose a source', [
      { text: '📷 Camera',        onPress: () => launchPicker('camera')  },
      { text: '🖼️ Photo Library',  onPress: () => launchPicker('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function launchPicker(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera Permission', 'Go to iPhone Settings → FamilyHub → Camera and allow access.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], allowsEditing: true, quality: 0.85 });
        if (!result.canceled && result.assets?.length) await uploadAssets(result.assets);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Photos Permission', 'Go to iPhone Settings → FamilyHub → Photos and allow access.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.85, selectionLimit: 10 });
        if (!result.canceled && result.assets?.length) await uploadAssets(result.assets);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not open picker.');
    }
  }

  async function uploadAssets(assets: ImagePicker.ImagePickerAsset[]) {
    setUploading(true);
    let successCount = 0;
    for (const asset of assets) {
      try {
        const ext      = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const fileName = asset.fileName ?? `memory_${Date.now()}.${ext}`;
        const mimeType = asset.mimeType ?? (ext === 'mp4' || ext === 'mov' ? `video/${ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`);
        const form = new FormData();
        form.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any);
        await api.post('/memories/upload', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
        successCount++;
      } catch (err) { toast.error(parseApiError(err)); }
    }
    setUploading(false);
    if (successCount > 0) {
      qc.invalidateQueries({ queryKey: ['memories'] });
      toast.success(successCount === 1 ? 'Memory uploaded!' : `${successCount} memories uploaded!`);
    }
  }

  // ── Album detail helpers ─────────────────────────────────────────────────

  function openAlbum(album: Album) {
    setSelectedAlbum(album);
  }

  function closeAlbum() {
    setAlbumViewerVisible(false);
    setSelectedAlbum(null);
  }

  function openAlbumViewer(index: number) {
    setAlbumViewerIndex(index);
    setAlbumViewerVisible(true);
  }

  async function deleteSelectedAlbum() {
    if (!selectedAlbum) return;
    Alert.alert('Delete Album', `Delete "${selectedAlbum.name}"? The photos inside won't be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/memories/albums/${selectedAlbum.id}`);
            qc.invalidateQueries({ queryKey: ['albums'] });
            closeAlbum();
            toast.success('Album deleted');
          } catch (err) { toast.error(parseApiError(err)); }
        },
      },
    ]);
  }

  function showAlbumUploadOptions() {
    Alert.alert('Add to Album', 'Choose a source', [
      { text: '📷 Camera',        onPress: () => launchAlbumPicker('camera')  },
      { text: '🖼️ Photo Library',  onPress: () => launchAlbumPicker('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function launchAlbumPicker(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera Permission', 'Go to iPhone Settings → FamilyHub → Camera and allow access.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], allowsEditing: true, quality: 0.85 });
        if (!result.canceled && result.assets?.length) await uploadAssetsToAlbum(result.assets);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Photos Permission', 'Go to iPhone Settings → FamilyHub → Photos and allow access.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.85, selectionLimit: 10 });
        if (!result.canceled && result.assets?.length) await uploadAssetsToAlbum(result.assets);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not open picker.');
    }
  }

  async function uploadAssetsToAlbum(assets: ImagePicker.ImagePickerAsset[]) {
    if (!selectedAlbum) return;
    const albumId = selectedAlbum.id;
    setUploading(true);
    let successCount = 0;
    for (const asset of assets) {
      try {
        const ext      = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const fileName = asset.fileName ?? `memory_${Date.now()}.${ext}`;
        const mimeType = asset.mimeType ?? (ext === 'mp4' || ext === 'mov' ? `video/${ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`);
        const form = new FormData();
        form.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any);
        form.append('albumId', albumId);
        await api.post('/memories/upload', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
        successCount++;
      } catch (err) { toast.error(parseApiError(err)); }
    }
    setUploading(false);
    if (successCount > 0) {
      qc.invalidateQueries({ queryKey: ['memories', 'album', albumId] });
      qc.invalidateQueries({ queryKey: ['albums'] });
      qc.invalidateQueries({ queryKey: ['memories'] });
      toast.success(successCount === 1 ? 'Photo added to album!' : `${successCount} photos added!`);
    }
  }

  // ── Album creation ────────────────────────────────────────────────────────

  async function createAlbum() {
    if (!newAlbumName.trim()) { toast.error('Enter an album name'); return; }
    setCreatingAlbum(true);
    try {
      await api.post('/memories/albums', { name: newAlbumName.trim() });
      qc.invalidateQueries({ queryKey: ['albums'] });
      toast.success(`"${newAlbumName.trim()}" created!`);
      setNewAlbumName('');
      setAlbumModalVisible(false);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setCreatingAlbum(false);
    }
  }

  // ── Photo viewer ──────────────────────────────────────────────────────────

  function openViewer(index: number) {
    setViewerIndex(index);
    setViewerVisible(true);
  }

  function handleLongPress(photo: Memory) {
    const isMyPhoto = photo.uploader?.id === user?.id;
    const buttons: any[] = [
      {
        text: `❤️ Like${(photo.likes?.length ?? 0) > 0 ? ` (${photo.likes.length})` : ''}`,
        onPress: () => api.post(`/memories/${photo.id}/like`).then(() => qc.invalidateQueries({ queryKey: ['memories'] })),
      },
    ];
    if (isMyPhoto) {
      buttons.push({
        text: '🗑️ Delete', style: 'destructive' as const,
        onPress: () => Alert.alert('Delete Memory', 'This will be permanently deleted.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await api.delete(`/memories/${photo.id}`);
              qc.invalidateQueries({ queryKey: ['memories'] });
              toast.success('Memory deleted');
            } catch (err) { toast.error(parseApiError(err)); }
          }},
        ]),
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(photo.title ?? 'Memory', `By ${photo.uploader?.name ?? 'unknown'}`, buttons);
  }

  function getAlbumCover(album: Album) {
    return album.coverUrl ?? album.memories[0]?.thumbnailUrl ?? album.memories[0]?.mediaUrl;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ── Album Detail ── */}
      <Modal visible={!!selectedAlbum} animationType="slide" onRequestClose={closeAlbum}>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.albumDetailHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={styles.albumDetailBtn} onPress={closeAlbum}>
              <Ionicons name="arrow-back" size={24} color={tokens.text} />
            </TouchableOpacity>
            <Text variant="h4" weight="bold" numberOfLines={1} style={{ flex: 1, marginHorizontal: 12, color: tokens.text }}>
              {selectedAlbum?.name}
            </Text>
            <TouchableOpacity style={styles.albumDetailBtn} onPress={deleteSelectedAlbum}>
              <Ionicons name="trash-outline" size={22} color="#FF5C5C" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary }}>
              {loadingAlbumPhotos ? 'Loading…' : `${albumPhotos.length} ${albumPhotos.length === 1 ? 'photo' : 'photos'}`}
            </Text>
          </View>

          {loadingAlbumPhotos ? (
            <View style={styles.center}><ActivityIndicator color={ModuleColors.memories.primary} size="large" /></View>
          ) : albumPhotos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={56} color={tokens.textTertiary} />
              <Text variant="h4" weight="bold" style={{ marginTop: 16, color: tokens.text }}>No photos yet</Text>
              <Text variant="body" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 8 }}>
                Add the first photo to this album
              </Text>
              <TouchableOpacity
                style={[styles.uploadCta, { backgroundColor: ModuleColors.memories.primary }]}
                onPress={showAlbumUploadOptions}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text variant="body" weight="semibold" color="#fff" style={{ marginLeft: 8 }}>Add Photos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
              <View style={styles.grid}>
                {albumPhotos.map((photo, index) => (
                  <TouchableOpacity
                    key={photo.id}
                    activeOpacity={0.85}
                    onPress={() => openAlbumViewer(index)}
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
            </ScrollView>
          )}

          {albumPhotos.length > 0 && (
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: uploading ? tokens.border : ModuleColors.memories.primary, bottom: insets.bottom + 24 }]}
              onPress={showAlbumUploadOptions}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="add" size={28} color="#fff" />
              }
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {/* ── Album Photo Viewer (root-level to avoid Modal nesting) ── */}
      <Modal visible={albumViewerVisible} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setAlbumViewerVisible(false)}>
        <View style={styles.viewer}>
          <FlatList
            data={albumPhotos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={albumViewerIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={p => p.id}
            renderItem={({ item: photo }) => (
              <View style={styles.viewerPage}>
                <Image source={{ uri: photo.mediaUrl }} style={styles.viewerImage} contentFit="contain" transition={200} />
                {photo.uploader && (
                  <View style={styles.viewerCaption}>
                    <Text variant="bodySmall" color="#fff" weight="semibold">{photo.uploader.name}</Text>
                    {photo.title ? <Text variant="caption" color="rgba(255,255,255,0.7)">{photo.title}</Text> : null}
                  </View>
                )}
              </View>
            )}
          />
          <TouchableOpacity style={[styles.viewerClose, { top: insets.top + 12 }]} onPress={() => setAlbumViewerVisible(false)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewerLike, { bottom: insets.bottom + 24 }]}
            onPress={() => {
              const photo = albumPhotos[albumViewerIndex];
              if (photo) api.post(`/memories/${photo.id}/like`).then(() => qc.invalidateQueries({ queryKey: ['memories', 'album', selectedAlbum?.id] }));
            }}
          >
            <Ionicons name="heart" size={28} color="#FF5C8A" />
            <Text style={{ color: '#fff', marginLeft: 6, fontSize: 15, fontWeight: '600' }}>
              {albumPhotos[albumViewerIndex]?.likes?.length ?? 0}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Full-screen photo viewer ── */}
      <Modal visible={viewerVisible} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewer}>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={p => p.id}
            renderItem={({ item: photo }) => (
              <View style={styles.viewerPage}>
                <Image
                  source={{ uri: photo.mediaUrl }}
                  style={styles.viewerImage}
                  contentFit="contain"
                  transition={200}
                />
                {photo.uploader && (
                  <View style={styles.viewerCaption}>
                    <Text variant="bodySmall" color="#fff" weight="semibold">{photo.uploader.name}</Text>
                    {photo.title ? <Text variant="caption" color="rgba(255,255,255,0.7)">{photo.title}</Text> : null}
                  </View>
                )}
              </View>
            )}
          />
          {/* Close button */}
          <TouchableOpacity style={[styles.viewerClose, { top: insets.top + 12 }]} onPress={() => setViewerVisible(false)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {/* Like button */}
          <TouchableOpacity
            style={[styles.viewerLike, { bottom: insets.bottom + 24 }]}
            onPress={() => {
              const photo = photos[viewerIndex];
              if (photo) api.post(`/memories/${photo.id}/like`).then(() => qc.invalidateQueries({ queryKey: ['memories'] }));
            }}
          >
            <Ionicons name="heart" size={28} color="#FF5C8A" />
            <Text style={{ color: '#fff', marginLeft: 6, fontSize: 15, fontWeight: '600' }}>
              {photos[viewerIndex]?.likes?.length ?? 0}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Create Album modal ── */}
      <Modal visible={albumModalVisible} transparent animationType="slide" onRequestClose={() => setAlbumModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.albumModalWrap}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAlbumModalVisible(false)} />
          <View style={[styles.albumSheet, { backgroundColor: tokens.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: tokens.border }]} />
            <Text variant="h4" weight="bold" style={{ color: tokens.text, marginBottom: 4 }}>New Album</Text>
            <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginBottom: 20 }}>Give your album a name</Text>
            <TextInput
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              placeholder="e.g. Summer 2025 🏖️"
              placeholderTextColor={tokens.textTertiary}
              style={[styles.albumInput, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt }]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={createAlbum}
            />
            <TouchableOpacity
              style={[styles.albumCreateBtn, { backgroundColor: creatingAlbum ? tokens.border : ModuleColors.memories.primary }]}
              onPress={createAlbum}
              disabled={creatingAlbum}
            >
              {creatingAlbum
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text variant="body" weight="bold" color="#fff">Create Album</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Header ── */}
      <LinearGradient
        colors={isDark ? ['#2E001A', '#0A0A1A'] : ['#FDF2F8', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Memories</Text>
            <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : tokens.textSecondary }}>
              {!hasFamilyId ? 'Join a family to share memories' : loadingMemories ? 'Loading…' : `${photos.length} photos • ${memories.filter(m => m.mediaType === 'VIDEO').length} videos`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: uploading ? tokens.border : ModuleColors.memories.primary }]}
            onPress={showUploadOptions}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          {(['timeline', 'albums', 'people'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabItem, tab === t && { borderBottomColor: ModuleColors.memories.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t)}
            >
              <Text variant="body" weight={tab === t ? 'semibold' : 'regular'} color={tab === t ? ModuleColors.memories.primary : tokens.textSecondary} style={{ textTransform: 'capitalize' }}>
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
                <TouchableOpacity style={[styles.uploadCta, { backgroundColor: ModuleColors.memories.primary }]} onPress={showUploadOptions}>
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
                  activeOpacity={0.85}
                  style={{ position: 'relative' }}
                  onPress={() => openViewer(index)}
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
          ) : (
            <View style={styles.albumsGrid}>
              {/* Create album button */}
              <TouchableOpacity
                style={[styles.createAlbumBtn, { borderColor: ModuleColors.memories.primary }]}
                onPress={() => setAlbumModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={22} color={ModuleColors.memories.primary} />
                <Text variant="body" weight="semibold" color={ModuleColors.memories.primary} style={{ marginLeft: 8 }}>Create Album</Text>
              </TouchableOpacity>

              {albums.length === 0 ? (
                <View style={[styles.emptyState, { paddingTop: 32 }]}>
                  <Ionicons name="folder-open-outline" size={56} color={tokens.textTertiary} />
                  <Text variant="h4" weight="bold" style={{ marginTop: 14, color: tokens.text }}>No albums yet</Text>
                  <Text variant="body" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 6 }}>Create your first album above</Text>
                </View>
              ) : (
                <>
                  {albums[0] && (
                    <TouchableOpacity style={styles.heroAlbum} activeOpacity={0.88} onPress={() => openAlbum(albums[0])}>
                      {getAlbumCover(albums[0])
                        ? <Image source={{ uri: getAlbumCover(albums[0]) }} style={styles.heroAlbumBg} contentFit="cover" />
                        : <View style={[styles.heroAlbumBg, { backgroundColor: ModuleColors.memories.light }]} />
                      }
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.heroAlbumOverlay}>
                        <Badge label="Latest" variant="error" />
                        <Text variant="h3" weight="bold" color="#fff" style={{ marginTop: 8 }}>{albums[0].name}</Text>
                        <Text variant="bodySmall" color="rgba(255,255,255,0.7)">{albums[0].memories.length} memories</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  {albums.length > 1 && (
                    <View style={styles.albumsRow}>
                      {albums.slice(1).map(album => (
                        <TouchableOpacity key={album.id} style={styles.albumCard} activeOpacity={0.85} onPress={() => openAlbum(album)}>
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
                </>
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
                    {member.avatar
                      ? <Image source={{ uri: member.avatar }} style={styles.personAvatar} contentFit="cover" />
                      : <View style={[styles.personAvatar, { backgroundColor: ModuleColors.memories.primary, alignItems: 'center', justifyContent: 'center' }]}>
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{member.name.charAt(0).toUpperCase()}</Text>
                        </View>
                    }
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
  root:             { flex: 1 },
  header:           { paddingHorizontal: Spacing[4], paddingBottom: 0 },
  headerTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  addBtn:           { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabs:             { flexDirection: 'row' },
  tabItem:          { flex: 1, alignItems: 'center', paddingVertical: 12 },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 4 },
  gridPhoto:        { width: COL_SIZE, height: COL_SIZE, borderRadius: 8 },
  gridPhotoLarge:   { width: COL_SIZE * 2 + 4, height: COL_SIZE * 2 + 4 },
  photoLikes:       { position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 3 },
  albumsGrid:       { padding: 16, gap: 12 },
  createAlbumBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 14 },
  heroAlbum:        { borderRadius: 20, overflow: 'hidden', height: 220, position: 'relative' },
  heroAlbumBg:      { ...StyleSheet.absoluteFillObject },
  heroAlbumOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  albumsRow:        { flexDirection: 'row', gap: 10 },
  albumCard:        { flex: 1, height: 130, borderRadius: 16, overflow: 'hidden' },
  albumInfo:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  peoplePad:        { padding: 20 },
  personRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  personAvatar:     { width: 52, height: 52, borderRadius: 26 },
  center:           { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyState:       { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40 },
  uploadCta:        { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  // Photo viewer
  viewer:           { flex: 1, backgroundColor: '#000' },
  viewerPage:       { width, height, alignItems: 'center', justifyContent: 'center' },
  viewerImage:      { width, height: height * 0.85 },
  viewerClose:      { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  viewerLike:       { position: 'absolute', left: 24, flexDirection: 'row', alignItems: 'center' },
  viewerCaption:    { position: 'absolute', bottom: 80, left: 20 },
  // Album modal
  albumModalWrap:   { flex: 1, justifyContent: 'flex-end' },
  albumSheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  albumInput:       { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16 },
  albumCreateBtn:   { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  // Album detail
  albumDetailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  albumDetailBtn:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  fab:               { position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
