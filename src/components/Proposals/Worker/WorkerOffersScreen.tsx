import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WD } from '../../../constants/theme';
import { getWorkerProposals } from '../../../api/workerDashboard';
import { useAuthStore } from '../../../store/authStore';
import type { User } from '../../../types/auth';
import { WorkerRequestDetailsModal } from '../../dashboard/Worker/WorkerRequestDetailsModal';

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

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    ACCEPTED: 'Aceptada',
    REJECTED: 'Rechazada',
    CANCELLED: 'Cancelada',
  };

  return labels[status] || status || 'Pendiente';
};

const getStatusStyle = (status: string) => {
  const styles: Record<string, { wrap: object; text: object }> = {
    PENDING: { wrap: { backgroundColor: '#FEF9C3', borderColor: '#FDE68A' }, text: { color: '#A16207' } },
    ACCEPTED: { wrap: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }, text: { color: '#15803D' } },
    REJECTED: { wrap: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }, text: { color: '#B91C1C' } },
    CANCELLED: { wrap: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, text: { color: '#4B5563' } },
  };

  return styles[status] || { wrap: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, text: { color: '#4B5563' } };
};

const getRequestTitle = (proposal: AnyRecord) => {
  const request = proposal?.serviceRequestId;
  if (!request || typeof request === 'string') return 'Solicitud asociada';
  return request.title || 'Solicitud asociada';
};

const getRequestDescription = (proposal: AnyRecord) => {
  const request = proposal?.serviceRequestId;
  if (!request || typeof request === 'string') return 'Sin descripcion disponible.';
  return request.description || 'Sin descripcion disponible.';
};

const FILTERS = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'ACCEPTED', label: 'Aceptadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
];

export function WorkerOffersScreen() {
  const user = useAuthStore((state) => state.user);
  const workerId = getUserId(user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState<AnyRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState<AnyRecord | null>(null);

  useEffect(() => {
    if (!workerId) return;

    let mounted = true;

    const loadOffers = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getWorkerProposals(workerId);
        if (!mounted) return;
        setProposals(getArrayFromResponse(response, ['proposals']));
      } catch (loadError: any) {
        if (!mounted) return;
        setError(loadError?.response?.data?.message || 'No se pudieron cargar tus ofertas.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOffers();

    return () => {
      mounted = false;
    };
  }, [workerId]);

  const counts = useMemo(() => {
    return proposals.reduce<Record<string, number>>(
      (acc, proposal) => {
        const status = proposal?.status || 'PENDING';
        acc.ALL += 1;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { ALL: 0, PENDING: 0, ACCEPTED: 0, REJECTED: 0, CANCELLED: 0 }
    );
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    if (statusFilter === 'ALL') return proposals;
    return proposals.filter((proposal) => proposal?.status === statusFilter);
  }, [proposals, statusFilter]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View>
        <Text style={styles.title}>Mis Ofertas</Text>
        <Text style={styles.subtitle}>Revisa tus propuestas enviadas y su estado actual.</Text>
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
          <Text style={styles.loadingText}>Cargando ofertas...</Text>
        </View>
      ) : filteredProposals.length ? (
        <View style={styles.list}>
          {filteredProposals.map((proposal) => {
            const statusStyle = getStatusStyle(proposal?.status);
            return (
              <Pressable
                key={proposal._id || proposal.id}
                onPress={() => setSelectedRequest(proposal?.serviceRequestId || null)}
                style={styles.offerCard}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.statusPill, statusStyle.wrap]}>
                    <Text style={[styles.statusText, statusStyle.text]}>{getStatusLabel(proposal?.status)}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(proposal?.createdAt)}</Text>
                </View>
                <Text style={styles.offerTitle} numberOfLines={1}>{getRequestTitle(proposal)}</Text>
                <Text style={styles.offerDesc} numberOfLines={2}>{getRequestDescription(proposal)}</Text>
                <View style={styles.offerFooter}>
                  <Text style={styles.priceText}>{formatMoney(proposal?.price)}</Text>
                  <Text style={styles.detailText}>Ver detalle</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={42} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No hay ofertas en este filtro</Text>
          <Text style={styles.emptyDesc}>Cuando envies propuestas apareceran aqui.</Text>
        </View>
      )}

      <WorkerRequestDetailsModal
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        job={selectedRequest}
        alreadyOffered
        onOffer={() => {}}
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
  offerCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
  dateText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  offerTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  offerDesc: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  offerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  priceText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  detailText: {
    color: '#CA8A04',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  emptyDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
