import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Share, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Text, Card, Avatar, Badge, Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { useFamilyStore } from '@/store/family.store';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

type Mode = 'home' | 'create' | 'join';

export default function FamilyScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user         = useAuthStore(s => s.user);
  const refreshUser  = useAuthStore(s => s.refreshUser);
  const { createFamily, joinFamily, leaveFamily, removeMember } = useFamilyStore();

  const [mode, setMode]           = useState<Mode>('home');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy]           = useState(false);

  const hasFamilyId = !!user?.familyId;

  const { data: familyData, isLoading, refetch } = useQuery({
    queryKey: ['family-me'],
    queryFn:  async () => {
      const { default: api } = await import('@/lib/api');
      const { data } = await api.get('/families/me');
      return data.data;
    },
    enabled: hasFamilyId,
  });

  const family  = familyData;
  const members: any[] = family?.members ?? [];

  async function handleCreate() {
    if (!familyName.trim()) { toast.error('Enter a family name'); return; }
    setBusy(true);
    try {
      await createFamily(familyName.trim());
      await refreshUser();
      toast.success(`${familyName} family created!`);
      setMode('home');
      refetch();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) { toast.error('Enter an invite code'); return; }
    setBusy(true);
    try {
      await joinFamily(inviteCode.trim().toUpperCase());
      await refreshUser();
      toast.success('Joined the family!');
      setMode('home');
      refetch();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    Alert.alert('Leave Family', 'Are you sure you want to leave this family?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await leaveFamily();
            await refreshUser();
            toast.success('You left the family');
          } catch (err) {
            toast.error(parseApiError(err));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function handleShare() {
    if (!family?.inviteCode) return;
    await Share.share({
      message: `Join our family on FamilyHub!\nInvite code: ${family.inviteCode}`,
      title: `Join ${family.name} on FamilyHub`,
    });
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (memberId === user?.id) { toast.error("Use Leave Family to remove yourself"); return; }
    Alert.alert('Remove Member', `Remove ${memberName} from the family?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(memberId);
            refetch();
            toast.success(`${memberName} removed`);
          } catch (err) {
            toast.error(parseApiError(err));
          }
        },
      },
    ]);
  }

  // ── No family: show setup screen ─────────────────────────────────────────

  if (!hasFamilyId || (!family && !isLoading)) {
    return (
      <View style={[styles.root, { backgroundColor: tokens.background }]}>
        <LinearGradient
          colors={isDark ? ['#0F0A2E', '#0A0A1A'] : ['#EEF4FF', '#F5F7FF']}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
            </TouchableOpacity>
            <Text variant="h3" weight="bold" style={{ color: isDark ? '#fff' : tokens.text }}>Family Setup</Text>
            <View style={{ width: 24 }} />
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60 }}>

          {mode === 'home' && (
            <>
              <View style={styles.setupHero}>
                <Text style={{ fontSize: 64 }}>👨‍👩‍👧‍👦</Text>
                <Text variant="h2" weight="black" style={{ marginTop: 16, color: tokens.text, textAlign: 'center' }}>
                  Start Your Family Hub
                </Text>
                <Text variant="body" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 8 }}>
                  Create a new family space or join an existing one with an invite code
                </Text>
              </View>

              <View style={{ gap: 14, marginTop: 32 }}>
                <TouchableOpacity
                  style={[styles.setupCard, { backgroundColor: Colors.primary[500] }]}
                  onPress={() => setMode('create')}
                  activeOpacity={0.85}
                >
                  <View style={styles.setupCardIcon}>
                    <Ionicons name="home" size={28} color={Colors.primary[500]} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text variant="h4" weight="bold" color="#fff">Create a Family</Text>
                    <Text variant="bodySmall" color="rgba(255,255,255,0.8)" style={{ marginTop: 2 }}>
                      Start a new family space and invite members
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.setupCard, { backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: Colors.primary[300] }]}
                  onPress={() => setMode('join')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.setupCardIcon, { backgroundColor: Colors.primary[50] }]}>
                    <Ionicons name="enter" size={28} color={Colors.primary[500]} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Join a Family</Text>
                    <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginTop: 2 }}>
                      Enter an invite code from a family member
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary[500]} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {mode === 'create' && (
            <Card shadow="md" style={{ marginTop: 24 }}>
              <TouchableOpacity style={styles.backRow} onPress={() => setMode('home')}>
                <Ionicons name="arrow-back" size={18} color={tokens.textSecondary} />
                <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginLeft: 6 }}>Back</Text>
              </TouchableOpacity>

              <Text variant="h3" weight="bold" style={{ marginBottom: 6, color: tokens.text }}>Create Your Family</Text>
              <Text variant="body" style={{ color: tokens.textSecondary, marginBottom: 24 }}>
                Give your family space a name — you can change it later.
              </Text>

              <Text variant="label" weight="semibold" style={{ color: tokens.textSecondary, marginBottom: 8 }}>
                FAMILY NAME
              </Text>
              <TextInput
                value={familyName}
                onChangeText={setFamilyName}
                placeholder="e.g. The Johnson Family"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.input, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt }]}
                autoFocus
              />

              <Button
                label={busy ? 'Creating…' : 'Create Family'}
                onPress={handleCreate}
                fullWidth
                size="lg"
                style={{ marginTop: 20 }}
                disabled={busy}
                leftIcon={busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="home" size={18} color="#fff" />}
              />
            </Card>
          )}

          {mode === 'join' && (
            <Card shadow="md" style={{ marginTop: 24 }}>
              <TouchableOpacity style={styles.backRow} onPress={() => setMode('home')}>
                <Ionicons name="arrow-back" size={18} color={tokens.textSecondary} />
                <Text variant="bodySmall" style={{ color: tokens.textSecondary, marginLeft: 6 }}>Back</Text>
              </TouchableOpacity>

              <Text variant="h3" weight="bold" style={{ marginBottom: 6, color: tokens.text }}>Join a Family</Text>
              <Text variant="body" style={{ color: tokens.textSecondary, marginBottom: 24 }}>
                Ask a family member for the invite code shown in their Family Management screen.
              </Text>

              <Text variant="label" weight="semibold" style={{ color: tokens.textSecondary, marginBottom: 8 }}>
                INVITE CODE
              </Text>
              <TextInput
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="Enter code (e.g. CLABCD1234)"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.input, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt, letterSpacing: 3, textTransform: 'uppercase' }]}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
              />

              <Button
                label={busy ? 'Joining…' : 'Join Family'}
                onPress={handleJoin}
                fullWidth
                size="lg"
                style={{ marginTop: 20 }}
                disabled={busy}
                leftIcon={busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="enter" size={18} color="#fff" />}
              />
            </Card>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Has family: show management screen ───────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: tokens.background }]}>
        <ActivityIndicator color={Colors.primary[500]} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? ['#0F0A2E', '#0A0A1A'] : ['#EEF4FF', '#F5F7FF']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
          <Text variant="h3" weight="bold" style={{ color: isDark ? '#fff' : tokens.text }}>Family Management</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.familyCluster}>
          <Text style={{ fontSize: 52 }}>👨‍👩‍👧‍👦</Text>
          <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text, marginTop: 12 }}>
            {family?.name ?? 'My Family'}
          </Text>
          <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </Text>
          <View style={styles.avatarCluster}>
            {members.slice(0, 5).map((m: any, i: number) => (
              <View key={m.id} style={[styles.clusterAvatar, { marginLeft: i > 0 ? -12 : 0 }]}>
                <Avatar name={m.name} size="md" />
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60, gap: 20 }}>

        {/* Invite code */}
        <Card shadow="md">
          <Text variant="h4" weight="bold" style={{ marginBottom: 4 }}>Invite Members 🔗</Text>
          <Text variant="bodySmall" secondary style={{ marginBottom: 16 }}>
            Share this code so family members can join
          </Text>

          <View style={[styles.codeBox, { backgroundColor: Colors.primary[50], borderColor: Colors.primary[200] }]}>
            <Text variant="h2" weight="black" color={Colors.primary[600]} center style={{ letterSpacing: 4 }}>
              {family?.inviteCode ?? '—'}
            </Text>
            <Text variant="caption" secondary center style={{ marginTop: 4 }}>Family Invite Code</Text>
          </View>

          <Button
            label="Share Invite Code"
            onPress={handleShare}
            fullWidth
            size="lg"
            style={{ marginTop: 16 }}
            leftIcon={<Ionicons name="share-outline" size={18} color="#fff" />}
          />
        </Card>

        {/* Members */}
        <View>
          <Text variant="h4" weight="bold" style={{ marginBottom: 14 }}>Members</Text>
          <Card shadow="sm" padding={0}>
            {members.map((member: any, i: number) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberRow,
                  i < members.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border },
                ]}
                onLongPress={() => handleRemoveMember(member.id, member.name)}
                activeOpacity={0.7}
              >
                <Avatar name={member.name} uri={member.avatar} size="md" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold">
                    {member.name}{member.id === user?.id ? ' (you)' : ''}
                  </Text>
                  <Text variant="caption" secondary numberOfLines={1}>{member.email}</Text>
                </View>
                <Badge
                  label={member.role}
                  variant={member.role === 'PARENT' ? 'primary' : member.role === 'CHILD' ? 'success' : 'warning'}
                  size="sm"
                />
              </TouchableOpacity>
            ))}
          </Card>
          <Text variant="caption" secondary style={{ marginTop: 8, marginLeft: 4 }}>
            Long-press a member to remove them
          </Text>
        </View>

        {/* Settings */}
        <View>
          <Text variant="h4" weight="bold" style={{ marginBottom: 14 }}>Settings</Text>
          <Card shadow="sm" padding={0}>
            <TouchableOpacity
              style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: tokens.border }]}
              onPress={() => {}}
            >
              <Ionicons name="create-outline" size={20} color={tokens.textSecondary} />
              <Text variant="body" weight="medium" style={{ flex: 1, marginLeft: 14 }}>Rename Family</Text>
              <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow} onPress={handleLeave}>
              <Ionicons name="exit-outline" size={20} color={Colors.error[500]} />
              <Text variant="body" weight="medium" color={Colors.error[500]} style={{ flex: 1, marginLeft: 14 }}>
                Leave Family
              </Text>
              <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
            </TouchableOpacity>
          </Card>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  center:        { alignItems: 'center', justifyContent: 'center' },
  header:        { paddingHorizontal: Spacing[4], paddingBottom: Spacing[6] },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  familyCluster: { alignItems: 'center' },
  avatarCluster: { flexDirection: 'row', marginTop: 16 },
  clusterAvatar: { borderWidth: 2, borderColor: '#fff', borderRadius: 26 },
  codeBox:       { borderRadius: BorderRadius.xl, padding: 20, borderWidth: 1.5, marginBottom: 4 },
  memberRow:     { flexDirection: 'row', alignItems: 'center', padding: 14 },
  settingRow:    { flexDirection: 'row', alignItems: 'center', padding: 16 },
  setupHero:     { alignItems: 'center', paddingTop: 32 },
  setupCard:     { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 20 },
  setupCardIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  backRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input:         { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
});
