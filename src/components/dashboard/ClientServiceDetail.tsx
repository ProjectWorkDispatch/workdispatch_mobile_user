import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { getClientServices, verifyWorkDay, getWorkerTrustStats, getReceivedReviews } from '../../api/clientDashboard';
import { getGivenReviews } from '../../api/user';
import { WD } from '../../constants/theme';
import { useAcceptedProposal } from '../../hooks/useAcceptedProposal';
import { useAuthStore } from '../../store/authStore';
import { useMessagesStore } from '../../store/userStore';
import { formatRelativeDate } from '../../utils/statusBadge';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { ReportModal } from '../Reports/ReportModal';
import { PostServiceReviewFlow } from '../reviews/PostServiceReviewFlow';

const SERVICE_STATUS_BADGE: Record<string, { label: string; bg: string; border: string; text: string }> = {
  PENDING: { label: 'Pendiente', bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  IN_PROGRESS: { label: 'En Progreso', bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
  COMPLETED: { label: 'Finalizado', bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46' },
  CANCELLED: { label: 'Cancelado', bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280' },
};

interface ClientServiceDetailProps {
  serviceId: string;
}

export function ClientServiceDetail({ serviceId }: ClientServiceDetailProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string;
  const startConversation = useMessagesStore((s) => s.startConversation);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<any>(null);

  const [showProposal, setShowProposal] = useState(false);
  const [showWorkPlan, setShowWorkPlan] = useState(false);

  const [verifyTarget, setVerifyTarget] = useState<any>(null);
  const [clientNote, setClientNote] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleVerify = async () => {
    if (!verifyTarget) return;
    setVerifyLoading(true);
    try {
      await verifyWorkDay(service._id, verifyTarget.dayNumber, {
        verified: verifyTarget.verified,
        clientNote: verifyTarget.verified ? undefined : clientNote.trim() || undefined,
      });
      Toast.show({
        type: 'success',
        text1: verifyTarget.verified
          ? 'Día verificado correctamente'
          : 'Día disputado. La reputación del trabajador se ha ajustado.',
      });
      setVerifyTarget(null);
      setClientNote('');
      fetchService();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al verificar el día',
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const [messaging, setMessaging] = useState(false);
  const [workerStats, setWorkerStats] = useState<Record<string, any> | null>(null);
  const [workerReviewsCount, setWorkerReviewsCount] = useState(0);
  const [loadingWorkerStats, setLoadingWorkerStats] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewFlowOpen, setReviewFlowOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const requestIdForProposal = service
    ? (typeof service.requestId === 'string' ? service.requestId : service.requestId?._id)
    : null;

  const { proposal: acceptedProposal, loading: proposalLoading } = useAcceptedProposal(requestIdForProposal);

  const fetchService = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getClientServices(currentUserId);
      const services = res.data?.services || [];
      const found = services.find((s: any) => s._id === serviceId);
      if (found) {
        setService(found);
      } else {
        setError('Servicio no encontrado');
      }
    } catch {
      setError('Error al cargar el servicio');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, serviceId]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  const workerId = service?.workerId
    ? (typeof service.workerId === 'string' ? service.workerId : service.workerId._id)
    : null;
  const workerName = service?.workerId
    ? `${service.workerId.firstName || ''} ${service.workerId.lastName || ''}`.trim()
    : '';

  useEffect(() => {
    if (!workerId) return;
    let mounted = true;
    const load = async () => {
      setLoadingWorkerStats(true);
      try {
        const [statsRes, reviewsRes] = await Promise.all([
          getWorkerTrustStats(workerId),
          getReceivedReviews(workerId),
        ]);
        if (!mounted) return;
        if (statsRes?.data?.success) setWorkerStats(statsRes.data.data);
        if (reviewsRes?.data?.success) setWorkerReviewsCount((reviewsRes.data.reviews || []).length);
      } catch {} finally {
        if (mounted) setLoadingWorkerStats(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [workerId]);

  const canChat = service && workerId && service.status !== 'CANCELLED';
  const canReview = service && (service.status === 'COMPLETED' || service.status === 'CANCELLED');
  const statusBadge = SERVICE_STATUS_BADGE[service?.status] || SERVICE_STATUS_BADGE.PENDING;

  useEffect(() => {
    if (!canReview || !currentUserId) return;
    let cancelled = false;
    getGivenReviews(currentUserId)
      .then((res) => {
        if (cancelled) return;
        const reviews = res.data?.reviews || [];
        const alreadyReviewed = reviews.some((r: any) => {
          const rid = typeof r.serviceId === 'string' ? r.serviceId : r.serviceId?._id;
          return rid === service._id;
        });
        setHasReviewed(alreadyReviewed);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [canReview, currentUserId, service?._id]);

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

  const handleChat = async () => {
    if (!currentUserId || !workerId) return;
    setMessaging(true);
    try {
      const conversation = await startConversation(currentUserId, workerId);
      if (conversation) router.push('/messages' as any);
    } catch {
      Toast.show({ type: 'error', text1: 'No se pudo iniciar la conversación' });
    } finally {
      setMessaging(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WD.yellow} />
        <Text style={styles.loadingText}>Cargando servicio...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Servicio no encontrado'}</Text>
        <Text style={styles.errorHint}>
          Puede que el servicio no exista o no tengas permiso para verlo.
        </Text>
        <Button onPress={() => router.replace('/my-services')}>Volver a Servicios</Button>
      </View>
    );
  }

  const requestTitle = service.requestId?.title || service.serviceCode || 'Servicio asignado';
  const requestImage = service.requestId?.serviceImage?.url || '';
  const categoryName = service.requestId?.categoryId?.name || 'Sin categoría';
  const address = service.requestId?.address || 'No especificada';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
    >
      <Button
        variant="ghost"
        onPress={() => router.push('/my-services')}
        icon={<Ionicons name="arrow-back" size={16} color={WD.darkerGray} />}
        style={{ alignSelf: 'flex-start' }}
      >
        Volver
      </Button>

      {/* Image */}
      {requestImage ? (
        <Image source={{ uri: requestImage }} style={styles.image} contentFit="cover" />
      ) : null}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badgesRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg, borderColor: statusBadge.border }]}>
            <View style={[styles.statusDot, { backgroundColor: statusBadge.text }]} />
            <Text style={[styles.statusText, { color: statusBadge.text }]}>{statusBadge.label}</Text>
          </View>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{categoryName}</Text>
          </View>
        </View>
        <Text style={styles.title}>{requestTitle}</Text>
      </View>

      {/* Description */}
      {service.requestId?.description && (
        <Card>
          <CardContent>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{service.requestId.description}</Text>
          </CardContent>
        </Card>
      )}

      {/* Info Grid */}
      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Información del servicio</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Precio final</Text>
              <Text style={styles.infoValue}>Q{service.finalPrice}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Dirección</Text>
              <Text style={styles.infoValue}>{address}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Creado</Text>
              <Text style={styles.infoValue}>{formatRelativeDate(service.createdAt)}</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Worker Info */}
      {workerName && (
        <Card>
          <CardContent>
            <Text style={styles.sectionTitle}>Trabajador</Text>
            {loadingWorkerStats ? (
              <View style={styles.statsLoadingRow}>
                <ActivityIndicator size="small" color={WD.yellowDark} />
                <Text style={styles.statsLoadingText}>Cargando información del trabajador...</Text>
              </View>
            ) : (
              <View style={styles.clientInfo}>
                <Ionicons name="person-circle-outline" size={36} color="#9CA3AF" />
                <View style={styles.clientTextCol}>
                  <Text style={styles.clientName}>{workerName}</Text>
                  {workerStats && (
                    <View style={styles.ratingRow}>
                      {renderStars(workerStats.ratingAverage)}
                      <Text style={styles.ratingCount}>
                        ({workerStats.ratingCount || 0}) {workerStats.completionRate != null
                          ? `· ${Math.round(workerStats.completionRate * 100)}% completados`
                          : ''}
                      </Text>
                    </View>
                  )}
                  {workerReviewsCount > 0 && (
                    <Text style={styles.reviewCount}>
                      {workerReviewsCount} reseña{workerReviewsCount !== 1 ? 's' : ''} recibida{workerReviewsCount !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </CardContent>
        </Card>
      )}

      {/* Accepted Proposal (collapsible) */}
      <Card>
        <Pressable onPress={() => setShowProposal(!showProposal)} style={styles.collapsibleHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="document-text-outline" size={18} color={WD.darkerGray} />
            <Text style={styles.sectionTitle}>Propuesta ganadora</Text>
          </View>
          <Ionicons
            name={showProposal ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={WD.textGray}
          />
        </Pressable>
        {showProposal && (
          <View style={styles.collapsibleContent}>
            {proposalLoading ? (
              <ActivityIndicator size="small" color={WD.yellow} />
            ) : acceptedProposal ? (
              <View style={{ gap: 8 }}>
                <View style={styles.proposalRow}>
                  <Text style={styles.proposalLabel}>Precio ofertado</Text>
                  <Text style={styles.proposalValue}>Q{acceptedProposal.price}</Text>
                </View>
                {acceptedProposal.message && (
                  <View>
                    <Text style={styles.proposalLabel}>Mensaje</Text>
                    <Text style={styles.proposalMessage}>
                      &ldquo;{acceptedProposal.message}&rdquo;
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.emptyText}>No se encontró la propuesta original.</Text>
            )}
          </View>
        )}
      </Card>

      {/* Work Plan */}
      <Card>
        <Pressable onPress={() => setShowWorkPlan(!showWorkPlan)} style={styles.collapsibleHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="list-outline" size={18} color={WD.darkerGray} />
            <Text style={styles.sectionTitle}>Plan de trabajo</Text>
            {Array.isArray(service.workPlan) && service.workPlan.length > 0 && (
              <View style={styles.workPlanCount}>
                <Text style={styles.workPlanCountText}>
                  {service.workPlan.filter((d: any) => d.status === 'VERIFIED').length}/{service.workPlan.length}
                </Text>
              </View>
            )}
          </View>
          <Ionicons
            name={showWorkPlan ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={WD.textGray}
          />
        </Pressable>
        {showWorkPlan && (
          <View style={styles.collapsibleContent}>
            {/* Fechas estimadas */}
            {service.estimatedStartDate && (
              <View style={styles.wpDates}>
                <View style={styles.wpDateItem}>
                  <Text style={styles.wpDateLabel}>Inicio</Text>
                  <Text style={styles.wpDateValue}>
                    {new Date(service.estimatedStartDate).toLocaleDateString('es-GT', {
                      day: 'numeric', month: 'short',
                    })}
                  </Text>
                </View>
                {service.estimatedEndDate && (
                  <>
                    <Ionicons name="arrow-forward" size={12} color={WD.textGray} />
                    <View style={styles.wpDateItem}>
                      <Text style={styles.wpDateLabel}>Fin</Text>
                      <Text style={styles.wpDateValue}>
                        {new Date(service.estimatedEndDate).toLocaleDateString('es-GT', {
                          day: 'numeric', month: 'short',
                        })}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Plan general */}
            {service.generalPlan ? (
              <View style={styles.wpGeneralPlan}>
                <Text style={styles.wpGeneralLabel}>Plan general</Text>
                <Text style={styles.wpGeneralText}>{service.generalPlan}</Text>
              </View>
            ) : null}

            {/* Días */}
            {Array.isArray(service.workPlan) && service.workPlan.length > 0 ? (
              <View style={{ gap: 8, marginTop: 4 }}>
                {service.workPlan
                  .slice()
                  .sort((a: any, b: any) => a.dayNumber - b.dayNumber)
                  .map((day: any) => {
                    const isPending = day.status === 'PENDING';
                    const isDone = day.status === 'DONE';
                    const isVerified = day.status === 'VERIFIED';
                    const isDisputed = day.status === 'DISPUTED';
                    return (
                      <View
                        key={day.dayNumber}
                        style={[
                          styles.workPlanDay,
                          isDone && styles.workPlanDayDone,
                          isVerified && styles.workPlanDayVerified,
                          isDisputed && styles.workPlanDayDisputed,
                        ]}
                      >
                        <Ionicons
                          name={
                            isVerified ? 'checkmark-circle' :
                            isDisputed ? 'close-circle' :
                            isDone ? 'time-outline' :
                            'ellipse-outline'
                          }
                          size={20}
                          color={
                            isVerified ? '#2563EB' :
                            isDisputed ? '#DC2626' :
                            isDone ? '#D97706' :
                            '#D1D5DB'
                          }
                        />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.dayNumber}>Día {day.dayNumber}</Text>
                            {day.date && (
                              <Text style={styles.dayDate}>
                                {new Date(day.date).toLocaleDateString('es-GT', {
                                  day: '2-digit', month: 'short',
                                })}
                              </Text>
                            )}
                            {isVerified && (
                              <View style={styles.wpBadgeVerified}>
                                <Text style={styles.wpBadgeVerifiedText}>Verificado</Text>
                              </View>
                            )}
                            {isDisputed && (
                              <View style={styles.wpBadgeDisputed}>
                                <Text style={styles.wpBadgeDisputedText}>Disputado</Text>
                              </View>
                            )}
                            {isDone && (
                              <View style={styles.wpBadgeDone}>
                                <Text style={styles.wpBadgeDoneText}>Completado</Text>
                              </View>
                            )}
                            {isPending && (
                              <View style={styles.wpBadgePending}>
                                <Text style={styles.wpBadgePendingText}>Pendiente</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.dayDescription}>{day.description}</Text>

                          {/* Acciones del cliente */}
                          {isDone && (
                            <View style={styles.wpVerifyActions}>
                              <Button
                                size="sm"
                                onPress={() => setVerifyTarget({ dayNumber: day.dayNumber, verified: true })}
                                disabled={verifyLoading}
                                icon={<Ionicons name="checkmark-outline" size={13} color={WD.white} />}
                              >
                                Verificar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onPress={() => {
                                  setVerifyTarget({ dayNumber: day.dayNumber, verified: false });
                                  setClientNote('');
                                }}
                                disabled={verifyLoading}
                                icon={<Ionicons name="close-outline" size={13} color={WD.white} />}
                              >
                                Disputar
                              </Button>
                            </View>
                          )}

                          {isDisputed && day.clientNote && (
                            <View style={styles.wpClientNote}>
                              <Text style={styles.wpClientNoteLabel}>Tu nota:</Text>
                              <Text style={styles.wpClientNoteText}>{day.clientNote}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
              </View>
            ) : (
              <Text style={styles.emptyText}>El trabajador aún no ha agregado días al plan.</Text>
            )}
          </View>
        )}
      </Card>

      {/* Actions */}
      {(canChat || canReview) && (
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
              {canReview && !hasReviewed && (
                <Button
                  onPress={() => setReviewFlowOpen(true)}
                  icon={<Ionicons name="star-outline" size={16} color={WD.darkerGray} />}
                >
                  Dejar reseña
                </Button>
              )}
              {canReview && hasReviewed && (
                <View style={styles.reviewedBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.reviewedText}>Ya dejaste una reseña</Text>
                </View>
              )}
              {canReview && (
                <Button
                  variant="destructive"
                  onPress={() => setReportOpen(true)}
                  icon={<Ionicons name="flag-outline" size={16} color={WD.white} />}
                >
                  Reportar
                </Button>
              )}
            </View>
          </CardContent>
        </Card>
      )}

      <PostServiceReviewFlow
        visible={reviewFlowOpen}
        onClose={() => setReviewFlowOpen(false)}
        serviceId={service._id}
        revieweredId={workerId || ''}
        revieweredName={workerName}
        onSuccess={() => {
          setHasReviewed(true);
          setReviewFlowOpen(false);
        }}
      />

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        reporteredId={workerId || ''}
        reporteredName={workerName}
        onSuccess={() => {
          setReportOpen(false);
          Toast.show({ type: 'success', text1: 'Reporte enviado' });
        }}
      />

      {/* Verify / Dispute confirmation modal */}
      <Modal
        open={!!verifyTarget}
        onClose={() => { setVerifyTarget(null); setClientNote(''); }}
        title={verifyTarget?.verified ? 'Verificar día' : 'Disputar día'}
        size="sm"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="outline" onPress={() => { setVerifyTarget(null); setClientNote(''); }}>
              Cancelar
            </Button>
            <Button
              onPress={handleVerify}
              disabled={verifyLoading}
              loading={verifyLoading}
            >
              {verifyTarget?.verified ? 'Sí, verificar' : 'Sí, disputar'}
            </Button>
          </View>
        }
      >
        {verifyTarget?.verified ? (
          <Text style={styles.verifyText}>
            Vas a confirmar que el trabajador completó el día {verifyTarget?.dayNumber} correctamente.
          </Text>
        ) : (
          <>
            <Text style={styles.verifyText}>
              Vas a disputar el día {verifyTarget?.dayNumber}. Esto afectará la reputación del trabajador.
            </Text>
            <Text style={styles.verifyLabel}>Motivo (opcional)</Text>
            <TextInput
              style={styles.verifyInput}
              placeholder="Describí por qué estás disputando este día..."
              placeholderTextColor="#9CA3AF"
              value={clientNote}
              onChangeText={setClientNote}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </>
        )}
      </Modal>
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
    gap: 14,
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
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  header: {
    gap: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: WD.darkerGray,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WD.darkerGray,
  },
  description: {
    fontSize: 14,
    color: WD.mediumGray,
    lineHeight: 20,
  },
  infoGrid: {
    gap: 12,
    marginTop: 8,
  },
  infoItem: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: WD.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: WD.darkerGray,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  collapsibleContent: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
    gap: 8,
  },
  proposalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proposalLabel: {
    fontSize: 12,
    color: WD.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  proposalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: WD.darkerGray,
  },
  proposalMessage: {
    fontSize: 13,
    color: WD.mediumGray,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: WD.textGray,
    textAlign: 'center',
    paddingVertical: 8,
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
  workPlanCount: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  workPlanCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  scheduledDate: {
    fontSize: 13,
    color: WD.textGray,
    marginBottom: 4,
  },
  workPlanDay: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  workPlanDayDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  dayDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  doneBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  doneBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#065F46',
  },
  dayDescription: {
    fontSize: 13,
    color: WD.mediumGray,
    marginTop: 2,
  },
  actionsContainer: {
    marginTop: 8,
    gap: 10,
  },
  reviewedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  reviewedText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  // Work plan interactive styles
  wpDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  wpDateItem: {
    gap: 2,
  },
  wpDateLabel: {
    fontSize: 11,
    color: WD.textGray,
    textTransform: 'uppercase',
  },
  wpDateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: WD.darkerGray,
  },
  wpGeneralPlan: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  wpGeneralLabel: {
    fontSize: 11,
    color: WD.textGray,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  wpGeneralText: {
    fontSize: 13,
    color: WD.mediumGray,
    lineHeight: 18,
  },
  workPlanDayVerified: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  workPlanDayDisputed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  wpBadgeVerified: {
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  wpBadgeVerifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  wpBadgeDisputed: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  wpBadgeDisputedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
  },
  wpBadgeDone: {
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  wpBadgeDoneText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#065F46',
  },
  wpBadgePending: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  wpBadgePendingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A16207',
  },
  wpVerifyActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  wpClientNote: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    gap: 2,
  },
  wpClientNoteLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  wpClientNoteText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  // Verify modal styles
  verifyText: {
    fontSize: 14,
    color: WD.mediumGray,
    lineHeight: 20,
    marginBottom: 12,
  },
  verifyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: WD.darkerGray,
    marginBottom: 6,
  },
  verifyInput: {
    borderWidth: 1,
    borderColor: WD.borderGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: WD.darkerGray,
    backgroundColor: WD.white,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
