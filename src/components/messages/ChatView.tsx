import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WD } from '../../constants/theme';
import type { Conversation, Message } from '../../types/social';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

interface ChatViewProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  onBack: () => void;
  onSendMessage: (content: string) => Promise<void> | void;
  onReport: () => void;
}

export function ChatView({ conversation, messages, currentUserId, onBack, onSendMessage, onReport }: ChatViewProps) {
  const listRef = useRef<FlatList>(null);
  const otherUser = conversation.user1Id?._id === currentUserId ? conversation.user2Id : conversation.user1Id;
  const fullName = `${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.trim() || 'Usuario';

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerName} numberOfLines={1}>{fullName}</Text>
        <TouchableOpacity onPress={onReport} style={styles.headerButton}>
          <Ionicons name="warning-outline" size={20} color={WD.red} />
        </TouchableOpacity>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-ellipses-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No hay mensajes aún. ¡Escribe el primero!</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <MessageBubble message={item} currentUserId={currentUserId} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <MessageInput onSend={onSendMessage} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WD.lightGray },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: WD.white, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerName: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#111827' },
  list: { padding: 12, gap: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});