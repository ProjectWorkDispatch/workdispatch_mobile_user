import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { WD } from '../../../constants/theme';
import {
  getWorkerProposals,
  getWorkerServices,
  getReviewsByReviewer,
  completeService,
  cancelService,
  getMeetingsByUser,
} from '../../../api/workerDashboard';
import { useAuthStore } from '../../../store/authStore';
import { useMessagesStore } from '../../../store/userStore';
import type { User } from '../../../types/auth';
import { Button } from '../../ui/Button';
import { PostServiceReviewFlow } from '../../reviews/PostServiceReviewFlow';
import { CancelServiceModal } from './CancelServiceModal';

type AnyRecord = Record<string, any>;

const getArrayFromResponse = (response: any, keys: string[] = []) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || value.Id || '';
};

const getUserId = (user: User | null) => String(user?.id || user?._id || user?.userId || user?.Id || '');

const formatMoney = (value: any) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Por definir';
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (value: any) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const getRequest = (item: AnyRecord) => {
  if (item._type === 'proposal') {
    const req = item.serviceRequestId;
    return req && typeof req === 'object' ? req : null;
  }
  const req = item.requestId || item.serviceRequestId;
  return req && typeof req === 'object' ? req : null;
};

const getClientName = (item: AnyRecord): string => {
  const client = item?.clientId;
  if (!client || typeof client === 'string') return 'Cliente';
  return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente';
};

const getCategoryName = (item: AnyRecord): string => {
  const request = getRequest(item);
  const category = request?.categoryId;
  if (!category) return 'Sin categoría';
  if (typeof category === 'string') return 'Categoría asignada';
  return category.name || category.nombre || 'Categoría asignada';
};

const getImageUrl = (item: AnyRecord): string => {
  const request = getRequest(item);
  return request?.serviceImage?.url || request?.image?.url || '';
};

const getTitle = (item: AnyRecord): string => {
  if (item._type === 'proposal') {
    const req = item.serviceRequestId;
    if (!req || typeof req === 'string') return 'Solicitud asociada';
    return req.title || 'Solicitud asociada';
  }
  const request = getRequest(item);
  return request?.title || item.serviceCode || 'Servicio asignado';
};

const getDescription = (item: AnyRecord): string => {
  if (item._type === 'proposal') {
    const req = item.serviceRequestId;
    if (!req || typeof req === 'string') return 'Sin descripción disponible.';
    return req.description || 'Sin descripción disponible.';
  }
  const request = getRequest(item);
  return request?.description || 'Sin descripción disponible.';
};

const canCompleteService = (service: AnyRecord): boolean => {
  const hasWorkPlan = Array.isArray(service.workPlan) && service.workPlan.length > 0;
  if (!hasWorkPlan || !service.estimatedEndDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planEndDate = new Date(service.estimatedEndDate);
  planEndDate.setHours(0, 0, 0, 0);
  return today >= planEndDate;
};

const getCompleteBlockedReason = (service: AnyRecord): string => {
  const hasWorkPlan = Array.isArray(service.workPlan) && service.workPlan.length > 0;
  if (!hasWorkPlan) return 'Define un plan de trabajo para poder completar el servicio.';
  if (!service.estimatedEndDate) return 'El plan de trabajo no tiene fecha de fin.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planEndDate = new Date(service.estimatedEndDate);
  planEndDate.setHours(0, 0, 0, 0);
  if (today < planEndDate) {
    return `Podrás completarlo a partir del ${planEndDate.toLocaleDateString('es-GT')}.`;
  }
  return '';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    ACCEPTED: 'Aceptada',
    REJECTED: 'Rechazada',
    CANCELLED: 'Cancelada',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Finalizado',
  };
  return labels[status] || status || 'Pendiente';
};

const getStatusStyle = (status: string) => {
  const s: Record<string, { wrap: object; text: object }> = {
    PENDING: { wrap: { backgroundColor: '#FEF9C3', borderColor: '#FDE68A' }, text: { color: '#A16207' } },
    ACCEPTED: { wrap: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }, text: { color: '#15803D' } },
    REJECTED: { wrap: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }, text: { color: '#B91C1C' } },
    CANCELLED: { wrap: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, text: { color: '#4B5563' } },
    IN_PROGRESS: { wrap: { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }, text: { color: '#0369A1' } },
    COMPLETED: { wrap: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }, text: { color: '#15803D' } },
  };
  return s[status] || { wrap: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, text: { color: '#4B5563' } };
};

const FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'COMPLETED', label: 'Finalizados' },
  { value: 'CANCELLED', label: 'Cancelados' },
];

export function WorkerServicesScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const workerId = getUserId(user);
  const startConversation = useMessagesStore((s) => s.startConversation);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState<AnyRecord[]>([]);
  const [services, setServices] = useState<AnyRecord[]>([]);
  const [reviews, setReviews] = useState<AnyRecord[]>([]);
  const [meetings, setMeetings] = useState<AnyRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedService, setSelectedService] = useState<AnyRecord | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AnyRecord | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);


  const loadData = async () => {
    if (!workerId) return;
    setLoading(true);
    setError('');
    try {
      const [proposalsRes, servicesRes, reviewsRes, meetingsRes] = await Promise.all([
        getWorkerProposals(workerId),
        getWorkerServices(workerId),
        getReviewsByReviewer(workerId),
        getMeetingsByUser(workerId).catch(() => null),
      ]);
      setProposals(getArrayFromResponse(proposalsRes, ['proposals']));
      setServices(getArrayFromResponse(servicesRes, ['services']));
      setReviews(getArrayFromResponse(reviewsRes, ['reviews']));
      if (meetingsRes?.data?.meetings) setMeetings(meetingsRes.data.meetings);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || 'No se pudieron cargar tus trabajos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadData().then(() => { });
    return () => { mounted = false; };
  }, [workerId]);

  const mergedItems = useMemo(() => {
    const serviceRequestIds = new Set(
      (services || []).map((s) => {
        const rid = s.requestId;
        if (!rid) return null;
        if (typeof rid === 'string') return rid;
        return rid._id || rid.id || null;
      }).filter(Boolean)
    );

    const normalizedProposals: AnyRecord[] = (proposals || [])
      .filter((p) => {
        const sid = typeof p.serviceRequestId === 'string'
          ? p.serviceRequestId
          : p.serviceRequestId?._id || p.serviceRequestId?.id;
        return sid ? !serviceRequestIds.has(sid) : true;
      })
      .map((p) => ({
        ...p,
        _type: 'proposal',
        _normalizedStatus: p.status,
        _sortDate: new Date(p.createdAt).getTime(),
      }));

    const normalizedServices: AnyRecord[] = (services || []).map((s) => ({
      ...s,
      _type: 'service',
      _normalizedStatus: s.status,
      _sortDate: new Date(s.createdAt).getTime(),
    }));

    return [...normalizedProposals, ...normalizedServices].sort(
      (a: AnyRecord, b: AnyRecord) => b._sortDate - a._sortDate
    );
  }, [proposals, services]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'ALL') return mergedItems;
    return mergedItems.filter((item: AnyRecord) => item._normalizedStatus === statusFilter);
  }, [mergedItems, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: 0, PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, ACCEPTED: 0, REJECTED: 0 };
    mergedItems.forEach((item: AnyRecord) => {
      c.ALL += 1;
      c[item._normalizedStatus] = (c[item._normalizedStatus] || 0) + 1;
    });
    return c;
  }, [mergedItems]);

  const reviewedServiceIds = useMemo(() => {
    return new Set(reviews.map((review) => getId(review?.serviceId)).filter(Boolean));
  }, [reviews]);

  const pendingInterviews = useMemo(() => {
    return (meetings || []).filter((m) => {
      if (m.status === 'CANCELLED') return false;
      const hasProposal = !!(m.proposalId?._id || m.proposalId);
      return !hasProposal;
    });
  }, [meetings]);

  const formatMeetingDateTime = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('es-GT', { dateStyle: 'full', timeStyle: 'short' }).format(d);
  };

  const getMeetingServiceTitle = (meeting: AnyRecord): string => {
    const sr = meeting.serviceRequestId;
    if (!sr || typeof sr === 'string') return 'Solicitud de servicio';
    return sr.title || 'Solicitud de servicio';
  };

  const handleComplete = async (serviceId: string) => {
    setCompletingId(serviceId);
    try {
      await completeService(serviceId);
      Toast.show({ type: 'success', text1: 'Servicio marcado como completado' });
      await loadData();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Error al completar servicio' });
    } finally {
      setCompletingId(null);
    }
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelService(getId(cancelTarget), reason, 'WORKER');
      Toast.show({ type: 'success', text1: 'Servicio cancelado' });
      setCancelTarget(null);
      await loadData();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Error al cancelar servicio' });
    } finally {
      setCancelling(false);
    }
  };

  const handleChat = async (clientId: string) => {
    console.log('DEBUG chat ->', { workerId, clientId, rawUser: user });
    if (!workerId || !clientId) {
      console.log('DEBUG chat -> bloqueado por guard, workerId o clientId vacío');
      return;
    }
    setMessagingId(clientId);
    try {
      const conversation = await startConversation(workerId, clientId);
      if (conversation) router.push('/messages' as any);
    } catch (err) {
      console.log('DEBUG chat -> error', err);
      Toast.show({ type: 'error', text1: 'No se pudo iniciar la conversación' });
    } finally {
      setMessagingId(null);
    }
  };

  const handleReviewCreated = (review: AnyRecord) => {
    if (!review) return;
    setReviews((current) => [review, ...current]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View>
        <Text style={styles.title}>Mis Trabajos</Text>
        <Text style={styles.subtitle}>Propuestas enviadas y servicios activos en un solo lugar.</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((filter) => {
          const active = statusFilter === filter.value;
          return (
            <Pressable
              key={filter.value}
              onPress={() => setStatusFilter(filter.value)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {filter.label} ({counts[filter.value] || 0})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {pendingInterviews.length > 0 && (
        <View style={styles.interviewsSection}>
          <Text style={styles.interviewsSectionTitle}>
            Entrevistas solicitadas ({pendingInterviews.length})
          </Text>
          {pendingInterviews.map((meeting) => {
            const mId = meeting._id || meeting.id;
            const formattedTime = formatMeetingDateTime(meeting.startTime);
            const workerName = meeting.workerId
              ? `${meeting.workerId.firstName || ''} ${meeting.workerId.lastName || ''}`.trim() || 'Trabajador'
              : 'Trabajador';
            const isPending = meeting.status === 'PENDING';
            const isConfirmed = meeting.status === 'CONFIRMED';
            return (
              <Pressable
                key={mId}
                style={styles.interviewCard}
                onPress={() => router.push(`/meeting/${mId}` as any)}
              >
                <View style={styles.interviewCardTop}>
                  <View style={[
                    styles.interviewStatusPill,
                    isConfirmed && styles.interviewStatusPillConfirmed,
                  ]}>
                    <Text style={[
                      styles.interviewStatusText,
                      isConfirmed && styles.interviewStatusTextConfirmed,
                    ]}>
                      {isConfirmed ? 'Confirmada' : 'Entrevista solicitada'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.interviewTitle} numberOfLines={1}>
                  {getMeetingServiceTitle(meeting)}
                </Text>
                <Text style={styles.interviewWorker}>{workerName}</Text>
                {formattedTime && (
                  <Text style={styles.interviewTime}>{formattedTime}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={WD.yellowDark} />
          <Text style={styles.loadingText}>Cargando trabajos...</Text>
        </View>
      ) : filteredItems.length ? (
        <View style={styles.list}>
          {filteredItems.map((item) => {
            const serviceId = getId(item);
            const statusStyle = getStatusStyle(item._normalizedStatus);
            const isService = item._type === 'service';
            const isInProgress = item._normalizedStatus === 'IN_PROGRESS';
            const isCompleted = item._normalizedStatus === 'COMPLETED';
            const alreadyReviewed = reviewedServiceIds.has(serviceId);
            const imageUrl = getImageUrl(item);
            const clientId = isService && item.clientId
              ? (typeof item.clientId === 'string' ? item.clientId : item.clientId._id || item.clientId.id)
              : null;
            const blockedReason = isService ? getCompleteBlockedReason(item) : '';
            const completable = isService ? canCompleteService(item) : false;

            const isPressable = item._type === 'proposal' || item._type === 'service';
            return (
              <Pressable
                key={`${item._type}-${serviceId}`}
                onPress={isPressable ? () => {
                  if (item._type === 'proposal') {
                    router.push(`/my-offers/${serviceId}` as any);
                  } else {
                    router.push(`/worker-service/${serviceId}` as any);
                  }
                } : undefined}
                style={({ pressed }) => [
                  styles.card,
                  isPressable && pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.cardBody}>
                  <View style={styles.imageBox}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                    ) : (
                      <View style={styles.emptyImage}>
                        <Ionicons name="briefcase-outline" size={30} color="#9CA3AF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.pillRow}>
                      <View style={[styles.statusPill, statusStyle.wrap]}>
                        <Text style={[styles.pillText, statusStyle.text]}>
                          {getStatusLabel(item._normalizedStatus)}
                        </Text>
                      </View>
                      <Text style={styles.categoryPill}>{getCategoryName(item)}</Text>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>{getTitle(item)}</Text>
                    <View style={styles.descRow}>
                      <Text style={[styles.cardDesc, { flex: 1, marginTop: 0 }]} numberOfLines={2}>
                        {getDescription(item)}
                      </Text>
                      {isService && clientId && (
                        <Pressable
                          onPress={() => handleChat(clientId)}
                          disabled={messagingId === clientId}
                          hitSlop={8}
                          style={({ pressed }) => [styles.chatIconButton, pressed && { opacity: 0.7 }]}
                        >
                          {messagingId === clientId ? (
                            <ActivityIndicator size="small" color={WD.yellowDark} />
                          ) : (
                            <Ionicons name="chatbubble-ellipses-outline" size={17} color={WD.yellowDark} />
                          )}
                        </Pressable>
                      )}
                    </View>
                    {isService && (
                      <Text style={styles.clientText}>{getClientName(item)}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.priceLabel}>Precio</Text>
                    <Text style={styles.priceValue}>
                      {isService ? formatMoney(item.finalPrice) : formatMoney(item.price)}
                    </Text>
                  </View>

                  {isService && isCompleted && (
                    alreadyReviewed ? (
                      <View style={styles.reviewSent}>
                        <Ionicons name="star-outline" size={15} color="#15803D" />
                        <Text style={styles.reviewSentText}>Reseña enviada</Text>
                      </View>
                    ) : (
                      <Button onPress={() => setSelectedService(item)} size="sm">
                        Dejar reseña
                      </Button>
                    )
                  )}
                </View>

                {isService && isInProgress && (
                  <View style={styles.actions}>
                    <View style={{ width: '100%', gap: 6 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                        <Button
                          size="sm"
                          onPress={() => handleComplete(serviceId)}
                          disabled={completingId === serviceId || !completable}
                        >
                          {completingId === serviceId ? 'Completando...' : 'Marcar completado'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onPress={() => setCancelTarget(item)}
                        >
                          Cancelar servicio
                        </Button>
                      </View>
                      {!completable && (
                        <Text style={{ fontSize: 11, color: WD.textGray, textAlign: 'center' }}>
                          {blockedReason}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={42} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No hay trabajos en este filtro</Text>
          <Text style={styles.emptyDesc}>Cuando acepten una oferta, el servicio aparecerá aquí.</Text>
        </View>
      )}

      <PostServiceReviewFlow
        visible={!!selectedService}
        onClose={() => setSelectedService(null)}
        serviceId={getId(selectedService)}
        revieweredId={
          selectedService?.clientId
            ? (typeof selectedService.clientId === 'string'
              ? selectedService.clientId
              : selectedService.clientId._id || selectedService.clientId.id || '')
            : ''
        }
        revieweredName={
          selectedService?.clientId && typeof selectedService.clientId === 'object'
            ? `${selectedService.clientId.firstName || ''} ${selectedService.clientId.lastName || ''}`.trim() || 'Cliente'
            : 'Cliente'
        }
        onSuccess={(review: any) => {
          handleReviewCreated(review);
          setSelectedService(null);
        }}
      />

      <CancelServiceModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        loading={cancelling}
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
    gap: 18,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
  },
  filters: {
    gap: 8,
  },
  filterChip: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  filterChipActive: {
    backgroundColor: WD.yellow,
    borderColor: WD.yellowDark,
  },
  filterText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextActive: {
    color: '#111827',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  imageBox: {
    width: 86,
    height: 86,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryPill: {
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
  },
  cardTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  cardDesc: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  clientText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    padding: 14,
  },
  priceLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  priceValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  reviewSent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reviewSentText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  interviewsSection: {
    gap: 10,
  },
  interviewsSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  interviewCard: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    padding: 14,
    gap: 6,
  },
  interviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interviewStatusPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  interviewStatusPillConfirmed: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  interviewStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  interviewStatusTextConfirmed: {
    color: '#15803D',
  },
  interviewTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  interviewWorker: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  interviewTime: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  descRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  chatIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
