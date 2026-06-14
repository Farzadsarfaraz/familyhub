import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Text, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

const C = ModuleColors.documents;

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = ['Personal', 'Legal', 'Financial', 'Medical', 'School', 'Other'];

const CATEGORY_COLOR: Record<string, string> = {
  Personal:  Colors.primary[500],
  Legal:     '#8B5CF6',
  Financial: Colors.success[500],
  Medical:   Colors.error[500],
  School:    Colors.warning[500],
  Other:     '#6B7280',
};

// ── Utilities ──────────────────────────────────────────────────────────────
function mimeToEmoji(mimeType: string): string {
  if (mimeType === 'application/pdf')                         return '📄';
  if (mimeType.startsWith('image/'))                         return '🖼️';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel'))   return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📑';
  if (mimeType.startsWith('text/'))                          return '📃';
  if (mimeType.startsWith('video/'))                         return '🎬';
  if (mimeType.startsWith('audio/'))                         return '🎵';
  return '📁';
}

function mimeToLabel(mimeType: string): string {
  if (mimeType === 'application/pdf')                         return 'PDF';
  if (mimeType.startsWith('image/'))                         return 'IMG';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
  if (mimeType.includes('sheet') || mimeType.includes('excel'))   return 'XLS';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPT';
  if (mimeType.startsWith('text/'))                          return 'TXT';
  if (mimeType.startsWith('video/'))                         return 'VID';
  if (mimeType.startsWith('audio/'))                         return 'AUD';
  return 'FILE';
}

function formatSize(bytes: number): string {
  if (bytes < 1024)             return `${bytes} B`;
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Document {
  id: string; name: string; fileUrl: string;
  mimeType: string; size: number; category: string;
  uploadedBy: string; createdAt: string;
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function DocumentsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  const [catFilter, setCatFilter] = useState('All');
  const [search,    setSearch]    = useState('');

  // Upload flow state
  const [picking,   setPicking]   = useState(false);
  const [modal,     setModal]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [pickedFile, setPickedFile] = useState<{
    uri: string; name: string; mimeType: string; size: number;
  } | null>(null);
  const [docName,   setDocName]   = useState('');
  const [docCat,    setDocCat]    = useState('Personal');

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn:  async () => { const r = await api.get('/documents'); return r.data.data; },
    enabled:  !!user?.familyId,
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  // Only show category chips that are actually in use + "All"
  const usedCats = ['All', ...CATEGORIES.filter(c => documents.some(d =>
    d.category.toLowerCase() === c.toLowerCase() || d.category === c
  ))];

  const filtered = documents.filter(d => {
    const catMatch = catFilter === 'All' ||
      d.category.toLowerCase() === catFilter.toLowerCase() || d.category === catFilter;
    const searchMatch = !search ||
      d.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  // ── Pick file ─────────────────────────────────────────────────────────────
  async function pickDocument() {
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPickedFile({
        uri:      asset.uri,
        name:     asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size:     asset.size     ?? 0,
      });
      setDocName(asset.name.replace(/\.[^.]+$/, '')); // strip extension
      setDocCat('Personal');
      setModal(true);
    } catch {
      toast.error('Could not open file picker');
    } finally {
      setPicking(false);
    }
  }

  // ── Save document record ──────────────────────────────────────────────────
  function closeModal() { if (saving) return; setModal(false); setPickedFile(null); }

  async function saveDocument() {
    if (!docName.trim()) { Alert.alert('Required', 'Enter a document name.'); return; }
    if (!pickedFile)     return;
    setSaving(true);
    try {
      await api.post('/documents', {
        name:     docName.trim(),
        fileUrl:  pickedFile.uri,
        mimeType: pickedFile.mimeType,
        size:     pickedFile.size,
        category: docCat,
      });
      qc.invalidateQueries({ queryKey: ['documents'] });
      closeModal();
      toast.success('Document saved');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  }

  // ── Open document ─────────────────────────────────────────────────────────
  async function openDocument(doc: Document) {
    try {
      const canOpen = await Linking.canOpenURL(doc.fileUrl);
      if (canOpen) {
        await Linking.openURL(doc.fileUrl);
      } else {
        toast.error('Cannot open this file on this device');
      }
    } catch {
      toast.error('Failed to open file');
    }
  }

  // ── Delete document ───────────────────────────────────────────────────────
  function confirmDelete(doc: Document) {
    Alert.alert('Delete Document', `Delete "${doc.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/documents/${doc.id}`);
          qc.invalidateQueries({ queryKey: ['documents'] });
          toast.success('Document deleted');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── No family guard ───────────────────────────────────────────────────────
  if (!user?.familyId) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: tokens.background }]}>
        <Text style={{ fontSize: 64 }}>📄</Text>
        <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No Family Yet</Text>
        <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Join or create a family to share documents.
        </Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ UPLOAD CONFIRM MODAL ══════ */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, {
            paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border,
          }]}>
            <TouchableOpacity style={[styles.modalBtn, saving && { opacity: 0.35 }]} onPress={closeModal} disabled={saving}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Save Document</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveDocument} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.formBody}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
            >
              {/* File preview */}
              {pickedFile && (
                <View style={[styles.filePreview, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                  <Text style={{ fontSize: 32 }}>{mimeToEmoji(pickedFile.mimeType)}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="body" weight="semibold" numberOfLines={1} style={{ color: tokens.text }}>
                      {pickedFile.name}
                    </Text>
                    <Text variant="caption" secondary>
                      {mimeToLabel(pickedFile.mimeType)} · {formatSize(pickedFile.size)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Name */}
              <TextInput
                value={docName}
                onChangeText={setDocName}
                placeholder="Document name"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus
              />

              {/* Category */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, {
                        backgroundColor: docCat === cat ? (CATEGORY_COLOR[cat] + '22') : tokens.surfaceAlt,
                        borderColor:     docCat === cat ? CATEGORY_COLOR[cat] : tokens.border,
                      }]}
                      onPress={() => setDocCat(cat)}
                    >
                      <Text
                        variant="bodySmall"
                        weight={docCat === cat ? 'bold' : 'regular'}
                        style={{ color: docCat === cat ? CATEGORY_COLOR[cat] : tokens.textSecondary }}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ HEADER ══════ */}
      <LinearGradient
        colors={isDark ? [C.dark, '#0A0A1A'] : [C.light, '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>📄 Documents</Text>
            <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
              {isLoading ? 'Loading…' : `${documents.length} file${documents.length !== 1 ? 's' : ''} · Family vault`}
            </Text>
          </View>
          <View style={[styles.lockBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
            <Ionicons name="lock-closed" size={18} color={C.primary} />
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchBox, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff',
          borderColor:     isDark ? 'transparent' : tokens.border,
        }]}>
          <Ionicons name="search" size={16} color={isDark ? 'rgba(255,255,255,0.5)' : tokens.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#fff' : tokens.text }]}
            placeholder="Search documents…"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : tokens.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={isDark ? 'rgba(255,255,255,0.5)' : tokens.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ══════ CATEGORY FILTER ══════ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52, borderBottomWidth: 1, borderBottomColor: tokens.border, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {usedCats.map(cat => {
          const color  = CATEGORY_COLOR[cat] ?? C.primary;
          const active = catFilter === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setCatFilter(cat)}
              style={[styles.catChip, {
                backgroundColor: active ? color : tokens.card,
                borderColor:     active ? color : tokens.border,
              }]}
            >
              <Text variant="caption" weight="semibold"
                style={{ color: active ? '#fff' : tokens.text }}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ══════ LIST ══════ */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text variant="body" secondary style={{ marginTop: 12 }}>Loading documents…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 12, paddingBottom: 100 }}>
          <Text variant="bodySmall" secondary>
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ''}
          </Text>

          {filtered.length === 0 && (
            <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
              <Text style={{ fontSize: 40 }}>📁</Text>
              <Text variant="body" weight="semibold" style={{ color: tokens.text, marginTop: 12 }}>
                {search ? 'No matching documents' : 'No documents yet'}
              </Text>
              <Text variant="bodySmall" secondary style={{ marginTop: 4, textAlign: 'center' }}>
                {search ? 'Try a different search' : 'Tap the upload button to add your first document'}
              </Text>
            </View>
          )}

          {filtered.map(doc => {
            const catColor = CATEGORY_COLOR[doc.category] ?? CATEGORY_COLOR['Other'];
            const emoji    = mimeToEmoji(doc.mimeType);
            const typeLabel = mimeToLabel(doc.mimeType);
            const typeColor: Record<string, string> = {
              PDF: Colors.error[500], IMG: Colors.primary[500],
              DOC: Colors.warning[500], XLS: Colors.success[500],
              PPT: '#F97316', VID: '#8B5CF6', AUD: '#EC4899', TXT: '#6B7280', FILE: '#6B7280',
            };
            return (
              <TouchableOpacity
                key={doc.id}
                activeOpacity={0.85}
                onPress={() => openDocument(doc)}
                onLongPress={() => Alert.alert(doc.name, 'What would you like to do?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open',   onPress: () => openDocument(doc) },
                  { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(doc) },
                ])}
              >
                <Card shadow="sm" style={styles.docCard}>
                  <View style={[styles.docIcon, { backgroundColor: catColor + '18' }]}>
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="body" weight="semibold" numberOfLines={1} style={{ color: tokens.text }}>
                      {doc.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text variant="caption" secondary>{fmtDate(doc.createdAt)}</Text>
                      <Text variant="caption" secondary> · {formatSize(doc.size)}</Text>
                    </View>
                    <View style={[styles.catLabel, { backgroundColor: catColor + '18' }]}>
                      <Text variant="caption" weight="semibold" style={{ color: catColor }}>
                        {doc.category}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.docRight}>
                    <View style={[styles.typeBadge, { backgroundColor: (typeColor[typeLabel] ?? C.primary) + '18' }]}>
                      <Text variant="caption" weight="bold" style={{ color: typeColor[typeLabel] ?? C.primary }}>
                        {typeLabel}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color={tokens.textSecondary} style={{ marginTop: 8 }} />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: C.primary, bottom: 32 + insets.bottom }]}
        onPress={pickDocument}
        disabled={picking}
      >
        {picking
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:    { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  lockBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontSize: 14 },

  catChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1.5 },

  emptyBox: { borderRadius: BorderRadius.xl, padding: 36, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', marginTop: 16 },

  docCard:    { flexDirection: 'row', alignItems: 'center', padding: 14 },
  docIcon:    { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  metaRow:    { flexDirection: 'row', marginTop: 2 },
  catLabel:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, marginTop: 4 },
  docRight:   { alignItems: 'center' },
  typeBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },

  fab: {
    position: 'absolute', right: 20, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10,
  },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBtn:    { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:    { padding: 20, paddingBottom: 60 },
  titleInput:  { fontSize: 20, fontWeight: '700', paddingVertical: 14, borderBottomWidth: 1, marginBottom: 4 },
  section:     { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionLabel:{ fontSize: 11, letterSpacing: 0.8, marginBottom: 10, color: '#888' },
  chip:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  filePreview: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: BorderRadius.xl, borderWidth: 1.5, marginBottom: 8 },
});
