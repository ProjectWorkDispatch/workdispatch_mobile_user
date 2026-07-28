import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, TextInput, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { WD } from '../../../constants/theme';
import { Badge, Card, CardContent } from '../../ui/Card';
import { DashboardStats, type StatItem } from '../DashboardStats';
import { WorkerOfferModal } from './WorkerOfferModal';
import { WorkerRequestDetailsModal } from './WorkerRequestDetailsModal';
import {
  getCategories,
  getOpenServiceRequests,
  getWorkerProposals,
  getWorkerServices,
  getWorkerSkills,
} from '../../../api/workerDashboard';
import type { User } from '../../../types/auth';

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
const JOBS_PER_PAGE = 5;

const getImageUrl = (job: AnyRecord) => {
  return job?.serviceImage?.url || job?.image?.url || job?.photo?.url || '';
};

const getCategoryName = (request: AnyRecord) => {
  const category = request?.categoryId || request?.category;
  if (!category) return 'Sin categoria';
  if (typeof category === 'string') return 'Categoria asignada';
  return category.name || category.nombre || 'Categoria asignada';
};

const getSearchText = (job: AnyRecord) => {
  return [
    job?.title,
    job?.description,
    job?.address,
    getCategoryName(job),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const formatMoney = (value: any) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Por definir';

  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatBudget = (request: AnyRecord) => {
  const min = Number(request?.budgetMin);
  const max = Number(request?.budgetMax);

  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `${formatMoney(min)} - ${formatMoney(max)}`;
  }

  if (Number.isFinite(max)) return formatMoney(max);
  if (Number.isFinite(min)) return formatMoney(min);
  return 'Presupuesto por definir';
};

const formatDate = (value: any) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
  }).format(date);
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
  const [openJobs, setOpenJobs] = useState<AnyRecord[]>([]);
  const [categories, setCategories] = useState<AnyRecord[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [jobsPage, setJobsPage] = useState(1);
  const [skills, setSkills] = useState<AnyRecord[]>([]);
  const [proposals, setProposals] = useState<AnyRecord[]>([]);
  const [services, setServices] = useState<AnyRecord[]>([]);
  const [selectedOfferJob, setSelectedOfferJob] = useState<AnyRecord | null>(null);
  const [selectedDetailsJob, setSelectedDetailsJob] = useState<AnyRecord | null>(null);

  useEffect(() => {
    if (!workerId) return;

    let mounted = true;

    const loadWorkerDashboard = async () => {
      setLoadingWorkerData(true);
      setWorkerError('');

      try {
        const [jobsResponse, categoriesResponse, skillsResponse, proposalsResponse, servicesResponse] = await Promise.all([
          getOpenServiceRequests(),
          getCategories(),
          getWorkerSkills(workerId),
          getWorkerProposals(workerId),
          getWorkerServices(workerId),
        ]);

        if (!mounted) return;

        setOpenJobs(getArrayFromResponse(jobsResponse, ['requests', 'serviceRequests']));
        setCategories(getArrayFromResponse(categoriesResponse, ['categories']));
        setSkills(getArrayFromResponse(skillsResponse, ['skills']));
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

  const skillCategoryIds = useMemo(() => {
    return new Set(
      skills
        .map((skill) => getId(skill?.skillId?.categoryId || skill?.categoryId))
        .filter(Boolean)
    );
  }, [skills]);

  const filteredJobs = useMemo(() => {
    const normalizedSearch = jobSearch.trim().toLowerCase();

    return openJobs.filter((job) => {
      const categoryId = getId(job?.categoryId || job?.category);
      const matchesCategory = !selectedCategoryId || categoryId === selectedCategoryId;
      const matchesSearch = !normalizedSearch || getSearchText(job).includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [jobSearch, openJobs, selectedCategoryId]);

  useEffect(() => {
    setJobsPage(1);
  }, [jobSearch, selectedCategoryId]);

  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const paginatedJobs = useMemo(() => {
    const safePage = Math.min(jobsPage, totalJobPages);
    const start = (safePage - 1) * JOBS_PER_PAGE;
    return filteredJobs.slice(start, start + JOBS_PER_PAGE);
  }, [filteredJobs, jobsPage, totalJobPages]);

  useEffect(() => {
    if (jobsPage > totalJobPages) setJobsPage(totalJobPages);
  }, [jobsPage, totalJobPages]);

  const pendingProposals = proposals.filter((proposal) => proposal?.status === 'PENDING');
  const activeServices = services.filter((service) => service?.status === 'IN_PROGRESS');
  const proposedRequestIds = useMemo(() => {
    return new Set(
      proposals
        .map((proposal) => getId(proposal?.serviceRequestId))
        .filter(Boolean)
    );
  }, [proposals]);

  const handleOpenOfferModal = (job: AnyRecord) => {
    if (proposedRequestIds.has(getId(job))) {
      Toast.show({ type: 'error', text1: 'Ya enviaste una oferta para esta solicitud.' });
      return;
    }

    setSelectedOfferJob(job);
  };

  const handleOfferFromDetails = () => {
    const job = selectedDetailsJob;
    if (!job) return;

    setSelectedDetailsJob(null);
    handleOpenOfferModal(job);
  };

  const handleProposalCreated = (proposal: AnyRecord) => {
    if (!proposal) return;
    setProposals((current) => [proposal, ...current]);
  };

  const stats: StatItem[] = [
    { label: 'Trabajos Disponibles', value: filteredJobs.length, icon: 'briefcase-outline', bg: '#FEF9C3', border: '#FDE68A', color: '#CA8A04' },
    { label: 'Mis Ofertas', value: pendingProposals.length, icon: 'document-text-outline', bg: '#F3F4F6', border: '#D1D5DB', color: '#374151' },
    { label: 'En Curso', value: activeServices.length, icon: 'checkmark-circle-outline', bg: '#E5E7EB', border: '#9CA3AF', color: '#111827' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Dashboard de Trabajador</Text>
          <Text style={styles.subtitle}>Revisa trabajos disponibles, ofertas enviadas y trabajos en curso</Text>
        </View>
      </View>

      {workerError ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>{workerError}</Text>
        </View>
      ) : null}

      <DashboardStats stats={stats} />

      <Card>
        <CardContent style={styles.cardContent}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Buscar trabajos disponibles</Text>
            <Text style={styles.sectionDesc}>
              Filtra solicitudes abiertas por categoria y texto.
            </Text>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              value={jobSearch}
              onChangeText={setJobSearch}
              placeholder="Buscar por titulo, descripcion o ubicacion"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChips}
          >
            <Pressable
              onPress={() => setSelectedCategoryId('')}
              style={[styles.categoryChip, !selectedCategoryId && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, !selectedCategoryId && styles.categoryChipTextActive]}>Todas</Text>
            </Pressable>

            {categories.map((category) => {
              const categoryId = getId(category);
              const active = selectedCategoryId === categoryId;

              return (
                <Pressable
                  key={categoryId}
                  onPress={() => setSelectedCategoryId(categoryId)}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {category.name || category.nombre || 'Categoria'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loadingWorkerData ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={WD.yellowDark} />
              <Text style={styles.loadingText}>Cargando trabajos disponibles...</Text>
            </View>
          ) : filteredJobs.length ? (
            <View style={styles.list}>
              {paginatedJobs.map((job) => {
                const matchesWorkerProfile = skillCategoryIds.has(getId(job?.categoryId || job?.category));
                const alreadyOffered = proposedRequestIds.has(getId(job));
                const imageUrl = getImageUrl(job);

                return (
                  <View key={job._id || job.id} style={styles.jobCard}>
                    <View style={styles.jobSummaryRow}>
                      <View style={styles.jobThumb}>
                        {imageUrl ? (
                          <Image source={{ uri: imageUrl }} style={styles.jobThumbImage} resizeMode="cover" />
                        ) : (
                          <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                        )}
                      </View>

                      <View style={styles.jobSummaryText}>
                        <View style={styles.badgeRow}>
                          <Badge>{getCategoryName(job)}</Badge>
                          {matchesWorkerProfile && <Badge variant="outline">Coincide con tu perfil</Badge>}
                        </View>
                        <Text style={styles.jobTitle} numberOfLines={1}>{job.title || 'Trabajo disponible'}</Text>
                        <Text style={styles.jobBudget}>{formatBudget(job)}</Text>
                        <Text style={styles.jobDate}>{formatDate(job.createdAt)}</Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => setSelectedDetailsJob(job)}
                      style={styles.offerButton}
                    >
                      <Text style={styles.offerButtonText}>Ver detalles</Text>
                    </Pressable>
                    {alreadyOffered ? (
                      <View style={styles.sentOfferPill}>
                        <Text style={styles.sentOfferText}>Ya ofertaste</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
              {totalJobPages > 1 ? (
                <View style={styles.pagination}>
                  <Text style={styles.paginationText}>Pagina {jobsPage} de {totalJobPages}</Text>
                  <View style={styles.paginationActions}>
                    <Pressable
                      disabled={jobsPage === 1}
                      onPress={() => setJobsPage((page) => Math.max(1, page - 1))}
                      style={[styles.paginationButton, jobsPage === 1 && styles.paginationButtonDisabled]}
                    >
                      <Text style={styles.paginationButtonText}>Anterior</Text>
                    </Pressable>
                    <Pressable
                      disabled={jobsPage === totalJobPages}
                      onPress={() => setJobsPage((page) => Math.min(totalJobPages, page + 1))}
                      style={[styles.paginationButton, jobsPage === totalJobPages && styles.paginationButtonDisabled]}
                    >
                      <Text style={styles.paginationButtonText}>Siguiente</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No hay trabajos con esos filtros</Text>
              <Text style={styles.emptyDesc}>Prueba otra categoria o cambia la busqueda.</Text>
            </View>
          )}
        </CardContent>
      </Card>

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

      <WorkerOfferModal
        open={!!selectedOfferJob}
        onClose={() => setSelectedOfferJob(null)}
        job={selectedOfferJob}
        workerId={workerId}
        hasExistingProposal={selectedOfferJob ? proposedRequestIds.has(getId(selectedOfferJob)) : false}
        onCreated={handleProposalCreated}
      />
      <WorkerRequestDetailsModal
        open={!!selectedDetailsJob}
        onClose={() => setSelectedDetailsJob(null)}
        job={selectedDetailsJob}
        alreadyOffered={selectedDetailsJob ? proposedRequestIds.has(getId(selectedDetailsJob)) : false}
        onOffer={handleOfferFromDetails}
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
  sectionHeader: {
    marginBottom: 12,
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
  searchBox: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    paddingVertical: 10,
  },
  categoryChips: {
    gap: 8,
    paddingBottom: 14,
  },
  categoryChip: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  categoryChipActive: {
    backgroundColor: WD.yellow,
    borderColor: WD.yellowDark,
  },
  categoryChipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#111827',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: 12,
  },
  jobCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  jobSummaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  jobThumb: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  jobThumbImage: {
    width: '100%',
    height: '100%',
  },
  jobSummaryText: {
    flex: 1,
    minWidth: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  jobBudget: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  jobDate: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  offerButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: WD.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  offerButtonDisabled: {
    opacity: 0.55,
  },
  offerButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  sentOfferPill: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sentOfferText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '800',
  },
  pagination: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 10,
  },
  paginationText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  paginationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  paginationButton: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
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
