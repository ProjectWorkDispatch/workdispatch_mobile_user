import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { WD } from '../../../constants/theme';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { DateTimePickerModal } from '../../ui/DateTimePickerModal';
import { getClientTrustStats, getReceivedReviews, getServiceRequestMeeting, workerRequestMeeting } from '../../../api/workerDashboard';
import { MapPicker } from '../MapPicker';

type AnyRecord = Record<string, any>;

const getCategoryName = (request?: AnyRecord | null) => {
  const category = request?.categoryId || request?.category;
  if (!category) return 'Sin categoria';
  if (typeof category === 'string') return 'Categoria asignada';
  return category.name || category.nombre || 'Categoria asignada';
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

const formatBudget = (request?: AnyRecord | null) => {
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
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const getImageUrl = (job?: AnyRecord | null) => {
  return job?.serviceImage?.url || job?.image?.url || job?.photo?.url || '';
};

const getClient = (job?: AnyRecord | null) => {
  return job?.clientId || job?.client || null;
};

const getClientId = (job?: AnyRecord | null) => {
  const client = getClient(job);
  if (!client || typeof client === 'string') return '';
  return client._id || client.id || '';
};

const getClientName = (job?: AnyRecord | null) => {
  const client = getClient(job);
  if (!client || typeof client === 'string') return 'Cliente';
  return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente';
};

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailLabelRow}>
        <Ionicons name={icon} size={14} color="#9CA3AF" />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

interface WorkerRequestDetailsModalProps {
  open: boolean;
  onClose: () => void;
  job: AnyRecord | null;
  alreadyOffered: boolean;
  onOffer: () => void;
  workerId: string;
}

export function WorkerRequestDetailsModal({
  open,
  onClose,
  job,
  alreadyOffered,
  onOffer,
  workerId,
}: WorkerRequestDetailsModalProps) {
  const imageUrl = getImageUrl(job);
  const client = getClient(job);
  const clientId = getClientId(job);
  const title = job?.title || 'Solicitud abierta';
  const description = job?.description || 'El cliente aun no agrego una descripcion detallada.';
  const address = job?.address || 'Ubicacion por confirmar';
  const lat = job?.latitude || job?.lat;
  const lng = job?.longitude || job?.lng;

  const [loadingStats, setLoadingStats] = useState(false);
  const [clientStats, setClientStats] = useState<AnyRecord | null>(null);
  const [reviews, setReviews] = useState<AnyRecord[]>([]);
  const [existingMeeting, setExistingMeeting] = useState<AnyRecord | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMeeting, setLoadingMeeting] = useState(false);

  useEffect(() => {
    if (!open || !clientId) return;

    let mounted = true;

    const load = async () => {
      setLoadingStats(true);
      setLoadingMeeting(true);
      try {
        const [statsRes, reviewsRes, meetingRes] = await Promise.all([
          getClientTrustStats(clientId),
          getReceivedReviews(clientId),
          job?._id ? getServiceRequestMeeting(job._id) : Promise.resolve(null),
        ]);

        if (!mounted) return;

        if (statsRes?.data?.success) {
          setClientStats(statsRes.data.data);
        }
        if (reviewsRes?.data?.success) {
          setReviews(reviewsRes.data.reviews || []);
        }
        if (meetingRes?.data?.success && meetingRes.data.data) {
          setExistingMeeting(meetingRes.data.data);
        }
      } catch {
        // silencio
      } finally {
        if (mounted) {
          setLoadingStats(false);
          setLoadingMeeting(false);
        }
      }
    };

    load();

    return () => { mounted = false; };
  }, [open, clientId, job?._id]);

  const handleRequestInterview = async (startTime: string) => {
    if (!job?._id || !workerId) return;
    setSending(true);
    try {
      const res = await workerRequestMeeting({
        serviceRequestId: job._id,
        startTime,
      });
      if (res?.data?.success) {
        Toast.show({ type: 'success', text1: 'Solicitud de entrevista enviada' });
        setShowPicker(false);
        const meetingRes = await getServiceRequestMeeting(job._id);
        if (meetingRes?.data?.success && meetingRes.data.data) {
          setExistingMeeting(meetingRes.data.data);
        }
      } else {
        Toast.show({ type: 'error', text1: res?.data?.message || 'Error al solicitar entrevista' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message || 'Error al solicitar entrevista' });
    } finally {
      setSending(false);
    }
  };

  const handleOpenMaps = () => {
    if (lat && lng) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${lat},${lng}`;
      const url = Platform.select({
        ios: `${scheme}${title}@${latLng}`,
        android: `${scheme}${latLng}(${title})`,
      });
      if (url) Linking.openURL(url);
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
      stars.push(
        <Ionicons key={i} name={iconName} size={12} color="#F59E0B" />
      );
    }
    return stars;
  };

  const meetingStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Entrevista pendiente de confirmación';
      case 'CONFIRMED': return 'Entrevista confirmada';
      case 'CANCELLED': return 'Entrevista cancelada';
      default: return '';
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Informacion de la solicitud" size="xl">
      <View style={styles.content}>
        <View style={styles.imageBox}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.emptyImage}>
              <Ionicons name="image-outline" size={36} color="#9CA3AF" />
              <Text style={styles.emptyImageText}>Sin imagen adjunta</Text>
            </View>
          )}
        </View>

        <View style={styles.badgeRow}>
          <Text style={styles.categoryPill}>{getCategoryName(job)}</Text>
          {alreadyOffered ? <Text style={styles.sentPill}>Ya ofertaste</Text> : null}
        </View>

        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View style={styles.detailsGrid}>
          <DetailItem icon="cash-outline" label="Presupuesto" value={formatBudget(job)} />
          <DetailItem icon="calendar-outline" label="Publicado" value={formatDate(job?.createdAt)} />
          <TouchableOpacity onPress={handleOpenMaps} disabled={!lat || !lng}>
            <DetailItem
              icon="location-outline"
              label="Ubicacion"
              value={address}
            />
          </TouchableOpacity>
        </View>

        {lat && lng && (
          <>
            <MapPicker lat={lat} lng={lng} onLocationChange={() => {}} readOnly />
            <TouchableOpacity onPress={handleOpenMaps} style={styles.mapBox}>
              <Ionicons name="map-outline" size={20} color={WD.yellowDark} />
              <Text style={styles.mapText}>Ver ubicación en el mapa</Text>
            </TouchableOpacity>
          </>
        )}

        {loadingStats ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={WD.yellowDark} />
            <Text style={styles.loadingText}>Cargando información del cliente...</Text>
          </View>
        ) : client ? (
          <View style={styles.clientSection}>
            <Text style={styles.sectionLabel}>Cliente</Text>
            <View style={styles.clientInfo}>
              <Ionicons name="person-circle-outline" size={36} color="#9CA3AF" />
              <View style={styles.clientTextCol}>
                <Text style={styles.clientName}>{getClientName(job)}</Text>
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
          </View>
        ) : null}

        {loadingMeeting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={WD.yellowDark} />
          </View>
        ) : existingMeeting ? (
          <View style={styles.interviewStatusBox}>
            <Ionicons
              name={existingMeeting.status === 'CONFIRMED' ? 'checkmark-circle' : 'time-outline'}
              size={18}
              color={existingMeeting.status === 'CONFIRMED' ? '#15803D' : '#92400E'}
            />
            <Text style={[
              styles.interviewStatusText,
              existingMeeting.status === 'CONFIRMED' && { color: '#15803D' },
            ]}>
              {meetingStatusLabel(existingMeeting.status)}
            </Text>
          </View>
        ) : !alreadyOffered && (
          <View style={styles.actions}>
            <Button
              onPress={() => setShowPicker(true)}
              fullWidth
              disabled={sending}
            >
              {sending ? 'Enviando...' : 'Solicitar entrevista'}
            </Button>
          </View>
        )}

        <View style={styles.actions}>
          <Button variant="ghost" onPress={onClose} fullWidth>
            Cerrar
          </Button>
          <Button onPress={onOffer} disabled={alreadyOffered} fullWidth>
            {alreadyOffered ? 'Ya ofertaste' : 'Enviar oferta'}
          </Button>
        </View>
      </View>

      <DateTimePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={handleRequestInterview}
        title="Seleccionar fecha y hora para la entrevista"
        mode="datetime"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 8,
  },
  imageBox: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: 150,
  },
  emptyImage: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyImageText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
  },
  sentPill: {
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  description: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  detailsGrid: {
    gap: 10,
  },
  detailItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: WD.white,
    padding: 10,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  detailLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
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
  },
  mapText: {
    color: WD.yellowDark,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 12,
  },
  clientSection: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    backgroundColor: WD.white,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6,
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
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
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
  interviewStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFBEB',
  },
  interviewStatusText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    gap: 8,
  },
});
