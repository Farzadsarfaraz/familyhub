import React, { useState, useRef, useEffect } from 'react';
import {
  View, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Pressable,
  Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { Text, Avatar } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { Colors, BorderRadius } from '@/constants/theme';
import { format } from 'date-fns';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

const SOCKET_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api').replace('/api', '');

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  messageId: string;
}

interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'IMAGE';
  mediaUrl?: string;
  roomId: string;
  senderId: string;
  sender: { id: string; name: string; avatar?: string };
  reactions: Reaction[];
  createdAt: string;
}

export default function ChatScreen() {
  const insets         = useSafeAreaInsets();
  const { tokens }     = useTheme();
  const user           = useAuthStore(s => s.user);
  const listRef        = useRef<FlatList>(null);
  const socketRef      = useRef<Socket | null>(null);
  const roomIdRef      = useRef<string | null>(null);
  const typingTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memberNamesRef = useRef<Record<string, string>>({});

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [connected,   setConnected]   = useState(false);
  const [input,       setInput]       = useState('');
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);

  const hasFamilyId = !!user?.familyId;

  // ── Init: room + history + socket ─────────────────────────────────────────
  useEffect(() => {
    if (!hasFamilyId) { setLoading(false); return; }

    let socket: Socket;

    async function init() {
      try {
        // 1. Get / create family chat room
        const { data: roomData } = await api.get('/chat/room');
        const room = roomData.data;
        roomIdRef.current = room.id;

        // 2. Load history
        const { data: histData } = await api.get(`/chat/room/${room.id}/messages`);
        setMessages(histData.data ?? []);

        // 3. Cache member names for typing indicator
        try {
          const { data: fam } = await api.get('/families/me');
          const names: Record<string, string> = {};
          (fam.data?.members ?? []).forEach((m: any) => { names[m.id] = m.name; });
          memberNamesRef.current = names;
        } catch { /* non-critical */ }

        // 4. Connect socket
        const token = await AsyncStorage.getItem('accessToken');
        socket = io(`${SOCKET_URL}/chat`, {
          auth:                 { token },
          transports:           ['websocket'],
          reconnection:         true,
          reconnectionAttempts: 10,
          reconnectionDelay:    1000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          setConnected(true);
          socket.emit('join_room', { roomId: room.id });
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('new_message', (msg: Message) => {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
        });

        socket.on('user_typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
          if (userId === user?.id) return;
          const name = memberNamesRef.current[userId] ?? 'Someone';
          setTypingUsers(prev =>
            isTyping
              ? prev.some(u => u.id === userId) ? prev : [...prev, { id: userId, name }]
              : prev.filter(u => u.id !== userId),
          );
        });

        socket.on('reaction_updated', ({ messageId, reaction }: { messageId: string; reaction: Reaction }) => {
          setMessages(prev => prev.map(m => {
            if (m.id !== messageId) return m;
            const existing = m.reactions ?? [];
            if (existing.some(r => r.userId === reaction.userId && r.emoji === reaction.emoji)) return m;
            return { ...m, reactions: [...existing, reaction] };
          }));
        });

      } catch (err) {
        toast.error(parseApiError(err));
      } finally {
        setLoading(false);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 150);
      }
    }

    init();

    return () => {
      if (socket) {
        if (roomIdRef.current) socket.emit('leave_room', { roomId: roomIdRef.current });
        socket.disconnect();
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [hasFamilyId]);

  // ── Send ───────────────────────────────────────────────────────────────────
  function sendMessage() {
    const text = input.trim();
    if (!text || !socketRef.current || !roomIdRef.current) return;
    socketRef.current.emit('typing', { roomId: roomIdRef.current, isTyping: false });
    if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; }
    socketRef.current.emit('send_message', { roomId: roomIdRef.current, content: text, type: 'TEXT' });
    setInput('');
  }

  function handleInputChange(text: string) {
    setInput(text);
    if (!socketRef.current || !roomIdRef.current) return;
    socketRef.current.emit('typing', { roomId: roomIdRef.current, isTyping: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('typing', { roomId: roomIdRef.current!, isTyping: false });
    }, 1500);
  }

  function showReactionPicker(messageId: string) {
    if (!socketRef.current || !roomIdRef.current) return;
    const emit = (emoji: string) =>
      socketRef.current!.emit('add_reaction', { messageId, emoji, roomId: roomIdRef.current });
    Alert.alert('Add Reaction', '', [
      { text: '❤️', onPress: () => emit('❤️') },
      { text: '👍', onPress: () => emit('👍') },
      { text: '😄', onPress: () => emit('😄') },
      { text: '🙏', onPress: () => emit('🙏') },
      { text: '🔥', onPress: () => emit('🔥') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // ── Render message ─────────────────────────────────────────────────────────
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe     = item.senderId === user?.id;
    const showName = !isMe && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    const showTime = index === messages.length - 1 || messages[index + 1]?.senderId !== item.senderId;

    const reactionGroups = (item.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
      return acc;
    }, {});

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && showTime ? (
          <View style={{ alignSelf: 'flex-end', marginRight: 8 }}>
            <Avatar name={item.sender?.name ?? '?'} uri={item.sender?.avatar} size="sm" />
          </View>
        ) : (!isMe && <View style={{ width: 40 }} />)}

        <View style={[styles.msgWrapper, isMe && { alignItems: 'flex-end' }]}>
          {showName && !isMe && (
            <Text variant="caption" weight="semibold" color={Colors.primary[500]} style={{ marginBottom: 3, marginLeft: 4 }}>
              {item.sender?.name}
            </Text>
          )}

          <Pressable
            style={[
              styles.bubble,
              isMe
                ? [styles.bubbleMe,   { backgroundColor: Colors.primary[500] }]
                : [styles.bubbleThem, { backgroundColor: tokens.card, borderColor: tokens.border }],
            ]}
            onLongPress={() => showReactionPicker(item.id)}
          >
            <Text variant="body" color={isMe ? '#fff' : tokens.text} style={{ lineHeight: 22 }}>
              {item.content}
            </Text>
          </Pressable>

          {Object.keys(reactionGroups).length > 0 && (
            <View style={[styles.reactions, isMe && { justifyContent: 'flex-end' }]}>
              {Object.entries(reactionGroups).map(([emoji, count]) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionBubble, { backgroundColor: tokens.surfaceAlt }]}
                  onPress={() => socketRef.current?.emit('add_reaction', { messageId: item.id, emoji, roomId: roomIdRef.current })}
                >
                  <Text style={{ fontSize: 13 }}>{emoji}{count > 1 ? ` ${count}` : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showTime && (
            <Text variant="caption" muted style={{ marginTop: 3, marginHorizontal: 4 }}>
              {format(new Date(item.createdAt), 'h:mm a')}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ── Empty / no-family states ───────────────────────────────────────────────
  const ListEmpty = () => {
    if (loading) return (
      <View style={styles.emptyCenter}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text variant="body" style={{ color: tokens.textSecondary, marginTop: 14 }}>Loading chat…</Text>
      </View>
    );
    return (
      <View style={styles.emptyCenter}>
        <Ionicons name="chatbubbles-outline" size={64} color={tokens.textTertiary} />
        <Text variant="h4" weight="bold" style={{ marginTop: 18, color: tokens.text }}>No messages yet</Text>
        <Text variant="body" style={{ color: tokens.textSecondary, marginTop: 8, textAlign: 'center' }}>
          Type a message below and say hello! 👋
        </Text>
      </View>
    );
  };

  if (!hasFamilyId) {
    return (
      <View style={[styles.root, styles.emptyCenter, { backgroundColor: tokens.background }]}>
        <Ionicons name="chatbubbles-outline" size={64} color={tokens.textTertiary} />
        <Text variant="h4" weight="bold" style={{ marginTop: 16, color: tokens.text }}>No Family Yet</Text>
        <Text variant="body" style={{ color: tokens.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 }}>
          Join or create a family to start chatting
        </Text>
      </View>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: tokens.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: tokens.card, borderBottomColor: tokens.border }]}>
        <Avatar name="Family Chat" size="md" color={Colors.primary[500]} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text variant="h4" weight="bold">Family Chat</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: connected ? Colors.success[500] : tokens.textTertiary }]} />
            <Text variant="caption" color={connected ? Colors.success[500] : tokens.textTertiary}>
              {connected ? 'Live' : 'Connecting…'}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages list — always rendered, empty state via ListEmptyComponent */}
      <FlatList
        ref={listRef}
        data={loading ? [] : messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={[styles.messageList, (loading || messages.length === 0) && styles.messageListEmpty]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onLayout={() => !loading && listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<ListEmpty />}
      />

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <View style={[styles.typingRow, { backgroundColor: tokens.background }]}>
          <Text variant="caption" color={tokens.textSecondary}>
            {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
          </Text>
        </View>
      )}

      {/* Input bar — paddingBottom clears the absolute-positioned tab bar (height = 56 + insets.bottom) */}
      <View style={[styles.inputBar, { backgroundColor: tokens.card, borderTopColor: tokens.border, paddingBottom: 56 + insets.bottom }]}>
        <View style={[styles.inputWrapper, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
          <TextInput
            style={[styles.textInput, { color: tokens.text }]}
            placeholder="Type a message…"
            placeholderTextColor={tokens.textTertiary}
            value={input}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: input.trim() ? Colors.primary[500] : tokens.surfaceAlt },
          ]}
          onPress={sendMessage}
          activeOpacity={0.75}
        >
          <Ionicons
            name="send"
            size={18}
            color={input.trim() ? '#fff' : tokens.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  statusRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5 },
  statusDot:     { width: 7, height: 7, borderRadius: 4 },
  list:          { flex: 1 },
  messageList:   { padding: 16, gap: 4 },
  messageListEmpty: { flex: 1 },
  emptyCenter:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  msgRow:        { flexDirection: 'row', marginVertical: 3, alignItems: 'flex-end' },
  msgRowMe:      { flexDirection: 'row-reverse' },
  msgWrapper:    { maxWidth: '78%' },
  bubble:        { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleMe:      { borderBottomRightRadius: 4 },
  bubbleThem:    { borderWidth: 1, borderBottomLeftRadius: 4 },
  reactions:     { flexDirection: 'row', gap: 4, marginTop: 4, marginLeft: 4, flexWrap: 'wrap' },
  reactionBubble: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12 },
  typingRow:     { paddingHorizontal: 20, paddingVertical: 6 },
  inputBar:      { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 8 },
  inputWrapper:  { flex: 1, borderRadius: BorderRadius.xl, borderWidth: 1.5, paddingLeft: 16, paddingRight: 8, paddingVertical: 10, minHeight: 48 },
  textInput:     { fontSize: 15, lineHeight: 22, maxHeight: 120 },
  sendBtn:       { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
