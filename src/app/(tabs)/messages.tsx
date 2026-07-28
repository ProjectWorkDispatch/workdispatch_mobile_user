import { ReportModal } from '@/components/Reports/ReportModal';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatView } from '../../components/messages/ChatView';
import { ConversationItem } from '../../components/messages/ConversationItem';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useMessagesStore } from '../../store/userStore';
import type { Conversation } from '../../types/social';

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string;

  const { conversations, selectedConversation, messages, loading, getConversations, selectConversation, sendMessage } =
    useMessagesStore();

  const [search, setSearch] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);

  useEffect(() => {
    if (currentUserId) getConversations(currentUserId);
  }, [currentUserId]);

  const filtered = useMemo(() => {
    const text = search.toLowerCase().trim();
    if (!text) return conversations;
    return conversations.filter((c) => {
      const other = c.user1Id?._id === currentUserId ? c.user2Id : c.user1Id;
      return (
        `${other?.firstName} ${other?.lastName}`.toLowerCase().includes(text) ||
        c.lastMessage?.toLowerCase().includes(text)
      );
    });
  }, [search, conversations, currentUserId]);

  const handleSelect = (conversation: Conversation) => {
    selectConversation(conversation);
    setShowChat(true);
  };

  if (showChat && selectedConversation) {
    const otherUser =
      selectedConversation.user1Id?._id === currentUserId ? selectedConversation.user2Id : selectedConversation.user1Id;

    return (
      <>
        <ChatView
          conversation={selectedConversation}
          messages={messages}
          currentUserId={currentUserId}
          onBack={() => setShowChat(false)}
          onSendMessage={(content) => sendMessage(selectedConversation._id, currentUserId, content)}
          onReport={() => setReportTarget(otherUser)}
        />
        <ReportModal
          visible={!!reportTarget}
          onClose={() => setReportTarget(null)}
          reporteredId={reportTarget?._id}
          reporteredName={`${reportTarget?.firstName || ''} ${reportTarget?.lastName || ''}`.trim()}
          onSuccess={() => setReportTarget(null)}
        />
      </>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mensajes</Text>
        <Text style={styles.subtitle}>Tus conversaciones sobre solicitudes y servicios</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginLeft: 12 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar conversación..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      {!loading && filtered.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No tienes conversaciones aún</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            currentUserId={currentUserId}
            active={selectedConversation?._id === item._id}
            onPress={() => handleSelect(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WD.lightGray },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: WD.white, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 10, fontSize: 14, color: '#374151' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
});