import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { WD } from '../../../constants/theme';
import { createProposal } from '../../../api/workerDashboard';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

type AnyRecord = Record<string, any>;

const getId = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || value.Id || '';
};

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

const getSuggestedPrice = (job?: AnyRecord | null) => {
  const min = Number(job?.budgetMin);
  const max = Number(job?.budgetMax);

  if (Number.isFinite(min) && Number.isFinite(max)) {
    return Math.max(0, Math.round(((min + max) / 2) / 25) * 25);
  }

  if (Number.isFinite(max)) return Math.max(0, Math.round((max * 0.85) / 25) * 25);
  if (Number.isFinite(min)) return Math.max(0, Math.round((min * 1.15) / 25) * 25);
  return '';
};

const getSuggestedTime = (job?: AnyRecord | null) => {
  const textLength = `${job?.title || ''} ${job?.description || ''}`.trim().length;
  if (textLength > 220) return '5 a 7 dias';
  if (textLength > 110) return '3 a 5 dias';
  return '1 a 2 dias';
};

const buildAiMessage = (job: AnyRecord | null | undefined, estimatedTime: string) => {
  const title = job?.title || 'la solicitud';
  const category = getCategoryName(job).toLowerCase();
  const location = job?.address ? ` en ${job.address}` : '';
  const time = estimatedTime || getSuggestedTime(job);

  return `Hola, puedo ayudarte con ${title}${location}. Tengo experiencia en trabajos de ${category} y puedo completarlo en aproximadamente ${time}. Mi propuesta incluye revisar los detalles contigo antes de iniciar, realizar el trabajo con cuidado y mantenerte informado durante el proceso.`;
};

interface WorkerOfferModalProps {
  open: boolean;
  onClose: () => void;
  job: AnyRecord | null;
  workerId: string;
  hasExistingProposal: boolean;
  onCreated?: (proposal: AnyRecord) => void;
}

export function WorkerOfferModal({
  open,
  onClose,
  job,
  workerId,
  hasExistingProposal,
  onCreated,
}: WorkerOfferModalProps) {
  const [price, setPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    setPrice('');
    setEstimatedTime('');
    setMessage('');
    setSubmitting(false);
    setError('');
  }, [job, open]);

  const requestId = getId(job);
  const finalMessage = useMemo(() => {
    if (!estimatedTime.trim() || !message.trim()) return '';
    return `Tiempo estimado: ${estimatedTime.trim()}\n\n${message.trim()}`;
  }, [estimatedTime, message]);

  const handleAiSuggestion = () => {
    const suggestedPrice = getSuggestedPrice(job);
    const suggestedTime = estimatedTime.trim() || getSuggestedTime(job);

    if (!price && suggestedPrice) setPrice(String(suggestedPrice));
    if (!estimatedTime.trim()) setEstimatedTime(suggestedTime);
    setMessage(buildAiMessage(job, suggestedTime));
  };

  const handleSubmit = async () => {
    setError('');

    const numericPrice = Number(price);

    if (hasExistingProposal) {
      setError('Ya enviaste una oferta para esta solicitud.');
      return;
    }

    if (!requestId || !workerId) {
      setError('No se pudo identificar la solicitud o el trabajador.');
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError('Ingresa un monto valido mayor a 0.');
      return;
    }

    if (!estimatedTime.trim()) {
      setError('Ingresa el tiempo estimado para completar el trabajo.');
      return;
    }

    if (!message.trim()) {
      setError('Escribe un mensaje para explicar tu propuesta.');
      return;
    }

    if (finalMessage.length > 500) {
      setError('El mensaje junto con el tiempo estimado no puede exceder 500 caracteres.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await createProposal({
        serviceRequestId: requestId,
        workerId,
        price: numericPrice,
        message: finalMessage,
      });

      Toast.show({ type: 'success', text1: 'Oferta enviada correctamente.' });
      onCreated?.(response?.data?.proposal);
      onClose();
    } catch (submitError: any) {
      const messageFromApi = submitError?.response?.data?.message || 'No se pudo enviar la oferta.';
      setError(messageFromApi);
      Toast.show({ type: 'error', text1: messageFromApi });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Hacer oferta" size="xl">
      <View style={styles.content}>
        <View style={styles.requestBox}>
          <Text style={styles.requestTitle}>{job?.title || 'Solicitud abierta'}</Text>
          <Text style={styles.requestDesc} numberOfLines={3}>
            {job?.description || 'El cliente aun no agrego una descripcion detallada.'}
          </Text>
          <View style={styles.requestMeta}>
            <Text style={styles.categoryPill}>{getCategoryName(job)}</Text>
            <Text style={styles.budgetPill}>{formatMoney(job?.budgetMin)} - {formatMoney(job?.budgetMax)}</Text>
          </View>
        </View>

        {hasExistingProposal ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>Ya enviaste una oferta para esta solicitud. Solo se permite una por trabajador.</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Monto a cobrar</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="Ej. 350"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            editable={!hasExistingProposal && !submitting}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tiempo estimado</Text>
          <TextInput
            value={estimatedTime}
            onChangeText={setEstimatedTime}
            placeholder="Ej. 2 a 3 dias"
            placeholderTextColor="#9CA3AF"
            editable={!hasExistingProposal && !submitting}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mensaje para el cliente</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Explica por que eres una buena opcion para este trabajo."
            placeholderTextColor="#9CA3AF"
            editable={!hasExistingProposal && !submitting}
            multiline
            maxLength={430}
            style={[styles.input, styles.textArea]}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{finalMessage.length || message.length}/500</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            variant="outline"
            onPress={handleAiSuggestion}
            disabled={hasExistingProposal || submitting}
            icon={<Ionicons name="sparkles-outline" size={16} color="#374151" />}
          >
            Sugerir con IA
          </Button>

          <View style={styles.submitRow}>
            <Button variant="ghost" onPress={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button onPress={handleSubmit} loading={submitting} disabled={hasExistingProposal}>
              Enviar oferta
            </Button>
          </View>
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
  requestBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    padding: 12,
  },
  requestTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  requestDesc: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  requestMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  categoryPill: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  budgetPill: {
    backgroundColor: WD.white,
    color: '#4B5563',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  warningBox: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FEF9C3',
    borderRadius: 10,
    padding: 10,
  },
  warningText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  field: {
    gap: 6,
  },
  label: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: WD.white,
    paddingHorizontal: 12,
    color: '#111827',
    fontSize: 13,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 10,
  },
  counter: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'right',
  },
  errorBox: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
  },
  actions: {
    gap: 10,
  },
  submitRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
