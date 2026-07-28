import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WD } from '../../constants/theme';
import type { Conversation } from '../../types/social';

interface ConversationItemProps {
  conversation: Conversation;
  active?: boolean;
  currentUserId: string;
  onPress: () => void;
}

export function ConversationItem({ conversation, active, currentUserId, onPress }: ConversationItemProps) {
  const other = conversation.user1Id?._id === currentUserId ? conversation.user2Id : conversation.user1Id;
  const fullName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim() || 'Usuario';
  const initials = fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.container, active && styles.active]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
          <Text style={styles.date}>
            {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString() : ''}
          </Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {conversation.lastMessage || 'Sin mensajes'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: WD.white,
  },
  active: { backgroundColor: '#FEFCE8' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: WD.darkerGray, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: WD.yellow, fontWeight: '700', fontSize: 14 },
  info: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontWeight: '700', fontSize: 14, color: '#111827' },
  date: { fontSize: 11, color: '#9CA3AF' },
  lastMessage: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});