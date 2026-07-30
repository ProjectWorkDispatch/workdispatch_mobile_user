import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Image as ExpoImage } from 'expo-image';
import { WD } from '../../constants/theme';
import { getMyServiceRequests, getClientServices, getCategories } from '../../api/clientDashboard';
import { useAuthStore } from '../../store/authStore';
import { useMessagesStore } from '../../store/userStore';
import { STATUS_COLORS, STATUS_LABELS, getCategoryName, formatRelativeDate } from '../../utils/statusBadge';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { NewServiceRequestModal } from './NewServiceRequestModal';

type AnyRecord = Record<string, any>;

const STATUS_TABS = [
  { value: null, label: 'Todas' },
  { value: 'SEARCHING', label: 'Buscando ofertas' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'COMPLETED', label: 'Finalizadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
];

const NORMALIZED_STATUS: Record<string, { label: string; bg: string; border: string; text: string }> = {
  SEARCHING: { label: 'Buscando ofertas', bg: '#FEF9C3', border: '#FDE68A', text: '#A16207' },
  IN_PROGRESS: { label: 'En curso', bg: '#E0F2FE', border: '#BAE6FD', text: '#0369A1' },
  COMPLETED: { label: 'Finalizado', bg: '#DCFCE7', border: '#BBF7D0', text: '#15803D' },
  CANCELLED: { label: 'Cancelado', bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C' },
};

const normalizeItem = (item: AnyRecord, type: string): string => {
  if (type === 'serviceRequest') {
    const status = item.status;
    if (status === 'OPEN') return 'SEARCHING';
    return status;
  }
  return item.status;
};

const getRequestIdString = (service: AnyRecord): string | null => {
  const rid = service.requestId;
  if (!rid) return null;
  if (typeof rid === 'string') return rid;
  return rid._id || rid.id || null;
};

const mergeAndSort = (requests: AnyRecord[], services: AnyRecord[]): AnyRecord[] => {
  const serviceRequestIds = new Set(
    (services || []).map(getRequestIdString).filter(Boolean)
  );

  const normalizedRequests = (requests || [])
    .filter((r: AnyRecord) => !serviceRequestIds.has(r._id))
    .map((r: AnyRecord) => ({
      ...r,
      _type: 'serviceRequest',
      _normalizedStatus: normalizeItem(r, 'serviceRequest'),
      _sortDate: new Date(r.createdAt).getTime(),
    }));

  const normalizedServices = (services || []).map((s: AnyRecord) => ({
    ...s,
    _type: 'service',
    _normalizedStatus: normalizeItem(s, 'service'),
    _sortDate: new Date(s.createdAt).getTime(),
  }));

  return [...normalizedRequests, ...normalizedServices].sort(
    (a: AnyRecord, b: AnyRecord) => b._sortDate - a._sortDate
  );
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

const getItemBudget = (item: AnyRecord): string => {
  if (item._type === 'serviceRequest') {
    return `Q${item.budgetMin} - Q${item.budgetMax}`;
  }
  return item.finalPrice ? `Q${item.finalPrice}` : 'Por definir';
};

const getWorkerId = (item: AnyRecord): string | null => {
  if (item._type !== 'service' || !item.workerId) return null;
  if (typeof item.workerId === 'string') return item.workerId;
  return item.workerId._id || item.workerId.id || null;
};

export function ClientMyServices() {
  const router = useRouter();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string;
  const startConversation = useMessagesStore((s) => s.startConversation);

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AnyRecord[]>([]);
  const [services, setServices] = useState<AnyRecord[]>([]);
  const [categories, setCategories] = useState<AnyRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [requestsRes, servicesRes, categoriesRes] = await Promise.all([
        getMyServiceRequests(),
        currentUserId ? getClientServices(currentUserId) : Promise.resolve({ data: { services: [] } }),
        getCategories(),
      ]);
      setRequests(requestsRes.data.data || []);
      setServices(servicesRes.data.services || []);
      setCategories(categoriesRes.data.data || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Error al cargar tus solicitudes' });
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mergedItems = useMemo(() => mergeAndSort(requests, services), [requests, services]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { SEARCHING: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
    mergedItems.forEach((item: AnyRecord) => {
      counts[item._normalizedStatus] = (counts[item._normalizedStatus] || 0) + 1;
    });
    return counts;
  }, [mergedItems]);

  const filteredItems = useMemo(() => {
    let items = mergedItems;
    if (statusFilter) {
      items = items.filter((item: AnyRecord) => item._normalizedStatus === statusFilter);
    }
    if (categoryFilter) {
      items = items.filter((item: AnyRecord) => {
        if (item._type === 'serviceRequest') {
          return item.categoryId?._id === categoryFilter;
        }
        return item.requestId?.categoryId?._id === categoryFilter;
      });
    }
    return items;
  }, [mergedItems, statusFilter, categoryFilter]);

  const handleChat = async (workerId: string) => {
    if (!currentUserId || !workerId) return;
    setMessagingId(workerId);
    try {
      const conversation = await startConversation(currentUserId, workerId);
      if (conversation) router.push('/messages' as any);
    } catch {
      Toast.show({ type: 'error', text1: 'No se pudo iniciar la conversación' });
    } finally {
      setMessagingId(null);
    }
  };

  const handleItemPress = (item: AnyRecord) => {
    if (item._type === 'serviceRequest') {
      router.push(`/my-requests/${item._id}` as any);
    } else if (item._type === 'service') {
      router.push(`/my-services/${item._id}` as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mis Servicios</Text>
          <Text style={styles.subtitle}>Todas tus solicitudes y servicios en un solo lugar</Text>
        </View>
        <Button
          variant="primary"
          size="sm"
          onPress={() => setOpenModal(true)}
          icon={<Ionicons name="add-outline" size={16} color={WD.darkerGray} />}
        >
          Nueva Solicitud
        </Button>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value || 'all'}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setStatusFilter(tab.value)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                  {tab.value ? ` (${statusCounts[tab.value] || 0})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[{ _id: '', name: 'Todas' }, ...categories].map((cat) => {
              const isActive = cat._id ? categoryFilter === cat._id : !categoryFilter;
              return (
                <TouchableOpacity
                  key={cat._id || 'all'}
                  style={[styles.filterChip, styles.filterChipSmall, isActive && styles.filterChipActive]}
                  onPress={() => setCategoryFilter(cat._id || null)}
                >
                  <Text style={[styles.filterChipText, styles.filterChipTextSmall, isActive && styles.filterChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WD.yellow} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={WD.textGray} />
          <Text style={styles.emptyTitle}>
            {mergedItems.length === 0
              ? 'Aún no has creado ninguna solicitud'
              : 'No hay resultados con este filtro'}
          </Text>
          <Text style={styles.emptyDesc}>
            {mergedItems.length === 0
              ? 'Creá tu primera solicitud desde el botón de arriba.'
              : 'Probá con otro filtro.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => `${item._type}-${item._id}`}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const statusInfo = NORMALIZED_STATUS[item._normalizedStatus] || NORMALIZED_STATUS.SEARCHING;
            const workerId = getWorkerId(item);
            const canChat = item._type === 'service' && workerId && item._normalizedStatus !== 'CANCELLED';
            const image = getItemImage(item);

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleItemPress(item)}
              >
                <Card>
                  <CardContent style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                    {/* Image */}
                    <View style={styles.imageContainer}>
                      {image ? (
                        <ExpoImage source={{ uri: image }} style={styles.image} contentFit="cover" />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Ionicons name="search-outline" size={24} color={WD.textGray} />
                        </View>
                      )}
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {getItemTitle(item)}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg, borderColor: statusInfo.border }]}>
                          <Text style={[styles.statusText, { color: statusInfo.text }]}>
                            {statusInfo.label}
                          </Text>
                        </View>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryText}>{getItemCategory(item)}</Text>
                        </View>
                      </View>
                      {item.createdAt && (
                        <Text style={styles.dateText}>{formatRelativeDate(item.createdAt)}</Text>
                      )}
                    </View>

                    {/* Budget + Chat */}
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Text style={styles.budgetText}>{getItemBudget(item)}</Text>
                      {canChat && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleChat(workerId!);
                          }}
                          disabled={messagingId === workerId}
                          hitSlop={8}
                          style={({ pressed }) => [styles.chatButton, pressed && { opacity: 0.7 }]}
                        >
                          {messagingId === workerId ? (
                            <ActivityIndicator size="small" color={WD.yellowDark} />
                          ) : (
                            <Ionicons
                              name="chatbubble-ellipses-outline"
                              size={17}
                              color={WD.yellowDark}
                            />
                          )}
                        </Pressable>
                      )}
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <NewServiceRequestModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={fetchData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WD.lightGray, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: WD.textGray, marginTop: 2 },
  filterBar: { gap: 8, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: WD.borderGray,
    backgroundColor: WD.white,
  },
  filterChipSmall: { paddingHorizontal: 12, paddingVertical: 5 },
  filterChipActive: { backgroundColor: WD.yellow, borderColor: WD.yellow },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  filterChipTextSmall: { fontSize: 11 },
  filterChipTextActive: { color: WD.darkerGray },
  loadingContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 14, color: WD.textGray },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: WD.darkerGray, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: WD.textGray, textAlign: 'center' },
  imageContainer: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden' },
  image: { width: 80, height: 80 },
  imagePlaceholder: {
    width: 80, height: 80, borderRadius: 12,
    backgroundColor: WD.lightGray, borderWidth: 1, borderColor: WD.borderGray,
    justifyContent: 'center', alignItems: 'center',
  },
  itemTitle: { fontSize: 15, fontWeight: '700', color: WD.darkerGray, flex: 1 },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 12, borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  categoryPill: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, backgroundColor: WD.lightGray,
  },
  categoryText: { fontSize: 11, color: WD.textGray },
  dateText: { fontSize: 12, color: WD.textGray },
  budgetText: { fontSize: 14, fontWeight: '700', color: WD.mediumGray },
  chatButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
