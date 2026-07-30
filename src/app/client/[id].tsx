import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { axiosUser } from '../../api/api';
import { getClientTrustStats } from '../../api/workerDashboard';
import { Button } from '../../components/ui/Button';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { WD } from '../../constants/theme';

const StarRow = ({ rating = 0, size = 14 }: { rating: number; size?: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons
        key={s}
        name={s <= Math.round(rating) ? 'star' : 'star-outline'}
        size={size}
        color={s <= Math.round(rating) ? WD.yellow : '#D1D5DB'}
      />
    ))}
    <Text style={{ fontSize: size - 2, color: WD.textGray, marginLeft: 4 }}>
      {Number(rating).toFixed(1)}
    </Text>
  </View>
);

const getArrayFromResponse = (response: any): any[] => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  const possibleKeys = ['data', 'reviews'];
  for (const key of possibleKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function ClientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [client, setClient] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      axiosUser.get(`/users/${id}`),
      getClientTrustStats(id).catch(() => null),
      axiosUser.get(`/reviews/received/${id}`).catch(() => null),
    ])
      .then(([uRes, sRes, rRes]) => {
        setClient(uRes.data?.data || uRes.data);
        if (sRes?.data?.success) setStats(sRes.data.data);
        setReviews(rRes ? getArrayFromResponse(rRes) : []);
      })
      .catch(() => setClient(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={WD.yellow} />
      </View>
    );

  if (!client)
    return (
      <View style={styles.center}>
        <Text style={{ color: WD.textGray }}>Cliente no encontrado</Text>
        <Button variant="outline" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Volver
        </Button>
      </View>
    );

  const initials = `${client.firstName?.[0] ?? ''}${client.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={20} color="#374151" />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

      <Card style={styles.heroCard}>
        <CardContent>
          <View style={styles.heroTop}>
            {client.profilePhoto && !client.profilePhoto.includes('default') ? (
              <Image source={{ uri: client.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials || '?'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>
                {client.firstName} {client.lastName}
              </Text>
              {stats && <StarRow rating={stats.ratingAverage} size={16} />}
              {client.verificationStatus && (
                <Badge variant="default" style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                  ✓ Verificado
                </Badge>
              )}
            </View>
          </View>

          {client.description && <Text style={styles.bio}>{client.description}</Text>}

          <View style={styles.infoRow}>
            {client.phone && (
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={14} color={WD.textGray} />
                <Text style={styles.infoText}>{client.phone}</Text>
              </View>
            )}
            {client.address && (
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={14} color={WD.textGray} />
                <Text style={styles.infoText}>{client.address}</Text>
              </View>
            )}
          </View>
        </CardContent>
      </Card>

      {stats && (
        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Estadísticas de confianza</CardTitle>
          </CardHeader>
          <CardContent>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {stats.completionRate != null
                    ? `${Math.round(stats.completionRate * 100)}%`
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>Trabajos completados</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {stats.reportRate != null
                    ? `${Math.round(stats.reportRate * 100)}%`
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>Reportes recibidos</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {stats.ratingCount != null ? `${stats.ratingCount}` : '0'}
                </Text>
                <Text style={styles.statLabel}>Reseñas recibidas</Text>
              </View>
            </View>
            {stats.memberSince && (
              <Text style={styles.memberSince}>
                Miembro desde {new Date(stats.memberSince).toLocaleDateString('es-GT', {
                  year: 'numeric',
                  month: 'long',
                })}
              </Text>
            )}
          </CardContent>
        </Card>
      )}

      <Card style={[styles.section, { marginBottom: 40 }]}>
        <CardHeader>
          <CardTitle>Reseñas ({reviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <Text style={styles.empty}>Sin reseñas aún</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {reviews.map((r: any) => (
                <View key={r._id} style={styles.reviewItem}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.reviewAuthor}>
                      {r.workerId?.firstName || 'Trabajador'}
                    </Text>
                    <StarRow rating={r.Rating || r.rating} size={12} />
                  </View>
                  {(r.Comment || r.comment) && (
                    <Text style={styles.reviewComment}>{r.Comment || r.comment}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WD.lightGray },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WD.lightGray,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  heroCard: { marginBottom: 16 },
  heroTop: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', marginBottom: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: WD.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: WD.darkerGray },
  clientName: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  bio: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 },
  infoRow: { gap: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: WD.textGray },
  section: { marginBottom: 16 },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WD.borderGray,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: WD.darkerGray,
  },
  statLabel: {
    fontSize: 11,
    color: WD.textGray,
    textAlign: 'center',
    marginTop: 4,
  },
  memberSince: {
    fontSize: 12,
    color: WD.textGray,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  empty: { fontSize: 14, color: WD.textGray, fontStyle: 'italic' },
  reviewItem: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WD.borderGray,
  },
  reviewAuthor: { fontSize: 13, fontWeight: '700', color: '#111827' },
  reviewComment: { fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 18 },
});
