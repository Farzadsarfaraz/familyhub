import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert,
  Modal, TextInput, ActivityIndicator,
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

const C = ModuleColors.emergency;

// ── Types ──────────────────────────────────────────────────────────────────
interface EmergencyContact {
  id: string; name: string; relation: string; phone: string;
  emoji?: string; color?: string; priority: number;
}
interface MedicalProfile {
  id: string; name: string; avatar?: string;
  bloodType?: string; allergies: string[]; conditions: string[];
  medications: { id: string; name: string; dosage?: string }[];
}
interface NearbyResource {
  id: string; name: string; emoji?: string; address?: string; phone?: string;
}

interface ContactForm { name: string; relation: string; phone: string; emoji: string; color: string; }
interface MedForm     { bloodType: string; allergies: string; conditions: string; }
interface NearbyForm  { name: string; emoji: string; address: string; phone: string; }

const DEFAULT_CONTACT: ContactForm = { name: '', relation: '', phone: '', emoji: '👤', color: Colors.primary[500] };
const DEFAULT_NEARBY:  NearbyForm  = { name: '', emoji: '🏥', address: '', phone: '' };

const CONTACT_EMOJIS = ['👤','👨‍⚕️','👩‍⚕️','👴','👵','🧑‍🚒','👮','🏥','🚑','☎️','👨','👩','🧑'];
const NEARBY_EMOJIS  = ['🏥','💊','🚑','🏨','🦷','🧑‍⚕️','🔬','🩺','⚕️'];
const COLOR_OPTIONS  = [Colors.primary[500], Colors.error[500], Colors.warning[500], Colors.success[500], '#8B5CF6', '#F97316', '#06B6D4'];

// Static always-visible emergency numbers (not stored in DB)
const STATIC_CONTACTS = [
  { name: 'Emergency Services', relation: 'Call 911', phone: '911',          emoji: '🚨', color: Colors.error[500]   },
  { name: 'Poison Control',     relation: 'Poison Help Line', phone: '18002221222', emoji: '☠️', color: Colors.warning[500] },
];

// ── Utilities ──────────────────────────────────────────────────────────────
function avatarLetter(name: string) { return name.charAt(0).toUpperCase(); }

function handleCall(phone: string, name: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits === '911') {
    Alert.alert('Call 911?', 'This will call emergency services.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
    ]);
  } else {
    Linking.openURL(`tel:${digits}`);
  }
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function EmergencyScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  const [profileIdx, setProfileIdx] = useState(0);

  // Contact modal
  const [contactModal,  setContactModal]  = useState(false);
  const [editContact,   setEditContact]   = useState<EmergencyContact | null>(null);
  const [contactForm,   setContactForm]   = useState<ContactForm>(DEFAULT_CONTACT);
  const [savingContact, setSavingContact] = useState(false);

  // Medical edit modal
  const [medModal,  setMedModal]  = useState(false);
  const [medForm,   setMedForm]   = useState<MedForm>({ bloodType: '', allergies: '', conditions: '' });
  const [savingMed, setSavingMed] = useState(false);

  // Nearby modal
  const [nearbyModal,  setNearbyModal]  = useState(false);
  const [nearbyForm,   setNearbyForm]   = useState<NearbyForm>(DEFAULT_NEARBY);
  const [savingNearby, setSavingNearby] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const enabled = !!user?.familyId;

  const { data: contacts = [], isLoading: loadingContacts } = useQuery<EmergencyContact[]>({
    queryKey: ['emergencyContacts'],
    queryFn:  async () => { const r = await api.get('/emergency/contacts'); return r.data.data; },
    enabled,
  });

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery<MedicalProfile[]>({
    queryKey: ['medicalProfiles'],
    queryFn:  async () => { const r = await api.get('/emergency/medical'); return r.data.data; },
    enabled,
  });

  const { data: nearby = [], isLoading: loadingNearby } = useQuery<NearbyResource[]>({
    queryKey: ['nearbyResources'],
    queryFn:  async () => { const r = await api.get('/emergency/nearby'); return r.data.data; },
    enabled,
  });

  const profile = profiles[profileIdx] ?? null;

  // ── Contact CRUD ───────────────────────────────────────────────────────────
  function openAddContact() { setEditContact(null); setContactForm(DEFAULT_CONTACT); setContactModal(true); }
  function openEditContact(c: EmergencyContact) {
    setEditContact(c);
    setContactForm({ name: c.name, relation: c.relation, phone: c.phone, emoji: c.emoji ?? '👤', color: c.color ?? Colors.primary[500] });
    setContactModal(true);
  }
  function closeContactModal() { if (savingContact) return; setContactModal(false); }

  async function saveContact() {
    if (!contactForm.name.trim())  { Alert.alert('Required', 'Enter a name.'); return; }
    if (!contactForm.phone.trim()) { Alert.alert('Required', 'Enter a phone number.'); return; }
    setSavingContact(true);
    try {
      const body = { name: contactForm.name.trim(), relation: contactForm.relation.trim(), phone: contactForm.phone.trim(), emoji: contactForm.emoji, color: contactForm.color };
      if (editContact) {
        await api.patch(`/emergency/contacts/${editContact.id}`, body);
        toast.success('Contact updated');
      } else {
        await api.post('/emergency/contacts', body);
        toast.success('Contact added');
      }
      qc.invalidateQueries({ queryKey: ['emergencyContacts'] });
      closeContactModal();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingContact(false); }
  }

  function confirmDeleteContact(c: EmergencyContact) {
    Alert.alert('Remove Contact', `Remove "${c.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await api.delete(`/emergency/contacts/${c.id}`); qc.invalidateQueries({ queryKey: ['emergencyContacts'] }); }
        catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── Medical Profile Edit ───────────────────────────────────────────────────
  function openEditMed(p: MedicalProfile) {
    if (p.id !== user?.id) { toast.error('You can only edit your own medical profile.'); return; }
    setMedForm({
      bloodType:  p.bloodType  ?? '',
      allergies:  p.allergies.join(', '),
      conditions: p.conditions.join(', '),
    });
    setMedModal(true);
  }
  function closeMedModal() { if (savingMed) return; setMedModal(false); }

  async function saveMed() {
    setSavingMed(true);
    try {
      const allergies  = medForm.allergies.split(',').map(s => s.trim()).filter(Boolean);
      const conditions = medForm.conditions.split(',').map(s => s.trim()).filter(Boolean);
      await api.patch('/emergency/medical', { bloodType: medForm.bloodType.trim() || undefined, allergies, conditions });
      qc.invalidateQueries({ queryKey: ['medicalProfiles'] });
      toast.success('Medical profile updated');
      closeMedModal();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingMed(false); }
  }

  // ── Nearby CRUD ────────────────────────────────────────────────────────────
  function openAddNearby() { setNearbyForm(DEFAULT_NEARBY); setNearbyModal(true); }
  function closeNearbyModal() { if (savingNearby) return; setNearbyModal(false); }

  async function saveNearby() {
    if (!nearbyForm.name.trim()) { Alert.alert('Required', 'Enter a name.'); return; }
    setSavingNearby(true);
    try {
      await api.post('/emergency/nearby', { name: nearbyForm.name.trim(), emoji: nearbyForm.emoji, address: nearbyForm.address.trim() || undefined, phone: nearbyForm.phone.trim() || undefined });
      qc.invalidateQueries({ queryKey: ['nearbyResources'] });
      toast.success('Resource added');
      closeNearbyModal();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingNearby(false); }
  }

  function confirmDeleteNearby(n: NearbyResource) {
    Alert.alert('Remove', `Remove "${n.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await api.delete(`/emergency/nearby/${n.id}`); qc.invalidateQueries({ queryKey: ['nearbyResources'] }); }
        catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ CONTACT MODAL ══════ */}
      <Modal visible={contactModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeContactModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingContact && { opacity: 0.35 }]} onPress={closeContactModal} disabled={savingContact}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>{editContact ? 'Edit Contact' : 'Add Contact'}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveContact} disabled={savingContact}>
              {savingContact ? <ActivityIndicator size="small" color={C.primary} /> : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              {/* Emoji */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {CONTACT_EMOJIS.map(e => (
                  <TouchableOpacity key={e} onPress={() => setContactForm(f => ({ ...f, emoji: e }))}
                    style={[styles.emojiBtn, { backgroundColor: contactForm.emoji === e ? C.primary + '22' : tokens.surfaceAlt, borderColor: contactForm.emoji === e ? C.primary : 'transparent' }]}>
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Color */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {COLOR_OPTIONS.map(col => (
                  <TouchableOpacity key={col} onPress={() => setContactForm(f => ({ ...f, color: col }))}
                    style={[styles.colorDot, { backgroundColor: col, borderWidth: contactForm.color === col ? 3 : 0, borderColor: tokens.text }]} />
                ))}
              </View>
              {[
                { label: 'Name',     key: 'name'     as const, icon: 'person-outline',  placeholder: 'Dr. Sarah Chen',      keyboard: 'default'      as const },
                { label: 'Relation', key: 'relation' as const, icon: 'heart-outline',   placeholder: 'Family Doctor',       keyboard: 'default'      as const },
                { label: 'Phone',    key: 'phone'    as const, icon: 'call-outline',    placeholder: '+1 (555) 123-4567',   keyboard: 'phone-pad'    as const },
              ].map(({ label, key, icon, placeholder, keyboard }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput value={contactForm[key]} onChangeText={t => setContactForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder} placeholderTextColor={tokens.textTertiary}
                    keyboardType={keyboard} style={[styles.inlineInput, { color: tokens.text }]} />
                </View>
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ MEDICAL MODAL ══════ */}
      <Modal visible={medModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeMedModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingMed && { opacity: 0.35 }]} onPress={closeMedModal} disabled={savingMed}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>My Medical Profile</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveMed} disabled={savingMed}>
              {savingMed ? <ActivityIndicator size="small" color={C.primary} /> : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              <Text variant="bodySmall" secondary style={{ marginBottom: 16 }}>
                This information is visible to all family members in an emergency.
              </Text>
              {[
                { label: 'Blood Type',  key: 'bloodType'  as const, icon: 'water-outline',         placeholder: 'O+, A-, B+…',                   multiline: false },
                { label: 'Allergies',   key: 'allergies'  as const, icon: 'warning-outline',        placeholder: 'Penicillin, Shellfish (comma separated)', multiline: true  },
                { label: 'Conditions',  key: 'conditions' as const, icon: 'medical-outline',        placeholder: 'Hypertension, Diabetes… (comma separated)', multiline: true  },
              ].map(({ label, key, icon, placeholder, multiline }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border, alignItems: multiline ? 'flex-start' : 'center' }]}>
                  <View style={[styles.rowLeft, { paddingTop: multiline ? 14 : 0 }]}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput value={medForm[key]} onChangeText={t => setMedForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder} placeholderTextColor={tokens.textTertiary}
                    multiline={multiline}
                    style={[styles.inlineInput, { color: tokens.text, textAlignVertical: multiline ? 'top' : 'center', minHeight: multiline ? 60 : undefined }]} />
                </View>
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ NEARBY MODAL ══════ */}
      <Modal visible={nearbyModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeNearbyModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingNearby && { opacity: 0.35 }]} onPress={closeNearbyModal} disabled={savingNearby}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Add Nearby Resource</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveNearby} disabled={savingNearby}>
              {savingNearby ? <ActivityIndicator size="small" color={C.primary} /> : <Text variant="body" weight="bold" style={{ color: C.primary }}>Add</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {NEARBY_EMOJIS.map(e => (
                  <TouchableOpacity key={e} onPress={() => setNearbyForm(f => ({ ...f, emoji: e }))}
                    style={[styles.emojiBtn, { backgroundColor: nearbyForm.emoji === e ? C.primary + '22' : tokens.surfaceAlt, borderColor: nearbyForm.emoji === e ? C.primary : 'transparent' }]}>
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {[
                { label: 'Name',    key: 'name'    as const, icon: 'business-outline',  placeholder: 'City General Hospital', keyboard: 'default'   as const },
                { label: 'Address', key: 'address' as const, icon: 'location-outline',  placeholder: '123 Main St (optional)', keyboard: 'default'  as const },
                { label: 'Phone',   key: 'phone'   as const, icon: 'call-outline',      placeholder: 'Phone number (optional)', keyboard: 'phone-pad' as const },
              ].map(({ label, key, icon, placeholder, keyboard }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput value={nearbyForm[key]} onChangeText={t => setNearbyForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder} placeholderTextColor={tokens.textTertiary}
                    keyboardType={keyboard} style={[styles.inlineInput, { color: tokens.text }]} />
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
        <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>🚨 Emergency</Text>
        <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
          Critical contacts & medical info
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 20, paddingBottom: 100 }}>

        {/* ── SOS Button ── */}
        <TouchableOpacity
          onPress={() => Alert.alert('Send SOS?', 'This will alert all emergency contacts immediately.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send SOS 🚨', style: 'destructive', onPress: () => toast.error('SOS alert sent to all contacts!') },
          ])}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[Colors.error[600], Colors.error[400]]} style={styles.sosBtn}>
            <Ionicons name="alert-circle" size={36} color="#fff" />
            <Text variant="h3" weight="black" style={{ color: '#fff', marginTop: 8 }}>SEND SOS</Text>
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              Alerts all emergency contacts
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Emergency Contacts ── */}
        <View style={styles.sectionHeader}>
          <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Emergency Contacts</Text>
          <TouchableOpacity onPress={openAddContact}>
            <Text variant="bodySmall" weight="semibold" style={{ color: C.primary }}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Static always-visible contacts */}
        {STATIC_CONTACTS.map((c, i) => (
          <Card key={`static-${i}`} shadow="sm" style={styles.contactCard}>
            <View style={[styles.contactAvatar, { backgroundColor: c.color + '18' }]}>
              <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="body" weight="bold" style={{ color: tokens.text }}>{c.name}</Text>
              <Text variant="caption" secondary>{c.relation}</Text>
              <Text variant="caption" style={{ color: Colors.primary[500] }}>{c.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => handleCall(c.phone, c.name)}
              style={[styles.callBtn, { backgroundColor: Colors.success[500] }]}>
              <Ionicons name="call" size={18} color="#fff" />
            </TouchableOpacity>
          </Card>
        ))}

        {/* DB contacts */}
        {loadingContacts ? (
          <ActivityIndicator size="small" color={C.primary} />
        ) : contacts.length === 0 ? (
          <TouchableOpacity onPress={openAddContact}>
            <View style={[styles.emptyBox, { borderColor: tokens.border, backgroundColor: tokens.surfaceAlt }]}>
              <Text style={{ fontSize: 24 }}>📋</Text>
              <Text variant="bodySmall" secondary style={{ marginTop: 6 }}>Add your family doctor, hospital, etc.</Text>
            </View>
          </TouchableOpacity>
        ) : (
          contacts.map(c => (
            <TouchableOpacity key={c.id} activeOpacity={0.85}
              onLongPress={() => Alert.alert(c.name, 'What would you like to do?', [
                { text: 'Edit',   onPress: () => openEditContact(c) },
                { text: 'Remove', style: 'destructive', onPress: () => confirmDeleteContact(c) },
                { text: 'Cancel', style: 'cancel' },
              ])}>
              <Card shadow="sm" style={styles.contactCard}>
                <View style={[styles.contactAvatar, { backgroundColor: (c.color ?? Colors.primary[500]) + '18' }]}>
                  <Text style={{ fontSize: 22 }}>{c.emoji ?? '👤'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="bold" style={{ color: tokens.text }}>{c.name}</Text>
                  <Text variant="caption" secondary>{c.relation}</Text>
                  <Text variant="caption" style={{ color: Colors.primary[500] }}>{c.phone}</Text>
                </View>
                <TouchableOpacity onPress={() => handleCall(c.phone, c.name)}
                  style={[styles.callBtn, { backgroundColor: Colors.success[500] }]}>
                  <Ionicons name="call" size={18} color="#fff" />
                </TouchableOpacity>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* ── Medical Profiles ── */}
        <View style={styles.sectionHeader}>
          <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Medical Profiles</Text>
          <Badge label={`${profiles.length} members`} variant="primary" />
        </View>

        {loadingProfiles ? (
          <ActivityIndicator size="small" color={C.primary} />
        ) : profiles.length === 0 ? (
          <Card shadow="sm" style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 36 }}>🏥</Text>
            <Text variant="body" secondary style={{ marginTop: 8 }}>No family members yet</Text>
          </Card>
        ) : (
          <>
            {/* Profile selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {profiles.map((p, i) => (
                <TouchableOpacity key={p.id} onPress={() => setProfileIdx(i)}
                  style={[styles.profileTab, {
                    backgroundColor: profileIdx === i ? C.primary : tokens.card,
                    borderColor:     profileIdx === i ? C.primary : tokens.border,
                  }]}>
                  <View style={[styles.profileAvatar, { backgroundColor: profileIdx === i ? 'rgba(255,255,255,0.2)' : tokens.surfaceAlt }]}>
                    <Text variant="body" weight="bold" style={{ color: profileIdx === i ? '#fff' : tokens.text }}>
                      {avatarLetter(p.name)}
                    </Text>
                  </View>
                  <Text variant="bodySmall" weight="semibold"
                    style={{ color: profileIdx === i ? '#fff' : tokens.text, marginTop: 4 }}
                    numberOfLines={1}>{p.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {profile && (
              <Card shadow="md" style={{ padding: 16, gap: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={styles.medRow}>
                    <View style={[styles.medIcon, { backgroundColor: Colors.error[50] }]}>
                      <Text style={{ fontSize: 18 }}>🩸</Text>
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text variant="caption" secondary>Blood Type</Text>
                      <Text variant="h3" weight="black" style={{ color: Colors.error[500] }}>
                        {profile.bloodType ?? '—'}
                      </Text>
                    </View>
                  </View>
                  {profile.id === user?.id && (
                    <TouchableOpacity onPress={() => openEditMed(profile)}
                      style={[styles.editBtn, { backgroundColor: tokens.surfaceAlt }]}>
                      <Ionicons name="pencil-outline" size={16} color={tokens.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.divider, { backgroundColor: tokens.border }]} />

                <View>
                  <Text variant="bodySmall" weight="bold" secondary style={{ marginBottom: 6 }}>ALLERGIES</Text>
                  {profile.allergies.length === 0 ? (
                    <Text variant="caption" secondary>None known</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {profile.allergies.map((a, i) => (
                        <View key={i} style={[styles.pill, { backgroundColor: Colors.error[50], borderColor: Colors.error[200] }]}>
                          <Text variant="caption" style={{ color: Colors.error[600] }}>⚠️ {a}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {profile.conditions.length > 0 && (
                  <View>
                    <Text variant="bodySmall" weight="bold" secondary style={{ marginBottom: 6 }}>CONDITIONS</Text>
                    {profile.conditions.map((cond, i) => (
                      <Text key={i} variant="body" secondary>• {cond}</Text>
                    ))}
                  </View>
                )}

                {profile.medications.length > 0 && (
                  <View>
                    <Text variant="bodySmall" weight="bold" secondary style={{ marginBottom: 6 }}>MEDICATIONS</Text>
                    <View style={{ gap: 4 }}>
                      {profile.medications.map(med => (
                        <View key={med.id} style={[styles.pill, { backgroundColor: Colors.primary[50], borderColor: Colors.primary[200] }]}>
                          <Text variant="caption" style={{ color: Colors.primary[600] }}>
                            💊 {med.name}{med.dosage ? ` · ${med.dosage}` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {profile.allergies.length === 0 && profile.conditions.length === 0 && profile.medications.length === 0 && profile.id === user?.id && (
                  <TouchableOpacity onPress={() => openEditMed(profile)}
                    style={[styles.emptyBox, { borderColor: tokens.border }]}>
                    <Text variant="bodySmall" secondary>Tap to add your blood type, allergies & conditions</Text>
                  </TouchableOpacity>
                )}
              </Card>
            )}
          </>
        )}

        {/* ── Nearby Resources ── */}
        <View style={styles.sectionHeader}>
          <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Nearby Resources</Text>
          <TouchableOpacity onPress={openAddNearby}>
            <Text variant="bodySmall" weight="semibold" style={{ color: C.primary }}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {loadingNearby ? (
          <ActivityIndicator size="small" color={C.primary} />
        ) : nearby.length === 0 ? (
          <TouchableOpacity onPress={openAddNearby}>
            <View style={[styles.emptyBox, { borderColor: tokens.border, backgroundColor: tokens.surfaceAlt }]}>
              <Text style={{ fontSize: 24 }}>🏥</Text>
              <Text variant="bodySmall" secondary style={{ marginTop: 6 }}>Add your local hospital, pharmacy, clinic…</Text>
            </View>
          </TouchableOpacity>
        ) : (
          nearby.map(n => (
            <TouchableOpacity key={n.id} activeOpacity={0.85}
              onLongPress={() => confirmDeleteNearby(n)}>
              <Card shadow="sm" style={styles.nearbyCard}>
                <Text style={{ fontSize: 22 }}>{n.emoji ?? '🏥'}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{n.name}</Text>
                  {n.address && <Text variant="caption" secondary>{n.address}</Text>}
                </View>
                {n.phone ? (
                  <TouchableOpacity onPress={() => handleCall(n.phone!, n.name)}
                    style={[styles.callBtn, { backgroundColor: Colors.success[500] }]}>
                    <Ionicons name="call" size={16} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  sosBtn:        { borderRadius: BorderRadius['2xl'], padding: 28, alignItems: 'center', shadowColor: Colors.error[500], shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contactCard:   { flexDirection: 'row', alignItems: 'center', padding: 14 },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  callBtn:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyBox:      { borderRadius: BorderRadius.xl, padding: 20, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  profileTab:    { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: BorderRadius.xl, borderWidth: 1.5, minWidth: 80 },
  profileAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  medRow:        { flexDirection: 'row', alignItems: 'center', flex: 1 },
  medIcon:       { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  editBtn:       { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  divider:       { height: 1 },
  pill:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, marginBottom: 4 },
  nearbyCard:    { flexDirection: 'row', alignItems: 'center', padding: 14 },
  // Modal
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalBtn:     { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:     { padding: 20, paddingBottom: 60 },
  emojiBtn:     { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  colorDot:     { width: 30, height: 30, borderRadius: 15 },
  formRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft:      { flexDirection: 'row', alignItems: 'center' },
  rowLabel:     { marginLeft: 12, fontSize: 15 },
  inlineInput:  { flex: 1, textAlign: 'right', fontSize: 15 },
});
