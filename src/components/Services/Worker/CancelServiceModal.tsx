import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { WD } from '../../../constants/theme';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

interface CancelServiceModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}

export function CancelServiceModal({ open, onClose, onConfirm, loading }: CancelServiceModalProps) {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (reason.trim().length < 5) return;
    onConfirm(reason.trim());
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cancelar servicio"
      size="sm"
      footer={
        <View style={styles.footer}>
          <Button variant="ghost" onPress={handleClose} disabled={loading}>
            Volver
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 5 || loading}
            onPress={handleConfirm}
            loading={loading}
          >
            {loading ? 'Cancelando...' : 'Cancelar servicio'}
          </Button>
        </View>
      }
    >
      <Text style={styles.hint}>
        Contale al cliente por qué vas a cancelar este servicio.
      </Text>
      <TextInput
        style={styles.input}
        multiline
        maxLength={300}
        placeholder="Ej: Tuve una emergencia y no puedo asistir..."
        placeholderTextColor={WD.textGray}
        value={reason}
        onChangeText={setReason}
      />
      <Text style={styles.counter}>{reason.length}/300</Text>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 14,
    color: WD.mediumGray,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: WD.borderGray,
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    fontSize: 14,
    color: WD.darkerGray,
    textAlignVertical: 'top',
  },
  counter: {
    fontSize: 12,
    color: WD.textGray,
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
  },
});
