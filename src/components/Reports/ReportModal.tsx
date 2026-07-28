import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useReportsStore } from '../../store/userStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const REASONS = [
  'Incumplimiento del servicio',
  'Comportamiento inapropiado',
  'Cobro indebido',
  'Suplantación de identidad',
  'Otro',
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reporteredId?: string;
  reporteredName?: string;
  onSuccess?: () => void;
}

export function ReportModal({ visible, onClose, reporteredId, reporteredName, onSuccess }: ReportModalProps) {
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string;
  const { createReport, loading } = useReportsStore();

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => {
    setReason('');
    setDescription('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      Toast.show({ type: 'error', text1: 'Selecciona un motivo' });
      return;
    }
    if (!description.trim()) {
      Toast.show({ type: 'error', text1: 'Describe el problema' });
      return;
    }

    const result = await createReport({
      reporterId: currentUserId,
      reporteredId,
      Reason: reason,
      Description: description.trim(),
    });

    if (result.success) {
      Toast.show({ type: 'success', text1: 'Reporte enviado. El equipo lo revisará pronto.' });
      reset();
      onSuccess?.();
    } else {
      Toast.show({ type: 'error', text1: result.error });
    }
  };

  return (
    <Modal
      open={visible}
      onClose={handleClose}
      title="Reportar un problema"
      footer={
        <>
          <Button variant="ghost" onPress={handleClose}>Cancelar</Button>
          <Button variant="destructive" onPress={handleSubmit} loading={loading}>Enviar reporte</Button>
        </>
      }
    >
      <View style={styles.section}>
        <Text style={styles.label}>Estás reportando a</Text>
        <Text style={styles.name}>{reporteredName || 'Usuario'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Motivo</Text>
        <View style={styles.reasonList}>
          {REASONS.map((r) => (
            <TouchableOpacity key={r} onPress={() => setReason(r)} style={[styles.reasonChip, reason === r && styles.reasonChipActive]}>
              {reason === r && <Ionicons name="checkmark" size={14} color={WD.darkerGray} />}
              <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="Describe con detalle lo sucedido..."
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
  reasonList: { gap: 8 },
  reasonChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: WD.white },
  reasonChipActive: { borderColor: WD.yellow, backgroundColor: '#FEFCE8' },
  reasonText: { fontSize: 13, color: '#6B7280' },
  reasonTextActive: { color: '#111827', fontWeight: '600' },
  textarea: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#374151', minHeight: 90, textAlignVertical: 'top' },
});