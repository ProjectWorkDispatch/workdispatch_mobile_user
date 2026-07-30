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
  getServiceById,
  getServiceRequestMeeting,
  confirmMeeting,
  proposeAlternativeTime,
  cancelMeeting,
  completeService,
  setupPlan,
  addWorkLog,
  editWorkLog,
  completeWorkDay,
  getClientTrustStats,
  getReceivedReviews,
} from '../../../api/workerDashboard';
import { WD } from '../../../constants/theme';
import { Button } from '../../ui/Button';
import { Card, CardContent } from '../../ui/Card';
import { DateTimePickerModal } from '../../ui/DateTimePickerModal';
import { WorkPlanSetupModal } from '../../ui/WorkPlanSetupModal';
import { AddWorkLogModal } from '../../ui/AddWorkLogModal';
import { MapPicker } from '../../dashboard/MapPicker';

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

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    ACCEPTED: 'Aceptada',
    REJECTED: 'Rechazada',
    CANCELLED: 'Cancelada',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Finalizado',
  };
  return labels[status] || status || 'Pendiente';
};

export function WorkerServiceDetail({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<AnyRecord | null>(null);
  const [meeting, setMeeting] = useState<AnyRecord | null>(null);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [clientStats, setClientStats] = useState<Record<string, any> | null>(null);
  const [reviews, setReviews] = useState<Record<string, any>[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showSetupPlan, setShowSetupPlan] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [editingLog, setEditingLog] = useState<AnyRecord | null>(null);
  const [workPlanLoading, setWorkPlanLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [serviceRes] = await Promise.all([
        getServiceById(serviceId),
      ]);
      const svc = serviceRes.data?.service || serviceRes.data;
      setService(svc);

      const srId = svc.requestId?._id || svc.requestId;
      if (srId) {
        getServiceRequestMeeting(srId)
          .then((res) => {
            if (res?.data?.data) setMeeting(res.data.data);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Servicio no encontrado');
      } else {
        setError(err.response?.data?.message || 'Error al cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

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

  const handleCancelMeetingCall = async () => {
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

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeService(serviceId);
      Toast.show({ type: 'success', text1: 'Servicio marcado como completado' });
      fetchData();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al completar servicio',
      });
    } finally {
      setCompleting(false);
    }
  };

  const handleSetupPlan = async (payload: {
    estimatedStartDate: string;
    estimatedEndDate: string;
    generalPlan: string;
  }) => {
    const res = await setupPlan(serviceId, payload);
    const svc = res.data?.service || res.data;
    setService(svc);
    Toast.show({ type: 'success', text1: 'Plan de trabajo guardado' });
  };

  const handleAddLog = async (payload: { description: string }) => {
    if (!service) return;
    const plan = service.workPlan || [];
    const maxDay = plan.reduce((max: number, d: AnyRecord) => Math.max(max, d.dayNumber || 0), 0);
    const nextDay = maxDay + 1;
    let autoDate: string;
    if (service.estimatedStartDate) {
      const d = new Date(service.estimatedStartDate);
      d.setDate(d.getDate() + (nextDay - 1));
      autoDate = d.toISOString();
    } else {
      autoDate = new Date().toISOString();
    }
    const res = await addWorkLog(serviceId, { date: autoDate, description: payload.description });
    const svc = res.data?.service || res.data;
    setService(svc);
  };

  const handleEditLog = async (payload: { description: string }) => {
    if (!editingLog) return;
    const res = await editWorkLog(serviceId, editingLog.dayNumber, { description: payload.description });
    const svc = res.data?.service || res.data;
    setService(svc);
    setEditingLog(null);
    Toast.show({ type: 'success', text1: 'Entrada actualizada' });
  };

  const handleCompleteDay = async (dayNumber: number) => {
    setWorkPlanLoading(`complete-${dayNumber}`);
    try {
      const res = await completeWorkDay(serviceId, dayNumber);
      const svc = res.data?.service || res.data;
      setService(svc);
      Toast.show({ type: 'success', text1: `Día ${dayNumber} marcado como completado` });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Error al completar el día',
      });
    } finally {
      setWorkPlanLoading(null);
    }
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

  useEffect(() => {
    if (!service) return;
    const req = service.requestId || service.serviceRequestId || {};
    const info = req.clientId || service.clientId || {};
    const cId = info._id || info.id || '';
    if (!cId) return;
    let mounted = true;
    const load = async () => {
      setLoadingStats(true);
      try {
        const [statsRes, reviewsRes] = await Promise.all([
          getClientTrustStats(cId),
          getReceivedReviews(cId),
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
  }, [service]);

  const handleOpenMaps = () => {
    if (!service) return;
    const req = service.requestId || service.serviceRequestId || {};
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
        <Text style={styles.loadingText}>Cargando servicio...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Servicio no encontrado'}</Text>
        <Button onPress={() => router.back()}>Volver</Button>
      </View>
    );
  }

  const request = service.requestId || service.serviceRequestId || {};
  const clientInfo = request.clientId || service.clientId || {};
  const proposalId = service.proposalId?._id || service.proposalId;
  const imageUrl = request.serviceImage?.url || '';
  const formattedTime = formatDateTime(meeting?.startTime);
  const isInProgress = service.status === 'IN_PROGRESS';
  const isCompleted = service.status === 'COMPLETED';

  // Mismas reglas que valida el backend en finishService: no se puede completar
  // sin un plan de trabajo, ni antes de que llegue la fecha de fin del plan.
  const hasWorkPlan = Array.isArray(service.workPlan) && service.workPlan.length > 0;
  const planEndDateReached = (() => {
    if (!service.estimatedEndDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const planEndDate = new Date(service.estimatedEndDate);
    planEndDate.setHours(0, 0, 0, 0);
    return today >= planEndDate;
  })();
  const canComplete = hasWorkPlan && planEndDateReached;
  const totalPlanDays = (() => {
    if (!service.estimatedStartDate || !service.estimatedEndDate) return Infinity;
    const start = new Date(service.estimatedStartDate);
    const end = new Date(service.estimatedEndDate);
    return Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  })();

  const completeBlockedReason = !hasWorkPlan
    ? 'Primero define un plan de trabajo para poder completar el servicio.'
    : !planEndDateReached
      ? `Podrás completarlo a partir del ${new Date(service.estimatedEndDate).toLocaleDateString('es-GT')}.`
      : '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      {/* Back */}
      <Button
        variant="ghost"
        onPress={() => router.back()}
        icon={<Ionicons name="arrow-back" size={16} color={WD.darkerGray} />}
        style={{ alignSelf: 'flex-start' }}
      >
        Volver
      </Button>

      {/* Title & Status */}
      <View>
        <Text style={styles.title}>{request.title || 'Servicio'}</Text>
        <View style={styles.badges}>
          <View style={[styles.statusPill, isCompleted ? styles.statusCompleted : isInProgress ? styles.statusInProgress : null]}>
            <Text style={[styles.statusText, isCompleted ? styles.statusTextCompleted : isInProgress ? styles.statusTextInProgress : null]}>
              {getStatusLabel(service.status)}
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

      {/* Price */}
      <Card>
        <CardContent>
          <Text style={styles.sectionTitle}>Precio acordado</Text>
          <Text style={styles.offerPrice}>{formatMoney(service.finalPrice || service.price)}</Text>
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
                          onPress={handleCancelMeetingCall}
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

      {/* Work Plan Section */}
      {isInProgress && (
        <Card>
          <CardContent>
            <View style={styles.wpHeader}>
              <Ionicons name="list-outline" size={18} color={WD.darkerGray} />
              <Text style={styles.sectionTitle}>Plan de trabajo</Text>
            </View>

            {!service.estimatedStartDate ? (
              <View style={styles.wpEmpty}>
                <Text style={styles.wpEmptyText}>
                  Todavía no definiste un plan de trabajo.
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setShowSetupPlan(true)}
                  icon={<Ionicons name="calendar-outline" size={14} color={WD.darkerGray} />}
                >
                  Crear plan de trabajo
                </Button>
              </View>
            ) : (
              <>
                {/* Fechas estimadas */}
                <View style={styles.wpDates}>
                  <View style={styles.wpDateItem}>
                    <Text style={styles.wpDateLabel}>Inicio</Text>
                    <Text style={styles.wpDateValue}>
                      {new Date(service.estimatedStartDate).toLocaleDateString('es-GT', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={14} color={WD.textGray} />
                  <View style={styles.wpDateItem}>
                    <Text style={styles.wpDateLabel}>Fin</Text>
                    <Text style={styles.wpDateValue}>
                      {service.estimatedEndDate
                        ? new Date(service.estimatedEndDate).toLocaleDateString('es-GT', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : 'Sin definir'}
                    </Text>
                  </View>
                </View>

                {/* Plan general */}
                {service.generalPlan ? (
                  <View style={styles.wpGeneralPlan}>
                    <Text style={styles.wpGeneralLabel}>Plan general</Text>
                    <Text style={styles.wpGeneralText}>{service.generalPlan}</Text>
                  </View>
                ) : null}

                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setShowSetupPlan(true)}
                  style={{ alignSelf: 'flex-start', marginBottom: 12 }}
                  icon={<Ionicons name="pencil-outline" size={14} color={WD.textGray} />}
                >
                  Editar plan
                </Button>

                {/* Registro diario */}
                {Array.isArray(service.workPlan) && service.workPlan.length > 0 && (
                  <View style={styles.wpLogSection}>
                    <Text style={styles.wpLogTitle}>Registro diario</Text>
                    {service.workPlan
                      .slice()
                      .sort((a: AnyRecord, b: AnyRecord) => a.dayNumber - b.dayNumber)
                      .map((day: AnyRecord) => {
                        const isPending = day.status === 'PENDING';
                        const isDone = day.status === 'DONE';
                        const isVerified = day.status === 'VERIFIED';
                        const isDisputed = day.status === 'DISPUTED';
                        const isFutureDay = (() => {
                          if (!day.date) return false;
                          const now = new Date();
                          now.setHours(23, 59, 59, 999);
                          return new Date(day.date).getTime() > now.getTime();
                        })();
                        return (
                          <View
                            key={day.dayNumber}
                            style={[
                              styles.wpDayCard,
                              isDone && styles.wpDayDone,
                              isVerified && styles.wpDayVerified,
                              isDisputed && styles.wpDayDisputed,
                            ]}
                          >
                            <View style={styles.wpDayHeader}>
                              <View style={styles.wpDayMeta}>
                                <Text style={styles.wpDayNumber}>Día {day.dayNumber}</Text>
                                <Text style={styles.wpDayDate}>
                                  {new Date(day.date).toLocaleDateString('es-GT', {
                                    day: '2-digit', month: 'short',
                                  })}
                                </Text>
                              </View>
                              {isDone && (
                                <View style={styles.wpBadgeDone}>
                                  <Text style={styles.wpBadgeDoneText}>Completado</Text>
                                </View>
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
                              {isPending && (
                                <View style={styles.wpBadgePending}>
                                  <Text style={styles.wpBadgePendingText}>Pendiente</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.wpDayDesc}>{day.description}</Text>

                            {isPending && !isFutureDay && (
                              <View style={styles.wpDayActions}>
                                <Button
                                  size="sm"
                                  onPress={() => handleCompleteDay(day.dayNumber)}
                                  disabled={workPlanLoading === `complete-${day.dayNumber}`}
                                  loading={workPlanLoading === `complete-${day.dayNumber}`}
                                  icon={<Ionicons name="checkmark-outline" size={14} color={WD.white} />}
                                >
                                  Marcar completado
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onPress={() => {
                                    setEditingLog(day);
                                    setShowAddLog(true);
                                  }}
                                  icon={<Ionicons name="pencil-outline" size={14} color={WD.textGray} />}
                                >
                                  Editar
                                </Button>
                              </View>
                            )}
                          </View>
                        );
                      })}
                  </View>
                )}

                {(!Array.isArray(service.workPlan) || service.workPlan.length < totalPlanDays) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setEditingLog(null);
                      setShowAddLog(true);
                    }}
                    icon={<Ionicons name="add-outline" size={16} color={WD.darkerGray} />}
                    style={{ marginTop: 8 }}
                  >
                    Agregar entrada diaria
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service Actions */}
      {isInProgress && (
        <Card>
          <CardContent>
            <Text style={styles.sectionTitle}>Acciones</Text>
            <View style={styles.serviceActions}>
              <Button
                onPress={handleComplete}
                disabled={completing || !canComplete}
                loading={completing}
              >
                {completing ? 'Completando...' : 'Marcar como completado'}
              </Button>
              {!canComplete && (
                <Text style={{ fontSize: 12, color: WD.textGray, marginTop: 8 }}>
                  {completeBlockedReason}
                </Text>
              )}
            </View>
          </CardContent>
        </Card>
      )}

      {/* Date Picker */}
      <DateTimePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={handleProposeTime}
        title="Proponé otro horario"
      />

      {/* Work Plan Modals */}
      <WorkPlanSetupModal
        visible={showSetupPlan}
        onClose={() => setShowSetupPlan(false)}
        onSave={handleSetupPlan}
        initialStartDate={service?.estimatedStartDate}
        initialEndDate={service?.estimatedEndDate}
        initialGeneralPlan={service?.generalPlan}
      />

      <AddWorkLogModal
        visible={showAddLog}
        onClose={() => {
          setShowAddLog(false);
          setEditingLog(null);
        }}
        onSave={editingLog ? handleEditLog : handleAddLog}
        initialDescription={editingLog?.description}
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
  statusInProgress: {
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A16207',
  },
  statusTextInProgress: {
    color: '#1D4ED8',
  },
  statusTextCompleted: {
    color: '#15803D',
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
  serviceActions: {
    gap: 10,
  },
  // Work Plan styles
  wpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  wpEmpty: {
    gap: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  wpEmptyText: {
    fontSize: 13,
    color: WD.textGray,
    textAlign: 'center',
  },
  wpDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
    padding: 12,
    marginBottom: 12,
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
  wpLogSection: {
    gap: 8,
  },
  wpLogTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: WD.darkerGray,
    marginBottom: 4,
  },
  wpDayCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 12,
    gap: 8,
  },
  wpDayDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  wpDayVerified: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  wpDayDisputed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  wpDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wpDayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  wpDayNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  wpDayDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  wpDayDesc: {
    fontSize: 13,
    color: WD.mediumGray,
    lineHeight: 18,
  },
  wpDayActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
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