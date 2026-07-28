// src/components/messages/MessageInput.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { WD } from '../../constants/theme';

interface MessageInputProps {
  onSend: (content: string) => Promise<void> | void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim() || sending) return;
    try {
      setSending(true);
      await onSend(content.trim());
      setContent('');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Escribe un mensaje..."
        placeholderTextColor="#9CA3AF"
        style={styles.input}
        multiline
        onSubmitEditing={handleSend}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={!content.trim() || sending}
        style={[styles.sendButton, (!content.trim() || sending) && styles.sendButtonDisabled]}
      >
        <Ionicons name="send" size={16} color={WD.darkerGray} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: WD.white,
  },
  input: { flex: 1, maxHeight: 100, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#374151' },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: WD.yellow, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
});