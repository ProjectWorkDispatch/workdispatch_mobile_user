import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import { Button } from '../../components/ui/Button';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useNotificationsStore } from '../../store/userStore';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string;

  const { notifications, loading, getNotifications, markAsRead, markAllAsRead } = useNotificationsStore();

  useEffect(() => {
    if (currentUserId) getNotifications(currentUserId);
  }, [currentUserId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notificaciones</Text>
          <Text style={styles.subtitle}>{unreadCount > 0 ? `Tienes ${unreadCount} sin leer` : 'Estás al día'}</Text>
        </View>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onPress={() => markAllAsRead(currentUserId)}>
            Marcar todas
          </Button>
        )}
      </View>

      {!loading && notifications.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No tienes notificaciones</Text>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            read={item.isRead}
            onRead={markAsRead}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WD.lightGray },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
});