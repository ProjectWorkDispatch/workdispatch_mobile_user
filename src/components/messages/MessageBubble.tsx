import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WD } from '../../constants/theme';
import type { Message } from '../../types/social';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
}

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const senderId = typeof message.senderId === 'string' ? message.senderId : message.senderId?._id;
  const isMine = senderId === currentUserId;
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.text, isMine && styles.textMine]}>{message.content}</Text>
        <Text style={[styles.time, isMine && styles.timeMine]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 4 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMine: { backgroundColor: WD.yellow, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: WD.white, borderWidth: 1, borderColor: '#E5E7EB', borderBottomLeftRadius: 4 },
  text: { fontSize: 14, color: '#374151', lineHeight: 20 },
  textMine: { color: WD.darkerGray },
  time: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(17,24,39,0.6)' },
});