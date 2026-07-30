import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  getMeetingById,
  confirmMeeting,
  proposeAlternativeTime,
  cancelMeeting,
  getClientTrustStats,
  getReceivedReviews,
} from '../../../api/workerDashboard';
import { WD } from '../../../constants/theme';
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

export function WorkerMeetingDetail({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const res = await getMeetingById(meetingId);
      setMeeting(res.data.data || null);
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        setError(err.response?.data?.message || 'Entrevista no encontrada');
      } else {
        setError('Error al cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clientId = meeting?.clientId?._id || meeting?.clientId || '';

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

  const handleCancel = async () => {
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={WD.yellow} />
        <Text style={styles.loadingText}>Cargando entrevista...</Text>
      </View>
    );
  }

  if (error || !meeting) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Entrevista no encontrada'}</Text>
        <Button onPress={() => router.back()}>Volver</Button>
      </View>
    );
  }

  const request = meeting.serviceRequestId || {};
  const clientInfo = meeting.clientId || {};
  const formattedTime = formatDateTime(meeting.startTime);
  const isConfirmed = meeting.status === 'CONFIRMED';
  const isCancelled = meeting.status === 'CANCELLED';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <Button
        variant="ghost"
        onPress={() => router.back()}
        icon={<Ionicons name="arrow-back" size={16} color={WD.darkerGray} />}
        style={{ alignSelf: 'flex-start' }}
      >
        Volver
      </Button>

      <View>
        <Text style={styles.title}>{request.title || 'Solicitud de servicio'}</Text>
      </View>

      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{request.description || 'Sin descripción disponible.'}</Text>
        </CardContent>
      </Card>

      {request.budgetMin != null && (
        <Card>
          <CardContent>
            <Text style={styles.sectionTitle}>Presupuesto</Text>
            <Text style={styles.budget}>
              {formatMoney(request.budgetMin)} - {formatMoney(request.budgetMax)}
            </Text>
          </CardContent>
        </Card>
      )}

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
                  <Text style={styles.clientName}>
                    {clientInfo.firstName} {clientInfo.lastName}
                  </Text>
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

      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Entrevista</Text>
          {isCancelled ? (
            <View style={styles.meetingCancelled}>
              <Ionicons name="close-circle" size={16} color="#B91C1C" />
              <Text style={styles.meetingCancelledText}>Entrevista cancelada</Text>
            </View>
          ) : isConfirmed ? (
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
              <Button
                size="sm"
                variant="ghost"
                onPress={handleCancel}
                disabled={meetingLoading}
                icon={<Ionicons name="close-outline" size={14} color="#B91C1C" />}
                style={{ marginTop: 4 }}
              >
                Cancelar reunión
              </Button>
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
                        onPress={handleCancel}
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
                    Proponer otra hora
                  </Button>
                </View>
              )}
            </View>
          )}
        </CardContent>
      </Card>

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
    color: '#111827',
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
  budget: {
    fontSize: 18,
    fontWeight: '900',
    color: WD.yellowDark,
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
  meetingCancelled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meetingCancelledText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
});
