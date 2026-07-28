import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WD } from '../../../constants/theme';
import { getReviewsByReviewer, getWorkerServices } from '../../../api/workerDashboard';
import { useAuthStore } from '../../../store/authStore';
import type { User } from '../../../types/auth';
import { Button } from '../../ui/Button';
import { WorkerReviewModal } from './WorkerReviewModal';

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

const getId = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || value.Id || '';
};

const getUserId = (user: User | null) => String(user?.id || user?._id || user?.userId || user?.Id || '');

const formatMoney = (value: any) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Por definir';

  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value: any) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getRequest = (service: AnyRecord) => {
  const request = service?.requestId || service?.serviceRequestId;
  return request && typeof request === 'object' ? request : null;
};

const getClientName = (service: AnyRecord) => {
  const client = service?.clientId;
  if (!client || typeof client === 'string') return 'Cliente';
  return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente';
};

const getCategoryName = (service: AnyRecord) => {
  const category = getRequest(service)?.categoryId;
  if (!category) return 'Sin categoria';
  if (typeof category === 'string') return 'Categoria asignada';
  return category.name || category.nombre || 'Categoria asignada';
};

const getImageUrl = (service: AnyRecord) => {
  const request = getRequest(service);
  return request?.serviceImage?.url || request?.image?.url || request?.photo?.url || '';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Finalizado',
    CANCELLED: 'Cancelado',
  };

  return labels[status] || status || 'En curso';
};

const getStatusStyle = (status: string) => {
  const styles: Record<string, { wrap: object; text: object }> = {
    PENDING: { wrap: { backgroundColor: '#FEF9C3', borderColor: '#FDE68A' }, text: { color: '#A16207' } },
    IN_PROGRESS: { wrap: { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }, text: { color: '#0369A1' } },
    COMPLETED: { wrap: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }, text: { color: '#15803D' } },
    CANCELLED: { wrap: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }, text: { color: '#B91C1C' } },
  };

  return styles[status] || { wrap: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, text: { color: '#4B5563' } };
};

const FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'COMPLETED', label: 'Finalizados' },
  { value: 'CANCELLED', label: 'Cancelados' },
];

export function WorkerServicesScreen() {
  const user = useAuthStore((state) => state.user);
  const workerId = getUserId(user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [services, setServices] = useState<AnyRecord[]>([]);
  const [reviews, setReviews] = useState<AnyRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedService, setSelectedService] = useState<AnyRecord | null>(null);

  useEffect(() => {
    if (!workerId) return;

    let mounted = true;

    const loadServices = async () => {
      setLoading(true);
      setError('');

      try {
        const [servicesResponse, reviewsResponse] = await Promise.all([
          getWorkerServices(workerId),
          getReviewsByReviewer(workerId),
        ]);

        if (!mounted) return;
        setServices(getArrayFromResponse(servicesResponse, ['services']));
        setReviews(getArrayFromResponse(reviewsResponse, ['reviews']));
      } catch (loadError: any) {
        if (!mounted) return;
        setError(loadError?.response?.data?.message || 'No se pudieron cargar tus servicios.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadServices();

    return () => {
      mounted = false;
    };
  }, [workerId]);

  const reviewedServiceIds = useMemo(() => {
    return new Set(reviews.map((review) => getId(review?.serviceId)).filter(Boolean));
  }, [reviews]);

  const counts = useMemo(() => {
    return services.reduce<Record<string, number>>(
      (acc, service) => {
        const status = service?.status || 'IN_PROGRESS';
        acc.ALL += 1;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { ALL: 0, PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 }
    );
  }, [services]);

  const filteredServices = useMemo(() => {
    if (statusFilter === 'ALL') return services;
    return services.filter((service) => service?.status === statusFilter);
  }, [services, statusFilter]);

  const handleReviewCreated = (review: AnyRecord) => {
    if (!review) return;
    setReviews((current) => [review, ...current]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View>
        <Text style={styles.title}>Mis Servicios</Text>
        <Text style={styles.subtitle}>Revisa tus trabajos activos, finalizados y cancelados.</Text>
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

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={WD.yellowDark} />
          <Text style={styles.loadingText}>Cargando servicios...</Text>
        </View>
      ) : filteredServices.length ? (
        <View style={styles.list}>
          {filteredServices.map((service) => {
            const request = getRequest(service);
            const imageUrl = getImageUrl(service);
            const serviceId = getId(service);
            const statusStyle = getStatusStyle(service?.status);
            const isCompleted = service?.status === 'COMPLETED';
            const alreadyReviewed = reviewedServiceIds.has(serviceId);

            return (
              <View key={serviceId} style={styles.serviceCard}>
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

                  <View style={styles.serviceInfo}>
                    <View style={styles.pillRow}>
                      <View style={[styles.statusPill, statusStyle.wrap]}>
                        <Text style={[styles.statusText, statusStyle.text]}>{getStatusLabel(service?.status)}</Text>
                      </View>
                      <Text style={styles.categoryPill}>{getCategoryName(service)}</Text>
                    </View>
                    <Text style={styles.serviceTitle} numberOfLines={1}>
                      {request?.title || service?.serviceCode || 'Servicio asignado'}
                    </Text>
                    <Text style={styles.serviceDesc} numberOfLines={2}>
                      {request?.description || 'Sin descripcion disponible.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.details}>
                  <InfoRow icon="person-circle-outline" text={getClientName(service)} />
                  <InfoRow icon="location-outline" text={request?.address || 'Ubicacion por confirmar'} />
                  <InfoRow icon="calendar-outline" text={`Inicio: ${formatDate(service?.startDate || service?.createdAt)}`} />
                  <InfoRow icon="checkmark-circle-outline" text={`Fin: ${formatDate(service?.endDate)}`} />
                </View>

                <View style={styles.footer}>
                  <View>
                    <Text style={styles.priceLabel}>Precio final</Text>
                    <Text style={styles.priceText}>{formatMoney(service?.finalPrice)}</Text>
                  </View>

                  {isCompleted ? (
                    alreadyReviewed ? (
                      <View style={styles.reviewSent}>
                        <Ionicons name="star-outline" size={15} color="#15803D" />
                        <Text style={styles.reviewSentText}>Resena enviada</Text>
                      </View>
                    ) : (
                      <Button onPress={() => setSelectedService(service)} size="sm">
                        Dejar resena
                      </Button>
                    )
                  ) : (
                    <Text style={styles.followText}>
                      {service?.status === 'IN_PROGRESS' ? 'Trabajo en seguimiento' : 'Sin accion disponible'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={42} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No hay servicios en este filtro</Text>
          <Text style={styles.emptyDesc}>Cuando acepten una oferta, el servicio aparecera aqui.</Text>
        </View>
      )}

      <WorkerReviewModal
        open={!!selectedService}
        onClose={() => setSelectedService(null)}
        service={selectedService}
        workerId={workerId}
        onCreated={handleReviewCreated}
      />
    </ScrollView>
  );
}

function InfoRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color="#9CA3AF" />
      <Text style={styles.infoText} numberOfLines={1}>{text}</Text>
    </View>
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
  serviceCard: {
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
  serviceInfo: {
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
  statusText: {
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
  serviceTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  serviceDesc: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  infoText: {
    flex: 1,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
  priceText: {
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
  followText: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
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
});
