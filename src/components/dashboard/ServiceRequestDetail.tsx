import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  acceptProposal,
  getProposalsForRequest,
  getServiceRequestById,
  rejectProposal,
} from '../../api/clientDashboard';
import { WD } from '../../constants/theme';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  formatRelativeDate,
  getCategoryName,
} from '../../utils/statusBadge';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { MapPicker } from './MapPicker';

type Worker = {
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

export function ServiceRequestDetail({ id }: ServiceRequestDetailProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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
    fetchData();
  }, [fetchData]);

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
        <Button onPress={() => router.replace('/my-requests')}>Volver a Mis Solicitudes</Button>
      </View>
    );
  }

  const pendingProposals = proposals.filter((p) => p.status === 'PENDING');
  const acceptedProposal = proposals.find((p) => p.status === 'ACCEPTED');
  const statusColor = STATUS_COLORS[serviceRequest.status] || STATUS_COLORS.OPEN;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
    >
      {/* Back Button */}
      <Button
        variant="ghost"
        onPress={() => router.push('/my-requests')}
        icon={<Ionicons name="arrow-back" size={16} color={WD.darkerGray} />}
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
              <Text style={styles.acceptedPrice}>Q{acceptedProposal.price}</Text>
              {acceptedProposal.message && (
                <Text style={styles.acceptedMessage}>"{acceptedProposal.message}"</Text>
              )}
            </View>
          ) : serviceRequest.status === 'OPEN' && pendingProposals.length > 0 ? (
            <View style={styles.proposalsContainer}>
              {pendingProposals.map((proposal) => (
                <View key={proposal._id} style={styles.proposalCard}>
                  <View style={styles.proposalHeader}>
                    <View>
                      <Text style={styles.workerName}>
                        {proposal.workerId?.firstName} {proposal.workerId?.lastName}
                      </Text>
                      <StarRating rating={proposal.workerId?.ratingAverage} />
                    </View>
                    <Text style={styles.proposalPrice}>Q{proposal.price}</Text>
                  </View>
                  {proposal.message && (
                    <Text style={styles.proposalMessage}>"{proposal.message}"</Text>
                  )}
                  <View style={styles.proposalActions}>
                    <Button
                      size="sm"
                      onPress={() => handleAccept(proposal._id)}
                      disabled={actionLoading === proposal._id}
                    >
                      {actionLoading === proposal._id ? 'Procesando...' : 'Aceptar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => setRejectTarget(proposal._id)}
                      disabled={actionLoading === proposal._id}
                    >
                      Rechazar
                    </Button>
                  </View>
                </View>
              ))}
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
  proposalActions: {
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
});
