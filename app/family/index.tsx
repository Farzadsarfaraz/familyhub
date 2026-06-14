import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Avatar, Badge, Button, Input } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

const MEMBERS = [
  { id: '1', name: 'John Smith',  email: 'john@family.com', role: 'PARENT',      online: true,  avatar: undefined },
  { id: '2', name: 'Jane Smith',  email: 'jane@family.com', role: 'PARENT',      online: false, avatar: undefined },
  { id: '3', name: 'Emma Smith',  email: 'emma@family.com', role: 'CHILD',       online: true,  avatar: undefined },
  { id: '4', name: 'Grandma Sue', email: 'sue@family.com',  role: 'GRANDPARENT', online: false, avatar: undefined },
];

const INVITE_CODE = 'SMITH2025';

export default function FamilyScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [inviteEmail, setInviteEmail] = useState('');

  const handleShare = async () => {
    await Share.share({
      message: `Join our FamilyHub! Use code: ${INVITE_CODE} or link: familyhub://join/${INVITE_CODE}`,
      title: 'Join Smith Family on FamilyHub',
    });
  };

  const roleColor: Record<string, string> = {
    PARENT:      Colors.primary[500],
    CHILD:       Colors.success[500],
    GRANDPARENT: Colors.warning[500],
    GUEST:       Colors.neutral[400],
  };

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
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={22} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
        </View>

        {/* Family avatar cluster */}
        <View style={styles.familyCluster}>
          <Text style={{ fontSize: 56 }}>👨‍👩‍👧‍👦</Text>
          <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text, marginTop: 12 }}>
            The Smith Family
          </Text>
          <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
            {MEMBERS.length} members · {MEMBERS.filter((m) => m.online).length} online
          </Text>
          <View style={styles.avatarCluster}>
            {MEMBERS.map((m, i) => (
              <View key={m.id} style={[styles.clusterAvatar, { marginLeft: i > 0 ? -12 : 0 }]}>
                <Avatar name={m.name} size="md" online={m.online} />
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60, gap: 20 }}>
        {/* Invite */}
        <Card shadow="md">
          <Text variant="h4" weight="bold" style={{ marginBottom: 4 }}>Invite Family Members 🔗</Text>
          <Text variant="bodySmall" secondary style={{ marginBottom: 16 }}>
            Share your invite code or send a direct invite
          </Text>

          <View style={[styles.codeBox, { backgroundColor: Colors.primary[50], borderColor: Colors.primary[200] }]}>
            <Text variant="h2" weight="black" color={Colors.primary[600]} center>{INVITE_CODE}</Text>
            <Text variant="caption" secondary center style={{ marginTop: 4 }}>Family Invite Code</Text>
          </View>

          <Button label="Share Invite Link" onPress={handleShare} fullWidth size="lg" style={{ marginTop: 16 }}
            leftIcon={<Ionicons name="share-outline" size={18} color="#fff" />}
          />

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: tokens.border }]} />
            <Text variant="caption" secondary style={{ marginHorizontal: 12 }}>or invite by email</Text>
            <View style={[styles.line, { backgroundColor: tokens.border }]} />
          </View>

          <Input
            placeholder="Enter email address"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
          />
          <Button label="Send Invitation" variant="outline" onPress={() => Alert.alert('Sent!', `Invitation sent to ${inviteEmail}`)}
            fullWidth size="lg" style={{ marginTop: 12 }} />
        </Card>

        {/* Members List */}
        <View>
          <Text variant="h4" weight="bold" style={{ marginBottom: 14 }}>Members</Text>
          <Card shadow="sm" padding={0}>
            {MEMBERS.map((member, i) => (
              <View
                key={member.id}
                style={[
                  styles.memberRow,
                  i < MEMBERS.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border },
                ]}
              >
                <Avatar name={member.name} size="md" online={member.online} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold">{member.name}</Text>
                  <Text variant="caption" secondary numberOfLines={1}>{member.email}</Text>
                </View>
                <Badge
                  label={member.role}
                  variant={member.role === 'PARENT' ? 'primary' : member.role === 'CHILD' ? 'success' : 'warning'}
                  size="sm"
                />
                <TouchableOpacity style={styles.moreBtn}>
                  <Ionicons name="ellipsis-vertical" size={18} color={tokens.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        </View>

        {/* Danger Zone */}
        <View>
          <Text variant="h4" weight="bold" style={{ marginBottom: 14 }}>Settings</Text>
          <Card shadow="sm" padding={0}>
            {[
              { icon: 'create-outline',  label: 'Rename Family',        onPress: () => {} },
              { icon: 'image-outline',   label: 'Change Family Photo',  onPress: () => {} },
              { icon: 'exit-outline',    label: 'Leave Family',         onPress: () => Alert.alert('Leave Family', 'Are you sure?') },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.settingRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}
                onPress={item.onPress}
              >
                <Ionicons name={item.icon as any} size={20} color={item.label.includes('Leave') ? Colors.error[500] : tokens.textSecondary} />
                <Text
                  variant="body"
                  weight="medium"
                  color={item.label.includes('Leave') ? Colors.error[500] : undefined}
                  style={{ flex: 1, marginLeft: 14 }}
                >
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  header:         { paddingHorizontal: Spacing[4], paddingBottom: Spacing[6] },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  familyCluster:  { alignItems: 'center' },
  avatarCluster:  { flexDirection: 'row', marginTop: 16 },
  clusterAvatar:  { borderWidth: 2, borderColor: '#fff', borderRadius: 26 },
  codeBox:        { borderRadius: BorderRadius.xl, padding: 20, borderWidth: 1.5, marginBottom: 4 },
  divider:        { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line:           { flex: 1, height: 1 },
  memberRow:      { flexDirection: 'row', alignItems: 'center', padding: 14 },
  moreBtn:        { padding: 8, marginLeft: 4 },
  settingRow:     { flexDirection: 'row', alignItems: 'center', padding: 16 },
});
