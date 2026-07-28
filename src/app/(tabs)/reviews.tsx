// src/app/(tabs)/reviews.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReviewCard } from '../../components/reviews/ReviewCard';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useReviewsStore } from '../../store/userStore';

export default function ReviewsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string;

  const { given, received, loading, getGivenReviews, getReceivedReviews } = useReviewsStore();
  const [tab, setTab] = useState<'received' | 'given'>('received');

  useEffect(() => {
    if (!currentUserId) return;
    getGivenReviews(currentUserId);
    getReceivedReviews(currentUserId);
  }, [currentUserId]);

  const list = tab === 'received' ? received : given;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Reseñas</Text>
        <Text style={styles.subtitle}>Reseñas que has dejado y que has recibido</Text>
      </View>

      <View style={styles.tabs}>
        {(['received', 'given'] as const).map((key) => (
          <TouchableOpacity key={key} onPress={() => setTab(key)} style={styles.tabButton}>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>
              {key === 'received' ? 'Recibidas' : 'Dadas'}
            </Text>
            {tab === key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {!loading && list.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>
            {tab === 'received' ? 'Aún no has recibido reseñas' : 'Aún no has dejado reseñas'}
          </Text>
        </View>
      )}

      <FlatList data={list} keyExtractor={(item) => item._id} contentContainerStyle={styles.list} renderItem={({ item }) => <ReviewCard review={item} direction={tab} />} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WD.lightGray },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 8 },
  tabButton: { paddingVertical: 10, marginRight: 24 },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabLabelActive: { color: '#111827' },
  tabIndicator: { height: 2, backgroundColor: WD.yellow, marginTop: 8, borderRadius: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});