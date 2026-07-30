import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text, TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { axiosUser } from '../../api/api';
import { Badge, Card, CardContent } from '../../components/ui/Card';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useFavoritesStore } from '../../store/userStore';

const StarRow = ({ rating = 0 }: { rating: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(s => (
      <Ionicons
        key={s}
        name={s <= Math.round(rating) ? 'star' : 'star-outline'}
        size={12}
        color={s <= Math.round(rating) ? WD.yellow : '#D1D5DB'}
      />
    ))}
    <Text style={{ fontSize: 11, color: WD.textGray, marginLeft: 4 }}>
      {Number(rating).toFixed(1)}
    </Text>
  </View>
);

export default function FindWorkersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const currentUserId = user?._id || user?.id;
  const { favorites, getMyFavorites, toggleFavorite } = useFavoritesStore();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [viewMode, setViewMode] = useState<'todos' | 'favoritos'>('todos');

  useEffect(() => {
    axiosUser.get('/users')
      .then(res => {
        const all = res.data?.data || res.data || [];
        setWorkers(all.filter((u: any) => u.role === 'WORKER'));
      })
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (currentUserId) getMyFavorites(currentUserId);
  }, [currentUserId]);

  const isFavorited = (workerId: string) =>
    favorites.some((f) => {
      const wid = typeof f.workerId === 'object' ? f.workerId._id : f.workerId;
      return wid === workerId;
    });

  const filtered = workers.filter(w => {
    const matchSearch = !search ||
      `${w.firstName} ${w.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      w.address?.toLowerCase().includes(search.toLowerCase());
    const matchRating = !filterRating || w.ratingAverage >= filterRating;
    const matchFav = viewMode !== 'favoritos' || isFavorited(w._id);
    return matchSearch && matchRating && matchFav;
  });

  const ratingFilters = [
    { label: 'Todos', value: 0 },
    { label: '4+\u2605', value: 4 },
    { label: '3+\u2605', value: 3 },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Buscar Trabajadores</Text>
        <Text style={styles.subtitle}>Encuentra profesionales calificados</Text>
      </View>

      {/* Buscador */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={WD.textGray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Nombre o ubicación..."
          placeholderTextColor={WD.textGray}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* View mode tabs */}
      <View style={styles.viewModeRow}>
        <TouchableOpacity
          onPress={() => setViewMode('todos')}
          style={[styles.viewModeChip, viewMode === 'todos' && styles.viewModeChipActive]}
        >
          <Text style={[styles.viewModeText, viewMode === 'todos' && styles.viewModeTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('favoritos')}
          style={[styles.viewModeChip, viewMode === 'favoritos' && styles.viewModeChipActive]}
        >
          <Ionicons
            name={viewMode === 'favoritos' ? 'heart' : 'heart-outline'}
            size={14}
            color={viewMode === 'favoritos' ? WD.white : WD.textGray}
          />
          <Text style={[styles.viewModeText, viewMode === 'favoritos' && styles.viewModeTextActive]}>
            Favoritos ({favorites.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtros rating */}
      <View style={styles.filters}>
        {ratingFilters.map(f => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilterRating(f.value)}
            style={[styles.filterChip, filterRating === f.value && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filterRating === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.count}>{filtered.length} trabajador{filtered.length !== 1 ? 'es' : ''}</Text>

      {loading ? (
        <ActivityIndicator size="large" color={WD.yellow} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {viewMode === 'favoritos'
                  ? 'No tienes trabajadores favoritos'
                  : 'No se encontraron trabajadores'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const initials = `${item.firstName?.[0] ?? ''}${item.lastName?.[0] ?? ''}`.toUpperCase();
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push(`/worker/${item._id}` as any)}
              >
                <Card>
                  <CardContent style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    {item.profilePhoto && !item.profilePhoto.includes('default') ? (
                      <Image
                        source={{ uri: item.profilePhoto }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>{initials || '?'}</Text>
                      </View>
                    )}

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.workerName}>
                          {item.firstName} {item.lastName}
                        </Text>
                        {!!item.verificationStatus && (
                          <Badge variant="default" style={{ paddingHorizontal: 6 }}>
                            {'✓ Verificado'}
                          </Badge>
                        )}
                      </View>
                      <StarRow rating={item.ratingAverage} />
                      {item.address && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="location-outline" size={12} color={WD.textGray} />
                          <Text style={styles.workerAddr} numberOfLines={1}>{item.address}</Text>
                        </View>
                      )}
                      {item.description && (
                        <Text style={styles.workerDesc} numberOfLines={2}>{item.description}</Text>
                      )}
                    </View>

                    {/* Favorite button */}
                    {currentUserId && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          if (currentUserId) toggleFavorite(currentUserId, item._id);
                        }}
                        style={styles.heartButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={isFavorited(item._id) ? 'heart' : 'heart-outline'}
                          size={22}
                          color={isFavorited(item._id) ? '#EF4444' : '#9CA3AF'}
                        />
                      </TouchableOpacity>
                    )}
                  </CardContent>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WD.lightGray, padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: WD.textGray, marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WD.white, borderRadius: 10,
    borderWidth: 1, borderColor: WD.borderGray,
    paddingHorizontal: 12, marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },
  viewModeRow: {
    flexDirection: 'row', gap: 8, marginBottom: 12,
  },
  viewModeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: WD.borderGray,
    backgroundColor: WD.white,
  },
  viewModeChipActive: {
    backgroundColor: WD.yellow, borderColor: WD.yellow,
  },
  viewModeText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  viewModeTextActive: { color: WD.darkerGray },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: WD.borderGray,
    backgroundColor: WD.white,
  },
  filterChipActive: { backgroundColor: WD.yellow, borderColor: WD.yellow },
  filterText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  filterTextActive: { color: WD.darkerGray },
  count: { fontSize: 12, color: WD.textGray, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: WD.borderGray },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: WD.yellow, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: WD.darkerGray },
  workerName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  workerAddr: { fontSize: 12, color: WD.textGray, flex: 1 },
  workerDesc: { fontSize: 12, color: WD.textGray, marginTop: 4, lineHeight: 17 },
  heartButton: {
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: WD.textGray, fontWeight: '600' },
});
