import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';
import { WD } from '../../constants/theme';

interface AddWorkLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: { description: string }) => Promise<void>;
  initialDescription?: string;
}

export function AddWorkLogModal({
  visible,
  onClose,
  onSave,
  initialDescription,
}: AddWorkLogModalProps) {
  const [description, setDescription] = useState(initialDescription || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) return;
    setSaving(true);
    try {
      await onSave({ description: description.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const valid = description.trim().length > 0;

  return (
    <Modal
      open={visible}
      onClose={onClose}
      title={initialDescription ? 'Editar entrada diaria' : 'Agregar entrada diaria'}
      size="lg"
      footer={
        <View style={styles.footer}>
          <Button variant="outline" onPress={onClose}>Cancelar</Button>
          <Button onPress={handleSave} disabled={!valid || saving} loading={saving}>
            Guardar
          </Button>
        </View>
      }
    >
      <View style={styles.field}>
        <Text style={styles.label}>Descripción del trabajo realizado</Text>
        <Text style={styles.hint}>
          Contá qué trabajaste o planeás trabajar este día
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="Ej: Lijé y preparé las paredes para pintar..."
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={300}
        />
        <Text style={styles.counter}>{description.length}/300</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: WD.darkerGray,
    marginBottom: 6,
  },
  hint: {
    fontSize: 11,
    color: WD.textGray,
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: WD.borderGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: WD.darkerGray,
    backgroundColor: WD.white,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  counter: {
    fontSize: 11,
    color: WD.textGray,
    textAlign: 'right',
    marginTop: 4,
  },
});
