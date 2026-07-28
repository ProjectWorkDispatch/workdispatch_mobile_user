import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WD } from '../../../constants/theme';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

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

const getClientName = (job?: AnyRecord | null) => {
  const client = job?.clientId || job?.client;
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
}

export function WorkerRequestDetailsModal({
  open,
  onClose,
  job,
  alreadyOffered,
  onOffer,
}: WorkerRequestDetailsModalProps) {
  const imageUrl = getImageUrl(job);

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
          <Text style={styles.title}>{job?.title || 'Solicitud abierta'}</Text>
          <Text style={styles.description}>
            {job?.description || 'El cliente aun no agrego una descripcion detallada.'}
          </Text>
        </View>

        <View style={styles.detailsGrid}>
          <DetailItem icon="cash-outline" label="Presupuesto" value={formatBudget(job)} />
          <DetailItem icon="calendar-outline" label="Publicado" value={formatDate(job?.createdAt)} />
          <DetailItem icon="location-outline" label="Ubicacion" value={job?.address || 'Ubicacion por confirmar'} />
          <DetailItem icon="person-circle-outline" label="Cliente" value={getClientName(job)} />
        </View>

        <View style={styles.actions}>
          <Button variant="ghost" onPress={onClose} fullWidth>
            Cerrar
          </Button>
          <Button onPress={onOffer} disabled={alreadyOffered} fullWidth>
            {alreadyOffered ? 'Ya ofertaste' : 'Enviar oferta'}
          </Button>
        </View>
      </View>
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
  actions: {
    gap: 8,
  },
});
