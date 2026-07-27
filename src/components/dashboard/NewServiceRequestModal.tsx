import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { createServiceRequest, getAiEstimate, getCategories } from '../../api/clientDashboard';
import { WD } from '../../constants/theme';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MapPicker } from './MapPicker';

type Category = { _id: string; name: string };

type Form = {
  title: string;
  description: string;
  categoryId: string;
  customCategory: string;
  address: string;
  latitude: string;
  longitude: string;
  budgetMin: string;
  budgetMax: string;
};

type FormErrors = {
  title?: string;
  description?: string;
  categoryId?: string;
  address?: string;
  location?: string;
  budgetMin?: string;
  budgetMax?: string;
};

const INITIAL_FORM: Form = {
  title: '',
  description: '',
  categoryId: '',
  customCategory: '',
  address: '',
  latitude: '',
  longitude: '',
  budgetMin: '',
  budgetMax: '',
};

type NewServiceRequestModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function NewServiceRequestModal({ open, onClose, onCreated }: NewServiceRequestModalProps) {
  const [form, setForm] = useState<Form>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [mapTouching, setMapTouching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategoriesLoading(true);
    getCategories()
      .then((res) => setCategories(res.data.data || []))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, [open]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setImageUri(null);
  };

  const handleChange = (field: keyof Form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.title || form.title.length < 10) e.title = 'El título debe tener al menos 10 caracteres';
    if (!form.description) e.description = 'La descripción es obligatoria';
    if (!form.categoryId) {
      e.categoryId = 'Seleccioná una categoría o escribí una personalizada';
    } else if (form.categoryId === '__custom' && !form.customCategory.trim()) {
      e.categoryId = 'Escribí tu categoría personalizada';
    }
    if (!form.address) e.address = 'La dirección es obligatoria';
    if (!form.latitude || !form.longitude) e.location = 'Seleccioná la ubicación en el mapa';
    if (!form.budgetMin || parseFloat(form.budgetMin) < 0) e.budgetMin = 'El presupuesto mínimo no puede ser negativo';
    if (!form.budgetMax || parseFloat(form.budgetMax) < 0) e.budgetMax = 'El presupuesto máximo no puede ser negativo';
    if (form.budgetMin && form.budgetMax && parseFloat(form.budgetMax) < parseFloat(form.budgetMin)) {
      e.budgetMax = 'El presupuesto máximo no puede ser menor al mínimo';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAiEstimate = async () => {
    if (!form.title || !form.description) return;
    setAiLoading(true);
    try {
      const selectedCategory = categories.find((cat) => cat._id === form.categoryId);
      const categoryName = selectedCategory?.name || form.customCategory || undefined;

      const res = await getAiEstimate({
        title: form.title,
        description: form.description,
        categoryName,
        budgetMin: form.budgetMin || undefined,
        budgetMax: form.budgetMax || undefined,
      });
      const data = res.data.data;

      setForm((prev) => ({
        ...prev,
        budgetMin: String(data.budgetMin ?? prev.budgetMin),
        budgetMax: String(data.budgetMax ?? prev.budgetMax),
      }));
      Toast.show({ type: 'success', text1: `Estimado: ${data.estimatedTime}` });
    } catch {
      Toast.show({ type: 'error', text1: 'No se pudo generar el estimado con IA' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    if (form.categoryId === '__custom') {
      fd.append('customCategory', form.customCategory.trim());
    } else if (form.categoryId) {
      fd.append('categoryId', form.categoryId);
    }
    fd.append('address', form.address);
    fd.append('latitude', form.latitude);
    fd.append('longitude', form.longitude);
    fd.append('budgetMin', form.budgetMin);
    fd.append('budgetMax', form.budgetMax);
    if (imageUri) {
      fd.append('serviceImage', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);
    }

    setSubmitting(true);
    try {
      await createServiceRequest(fd);
      Toast.show({ type: 'success', text1: 'Solicitud creada exitosamente' });
      resetForm();
      onClose();
      onCreated();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al crear la solicitud';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canEstimate = form.title.length > 0 && form.description.length > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nueva Solicitud"
      size="lg"
      scrollEnabled={!mapTouching}
      footer={
        <View style={styles.footerRow}>
          <Button variant="ghost" onPress={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onPress={handleSubmit} loading={submitting}>
            Crear Solicitud
          </Button>
        </View>
      }
    >
      <View style={styles.form}>
        {/* Título */}
        <View style={styles.field}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(v) => handleChange('title', v)}
            placeholder="Ej: Reparación de plomería"
            placeholderTextColor={WD.textGray}
          />
          {errors.title && <Text style={styles.error}>{errors.title}</Text>}
        </View>

        {/* Descripción */}
        <View style={styles.field}>
          <Text style={styles.label}>Descripción *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.description}
            onChangeText={(v) => handleChange('description', v)}
            placeholder="Describe el trabajo que necesitás..."
            placeholderTextColor={WD.textGray}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.error}>{errors.description}</Text>}
        </View>

        {/* Categoría */}
        <View style={styles.field}>
          <Text style={styles.label}>Categoría *</Text>
          {categoriesLoading ? (
            <Text style={styles.loadingText}>Cargando categorías...</Text>
          ) : (
            <View style={styles.chipContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={[
                    styles.chip,
                    form.categoryId === cat._id && styles.chipActive,
                  ]}
                  onPress={() => handleChange('categoryId', cat._id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.categoryId === cat._id && styles.chipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.chip,
                  form.categoryId === '__custom' && styles.chipActive,
                ]}
                onPress={() => handleChange('categoryId', '__custom')}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.categoryId === '__custom' && styles.chipTextActive,
                  ]}
                >
                  Otra (especificar)
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {form.categoryId === '__custom' && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={form.customCategory}
              onChangeText={(v) => handleChange('customCategory', v)}
              placeholder="Escribí tu categoría personalizada"
              placeholderTextColor={WD.textGray}
              maxLength={100}
            />
          )}
          {errors.categoryId && <Text style={styles.error}>{errors.categoryId}</Text>}
        </View>

        {/* Dirección */}
        <View style={styles.field}>
          <Text style={styles.label}>Dirección *</Text>
          <TextInput
            style={styles.input}
            value={form.address}
            onChangeText={(v) => handleChange('address', v)}
            placeholder="Dirección del lugar"
            placeholderTextColor={WD.textGray}
          />
          {errors.address && <Text style={styles.error}>{errors.address}</Text>}
        </View>

        {/* Mapa */}
        <View
          onTouchStart={() => setMapTouching(true)}
          onTouchEnd={() => setMapTouching(false)}
          onTouchCancel={() => setMapTouching(false)}
        >
          <MapPicker
          lat={form.latitude || null}
          lng={form.longitude || null}
          onLocationChange={(lat, lng) => {
            setForm((prev) => ({
              ...prev,
              latitude: lat !== null ? String(lat) : '',
              longitude: lng !== null ? String(lng) : '',
            }));
            if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
          }}
        />
        {errors.location && <Text style={styles.error}>{errors.location}</Text>}
      </View>

      {/* Presupuesto */}
      <View style={styles.fieldRow}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Presupuesto Mín. (Q) *</Text>
          <TextInput
            style={styles.input}
            value={form.budgetMin}
            onChangeText={(v) => handleChange('budgetMin', v)}
            placeholder="0"
            placeholderTextColor={WD.textGray}
            keyboardType="numeric"
          />
          {errors.budgetMin && <Text style={styles.error}>{errors.budgetMin}</Text>}
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Presupuesto Máx. (Q) *</Text>
          <TextInput
            style={styles.input}
            value={form.budgetMax}
            onChangeText={(v) => handleChange('budgetMax', v)}
            placeholder="0"
            placeholderTextColor={WD.textGray}
            keyboardType="numeric"
          />
          {errors.budgetMax && <Text style={styles.error}>{errors.budgetMax}</Text>}
        </View>
      </View>

      {/* Imagen */}
      <View style={styles.field}>
        <Text style={styles.label}>Foto (opcional)</Text>
        <TouchableOpacity style={styles.imageContainer} onPress={handlePickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={24} color={WD.textGray} />
              <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* IA Estimate */}
      <View style={styles.aiBlock}>
        <View style={styles.aiHeader}>
          <Text style={styles.aiTitle}>Estimado con IA</Text>
          <Button
            variant="outline"
            size="sm"
            onPress={handleAiEstimate}
            loading={aiLoading}
            disabled={!canEstimate}
          >
            Generar estimado con IA
          </Button>
        </View>
        <Text style={styles.aiHint}>
          Obtené un estimado automático del costo según la categoría y descripción.
        </Text>
      </View>
    </View>
    </Modal >
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: WD.darkerGray,
  },
  input: {
    borderWidth: 1,
    borderColor: WD.borderGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: WD.darkerGray,
  },
  textarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 12,
    color: WD.red,
  },
  loadingText: {
    fontSize: 13,
    color: WD.textGray,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WD.borderGray,
    backgroundColor: WD.white,
  },
  chipActive: {
    borderColor: WD.yellow,
    backgroundColor: '#FEF9C3',
  },
  chipText: {
    fontSize: 13,
    color: WD.textGray,
  },
  chipTextActive: {
    color: WD.yellowDark,
    fontWeight: '600',
  },
  imageContainer: {
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: WD.borderGray,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: WD.textGray,
  },
  aiBlock: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FEF9C3',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: WD.yellowDark,
  },
  aiHint: {
    fontSize: 12,
    color: WD.yellowDark,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
