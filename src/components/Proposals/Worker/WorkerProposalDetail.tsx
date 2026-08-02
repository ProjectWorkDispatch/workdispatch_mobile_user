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
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  cancelMeeting,
  confirmMeeting,
  getClientTrustStats,
  getProposalById,
  getProposalMeeting,
  getReceivedReviews,
  proposeAlternativeTime,
} from '../../../api/workerDashboard';
import { WD } from '../../../constants/theme';
import { MapPicker } from '../../dashboard/MapPicker';
import { Button } from '../../ui/Button';
import { Card, CardContent } from '../../ui/Card';
import { DateTimePickerModal } from '../../ui/DateTimePickerModal';

type AnyRecord = Record<string, any>;

const formatMoney = (value: any) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Por definir';
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    maximumFractionDigits: 0,
  }).format(amount);
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

const getCategoryName = (request?: AnyRecord | null) => {
  const category = request?.categoryId;
  if (!category) return 'Sin categoría';
  if (typeof category === 'string') return 'Categoría';
  return category.name || 'Categoría';
};

export function WorkerProposalDetail({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AnyRecord | null>(null);
  const [meeting, setMeeting] = useState<AnyRecord | null>(null);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [clientStats, setClientStats] = useState<Record<string, any> | null>(null);
  const [reviews, setReviews] = useState<Record<string, any>[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [proposalRes, meetingRes] = await Promise.all([
        getProposalById(proposalId),
        getProposalMeeting(proposalId).catch(() => null),
      ]);
      setProposal(proposalRes.data.proposal || null);
      if (meetingRes?.data?.data) setMeeting(meetingRes.data.data);
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        setError(err.response?.data?.message || 'Propuesta no encontrada');
      } else {
        setError('Error al cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirm = async () => {
    if (!meeting) return;
    setMeetingLoading(true);
    try {
      const res = await confirmMeeting(meeting._id);
      Toast.show({ type: 'success', text1: 'Asistencia confirmada' });
      setMeeting(res.data.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al confirmar asistencia',
      });
    } finally {
      setMeetingLoading(false);
    }
  };

  const handleProposeTime = async (isoDate: string) => {
    if (!meeting) return;
    setMeetingLoading(true);
    setShowPicker(false);
    try {
      const res = await proposeAlternativeTime(meeting._id, isoDate);
      Toast.show({ type: 'success', text1: 'Nuevo horario propuesto' });
      setMeeting(res.data.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al proponer horario',
      });
    } finally {
      setMeetingLoading(false);
    }
  };

  const handleCancelMeeting = async () => {
    if (!meeting) return;
    setMeetingLoading(true);
    try {
      await cancelMeeting(meeting._id);
      Toast.show({ type: 'success', text1: 'Entrevista cancelada' });
      setMeeting((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al cancelar entrevista',
      });
    } finally {
      setMeetingLoading(false);
    }
  };

  const request = proposal ? (proposal.serviceRequestId || {}) : {};
  const clientInfo = request.clientId || {};
  const clientId = clientInfo._id || clientInfo.id || '';

  useEffect(() => {
    if (!clientId) return;
    let mounted = true;
    const load = async () => {
      setLoadingStats(true);
      try {
        const [statsRes, reviewsRes] = await Promise.all([
          getClientTrustStats(clientId),
          getReceivedReviews(clientId),
        ]);
        if (!mounted) return;
        if (statsRes?.data?.success) setClientStats(statsRes.data.data);
        if (reviewsRes?.data?.success) setReviews(reviewsRes.data.reviews || []);
      } catch {} finally {
        if (mounted) setLoadingStats(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [clientId]);

  const renderStars = (rating: number | null | undefined) => {
    const max = 5;
    const value = rating ?? 0;
    const full = Math.floor(value);
    const half = value - full >= 0.5;
    const stars: React.ReactNode[] = [];
    for (let i = 0; i < max; i++) {
      let iconName: keyof typeof Ionicons.glyphMap = 'star-outline';
      if (i < full) iconName = 'star';
      else if (i === full && half) iconName = 'star-half';
      stars.push(<Ionicons key={i} name={iconName} size={12} color="#F59E0B" />);
    }
    return stars;
  };

  const handleOpenMaps = () => {
    if (!proposal) return;
    const req = proposal.serviceRequestId || {};
    if (req.latitude && req.longitude) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${req.latitude},${req.longitude}`;
      const url = Platform.select({
        ios: `${scheme}${req.title}@${latLng}`,
        android: `${scheme}${latLng}(${req.title})`,
      });
      if (url) Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={WD.yellow} />
        <Text style={styles.loadingText}>Cargando propuesta...</Text>
      </View>
    );
  }

  if (error || !proposal) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Propuesta no encontrada'}</Text>
        <Button onPress={() => router.replace('/(tabs)/my-services')}>Volver</Button>
      </View>
    );
  }

  const imageUrl = request.serviceImage?.url || '';
  const formattedTime = formatDateTime(meeting?.startTime);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      {/* Back */}
      <Button
        variant="ghost"
        onPress={() => router.replace('/(tabs)/my-services')}
        icon={<Ionicons name="arrow-back" size={16} color={WD.darkerGray} />}
        style={{ alignSelf: 'flex-start' }}
      >
        Volver
      </Button>

      {/* Title & Status */}
      <View>
        <Text style={styles.title}>{request.title || 'Solicitud'}</Text>
        <View style={styles.badges}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>
              {proposal.status === 'PENDING' ? 'Pendiente' : proposal.status === 'ACCEPTED' ? 'Aceptada' : proposal.status === 'REJECTED' ? 'Rechazada' : proposal.status}
            </Text>
          </View>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{getCategoryName(request)}</Text>
          </View>
        </View>
      </View>

      {/* Image */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
      ) : null}

      {/* Description */}
      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{request.description || 'Sin descripción'}</Text>
        </CardContent>
      </Card>

      {/* Tu oferta */}
      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Tu oferta</Text>
          <Text style={styles.offerPrice}>{formatMoney(proposal.price)}</Text>
          {proposal.message && <Text style={styles.offerMessage}>"{proposal.message}"</Text>}
        </CardContent>
      </Card>

      {/* Location */}
      {request.latitude && request.longitude ? (
        <Card>
          <CardContent>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <MapPicker
              lat={request.latitude}
              lng={request.longitude}
              onLocationChange={() => {}}
              readOnly
            />
            <TouchableOpacity onPress={handleOpenMaps} style={styles.mapBox}>
              <Ionicons name="map-outline" size={20} color={WD.yellowDark} />
              <Text style={styles.mapBoxText}>Ver ubicación en el mapa</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>
      ) : null}

      {/* Info */}
      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Presupuesto</Text>
              <Text style={styles.infoValue}>
                {formatMoney(request.budgetMin)} - {formatMoney(request.budgetMax)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Dirección</Text>
              <Text style={styles.infoValue}>{request.address || 'No especificada'}</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Client Info */}
      {clientInfo.firstName && (
        <Card>
          <CardContent>
            <Text style={styles.sectionTitle}>Cliente</Text>
            {loadingStats ? (
              <View style={styles.statsLoadingRow}>
                <ActivityIndicator size="small" color={WD.yellowDark} />
                <Text style={styles.statsLoadingText}>Cargando información del cliente...</Text>
              </View>
            ) : (
              <View style={styles.clientInfo}>
                <Ionicons name="person-circle-outline" size={36} color="#9CA3AF" />
                <View style={styles.clientTextCol}>
                  <Text style={styles.clientName}>{clientInfo.firstName} {clientInfo.lastName}</Text>
                  {clientStats && (
                    <View style={styles.ratingRow}>
                      {renderStars(clientStats.ratingAverage)}
                      <Text style={styles.ratingCount}>
                        ({clientStats.ratingCount || 0}) {clientStats.completionRate != null
                          ? `· ${Math.round(clientStats.completionRate * 100)}% completados`
                          : ''}
                      </Text>
                    </View>
                  )}
                  {reviews.length > 0 && (
                    <Text style={styles.reviewCount}>
                      {reviews.length} reseña{reviews.length !== 1 ? 's' : ''} recibida{reviews.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meeting Section */}
      {meeting && meeting.status !== 'CANCELLED' ? (
        <Card>
          <CardContent>
            <Text style={styles.sectionTitle}>Entrevista</Text>

            {meeting.status === 'CONFIRMED' ? (
              <View style={styles.meetingConfirmed}>
                <View style={styles.meetingConfirmedRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={styles.meetingConfirmedText}>Entrevista confirmada</Text>
                </View>
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
            ) : (
              <View style={styles.meetingPending}>
                <View style={styles.meetingPendingRow}>
                  <Ionicons name="time-outline" size={16} color="#92400E" />
                  <Text style={styles.meetingPendingLabel}>Entrevista solicitada</Text>
                </View>
                {formattedTime && (
                  <Text style={styles.meetingTime}>
                    {meeting.lastProposedBy === 'WORKER' ? 'Propusiste: ' : 'Proponen: '}{formattedTime}
                  </Text>
                )}

                {meeting.confirmedByWorker && meeting.confirmedByClient ? null : meeting.confirmedByWorker ? (
                  <Text style={styles.meetingHint}>Esperando confirmación del cliente</Text>
                ) : (
                  <View style={styles.meetingActions}>
                    <View style={styles.meetingActionsRow}>
                      <View style={styles.meetingActionHalf}>
                        <Button
                          size="sm"
                          onPress={handleConfirm}
                          disabled={meetingLoading}
                          icon={<Ionicons name="checkmark-outline" size={14} color={WD.white} />}
                        >
                          {meetingLoading ? '...' : 'Aceptar horario'}
                        </Button>
                      </View>
                      <View style={styles.meetingActionHalf}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={handleCancelMeeting}
                          disabled={meetingLoading}
                        >
                          Rechazar
                        </Button>
                      </View>
                    </View>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => setShowPicker(true)}
                      disabled={meetingLoading}
                      icon={<Ionicons name="calendar-outline" size={14} color={WD.darkerGray} />}
                      fullWidth
                    >
                      Proponer hora
                    </Button>
                  </View>
                )}
              </View>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Actions */}
      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Acciones</Text>
          <View style={styles.actionsContainer}>
            {clientId ? (
              <Button
                variant="outline"
                onPress={() => router.push(`/client/${clientId}` as any)}
                icon={<Ionicons name="person-outline" size={16} color={WD.darkerGray} />}
              >
                Ver Perfil del Cliente
              </Button>
            ) : null}
          </View>
        </CardContent>
      </Card>

      {/* Date Picker */}
      <DateTimePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={handleProposeTime}
        title="Proponé otro horario"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WD.lightGray,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  center: {
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
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: WD.darkerGray,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusPill: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A16207',
  },
  categoryPill: {
    backgroundColor: WD.lightGray,
    borderWidth: 1,
    borderColor: WD.borderGray,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  offerPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: WD.yellowDark,
  },
  offerMessage: {
    fontSize: 13,
    color: WD.mediumGray,
    fontStyle: 'italic',
    marginTop: 4,
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
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clientTextCol: {
    flex: 1,
    minWidth: 0,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingCount: {
    color: '#6B7280',
    fontSize: 11,
  },
  reviewCount: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  statsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  statsLoadingText: {
    color: '#6B7280',
    fontSize: 12,
  },
  meetingConfirmed: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  meetingConfirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meetingConfirmedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  meetingTime: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  meetLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  meetingPending: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  meetingActions: {
    gap: 8,
    marginTop: 4,
  },
  meetingActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  meetingActionHalf: {
    flex: 1,
  },
  actionsContainer: {
    gap: 10,
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
