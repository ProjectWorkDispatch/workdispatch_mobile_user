import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  acceptProposal,
  getProposalsForRequest,
  getServiceRequestById,
  rejectProposal,
  requestMeeting,
  getProposalMeeting,
  confirmMeeting,
  proposeAlternativeTime,
  getWorkerTrustStats,
  getReceivedReviews,
  getServiceRequestMeeting,
} from '../../api/clientDashboard';
import { getGivenReviews } from '../../api/user';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useMessagesStore } from '../../store/userStore';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  formatRelativeDate,
  getCategoryName,
} from '../../utils/statusBadge';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { DateTimePickerModal } from '../ui/DateTimePickerModal';
import { PostServiceReviewFlow } from '../reviews/PostServiceReviewFlow';
import { ReportModal } from '../Reports/ReportModal';
import { MapPicker } from './MapPicker';

type Worker = {
  _id?: string;
  firstName: string;
  lastName: string;
  ratingAverage?: number;
  profilePhoto?: string;
};

type Proposal = {
  _id: string;
  price: number;
  message: string;
  status: string;
  workerId: Worker;
};

type ServiceRequest = {
  _id: string;
  title: string;
  description: string;
  status: string;
  budgetMin: number;
  budgetMax: number;
  address?: string;
  latitude?: string;
  longitude?: string;
  serviceImage?: { url: string };
  categoryId?: { _id: string; name: string };
  customCategory?: string;
  clientId: string;
  createdAt: string;
};

type ServiceRequestDetailProps = {
  id: string;
};

const StarRating = ({ rating }: { rating?: number }) => {
  if (!rating) return <Text style={styles.noRating}>Sin calificación</Text>;
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= Math.round(rating) ? 'star' : 'star-outline'}
          size={16}
          color={WD.yellow}
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(d);
};

export function ServiceRequestDetail({ id }: ServiceRequestDetailProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currentUserId = user?._id || user?.id;
  const startConversation = useMessagesStore((s) => s.startConversation);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acceptTarget, setAcceptTarget] = useState<string | null>(null);

  const [messaging, setMessaging] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const [meetingsByProposal, setMeetingsByProposal] = useState<Record<string, any>>({});
  const [meetingLoading, setMeetingLoading] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<{ proposalId: string; mode: 'request' | 'propose' } | null>(null);
  const [srPickerOpen, setSrPickerOpen] = useState(false);
  const [workerStats, setWorkerStats] = useState<Record<string, any>>({});
  const [workerReviews, setWorkerReviews] = useState<Record<string, number>>({});
  const [serviceRequestMeeting, setServiceRequestMeeting] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [requestRes, proposalsRes] = await Promise.all([
        getServiceRequestById(id),
        getProposalsForRequest(id),
      ]);
      setServiceRequest(requestRes.data.data || requestRes.data);
      setProposals(proposalsRes.data.proposals || []);
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        setError(err.response?.data?.message || 'Solicitud no encontrada');
      } else {
        Toast.show({ type: 'error', text1: 'Error al cargar los datos' });
        setError('Error al cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    getServiceRequestMeeting(id)
      .then((res) => {
        if (res?.data?.data) setServiceRequestMeeting(res.data.data);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const acceptedProposal = proposals.find((p) => p.status === 'ACCEPTED');
  const acceptedWorkerId = acceptedProposal?.workerId
    ? (typeof acceptedProposal.workerId === 'string'
        ? acceptedProposal.workerId
        : acceptedProposal.workerId._id || '')
    : null;
  const acceptedWorkerName = acceptedProposal?.workerId
    ? `${acceptedProposal.workerId.firstName} ${acceptedProposal.workerId.lastName}`
    : '';

  const isCompleted = serviceRequest?.status === 'COMPLETED';
  const isCancelled = serviceRequest?.status === 'CANCELLED';
  const isNotOpen = serviceRequest?.status !== 'OPEN' && !!acceptedProposal;
  const canChat = isNotOpen && acceptedWorkerId && serviceRequest?.status !== 'CANCELLED';
  const canReview = isCompleted && acceptedWorkerId && !hasReviewed;
  const canReport = (isCompleted || isCancelled) && acceptedWorkerId;

  useEffect(() => {
    if (!proposals.length) return;
    let cancelled = false;
    proposals.forEach(async (p) => {
      try {
        const res = await getProposalMeeting(p._id);
        if (cancelled) return;
        if (res.data.data) {
          setMeetingsByProposal((prev) => ({ ...prev, [p._id]: res.data.data }));
        }
      } catch {}
    });
    return () => { cancelled = true; };
  }, [proposals]);

  useEffect(() => {
    if (!proposals.length) return;
    const workerIds = new Set<string>();
    proposals.forEach((p) => {
      const wid = p.workerId?._id || p.workerId;
      if (wid && typeof wid === 'string') workerIds.add(wid);
    });
    let cancelled = false;
    workerIds.forEach(async (wid) => {
      try {
        const [statsRes, reviewsRes] = await Promise.all([
          getWorkerTrustStats(wid),
          getReceivedReviews(wid),
        ]);
        if (cancelled) return;
        if (statsRes?.data?.success) {
          setWorkerStats((prev) => ({ ...prev, [wid]: statsRes.data.data }));
        }
        if (reviewsRes?.data?.success) {
          setWorkerReviews((prev) => ({ ...prev, [wid]: (reviewsRes.data.reviews || []).length }));
        }
      } catch {}
    });
    return () => { cancelled = true; };
  }, [proposals]);

  useEffect(() => {
    if (!currentUserId || !isCompleted) return;
    let cancelled = false;
    getGivenReviews(currentUserId)
      .then((res) => {
        if (cancelled) return;
        const reviews = res.data?.reviews || [];
        const alreadyReviewed = reviews.some((r: any) => {
          const rid = typeof r.serviceId === 'string' ? r.serviceId : r.serviceId?._id;
          return rid === serviceRequest?._id;
        });
        setHasReviewed(alreadyReviewed);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUserId, isCompleted, serviceRequest?._id]);

  const handleAccept = async (proposalId: string) => {
    setActionLoading(proposalId);
    try {
      await acceptProposal(proposalId);
      Toast.show({ type: 'success', text1: 'Propuesta aceptada' });
      await fetchData();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al aceptar propuesta',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (proposalId: string, reason: string) => {
    setActionLoading(proposalId);
    try {
      await rejectProposal(proposalId, reason);
      Toast.show({ type: 'success', text1: 'Propuesta rechazada' });
      setRejectTarget(null);
      setRejectReason('');
      const proposalsRes = await getProposalsForRequest(id);
      setProposals(proposalsRes.data.proposals || []);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al rechazar propuesta',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePickerConfirm = async (isoDate: string) => {
    if (!pickerTarget) return;
    const { proposalId, mode } = pickerTarget;
    setPickerTarget(null);
    setMeetingLoading(proposalId);
    try {
      if (mode === 'request') {
        const res = await requestMeeting(proposalId, isoDate);
        Toast.show({ type: 'success', text1: 'Entrevista solicitada' });
        setMeetingsByProposal((prev) => ({ ...prev, [proposalId]: res.data.data }));
      } else {
        const meeting = meetingsByProposal[proposalId];
        if (!meeting) return;
        const res = await proposeAlternativeTime(meeting._id, isoDate);
        Toast.show({ type: 'success', text1: 'Nuevo horario propuesto' });
        setMeetingsByProposal((prev) => ({ ...prev, [proposalId]: res.data.data }));
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al procesar la solicitud',
      });
    } finally {
      setMeetingLoading(null);
    }
  };

  const handleConfirmServiceMeeting = async () => {
    if (!serviceRequestMeeting) return;
    setMeetingLoading('sr-meeting');
    try {
      const res = await confirmMeeting(serviceRequestMeeting._id);
      Toast.show({ type: 'success', text1: 'Asistencia confirmada' });
      setServiceRequestMeeting(res.data.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al confirmar asistencia',
      });
    } finally {
      setMeetingLoading(null);
    }
  };

  const handleProposeSrMeetingTime = async (isoDate: string) => {
    if (!serviceRequestMeeting) return;
    setSrPickerOpen(false);
    setMeetingLoading('sr-meeting');
    try {
      const res = await proposeAlternativeTime(serviceRequestMeeting._id, isoDate);
      Toast.show({ type: 'success', text1: 'Nuevo horario propuesto' });
      setServiceRequestMeeting(res.data.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al proponer horario',
      });
    } finally {
      setMeetingLoading(null);
    }
  };

  const renderWorkerRequestedMeeting = () => {
    if (!serviceRequestMeeting) return null;
    const meeting = serviceRequestMeeting;
    if (meeting.proposalId) return null;

    const formattedTime = formatDateTime(meeting.startTime);
    const workerName = meeting.workerId
      ? `${meeting.workerId.firstName || ''} ${meeting.workerId.lastName || ''}`.trim() || 'Trabajador'
      : 'Trabajador';

    if (meeting.status === 'CANCELLED') return null;
    if (meeting.status === 'CONFIRMED') {
      return (
        <View style={styles.workerRequestedMeetingBlock}>
          <Text style={styles.workerReqMeetingTitle}>Entrevista solicitada por {workerName}</Text>
          <View style={styles.meetingConfirmedBlock}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={styles.meetingConfirmedText}>Entrevista confirmada</Text>
            {formattedTime && <Text style={styles.meetingTime}>{formattedTime}</Text>}
            {meeting.meetLink && (
              <Text
                style={styles.meetLink}
                onPress={() => Linking.openURL(meeting.meetLink)}
              >
                Abrir videollamada
              </Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.workerRequestedMeetingBlock}>
        <Text style={styles.workerReqMeetingTitle}>Entrevista solicitada por {workerName}</Text>
        <View style={styles.meetingPendingBlock}>
          <View style={styles.meetingPendingRow}>
            <Ionicons name="time-outline" size={16} color="#92400E" />
            <Text style={styles.meetingPendingLabel}>Pendiente de confirmación</Text>
          </View>
          {formattedTime && (
            <Text style={styles.meetingTime}>
              {meeting.lastProposedBy === 'WORKER' ? 'El trabajador propuso: ' : 'Proponen: '}{formattedTime}
            </Text>
          )}
          {meeting.confirmedByClient && meeting.confirmedByWorker ? null : meeting.confirmedByClient ? (
            <Text style={styles.meetingHint}>Esperando confirmación del trabajador</Text>
          ) : (
            <View style={styles.meetingActionsRow}>
              <Button
                size="sm"
                onPress={handleConfirmServiceMeeting}
                disabled={meetingLoading === 'sr-meeting'}
                icon={<Ionicons name="checkmark-outline" size={14} color={WD.white} />}
              >
                {meetingLoading === 'sr-meeting' ? 'Confirmando...' : 'Aceptar horario'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onPress={() => setSrPickerOpen(true)}
                disabled={meetingLoading === 'sr-meeting'}
                icon={<Ionicons name="calendar-outline" size={14} color={WD.darkerGray} />}
              >
                Proponer otra hora
              </Button>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderWorkerStats = (workerId: string) => {
    const stats = workerStats[workerId];
    const reviewCount = workerReviews[workerId];
    if (!stats) return null;
    return (
      <View style={styles.workerStatsRow}>
        <View style={styles.workerStarsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.round(stats.ratingAverage || 0) ? 'star' : 'star-outline'}
              size={12}
              color="#F59E0B"
            />
          ))}
          <Text style={styles.workerStatsText}>
            ({stats.ratingCount || 0})
          </Text>
        </View>
        {stats.completionRate != null && (
          <Text style={styles.workerStatsText}>
            · {Math.round(stats.completionRate * 100)}% completados
          </Text>
        )}
        {reviewCount != null && reviewCount > 0 && (
          <Text style={styles.workerStatsText}>
            · {reviewCount} reseña{reviewCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    );
  };

  const handleConfirmMeeting = async (meetingId: string, proposalId: string) => {
    setMeetingLoading(proposalId);
    try {
      const res = await confirmMeeting(meetingId);
      Toast.show({ type: 'success', text1: 'Asistencia confirmada' });
      setMeetingsByProposal((prev) => ({ ...prev, [proposalId]: res.data.data }));
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al confirmar asistencia',
      });
    } finally {
      setMeetingLoading(null);
    }
  };

  const handleOpenMaps = () => {
    if (serviceRequest?.latitude && serviceRequest?.longitude) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${serviceRequest.latitude},${serviceRequest.longitude}`;
      const url = Platform.select({
        ios: `${scheme}${serviceRequest.title}@${latLng}`,
        android: `${scheme}${latLng}(${serviceRequest.title})`,
      });
      if (url) Linking.openURL(url);
    }
  };

  const handleChat = async () => {
    if (!currentUserId || !acceptedWorkerId) return;
    setMessaging(true);
    try {
      const conversation = await startConversation(currentUserId, acceptedWorkerId);
      if (conversation) router.push('/messages' as any);
    } catch {
      Toast.show({ type: 'error', text1: 'No se pudo iniciar la conversación' });
    } finally {
      setMessaging(false);
    }
  };

  const renderMeetingSection = (proposalId: string) => {
    const meeting = meetingsByProposal[proposalId];
    if (!meeting) return null;

    const formattedTime = formatDateTime(meeting.startTime);
    const clientConfirmed = meeting.confirmedByClient;
    const workerConfirmed = meeting.confirmedByWorker;

    if (meeting.status === 'CONFIRMED') {
      return (
        <View style={styles.meetingConfirmedBlock}>
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={styles.meetingConfirmedText}>Entrevista confirmada</Text>
          {formattedTime && <Text style={styles.meetingTime}>{formattedTime}</Text>}
          {meeting.meetLink && (
            <Text
              style={styles.meetLink}
              onPress={() => Linking.openURL(meeting.meetLink)}
            >
              Abrir videollamada
            </Text>
          )}
        </View>
      );
    }

    if (meeting.status === 'CANCELLED') {
      return (
        <View style={styles.meetingCancelledBlock}>
          <Ionicons name="close-circle" size={16} color="#B91C1C" />
          <Text style={styles.meetingCancelledText}>Entrevista cancelada</Text>
        </View>
      );
    }

    const lastProposed = meeting.lastProposedBy;
    const iProposed = lastProposed === 'CLIENT';

    return (
      <View style={styles.meetingPendingBlock}>
        <View style={styles.meetingPendingRow}>
          <Ionicons name="time-outline" size={16} color="#92400E" />
          <Text style={styles.meetingPendingLabel}>
            Entrevista solicitada
          </Text>
        </View>
        {formattedTime && (
          <Text style={styles.meetingTime}>
            {iProposed ? 'Propusiste: ' : 'Proponen: '}{formattedTime}
          </Text>
        )}
        {clientConfirmed && workerConfirmed ? null : clientConfirmed ? (
          <Text style={styles.meetingHint}>Esperando confirmación del trabajador</Text>
        ) : (
          <View style={styles.meetingActionsRow}>
            <Button
              size="sm"
              onPress={() => handleConfirmMeeting(meeting._id, proposalId)}
              disabled={meetingLoading === proposalId}
              icon={<Ionicons name="checkmark-outline" size={14} color={WD.white} />}
            >
              {meetingLoading === proposalId ? 'Confirmando...' : 'Aceptar horario'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onPress={() => setPickerTarget({ proposalId, mode: 'propose' })}
              disabled={meetingLoading === proposalId}
              icon={<Ionicons name="calendar-outline" size={14} color={WD.darkerGray} />}
            >
              Proponer otra hora
            </Button>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WD.yellow} />
        <Text style={styles.loadingText}>Cargando solicitud...</Text>
      </View>
    );
  }

  if (error || !serviceRequest) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Solicitud no encontrada'}</Text>
        <Text style={styles.errorHint}>
          Puede que la solicitud no exista o no tengas permiso para verla.
        </Text>
        <Button onPress={() => router.replace('/my-services')}>Volver a Servicios</Button>
      </View>
    );
  }

  const pendingProposals = proposals.filter((p) => p.status === 'PENDING');
  const statusColor = STATUS_COLORS[serviceRequest.status] || STATUS_COLORS.OPEN;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
    >
      {/* Back Button */}
      <Button
        variant="ghost"
        onPress={() => router.push('/my-services')}
        icon={<Ionicons name="arrow-back" size={16} color={WD.darkerGray} />}
        style={{ alignSelf: 'flex-start' }}
      >
        Volver
      </Button>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{serviceRequest.title}</Text>
        <View style={styles.badges}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor.bg, borderColor: statusColor.border },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {STATUS_LABELS[serviceRequest.status] || serviceRequest.status}
            </Text>
          </View>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{getCategoryName(serviceRequest)}</Text>
          </View>
        </View>
      </View>

      {/* Image */}
      {serviceRequest.serviceImage?.url && (
        <Image
          source={{ uri: serviceRequest.serviceImage.url }}
          style={styles.image}
          contentFit="cover"
        />
      )}

      {/* Description */}
      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{serviceRequest.description}</Text>
        </CardContent>
      </Card>

      {/* Location */}
      {serviceRequest.latitude && serviceRequest.longitude && (
        <Card>
          <CardContent>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <MapPicker
              lat={serviceRequest.latitude}
              lng={serviceRequest.longitude}
              onLocationChange={() => { }}
              readOnly
            />
            <TouchableOpacity onPress={handleOpenMaps} style={styles.mapBox}>
              <Ionicons name="map-outline" size={20} color={WD.yellowDark} />
              <Text style={styles.mapBoxText}>Ver ubicación en el mapa</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Presupuesto</Text>
              <Text style={styles.infoValue}>
                Q{serviceRequest.budgetMin} - Q{serviceRequest.budgetMax}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Dirección</Text>
              <Text style={styles.infoValue}>{serviceRequest.address || 'No especificada'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Creada</Text>
              <Text style={styles.infoValue}>{formatRelativeDate(serviceRequest.createdAt)}</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Actions: Chat + Review + Report */}
      {(canChat || canReview || canReport) && (
        <Card>
          <CardContent>
            <Text style={styles.sectionTitle}>Acciones</Text>
            <View style={styles.actionsContainer}>
              {canChat && (
                <Button
                  variant="outline"
                  onPress={handleChat}
                  disabled={messaging}
                  icon={<Ionicons name="chatbubble-outline" size={16} color="#374151" />}
                >
                  {messaging ? 'Abriendo...' : 'Chatear con el trabajador'}
                </Button>
              )}
              {canReview && (
                <Button
                  onPress={() => setReviewModalOpen(true)}
                  icon={<Ionicons name="star-outline" size={16} color={WD.darkerGray} />}
                >
                  Dejar reseña
                </Button>
              )}
              {canReport && (
                <Button
                  variant="destructive"
                  onPress={() => setReportModalOpen(true)}
                  icon={<Ionicons name="flag-outline" size={16} color={WD.white} />}
                >
                  Reportar
                </Button>
              )}
            </View>
          </CardContent>
        </Card>
      )}

      {/* Worker-requested interview (no proposal) */}
      {renderWorkerRequestedMeeting()}

      {/* Proposals */}
      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Ofertas recibidas</Text>

          {serviceRequest.status !== 'OPEN' && acceptedProposal ? (
            <View style={styles.acceptedBlock}>
              <Text style={styles.acceptedTitle}>Oferta aceptada</Text>
              <Text style={styles.workerName}>
                {acceptedProposal.workerId?.firstName} {acceptedProposal.workerId?.lastName}
              </Text>
              <StarRating rating={acceptedProposal.workerId?.ratingAverage} />
              {acceptedWorkerId && renderWorkerStats(acceptedWorkerId)}
              <Text style={styles.acceptedPrice}>Q{acceptedProposal.price}</Text>
              {acceptedProposal.message && (
                <Text style={styles.acceptedMessage}>"{acceptedProposal.message}"</Text>
              )}
            </View>
          ) : serviceRequest.status === 'OPEN' && pendingProposals.length > 0 ? (
            <View style={styles.proposalsContainer}>
              {pendingProposals.map((proposal) => {
                const meeting = meetingsByProposal[proposal._id];
                const hasMeeting = meeting && meeting.status !== 'CANCELLED';
                const wid = proposal.workerId?._id || proposal.workerId || '';
                return (
                  <View key={proposal._id} style={styles.proposalCard}>
                    <View style={styles.proposalHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.workerName}>
                          {proposal.workerId?.firstName} {proposal.workerId?.lastName}
                        </Text>
                        <StarRating rating={proposal.workerId?.ratingAverage} />
                        {typeof wid === 'string' && renderWorkerStats(wid)}
                      </View>
                      <View style={styles.proposalHeaderRight}>
                        <Text style={styles.proposalPrice}>Q{proposal.price}</Text>
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => router.push(`/worker/${proposal.workerId?._id}` as any)}
                          icon={<Ionicons name="person-outline" size={14} color={WD.darkerGray} />}
                        >
                          Ver perfil
                        </Button>
                      </View>
                    </View>
                    {proposal.message && (
                      <Text style={styles.proposalMessage}>"{proposal.message}"</Text>
                    )}
                    <View style={styles.proposalActionsRow}>
                      <Button
                        size="sm"
                        style={{ flex: 1 }}
                        onPress={() => setAcceptTarget(proposal._id)}
                        disabled={actionLoading === proposal._id}
                      >
                        {actionLoading === proposal._id ? 'Procesando...' : 'Aceptar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        style={{ flex: 1 }}
                        onPress={() => setRejectTarget(proposal._id)}
                        disabled={actionLoading === proposal._id}
                      >
                        Rechazar
                      </Button>
                    </View>
                    {!hasMeeting && (
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => setPickerTarget({ proposalId: proposal._id, mode: 'request' })}
                        disabled={meetingLoading === proposal._id}
                        icon={<Ionicons name="calendar-outline" size={14} color={WD.darkerGray} />}
                      >
                        {meetingLoading === proposal._id ? '...' : 'Entrevista'}
                      </Button>
                    )}
                    {renderMeetingSection(proposal._id)}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noProposals}>
              Todavía no has recibido ofertas para esta solicitud.
            </Text>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
        title="Rechazar propuesta"
        size="sm"
        footer={
          <View style={styles.modalFooter}>
            <Button
              variant="ghost"
              onPress={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={rejectReason.trim().length < 5 || actionLoading === rejectTarget}
              onPress={() => handleReject(rejectTarget!, rejectReason.trim())}
            >
              {actionLoading === rejectTarget ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </View>
        }
      >
        <Text style={styles.rejectHint}>
          Contale al trabajador por qué no vas a aceptar esta propuesta.
        </Text>
        <TextInput
          style={styles.rejectInput}
          multiline
          maxLength={300}
          placeholder="Ej: Encontré a alguien con mejor disponibilidad..."
          placeholderTextColor={WD.textGray}
          value={rejectReason}
          onChangeText={setRejectReason}
        />
        <Text style={styles.rejectCounter}>{rejectReason.length}/300</Text>
      </Modal>

      {/* Accept Confirmation Modal */}
      <Modal
        open={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        title="Aceptar propuesta"
        size="sm"
        footer={
          <View style={styles.modalFooter}>
            <Button variant="ghost" onPress={() => setAcceptTarget(null)}>
              Cancelar
            </Button>
            <Button
              loading={actionLoading === acceptTarget}
              onPress={() => {
                if (acceptTarget) handleAccept(acceptTarget);
                setAcceptTarget(null);
              }}
            >
              {actionLoading === acceptTarget ? 'Aceptando...' : 'Sí, aceptar'}
            </Button>
          </View>
        }
      >
        <Text style={styles.acceptHint}>
          {(() => {
            const p = pendingProposals.find((x) => x._id === acceptTarget);
            if (!p) return '';
            return `Estás por aceptar la propuesta de ${p.workerId?.firstName || ''} ${p.workerId?.lastName || ''} por Q${p.price}.`;
          })()}
        </Text>
        <Text style={styles.acceptWarning}>
          Al aceptar esta propuesta, las demás serán rechazadas automáticamente y el servicio pasará a estado "en progreso".
        </Text>
      </Modal>

      {/* Date Time Picker Modal for proposals */}
      <DateTimePickerModal
        visible={!!pickerTarget}
        onClose={() => setPickerTarget(null)}
        onConfirm={handlePickerConfirm}
        title={
          pickerTarget?.mode === 'request'
            ? 'Seleccioná fecha y hora para la entrevista'
            : 'Proponé otro horario'
        }
      />

      {/* Date Time Picker Modal for worker-requested interview */}
      <DateTimePickerModal
        visible={srPickerOpen}
        onClose={() => setSrPickerOpen(false)}
        onConfirm={handleProposeSrMeetingTime}
        title="Proponé otro horario para la entrevista"
      />

      {/* Review Modal */}
      <PostServiceReviewFlow
        visible={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        serviceId={serviceRequest._id}
        revieweredId={acceptedWorkerId || ''}
        revieweredName={acceptedWorkerName}
        onSuccess={() => {
          setHasReviewed(true);
          setReviewModalOpen(false);
        }}
      />

      {/* Report Modal */}
      <ReportModal
        visible={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reporteredId={acceptedWorkerId || ''}
        reporteredName={acceptedWorkerName}
        onSuccess={() => {
          setReportModalOpen(false);
          Toast.show({ type: 'success', text1: 'Reporte enviado' });
        }}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: WD.textGray,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: WD.darkerGray,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 13,
    color: WD.textGray,
    textAlign: 'center',
    marginBottom: 8,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: WD.darkerGray,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: WD.lightGray,
    borderWidth: 1,
    borderColor: WD.borderGray,
  },
  categoryText: {
    fontSize: 12,
    color: WD.textGray,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WD.darkerGray,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: WD.mediumGray,
    lineHeight: 20,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: WD.textGray,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: WD.darkerGray,
  },
  actionsContainer: {
    gap: 10,
  },
  acceptedBlock: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  acceptedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  workerName: {
    fontSize: 14,
    fontWeight: '600',
    color: WD.darkerGray,
  },
  acceptedPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  acceptedMessage: {
    fontSize: 13,
    color: WD.mediumGray,
    fontStyle: 'italic',
  },
  noRating: {
    fontSize: 12,
    color: WD.textGray,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    color: WD.mediumGray,
    marginLeft: 4,
  },
  proposalsContainer: {
    gap: 12,
  },
  proposalCard: {
    borderWidth: 1,
    borderColor: WD.borderGray,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  proposalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  proposalPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: WD.darkerGray,
  },
  proposalMessage: {
    fontSize: 13,
    color: WD.mediumGray,
    fontStyle: 'italic',
  },
  proposalActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  noProposals: {
    fontSize: 14,
    color: WD.textGray,
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectHint: {
    fontSize: 14,
    color: WD.mediumGray,
    marginBottom: 12,
  },
  acceptHint: {
    fontSize: 15,
    fontWeight: '600',
    color: WD.darkerGray,
    marginBottom: 8,
  },
  acceptWarning: {
    fontSize: 13,
    color: WD.mediumGray,
    lineHeight: 18,
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: WD.borderGray,
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    fontSize: 14,
    color: WD.darkerGray,
    textAlignVertical: 'top',
  },
  rejectCounter: {
    fontSize: 12,
    color: WD.textGray,
    textAlign: 'right',
    marginTop: 4,
  },
  meetingConfirmedBlock: {
    marginTop: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  meetingConfirmedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  meetingTime: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  meetLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  meetingCancelledBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  meetingCancelledText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  meetingPendingBlock: {
    marginTop: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  meetingPendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meetingPendingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  meetingHint: {
    fontSize: 12,
    color: '#A16207',
    fontStyle: 'italic',
  },
  meetingActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  workerRequestedMeetingBlock: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    padding: 14,
    gap: 8,
  },
  workerReqMeetingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  workerStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  workerStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  workerStatsText: {
    color: '#6B7280',
    fontSize: 11,
  },
  mapBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: WD.yellowDark,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFBEB',
    marginTop: 8,
  },
  mapBoxText: {
    color: WD.yellowDark,
    fontSize: 13,
    fontWeight: '700',
  },
});
