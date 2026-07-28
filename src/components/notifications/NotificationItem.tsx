import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WD } from '../../constants/theme';
import type { AppNotification } from '../../types/social';

const TYPE_STYLES: Record<string, { color: string; label: string }> = {
  NEW_MESSAGE: { color: '#3B82F6', label: 'Mensaje' },
  NEW_REVIEW: { color: WD.yellow, label: 'Reseña' },
  ACCOUNT_REPORTED: { color: WD.red, label: 'Reporte' },
  NEW_REPORT: { color: WD.red, label: 'Reporte' },
};

function formatRelativeTime(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} día(s)`;
}

interface NotificationItemProps {
  notification: AppNotification;
  read: boolean;
  onRead: (id: string) => void;
}

export function NotificationItem({ notification, read, onRead }: NotificationItemProps) {
  const style = TYPE_STYLES[notification.Type] || { color: '#9CA3AF', label: notification.Type };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onRead(notification._id)} style={[styles.container, !read && styles.unread]}>
      <View style={[styles.dot, { backgroundColor: style.color }]} />
      <View style={styles.content}>
        <Text style={[styles.type, { color: style.color }]}>{style.label}</Text>
        <Text style={[styles.message, !read && styles.messageUnread]}>{notification.Message}</Text>
        <Text style={styles.time}>{formatRelativeTime(notification.createdAt)}</Text>
      </View>
      {!read && <View style={styles.unreadBadge} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: WD.white },
  unread: { backgroundColor: '#FEFCE8' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  content: { flex: 1 },
  type: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  message: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  messageUnread: { fontWeight: '700', color: '#111827' },
  time: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  unreadBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: WD.yellow, marginTop: 4 },
});