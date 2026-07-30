import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { WD } from '../../../constants/theme';
import { Card, CardContent } from '../../ui/Card';
import { DashboardStats, type StatItem } from '../DashboardStats';
import { getWorkerProposals, getWorkerServices } from '../../../api/workerDashboard';
import type { User } from '../../../types/auth';
import { getMeetingsByUser } from '../../../api/meetings';
import { getMeetingReminders, getWorkerLogReminders } from '../../../utils/reminders';
import { RemindersCard } from '../RemindersCard';

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

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    ACCEPTED: 'Aceptada',
    REJECTED: 'Rechazada',
    CANCELLED: 'Cancelada',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Completada',
  };

  return labels[status] || status || 'Pendiente';
};

const getStatusStyle = (status: string) => {
  const styles: Record<string, { wrap: object; text: object }> = {
    PENDING: { wrap: { backgroundColor: '#FEF9C3', borderColor: '#FDE68A' }, text: { color: '#A16207' } },
    ACCEPTED: { wrap: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }, text: { color: '#15803D' } },
    REJECTED: { wrap: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }, text: { color: '#B91C1C' } },
    CANCELLED: { wrap: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, text: { color: '#4B5563' } },
    IN_PROGRESS: { wrap: { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' }, text: { color: '#1D4ED8' } },
    COMPLETED: { wrap: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }, text: { color: '#15803D' } },
  };

  return styles[status] || { wrap: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, text: { color: '#4B5563' } };
};

export function WorkerDashboardSummary({ user }: { user: User | null }) {
  const workerId = getUserId(user);
  const [loadingWorkerData, setLoadingWorkerData] = useState(false);
  const [workerError, setWorkerError] = useState('');
  const [proposals, setProposals] = useState<AnyRecord[]>([]);
  const [services, setServices] = useState<AnyRecord[]>([]);
  const [meetings, setMeetings] = useState<AnyRecord[]>([]);

  useEffect(() => {
    if (!workerId) return;

    let mounted = true;

    const loadWorkerDashboard = async () => {
      setLoadingWorkerData(true);
      setWorkerError('');

      const [proposalsResponse, servicesResponse, meetingsResponse] = await Promise.all([
        getWorkerProposals(workerId),
        getWorkerServices(workerId),
        getMeetingsByUser(workerId),
      ]);

      if (!mounted) return;

      setProposals(getArrayFromResponse(proposalsResponse, ['proposals']));
      setServices(getArrayFromResponse(servicesResponse, ['services', 'service']));
      setMeetings(getArrayFromResponse(meetingsResponse, ['meetings']));

      try {
        const [proposalsResponse, servicesResponse] = await Promise.all([
          getWorkerProposals(workerId),
          getWorkerServices(workerId),
        ]);

        if (!mounted) return;

        setProposals(getArrayFromResponse(proposalsResponse, ['proposals']));
        setServices(getArrayFromResponse(servicesResponse, ['services', 'service']));
      } catch (error: any) {
        if (!mounted) return;
        setWorkerError(error?.response?.data?.message || 'No se pudo cargar el resumen del trabajador.');
      } finally {
        if (mounted) setLoadingWorkerData(false);
      }
    };

    loadWorkerDashboard();

    return () => {
      mounted = false;
    };
  }, [workerId]);

  const pendingProposals = proposals.filter((proposal) => proposal?.status === 'PENDING');
  const activeServices = services.filter((service) => service?.status === 'IN_PROGRESS');

  const stats: StatItem[] = [
    { label: 'Mis Ofertas', value: pendingProposals.length, icon: 'document-text-outline', bg: '#F3F4F6', border: '#D1D5DB', color: '#374151' },
    { label: 'En Curso', value: activeServices.length, icon: 'checkmark-circle-outline', bg: '#E5E7EB', border: '#9CA3AF', color: '#111827' },
  ];

  const reminders = useMemo(
    () => [...getMeetingReminders(meetings, workerId), ...getWorkerLogReminders(services)],
    [meetings, services, workerId]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Dashboard de Trabajador</Text>
          <Text style={styles.subtitle}>Revisa tus ofertas y trabajos en curso</Text>
        </View>
      </View>

      {workerError ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>{workerError}</Text>
        </View>
      ) : null}

      <DashboardStats stats={stats} />
      <RemindersCard items={reminders} />

      <Card>
        <CardContent style={styles.cardContent}>
          <Text style={styles.sectionTitle}>Estado de tus ofertas</Text>
          <Text style={styles.sectionDesc}>Seguimiento rapido de propuestas enviadas.</Text>

          {proposals.length ? (
            <View style={styles.list}>
              {proposals.slice(0, 4).map((proposal) => {
                const statusStyle = getStatusStyle(proposal?.status);
                return (
                  <View key={proposal._id || proposal.id} style={styles.rowItem}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{proposal?.serviceRequestId?.title || 'Oferta enviada'}</Text>
                      <Text style={styles.rowSubtitle}>{formatMoney(proposal?.price)}</Text>
                    </View>
                    <View style={[styles.statusPill, statusStyle.wrap]}>
                      <Text style={[styles.statusText, statusStyle.text]}>{getStatusLabel(proposal?.status)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyInline}>Aun no hay ofertas registradas.</Text>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent style={styles.cardContent}>
          <Text style={styles.sectionTitle}>Trabajos en curso</Text>
          <Text style={styles.sectionDesc}>Servicios activos que necesitan seguimiento.</Text>

          {activeServices.length ? (
            <View style={styles.list}>
              {activeServices.slice(0, 4).map((service) => {
                const statusStyle = getStatusStyle(service?.status);
                return (
                  <View key={service._id || service.id} style={styles.rowItem}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {service?.requestId?.title || service?.serviceCode || 'Trabajo en curso'}
                      </Text>
                      <Text style={styles.rowSubtitle}>{formatMoney(service?.finalPrice)}</Text>
                    </View>
                    <View style={[styles.statusPill, statusStyle.wrap]}>
                      <Text style={[styles.statusText, statusStyle.text]}>{getStatusLabel(service?.status)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyInline}>No tienes trabajos en curso.</Text>
          )}
        </CardContent>
      </Card>
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
  cardContent: {
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  emptyInline: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
