import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { getMyServiceRequests } from '../../api/clientDashboard';
import { WD } from '../../constants/theme';
import { STATUS_COLORS, STATUS_LABELS, getCategoryName } from '../../utils/statusBadge';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { DashboardStats, type StatItem } from './DashboardStats';
import { NewServiceRequestModal } from './NewServiceRequestModal';

type ServiceRequest = {
  _id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  budgetMin: number;
  budgetMax: number;
  categoryId?: { _id: string; name: string } | string;
  customCategory?: string;
  createdAt: string;
};

export function ClientDashboardSummary() {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyServiceRequests();
      setRequests(res.data.data || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Error al cargar tus solicitudes' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats: StatItem[] = [
    { label: 'Solicitudes Activas', value: requests.filter((r) => r.status === 'OPEN').length, icon: 'time-outline', bg: '#FEF9C3', border: '#FDE68A', color: '#CA8A04' },
    { label: 'En Progreso', value: requests.filter((r) => r.status === 'IN_PROGRESS').length, icon: 'checkmark-circle-outline', bg: '#F3F4F6', border: '#D1D5DB', color: '#374151' },
    { label: 'Completados', value: requests.filter((r) => r.status === 'COMPLETED').length, icon: 'checkmark-circle-outline', bg: '#E5E7EB', border: '#9CA3AF', color: '#111827' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Panel de Cliente</Text>
          <Text style={styles.subtitle}>Gestiona tus solicitudes de trabajo</Text>
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

      {loading ? (
        <Card>
          <CardContent>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WD.yellow} />
            </View>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent>
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Aun no has creado ninguna solicitud</Text>
              <Text style={styles.emptyDesc}>
                Esta seccion la completa cada feature de solicitudes del cliente.
              </Text>
            </View>
          </CardContent>
        </Card>
      ) : (
        <>
          <View style={styles.listContainer}>
            {requests.slice(0, 3).map((request) => {
              const statusColor = STATUS_COLORS[request.status] || STATUS_COLORS.OPEN;
              return (
                <Card key={request._id}>
                  <CardContent>
                    <View style={styles.requestCard}>
                      <View style={styles.requestHeader}>
                        <Text style={styles.requestTitle} numberOfLines={1}>
                          {request.title}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusColor.bg, borderColor: statusColor.border },
                          ]}
                        >
                          <Text style={[styles.statusText, { color: statusColor.text }]}>
                            {STATUS_LABELS[request.status] || request.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.requestCategory}>{getCategoryName(request)}</Text>
                      <Text style={styles.requestBudget}>
                        Q{request.budgetMin} - Q{request.budgetMax}
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              );
            })}
          </View>
          <Button variant="outline" onPress={() => router.push('/my-requests')}>
            Ver todas mis solicitudes
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
  },
  emptyTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  requestCard: {
    gap: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestTitle: {
    flex: 1,
    fontSize: 16,
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
    fontSize: 11,
    fontWeight: '700',
  },
  requestCategory: {
    fontSize: 13,
    color: '#6B7280',
  },
  requestBudget: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
});
