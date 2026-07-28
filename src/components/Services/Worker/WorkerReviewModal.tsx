import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WD } from '../../../constants/theme';
import { createReview } from '../../../api/workerDashboard';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

type AnyRecord = Record<string, any>;

const getId = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || value.Id || '';
};

const getClientName = (service?: AnyRecord | null) => {
  const client = service?.clientId;
  if (!client || typeof client === 'string') return 'cliente';
  return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'cliente';
};

interface WorkerReviewModalProps {
  open: boolean;
  onClose: () => void;
  service: AnyRecord | null;
  workerId: string;
  onCreated?: (review: AnyRecord) => void;
}

export function WorkerReviewModal({
  open,
  onClose,
  service,
  workerId,
  onCreated,
}: WorkerReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setRating(5);
    setComment('');
    setError('');
    setSubmitting(false);
  }, [open, service]);

  const handleSubmit = async () => {
    const serviceId = getId(service);
    const clientId = getId(service?.clientId);

    if (!serviceId || !workerId || !clientId) {
      setError('Faltan datos para crear la resena.');
      return;
    }

    if (!comment.trim()) {
      setError('Escribe un comentario para el cliente.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await createReview({
        serviceId,
        reviewerId: workerId,
        revieweredId: clientId,
        Rating: rating,
        Comment: comment.trim(),
      });
      onCreated?.(response?.data?.review);
      onClose();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || 'No se pudo enviar la resena.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Dejar resena al cliente" size="lg">
      <View style={styles.content}>
        <View>
          <Text style={styles.label}>Cliente</Text>
          <Text style={styles.clientName}>{getClientName(service)}</Text>
        </View>

        <View>
          <Text style={styles.label}>Calificacion</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} onPress={() => setRating(value)} style={styles.starButton}>
                <Ionicons
                  name={value <= rating ? 'star' : 'star-outline'}
                  size={34}
                  color={value <= rating ? WD.yellow : '#D1D5DB'}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Comentario</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholder="Cuentanos como fue trabajar con este cliente."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={18} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button variant="ghost" onPress={onClose} fullWidth>
            Cancelar
          </Button>
          <Button onPress={handleSubmit} loading={submitting} fullWidth>
            Enviar resena
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  label: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  clientName: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  starButton: {
    padding: 2,
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 14,
    backgroundColor: WD.white,
  },
  errorBox: {
    flexDirection: 'row',
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
    fontWeight: '700',
  },
  actions: {
    gap: 8,
  },
});
