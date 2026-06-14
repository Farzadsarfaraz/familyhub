import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Modal,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, Card, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

const C = ModuleColors.pets;

// ── Types ──────────────────────────────────────────────────────────────────
interface PetMedication {
  id: string; name: string; dose?: string; schedule?: string; nextDue?: string; petId: string;
}
interface Pet {
  id: string; name: string; species: string; breed?: string;
  birthDate?: string; avatar?: string; weight?: string;
  color?: string; emoji?: string; nextVet?: string; notes?: string;
  familyId: string; createdAt: string;
  medications: PetMedication[];
}

interface PetForm {
  name: string; species: string; breed: string;
  birthDate: string; weight: string; color: string; emoji: string; notes: string;
  nextVet: string;
}
interface MedForm { name: string; dose: string; schedule: string; nextDue: string; }

const DEFAULT_PET: PetForm = {
  name: '', species: '', breed: '', birthDate: '', weight: '',
  color: C.primary, emoji: '', notes: '', nextVet: '',
};
const DEFAULT_MED: MedForm = { name: '', dose: '', schedule: 'Monthly', nextDue: '' };

const SPECIES_OPTIONS = [
  { label: 'Dog',   emoji: '🐕' },
  { label: 'Cat',   emoji: '🐈' },
  { label: 'Bird',  emoji: '🦜' },
  { label: 'Fish',  emoji: '🐠' },
  { label: 'Rabbit',emoji: '🐇' },
  { label: 'Other', emoji: '🐾' },
];
const FREQ_OPTIONS = ['Daily', 'Twice daily', 'Weekly', 'Monthly', 'As needed'];
const COLOR_OPTIONS = ['#F59E0B','#8B5CF6','#10B981','#EF4444','#3B82F6','#F97316','#EC4899','#6B7280'];

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Utilities ──────────────────────────────────────────────────────────────
function petEmoji(pet: Pet): string {
  if (pet.emoji) return pet.emoji;
  const s = pet.species.toLowerCase();
  if (s.includes('dog'))    return '🐕';
  if (s.includes('cat'))    return '🐈';
  if (s.includes('bird'))   return '🦜';
  if (s.includes('fish'))   return '🐠';
  if (s.includes('rabbit')) return '🐇';
  return '🐾';
}
function petColor(pet: Pet): string { return pet.color || C.primary; }
function petAge(birthDate: string): string {
  const diff = Date.now() - new Date(birthDate).getTime();
  const years  = Math.floor(diff / (365.25 * 86_400_000));
  const months = Math.floor(diff / (30.44 * 86_400_000)) % 12;
  if (years >= 1) return `${years} yr${years > 1 ? 's' : ''}`;
  return `${months} mo${months !== 1 ? 's' : ''}`;
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function PetsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pet CRUD
  const [petModal,  setPetModal]  = useState(false);
  const [editPet,   setEditPet]   = useState<Pet | null>(null);
  const [petForm,   setPetForm]   = useState<PetForm>(DEFAULT_PET);
  const [savingPet, setSavingPet] = useState(false);

  // Medication CRUD
  const [medModal,  setMedModal]  = useState(false);
  const [editMed,   setEditMed]   = useState<PetMedication | null>(null);
  const [medForm,   setMedForm]   = useState<MedForm>(DEFAULT_MED);
  const [savingMed, setSavingMed] = useState(false);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: pets = [], isLoading } = useQuery<Pet[]>({
    queryKey: ['pets'],
    queryFn:  async () => { const r = await api.get('/pets'); return r.data.data; },
    enabled:  !!user?.familyId,
    onSuccess: (data: Pet[]) => {
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      if (selectedId && !data.find((p: Pet) => p.id === selectedId) && data.length > 0) {
        setSelectedId(data[0].id);
      }
    },
  });

  const selected = pets.find(p => p.id === selectedId) ?? null;

  // ── Pet CRUD ───────────────────────────────────────────────────────────────
  function openCreatePet() {
    setEditPet(null);
    setPetForm(DEFAULT_PET);
    setPetModal(true);
  }
  function openEditPet(pet: Pet) {
    setEditPet(pet);
    setPetForm({
      name:      pet.name,
      species:   pet.species,
      breed:     pet.breed    ?? '',
      birthDate: pet.birthDate ? pet.birthDate.slice(0, 10) : '',
      weight:    pet.weight   ?? '',
      color:     pet.color    ?? C.primary,
      emoji:     pet.emoji    ?? '',
      notes:     pet.notes    ?? '',
      nextVet:   pet.nextVet  ? pet.nextVet.slice(0, 10) : '',
    });
    setPetModal(true);
  }
  function closePetModal() { if (savingPet) return; setPetModal(false); }

  async function savePet() {
    if (!petForm.name.trim())    { Alert.alert('Required', 'Enter a pet name.'); return; }
    if (!petForm.species.trim()) { Alert.alert('Required', 'Select a species.'); return; }
    setSavingPet(true);
    try {
      const body = {
        name:      petForm.name.trim(),
        species:   petForm.species.trim(),
        breed:     petForm.breed.trim()     || undefined,
        birthDate: petForm.birthDate        || undefined,
        weight:    petForm.weight.trim()    || undefined,
        color:     petForm.color            || undefined,
        emoji:     petForm.emoji.trim()     || undefined,
        notes:     petForm.notes.trim()     || undefined,
        nextVet:   petForm.nextVet          || undefined,
      };
      if (editPet) {
        await api.patch(`/pets/${editPet.id}`, body);
        toast.success('Pet updated');
      } else {
        const r = await api.post('/pets', body);
        setSelectedId(r.data.data.id);
        toast.success('Pet added!');
      }
      qc.invalidateQueries({ queryKey: ['pets'] });
      closePetModal();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingPet(false); }
  }

  function confirmDeletePet(pet: Pet) {
    Alert.alert('Delete Pet', `Remove ${pet.name} from your family?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/pets/${pet.id}`);
          qc.invalidateQueries({ queryKey: ['pets'] });
          toast.success('Pet removed');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── Medication CRUD ────────────────────────────────────────────────────────
  function openAddMed() { setEditMed(null); setMedForm(DEFAULT_MED); setMedModal(true); }
  function openEditMed(med: PetMedication) {
    setEditMed(med);
    setMedForm({ name: med.name, dose: med.dose ?? '', schedule: med.schedule ?? 'Monthly', nextDue: med.nextDue ? med.nextDue.slice(0, 10) : '' });
    setMedModal(true);
  }
  function closeMedModal() { if (savingMed) return; setMedModal(false); }

  async function saveMed() {
    if (!medForm.name.trim()) { Alert.alert('Required', 'Enter a medication name.'); return; }
    setSavingMed(true);
    try {
      const body = {
        name:     medForm.name.trim(),
        dose:     medForm.dose.trim()     || undefined,
        schedule: medForm.schedule        || undefined,
        nextDue:  medForm.nextDue         || undefined,
      };
      if (editMed) {
        await api.patch(`/pets/medications/${editMed.id}`, body);
        toast.success('Medication updated');
      } else {
        await api.post(`/pets/${selected!.id}/medications`, body);
        toast.success('Medication added');
      }
      qc.invalidateQueries({ queryKey: ['pets'] });
      closeMedModal();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingMed(false); }
  }

  function confirmDeleteMed(med: PetMedication) {
    Alert.alert('Remove', `Remove "${med.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/pets/medications/${med.id}`);
          qc.invalidateQueries({ queryKey: ['pets'] });
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── No family guard ────────────────────────────────────────────────────────
  if (!user?.familyId) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: tokens.background }]}>
        <Text style={{ fontSize: 64 }}>🐾</Text>
        <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No Family Yet</Text>
        <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Join or create a family to track your pets.
        </Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ PET MODAL ══════ */}
      <Modal visible={petModal} animationType="slide" onRequestClose={closePetModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingPet && { opacity: 0.35 }]} onPress={closePetModal} disabled={savingPet}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>{editPet ? 'Edit Pet' : 'Add Pet'}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={savePet} disabled={savingPet}>
              {savingPet ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              {/* Emoji preview + name */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={[styles.bigAvatar, { backgroundColor: (petForm.color || C.primary) + '22' }]}>
                  <Text style={{ fontSize: 52 }}>{petForm.emoji || '🐾'}</Text>
                </View>
                <TextInput
                  value={petForm.name}
                  onChangeText={t => setPetForm(f => ({ ...f, name: t }))}
                  placeholder="Pet name"
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.nameInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                  autoFocus
                  textAlign="center"
                />
              </View>

              {/* Species */}
              <Text variant="bodySmall" weight="semibold" secondary style={styles.sectionLabel}>SPECIES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                {SPECIES_OPTIONS.map(s => {
                  const active = petForm.species === s.label;
                  return (
                    <TouchableOpacity key={s.label}
                      onPress={() => setPetForm(f => ({ ...f, species: s.label, emoji: f.emoji || s.emoji }))}
                      style={[styles.chip, { backgroundColor: active ? C.primary : tokens.surfaceAlt, borderColor: active ? C.primary : tokens.border }]}>
                      <Text>{s.emoji}</Text>
                      <Text variant="bodySmall" weight="semibold" style={{ marginLeft: 4, color: active ? '#fff' : tokens.text }}>{s.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Accent color */}
              <Text variant="bodySmall" weight="semibold" secondary style={styles.sectionLabel}>COLOR</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                {COLOR_OPTIONS.map(col => (
                  <TouchableOpacity key={col} onPress={() => setPetForm(f => ({ ...f, color: col }))}
                    style={[styles.colorDot, { backgroundColor: col, borderWidth: petForm.color === col ? 3 : 0, borderColor: tokens.text }]} />
                ))}
              </View>

              {/* Other fields */}
              {[
                { label: 'Emoji override', key: 'emoji'     as const, icon: 'happy-outline',    placeholder: '🐕 (optional)'     },
                { label: 'Breed',          key: 'breed'     as const, icon: 'paw-outline',       placeholder: 'Golden Retriever'   },
                { label: 'Weight',         key: 'weight'    as const, icon: 'scale-outline',     placeholder: '32 kg'             },
                { label: 'Birth date',     key: 'birthDate' as const, icon: 'calendar-outline',  placeholder: 'YYYY-MM-DD'        },
                { label: 'Next vet visit', key: 'nextVet'   as const, icon: 'medical-outline',   placeholder: 'YYYY-MM-DD'        },
                { label: 'Notes',          key: 'notes'     as const, icon: 'document-text-outline', placeholder: 'Allergies, special needs…' },
              ].map(({ label, key, icon, placeholder }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput
                    value={petForm[key]}
                    onChangeText={t => setPetForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor={tokens.textTertiary}
                    style={[styles.inlineInput, { color: tokens.text }]}
                  />
                </View>
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ MEDICATION MODAL ══════ */}
      <Modal visible={medModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeMedModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingMed && { opacity: 0.35 }]} onPress={closeMedModal} disabled={savingMed}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>{editMed ? 'Edit Medication' : 'Add Medication'}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveMed} disabled={savingMed}>
              {savingMed ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              <TextInput
                value={medForm.name}
                onChangeText={t => setMedForm(f => ({ ...f, name: t }))}
                placeholder="Medication name"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus
              />
              {/* Frequency chips */}
              <Text variant="bodySmall" weight="semibold" secondary style={styles.sectionLabel}>FREQUENCY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                {FREQ_OPTIONS.map(f => {
                  const active = medForm.schedule === f;
                  return (
                    <TouchableOpacity key={f}
                      onPress={() => setMedForm(prev => ({ ...prev, schedule: f }))}
                      style={[styles.chip, { backgroundColor: active ? C.primary : tokens.surfaceAlt, borderColor: active ? C.primary : tokens.border }]}>
                      <Text variant="bodySmall" weight="semibold" style={{ color: active ? '#fff' : tokens.text }}>{f}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {[
                { label: 'Dose',     key: 'dose'   as const, icon: 'flask-outline',    placeholder: '1 tablet' },
                { label: 'Next due', key: 'nextDue' as const, icon: 'calendar-outline', placeholder: 'YYYY-MM-DD' },
              ].map(({ label, key, icon, placeholder }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput
                    value={medForm[key]}
                    onChangeText={t => setMedForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor={tokens.textTertiary}
                    style={[styles.inlineInput, { color: tokens.text }]}
                  />
                </View>
              ))}
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
        <View style={styles.headerTop}>
          <View>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>🐾 Pets</Text>
            {isLoading ? null : (
              <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
                {pets.length} {pets.length === 1 ? 'pet' : 'pets'}{pets.length > 0 ? ' · Tap to view' : ''}
              </Text>
            )}
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#fff' }]}
            onPress={openCreatePet}>
            <Ionicons name="add" size={20} color={C.primary} />
            <Text variant="bodySmall" weight="semibold" color={C.primary} style={{ marginLeft: 4 }}>Add Pet</Text>
          </TouchableOpacity>
        </View>

        {/* Pet selector */}
        {isLoading ? (
          <View style={{ paddingTop: 20 }}><ActivityIndicator size="small" color={C.primary} /></View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, gap: 12 }}>
            {pets.map(pet => {
              const col = petColor(pet);
              const isActive = selectedId === pet.id;
              return (
                <TouchableOpacity key={pet.id}
                  onPress={() => setSelectedId(pet.id)}
                  onLongPress={() => Alert.alert(pet.name, 'What would you like to do?', [
                    { text: 'Edit',   onPress: () => openEditPet(pet) },
                    { text: 'Delete', style: 'destructive', onPress: () => confirmDeletePet(pet) },
                    { text: 'Cancel', style: 'cancel' },
                  ])}
                  style={[styles.petChip, { backgroundColor: isActive ? col : isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: col }]}>
                  <Text style={{ fontSize: 24 }}>{petEmoji(pet)}</Text>
                  <View style={{ marginLeft: 8 }}>
                    <Text variant="body" weight="bold" style={{ color: isActive ? '#fff' : tokens.text }}>{pet.name}</Text>
                    <Text variant="caption" style={{ color: isActive ? 'rgba(255,255,255,0.75)' : tokens.textSecondary }}>{pet.species}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.petChip, { borderColor: C.primary, borderStyle: 'dashed' }]}
              onPress={openCreatePet}>
              <Ionicons name="add-circle-outline" size={24} color={C.primary} />
              <Text variant="body" weight="semibold" color={C.primary} style={{ marginLeft: 8 }}>New</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </LinearGradient>

      {/* ══════ BODY ══════ */}
      {pets.length === 0 && !isLoading ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ fontSize: 72 }}>🐾</Text>
          <Text variant="h3" weight="bold" style={{ color: tokens.text, marginTop: 20 }}>No pets yet</Text>
          <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
            Add your furry (or not-so-furry) family members
          </Text>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: C.primary, marginTop: 32 }]}
            onPress={openCreatePet}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text variant="body" weight="bold" style={{ color: '#fff', marginLeft: 8 }}>Add a Pet</Text>
          </TouchableOpacity>
        </View>
      ) : selected ? (
        <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 16, paddingBottom: 100 }}>
          {/* Profile card */}
          <Card shadow="md" style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={[styles.avatarCircle, { backgroundColor: petColor(selected) + '22' }]}>
                <Text style={{ fontSize: 40 }}>{petEmoji(selected)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text variant="h3" weight="black" style={{ color: tokens.text }}>{selected.name}</Text>
                <Text variant="body" secondary>{selected.breed || selected.species}</Text>
                <View style={styles.metaRow}>
                  {selected.birthDate && (
                    <View style={styles.pill}>
                      <Ionicons name="calendar-outline" size={13} color={tokens.textSecondary} />
                      <Text variant="caption" secondary style={{ marginLeft: 4 }}>{petAge(selected.birthDate)}</Text>
                    </View>
                  )}
                  {selected.weight && (
                    <View style={styles.pill}>
                      <Ionicons name="scale-outline" size={13} color={tokens.textSecondary} />
                      <Text variant="caption" secondary style={{ marginLeft: 4 }}>{selected.weight}</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => openEditPet(selected)}
                style={[styles.editBtn, { backgroundColor: tokens.surfaceAlt }]}>
                <Ionicons name="pencil-outline" size={16} color={tokens.textSecondary} />
              </TouchableOpacity>
            </View>
            {selected.nextVet && (
              <View style={[styles.vetRow, { backgroundColor: Colors.primary[50] + (isDark ? '33' : ''), borderRadius: BorderRadius.lg }]}>
                <Ionicons name="medical-outline" size={16} color={Colors.primary[500]} />
                <Text variant="bodySmall" style={{ marginLeft: 8, color: Colors.primary[600] }}>
                  Next vet: <Text variant="bodySmall" weight="bold" style={{ color: Colors.primary[600] }}>{fmtDate(selected.nextVet)}</Text>
                </Text>
              </View>
            )}
            {selected.notes && (
              <View style={[styles.notesRow, { backgroundColor: tokens.surfaceAlt }]}>
                <Ionicons name="document-text-outline" size={14} color={tokens.textSecondary} style={{ marginRight: 8 }} />
                <Text variant="bodySmall" secondary style={{ flex: 1 }}>{selected.notes}</Text>
              </View>
            )}
          </Card>

          {/* Medications */}
          <View>
            <View style={styles.sectionHeader}>
              <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Medications 💊</Text>
              <TouchableOpacity onPress={openAddMed}>
                <Text variant="bodySmall" weight="semibold" style={{ color: C.primary }}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {selected.medications.length === 0 ? (
              <TouchableOpacity onPress={openAddMed}>
                <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                  <Text style={{ fontSize: 24 }}>💊</Text>
                  <Text variant="bodySmall" secondary style={{ marginTop: 6 }}>No medications — tap to add</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 8 }}>
                {selected.medications.map(med => (
                  <TouchableOpacity key={med.id}
                    onLongPress={() => Alert.alert(med.name, 'What would you like to do?', [
                      { text: 'Edit',   onPress: () => openEditMed(med) },
                      { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteMed(med) },
                      { text: 'Cancel', style: 'cancel' },
                    ])}
                    activeOpacity={0.8}>
                    <Card style={styles.medCard} shadow="sm">
                      <View style={[styles.medIcon, { backgroundColor: C.primary + '18' }]}>
                        <Ionicons name="medkit-outline" size={20} color={C.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{med.name}</Text>
                        <Text variant="caption" secondary>
                          {[med.dose, med.schedule].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      {med.nextDue && (
                        <Badge label={`Due ${fmtDate(med.nextDue)}`} variant="warning" />
                      )}
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1 },
  center:  { alignItems: 'center', justifyContent: 'center' },

  header:      { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full },
  petChip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.xl, borderWidth: 1.5 },

  profileCard: { padding: 16 },
  profileRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatarCircle:{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 8 },
  pill:        { flexDirection: 'row', alignItems: 'center' },
  editBtn:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  vetRow:      { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 8 },
  notesRow:    { flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: BorderRadius.lg },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  emptyBox:    { borderRadius: BorderRadius.xl, padding: 20, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  medCard:     { flexDirection: 'row', alignItems: 'center', padding: 14 },
  medIcon:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  createBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: BorderRadius.xl },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBtn:  { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:  { padding: 20, paddingBottom: 60 },
  titleInput:{ fontSize: 20, fontWeight: '700', paddingVertical: 14, borderBottomWidth: 1, marginBottom: 4 },
  nameInput: { fontSize: 22, fontWeight: '700', textAlign: 'center', paddingVertical: 10, borderBottomWidth: 1, marginTop: 12, marginBottom: 4 },
  bigAvatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { marginBottom: 8 },
  chip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  colorDot:{ width: 32, height: 32, borderRadius: 16 },
  formRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel:{ marginLeft: 12, fontSize: 15 },
  inlineInput: { flex: 1, textAlign: 'right', fontSize: 15 },
});
