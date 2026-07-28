import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Image } from 'expo-image';
import { WD } from '../../constants/theme';
import { getMyServiceRequests, getCategories } from '../../api/clientDashboard';
import { STATUS_COLORS, STATUS_LABELS, getCategoryName, formatRelativeDate } from '../../utils/statusBadge';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { NewServiceRequestModal } from './NewServiceRequestModal';

type Category = { _id: string; name: string };

type ServiceRequest = {
  _id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  budgetMin: number;
  budgetMax: number;
  categoryId?: { _id: string; name: string } | string;
  customCategory?: string;
  serviceImage?: { url: string };
  address?: string;
  createdAt: string;
};

const STATUS_TABS = [
  { value: null, label: 'Todas' },
  { value: 'OPEN', label: 'Abiertas' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
];

export function MyRequestsList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyServiceRequests(statusFilter);
      setRequests(res.data.data || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Error al cargar tus solicitudes' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data.data || []))
      .catch(() => {});
  }, []);

  const filteredRequests = useMemo(() => {
    if (!categoryFilter) return requests;
    return requests.filter((r) => {
      const catId = r.categoryId && typeof r.categoryId === 'object' ? r.categoryId._id : r.categoryId;
      return catId === categoryFilter;
    });
  }, [requests, categoryFilter]);

  const handleStatusChange = (value: string | null) => {
    setStatusFilter(value);
    setCategoryFilter(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mis Solicitudes</Text>
        <Button
          variant="primary"
          size="sm"
          onPress={() => setOpenModal(true)}
          icon={<Ionicons name="add-outline" size={16} color={WD.darkerGray} />}
        >
          Nueva Solicitud
        </Button>
      </View>

      {/* Status Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabsContainer}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.value || 'all'}
              style={[styles.chip, statusFilter === tab.value && styles.chipActive]}
              onPress={() => handleStatusChange(tab.value)}
            >
              <Text style={[styles.chipText, statusFilter === tab.value && styles.chipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Category Filter */}
      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.chip, styles.chipSmall, !categoryFilter && styles.chipActive]}
              onPress={() => setCategoryFilter(null)}
            >
              <Text style={[styles.chipText, styles.chipTextSmall, !categoryFilter && styles.chipTextActive]}>
                Todas las categorías
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                style={[styles.chip, styles.chipSmall, categoryFilter === cat._id && styles.chipActive]}
                onPress={() => setCategoryFilter(cat._id)}
              >
                <Text style={[styles.chipText, styles.chipTextSmall, categoryFilter === cat._id && styles.chipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WD.yellow} />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={WD.textGray} />
          <Text style={styles.emptyTitle}>
            {requests.length === 0
              ? 'Aún no has creado ninguna solicitud'
              : 'No tenés solicitudes con este filtro'}
          </Text>
          <Text style={styles.emptyDesc}>
            {requests.length === 0
              ? 'Creá tu primera solicitud desde el botón de arriba.'
              : 'Probá con otro filtro o creá una nueva solicitud.'}
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {filteredRequests.map((request) => {
            const statusColor = STATUS_COLORS[request.status] || STATUS_COLORS.OPEN;
            return (
              <TouchableOpacity
                key={request._id}
                onPress={() => router.push(`/my-requests/${request._id}`)}
                activeOpacity={0.7}
              >
                <Card>
                  <CardContent>
                    <View style={styles.requestCard}>
                      <View style={styles.requestImageContainer}>
                        {request.serviceImage?.url ? (
                          <Image source={{ uri: request.serviceImage.url }} style={styles.requestImage} contentFit="cover" />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <Ionicons name="search-outline" size={24} color={WD.textGray} />
                          </View>
                        )}
                      </View>
                      <View style={styles.requestInfo}>
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
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryText}>{getCategoryName(request)}</Text>
                        </View>
                        <Text style={styles.requestDate}>{formatRelativeDate(request.createdAt)}</Text>
                        <Text style={styles.requestBudget}>
                          Q{request.budgetMin} - Q{request.budgetMax}
                        </Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <NewServiceRequestModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={fetchRequests}
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
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: WD.darkerGray,
  },
  tabsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WD.borderGray,
    backgroundColor: WD.white,
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: WD.yellow,
    backgroundColor: '#FEF9C3',
  },
  chipText: {
    fontSize: 13,
    color: WD.textGray,
  },
  chipTextSmall: {
    fontSize: 12,
  },
  chipTextActive: {
    color: WD.yellowDark,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: WD.textGray,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WD.darkerGray,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: WD.textGray,
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  requestCard: {
    flexDirection: 'row',
    gap: 12,
  },
  requestImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  requestImage: {
    width: 80,
    height: 80,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: WD.lightGray,
    borderWidth: 1,
    borderColor: WD.borderGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
    gap: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  requestTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: WD.darkerGray,
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
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: WD.lightGray,
  },
  categoryText: {
    fontSize: 11,
    color: WD.textGray,
  },
  requestDate: {
    fontSize: 12,
    color: WD.textGray,
  },
  requestBudget: {
    fontSize: 14,
    fontWeight: '700',
    color: WD.mediumGray,
  },
});
