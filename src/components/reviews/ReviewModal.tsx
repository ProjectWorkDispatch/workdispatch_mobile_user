import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../../store/authStore';
import { useReviewsStore } from '../../store/userStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StarRating } from './StarRating';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  serviceId?: string;
  revieweredId?: string;
  revieweredName?: string;
  onSuccess?: (review: any) => void;
}

export function ReviewModal({ visible, onClose, serviceId, revieweredId, revieweredName, onSuccess }: ReviewModalProps) {
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string;
  const { createReview, loading } = useReviewsStore();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const reset = () => {
    setRating(0);
    setComment('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!rating) {
      Toast.show({ type: 'error', text1: 'Selecciona una calificación' });
      return;
    }
    if (!comment.trim()) {
      Toast.show({ type: 'error', text1: 'Escribe un comentario' });
      return;
    }

    const result = await createReview({
      serviceId,
      reviewerId: currentUserId,
      revieweredId,
      Rating: rating,
      Comment: comment.trim(),
    });

    if (result.success) {
      Toast.show({ type: 'success', text1: 'Reseña enviada correctamente' });
      reset();
      onSuccess?.(result.data);
    } else {
      Toast.show({ type: 'error', text1: result.error });
    }
  };

  return (
    <Modal
      open={visible}
      onClose={handleClose}
      title="Calificar servicio"
      footer={
        <>
          <Button variant="ghost" onPress={handleClose}>Cancelar</Button>
          <Button onPress={handleSubmit} loading={loading}>Enviar reseña</Button>
        </>
      }
    >
      <View style={styles.section}>
        <Text style={styles.label}>Estás calificando a</Text>
        <Text style={styles.name}>{revieweredName || 'Usuario'}</Text>
      </View>

      <View style={styles.ratingBlock}>
        <StarRating value={rating} onChange={setRating} />
        <Text style={styles.ratingHint}>{rating > 0 ? `${rating} de 5 estrellas` : 'Selecciona una calificación'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Comentario</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          placeholder="Cuéntanos cómo fue tu experiencia..."
          placeholderTextColor="#9CA3AF"
          style={styles.textarea}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  ratingBlock: { alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 16 },
  ratingHint: { fontSize: 13, color: '#9CA3AF' },
  textarea: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#374151', minHeight: 90, textAlignVertical: 'top' },
});