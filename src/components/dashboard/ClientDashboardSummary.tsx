import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { getMyServiceRequests, getClientServices } from '../../api/clientDashboard';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { formatRelativeDate } from '../../utils/statusBadge';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { DashboardStats, type StatItem } from './DashboardStats';
import { NewServiceRequestModal } from './NewServiceRequestModal';
import { getMeetingsByUser } from '../../api/meetings';
import { getClientVerifyReminders, getMeetingReminders } from '../../utils/reminders';
import { RemindersCard } from './RemindersCard';

type AnyRecord = Record<string, any>;

const NORMALIZED_BADGE: Record<string, { label: string; bg: string; border: string; text: string }> = {
  SEARCHING: { label: 'Buscando ofertas', bg: '#FEF9C3', border: '#FDE68A', text: '#A16207' },
  IN_PROGRESS: { label: 'En curso', bg: '#E0F2FE', border: '#BAE6FD', text: '#0369A1' },
  COMPLETED: { label: 'Finalizado', bg: '#DCFCE7', border: '#BBF7D0', text: '#15803D' },
  CANCELLED: { label: 'Cancelado', bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C' },
};

const normalizeItem = (item: AnyRecord, type: string): string => {
  if (type === 'serviceRequest') {
    if (item.status === 'OPEN') return 'SEARCHING';
    return item.status;
  }
  if (item.status === 'PENDING') return 'SEARCHING';
  return item.status;
};

const getRequestIdString = (service: AnyRecord): string | null => {
  const rid = service.requestId;
  if (!rid) return null;
  if (typeof rid === 'string') return rid;
  return rid._id || rid.id || null;
};

const getItemTitle = (item: AnyRecord): string => {
  if (item._type === 'serviceRequest') return item.title;
  return item.requestId?.title || item.serviceCode || 'Servicio asignado';
};

const getItemCategory = (item: AnyRecord): string => {
  if (item._type === 'serviceRequest') {
    return item.categoryId?.name || item.customCategory || 'Sin categoría';
  }
  return item.requestId?.categoryId?.name || 'Sin categoría';
};

const getItemImage = (item: AnyRecord): string => {
  if (item._type === 'serviceRequest') return item.serviceImage?.url || '';
  return item.requestId?.serviceImage?.url || '';
};

const getItemBudgetOrPrice = (item: AnyRecord): string => {
  if (item._type === 'serviceRequest') {
    return `Q${item.budgetMin} - Q${item.budgetMax}`;
  }
  return item.finalPrice ? `Q${item.finalPrice}` : 'Por definir';
};



export function ClientDashboardSummary() {
  const router = useRouter();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string;

  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AnyRecord[]>([]);
  const [services, setServices] = useState<AnyRecord[]>([]);

  const [meetings, setMeetings] = useState<AnyRecord[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [requestsRes, servicesRes, meetingsRes] = await Promise.all([
        getMyServiceRequests(),
        currentUserId ? getClientServices(currentUserId) : Promise.resolve({ data: { services: [] } }),
        currentUserId ? getMeetingsByUser(currentUserId) : Promise.resolve({ data: { meetings: [] } }),
      ]);
      setRequests(requestsRes.data.data || []);
      setServices(servicesRes.data.services || []);
      setMeetings(meetingsRes.data.meetings || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Error al cargar tus datos' });
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mergedItems = useMemo(() => {
    const serviceRequestIds = new Set(
      (services || []).map(getRequestIdString).filter(Boolean)
    );

    const normalizedRequests: AnyRecord[] = (requests || [])
      .filter((r: AnyRecord) => !serviceRequestIds.has(r._id))
      .map((r: AnyRecord) => ({
        ...r,
        _type: 'serviceRequest',
        _normalizedStatus: normalizeItem(r, 'serviceRequest'),
        _sortDate: new Date(r.createdAt).getTime(),
      }));

    const normalizedServices: AnyRecord[] = (services || []).map((s: AnyRecord) => ({
      ...s,
      _type: 'service',
      _normalizedStatus: normalizeItem(s, 'service'),
      _sortDate: new Date(s.createdAt).getTime(),
    }));

    return [...normalizedRequests, ...normalizedServices].sort(
      (a: AnyRecord, b: AnyRecord) => b._sortDate - a._sortDate
    );
  }, [requests, services]);

  const stats: StatItem[] = useMemo(() => {
    const counts = { SEARCHING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    mergedItems.forEach((item: AnyRecord) => {
      if (item._normalizedStatus in counts) {
        (counts as any)[item._normalizedStatus]++;
      }
    });
    return [
      { label: 'Solicitudes Activas', value: counts.SEARCHING, icon: 'time-outline', bg: '#FEF9C3', border: '#FDE68A', color: '#A16207' },
      { label: 'En Progreso', value: counts.IN_PROGRESS, icon: 'checkmark-circle-outline', bg: '#E0F2FE', border: '#BAE6FD', color: '#0369A1' },
      { label: 'Completados', value: counts.COMPLETED, icon: 'checkmark-circle-outline', bg: '#DCFCE7', border: '#BBF7D0', color: '#15803D' },
    ];
  }, [mergedItems]);

  const previewItems = useMemo(() => mergedItems.slice(0, 3), [mergedItems]);

  const handleItemPress = (item: AnyRecord) => {
    if (item._type === 'serviceRequest') {
      router.push(`/my-requests/${item._id}` as any);
    } else {
      router.push(`/my-services/${item._id}` as any);
    }
  };

  const reminders = useMemo(() => {
    return [
      ...getMeetingReminders(meetings, currentUserId),
      ...getClientVerifyReminders(services),
    ];
  }, [meetings, services, currentUserId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Panel de Cliente</Text>
          <Text style={styles.subtitle}>Gestiona tus solicitudes y servicios</Text>
        </View>
        <Button
          variant="primary"
          onPress={() => setOpenModal(true)}
          icon={<Ionicons name="add-outline" size={16} color={WD.darkerGray} />}
        >
          Nueva Solicitud
        </Button>
      </View>

      <DashboardStats stats={stats} />
      <RemindersCard items={reminders} />

      {loading ? (
        <Card>
          <CardContent>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WD.yellow} />
            </View>
          </CardContent>
        </Card>
      ) : previewItems.length === 0 ? (
        <Card>
          <CardContent>
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Aún no hay actividad</Text>
              <Text style={styles.emptyDesc}>
                Creá una solicitud y cuando un trabajador la acepte, aparecerá aquí.
              </Text>
            </View>
          </CardContent>
        </Card>
      ) : (
        <>
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionTitle}>Actividad reciente</Text>
          </View>
          <View style={styles.listContainer}>
            {previewItems.map((item) => {
              const badge = NORMALIZED_BADGE[item._normalizedStatus] || NORMALIZED_BADGE.SEARCHING;
              const image = getItemImage(item);
              return (
                <TouchableOpacity
                  key={`${item._type}-${item._id}`}
                  activeOpacity={0.7}
                  onPress={() => handleItemPress(item)}
                >
                  <Card>
                    <CardContent style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                      {image ? (
                        <Image source={{ uri: image }} style={styles.previewImage} contentFit="cover" />
                      ) : (
                        <View style={styles.previewImagePlaceholder}>
                          <Ionicons name="search-outline" size={22} color={WD.textGray} />
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.previewTitle} numberOfLines={1}>
                          {getItemTitle(item)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                            <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                          </View>
                          <View style={styles.categoryPill}>
                            <Text style={styles.categoryText}>{getItemCategory(item)}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.dateText}>
                            {item.createdAt ? formatRelativeDate(item.createdAt) : ''}
                          </Text>
                          <Text style={styles.priceText}>{getItemBudgetOrPrice(item)}</Text>
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
          <Button variant="outline" onPress={() => router.push('/my-services')}>
            Ver todos mis servicios
          </Button>
        </>
      )}

      <NewServiceRequestModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={fetchData}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WD.lightGray,
  },
  contentContainer: {
    padding: 16,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  sectionLabel: {
    marginTop: -8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  listContainer: {
    gap: 12,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  previewImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: WD.lightGray,
    borderWidth: 1,
    borderColor: WD.borderGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  categoryText: {
    fontSize: 11,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
});
