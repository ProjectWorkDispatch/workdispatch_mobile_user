import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, CardContent } from '../../components/ui/Card';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useReportsStore } from '../../store/userStore';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string;
  const { createdReports, loading, getMyReports } = useReportsStore();

  useEffect(() => {
    if (currentUserId) getMyReports(currentUserId);
  }, [currentUserId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Reportes</Text>
        <Text style={styles.subtitle}>Reportes que has enviado y su estado</Text>
      </View>

      {!loading && createdReports.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="flag-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No has enviado reportes</Text>
        </View>
      )}

      <FlatList
        data={createdReports}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const person = item.reporteredId;
          const fullName = `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'Usuario';
          return (
            <Card style={styles.card}>
              <CardContent>
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reason}>{item.Reason}</Text>
                    <Text style={styles.name}>Reportado: {fullName}</Text>
                  </View>
                  <View style={[styles.status, item.Status ? styles.statusPending : styles.statusResolved]}>
                    <Text style={[styles.statusText, item.Status ? styles.statusTextPending : styles.statusTextResolved]}>
                      {item.Status ? 'Pendiente' : 'Resuelto'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.description}>{item.Description}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </CardContent>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WD.lightGray },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  card: { marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  reason: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPending: { backgroundColor: '#FEF9C3' },
  statusResolved: { backgroundColor: '#DCFCE7' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextPending: { color: '#CA8A04' },
  statusTextResolved: { color: '#16A34A' },
  description: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 19 },
  date: { fontSize: 11, color: '#9CA3AF', marginTop: 8 },
});