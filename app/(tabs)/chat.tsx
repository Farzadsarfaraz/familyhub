import React, { useState, useRef } from 'react';
import {
  View, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text, Avatar, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { format } from 'date-fns';

interface MockMessage {
  id:        string;
  content:   string;
  senderId:  string;
  senderName: string;
  time:      Date;
  type:      'text' | 'image';
  reactions?: string[];
  read:      boolean;
}

const ME = 'me';

const INITIAL_MESSAGES: MockMessage[] = [
  { id: '1', content: "Don't forget we have family dinner at 7 PM! 🍝", senderId: 'mom', senderName: 'Mom', time: new Date(Date.now() - 3600000 * 2), type: 'text', reactions: ['❤️', '👍'], read: true },
  { id: '2', content: "Can someone pick up Emma from piano?", senderId: 'dad', senderName: 'Dad', time: new Date(Date.now() - 3600000), type: 'text', reactions: [], read: true },
  { id: '3', content: "I can do it! I'll be done with work by 4 😊", senderId: ME, senderName: 'You', time: new Date(Date.now() - 1800000), type: 'text', reactions: ['🙏'], read: true },
  { id: '4', content: "Also added the groceries to the shopping list", senderId: ME, senderName: 'You', time: new Date(Date.now() - 1800000 + 60000), type: 'text', reactions: [], read: true },
  { id: '5', content: "You're the best! ❤️", senderId: 'mom', senderName: 'Mom', time: new Date(Date.now() - 900000), type: 'text', reactions: [], read: true },
  { id: '6', content: "Emma says thank you 🎹", senderId: 'dad', senderName: 'Dad', time: new Date(Date.now() - 300000), type: 'text', reactions: ['😄'], read: false },
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user   = useAuthStore((s) => s.user);
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<MockMessage[]>(INITIAL_MESSAGES);
  const [input,    setInput]    = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg: MockMessage = {
      id:        Date.now().toString(),
      content:   input.trim(),
      senderId:  ME,
      senderName: 'You',
      time:      new Date(),
      type:      'text',
      reactions: [],
      read:      false,
    };
    setMessages((prev) => [...prev, msg]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const renderMessage = ({ item, index }: { item: MockMessage; index: number }) => {
    const isMe     = item.senderId === ME;
    const showName = !isMe && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    const showTime = index === messages.length - 1 || messages[index + 1]?.senderId !== item.senderId;

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && showTime && (
          <Avatar name={item.senderName} size="sm" style={{ alignSelf: 'flex-end', marginRight: 8 } as any} />
        )}
        {!isMe && !showTime && <View style={{ width: 40 }} />}

        <View style={[styles.msgWrapper, isMe && { alignItems: 'flex-end' }]}>
          {showName && !isMe && (
            <Text variant="caption" weight="semibold" color={Colors.primary[500]} style={{ marginBottom: 3, marginLeft: 4 }}>
              {item.senderName}
            </Text>
          )}
          <Pressable
            style={[
              styles.bubble,
              isMe ? [styles.bubbleMe, { backgroundColor: Colors.primary[500] }]
                   : [styles.bubbleThem, { backgroundColor: tokens.card, borderColor: tokens.border }],
            ]}
            onLongPress={() => {}}
          >
            <Text
              variant="body"
              color={isMe ? '#fff' : tokens.text}
              style={{ lineHeight: 22 }}
            >
              {item.content}
            </Text>
          </Pressable>
          {item.reactions && item.reactions.length > 0 && (
            <View style={styles.reactions}>
              {item.reactions.map((r, i) => (
                <View key={i} style={[styles.reactionBubble, { backgroundColor: tokens.surfaceAlt }]}>
                  <Text style={{ fontSize: 13 }}>{r}</Text>
                </View>
              ))}
            </View>
          )}
          {showTime && (
            <Text variant="caption" muted style={{ marginTop: 3, marginHorizontal: 4 }}>
              {format(item.time, 'h:mm a')}
              {isMe && (item.read ? ' ✓✓' : ' ✓')}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: tokens.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: tokens.card, borderBottomColor: tokens.border }]}>
        <Avatar name="Smith Family" size="md" color={Colors.primary[500]} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text variant="h4" weight="bold">Family Chat</Text>
          <Text variant="caption" color={Colors.success[500]}>4 members • 2 online</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="videocam-outline" size={22} color={tokens.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headerBtn, { marginLeft: 8 }]}>
          <Ionicons name="information-circle-outline" size={22} color={tokens.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor:  tokens.card,
            borderTopColor:   tokens.border,
            paddingBottom:    insets.bottom + 8,
          },
        ]}
      >
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="add-circle-outline" size={26} color={Colors.primary[500]} />
        </TouchableOpacity>

        <View style={[styles.inputWrapper, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
          <TextInput
            style={[styles.textInput, { color: tokens.text }]}
            placeholder="Message..."
            placeholderTextColor={tokens.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity style={styles.emojiBtn}>
            <Ionicons name="happy-outline" size={22} color={tokens.textTertiary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() ? Colors.primary[500] : tokens.surfaceAlt }]}
          onPress={sendMessage}
          activeOpacity={0.8}
        >
          <Ionicons
            name={input.trim() ? 'send' : 'mic-outline'}
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
  headerBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  messageList:   { padding: 16, gap: 4 },
  msgRow:        { flexDirection: 'row', marginVertical: 3, alignItems: 'flex-end' },
  msgRowMe:      { flexDirection: 'row-reverse' },
  msgWrapper:    { maxWidth: '78%' },
  bubble:        { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleMe:      { borderBottomRightRadius: 4 },
  bubbleThem:    { borderWidth: 1, borderBottomLeftRadius: 4 },
  reactions:     { flexDirection: 'row', gap: 4, marginTop: 4, marginLeft: 4 },
  reactionBubble: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12 },
  inputRow:      { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 8 },
  attachBtn:     { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  inputWrapper:  { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: BorderRadius.xl, borderWidth: 1, paddingLeft: 14, paddingRight: 8, paddingVertical: 8 },
  textInput:     { flex: 1, maxHeight: 120, fontSize: 15, lineHeight: 22 },
  emojiBtn:      { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  sendBtn:       { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
