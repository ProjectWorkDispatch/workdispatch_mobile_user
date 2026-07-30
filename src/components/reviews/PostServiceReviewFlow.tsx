import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useReviewsStore } from '../../store/userStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StarRating } from './StarRating';
import { ReportModal } from '../Reports/ReportModal';

const LOW_RATING_REASONS = [
  'El trabajo no se completó como se acordó',
  'Mala actitud o comportamiento inapropiado',
  'Llegó muy tarde o no se presentó',
  'Cobró más de lo pactado',
  'Dañó algo durante el trabajo',
  'Mala comunicación',
  'Otro',
];

type Step = 'prompt' | 'rate' | 'lowRatingSurvey' | 'done';

interface PostServiceReviewFlowProps {
  visible: boolean;
  onClose: () => void;
  serviceId?: string;
  revieweredId?: string;
  revieweredName?: string;
  onSuccess?: (review: any) => void;
}

export function PostServiceReviewFlow({
  visible,
  onClose,
  serviceId,
  revieweredId,
  revieweredName,
  onSuccess,
}: PostServiceReviewFlowProps) {
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string;
  const { createReview, loading } = useReviewsStore();

  const [step, setStep] = useState<Step>('prompt');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);

  const reset = () => {
    setStep('prompt');
    setRating(0);
    setComment('');
    setSelectedReasons([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleRateSubmit = () => {
    if (!rating) {
      Toast.show({ type: 'error', text1: 'Selecciona una calificación' });
      return;
    }
    if (!comment.trim()) {
      Toast.show({ type: 'error', text1: 'Escribe un comentario' });
      return;
    }
    if (rating <= 2) {
      setStep('lowRatingSurvey');
    } else {
      submitReview([]);
    }
  };

  const submitReview = async (reasons: string[]) => {
    const result = await createReview({
      serviceId,
      reviewerId: currentUserId,
      revieweredId,
      Rating: rating,
      Comment: comment.trim(),
      LowRatingReasons: reasons.length > 0 ? reasons : undefined,
    });

    if (result.success) {
      Toast.show({ type: 'success', text1: 'Reseña enviada correctamente' });
      setStep('done');
      onSuccess?.(result.data);
    } else {
      Toast.show({ type: 'error', text1: result.error });
    }
  };

  const handleLowRatingSubmit = () => {
    submitReview(selectedReasons);
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const modalTitle =
    step === 'prompt'
      ? 'Reseña post-servicio'
      : step === 'rate'
      ? 'Calificar servicio'
      : step === 'lowRatingSurvey'
      ? 'Cuéntanos más'
      : '¡Gracias!';

  return (
    <>
      <Modal
        open={visible}
        onClose={handleClose}
        title={modalTitle}
        footer={
          step === 'done' ? (
            <Button onPress={handleClose}>Cerrar</Button>
          ) : step === 'prompt' ? (
            <>
              <Button variant="ghost" onPress={handleClose}>Ahora no</Button>
              <Button onPress={() => setStep('rate')}>Dejar reseña</Button>
            </>
          ) : step === 'rate' ? (
            <>
              <Button variant="ghost" onPress={handleClose}>Cancelar</Button>
              <Button onPress={handleRateSubmit}>Siguiente</Button>
            </>
          ) : step === 'lowRatingSurvey' ? (
            <>
              <Button variant="ghost" onPress={handleClose}>Cancelar</Button>
              <Button onPress={handleLowRatingSubmit} loading={loading}>Enviar reseña</Button>
            </>
          ) : null
        }
      >
        {step === 'prompt' && (
          <View style={styles.promptContainer}>
            <Text style={styles.promptText}>
              ¿Qué tal estuvo el trabajo con{' '}
              <Text style={styles.promptBold}>{revieweredName || 'esta persona'}</Text>?
            </Text>
          </View>
        )}

        {step === 'rate' && (
          <View style={styles.rateContainer}>
            <View>
              <Text style={styles.label}>Estás calificando a</Text>
              <Text style={styles.name}>{revieweredName || 'Usuario'}</Text>
            </View>
            <View style={styles.ratingBlock}>
              <StarRating value={rating} onChange={setRating} />
              <Text style={styles.ratingHint}>
                {rating > 0 ? `${rating} de 5 estrellas` : 'Selecciona una calificación'}
              </Text>
            </View>
            <View>
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
          </View>
        )}

        {step === 'lowRatingSurvey' && (
          <View style={styles.surveyContainer}>
            <Text style={styles.label}>Selecciona los motivos que aplican (opcional):</Text>
            <View style={styles.reasonList}>
              {LOW_RATING_REASONS.map((reason) => {
                const isSelected = selectedReasons.includes(reason);
                return (
                  <Pressable
                    key={reason}
                    onPress={() => toggleReason(reason)}
                    style={[styles.reasonItem, isSelected && styles.reasonItemActive]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'checkbox-outline'}
                      size={20}
                      color={isSelected ? WD.yellowDark : WD.textGray}
                    />
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                      {reason}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.reportBanner}>
              <Text style={styles.reportBannerText}>
                ¿El servicio fue realmente grave? Puedes reportar a{' '}
                <Text style={styles.reportBold}>{revieweredName}</Text> para que el equipo lo revise.
              </Text>
              <Button
                size="sm"
                variant="outline"
                onPress={() => setReportOpen(true)}
              >
                Crear reporte
              </Button>
            </View>
          </View>
        )}

        {step === 'done' && (
          <View style={styles.doneContainer}>
            <Text style={styles.doneTitle}>¡Gracias por tu reseña!</Text>
            <Text style={styles.doneSubtitle}>Tu opinión ayuda a mejorar la comunidad.</Text>
          </View>
        )}
      </Modal>

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        reporteredId={revieweredId}
        reporteredName={revieweredName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  promptContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  promptText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  promptBold: {
    fontWeight: '700',
    color: '#111827',
  },
  rateContainer: {
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  ratingBlock: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  ratingHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  surveyContainer: {
    gap: 16,
  },
  reasonList: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonItemActive: {
    borderColor: WD.yellow,
    backgroundColor: '#FEFCE8',
  },
  reasonText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  reasonTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  reportBanner: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FEF9C3',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  reportBannerText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  reportBold: {
    fontWeight: '700',
  },
  doneContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  doneSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
