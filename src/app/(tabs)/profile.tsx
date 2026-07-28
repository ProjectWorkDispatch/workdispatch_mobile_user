import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image,
  ScrollView, StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { axiosUser } from '../../api/api';
import { Button } from '../../components/ui/Button';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const userId = (user as any)?._id || (user as any)?.id;
  const isWorker = user?.role === 'WORKER';

  const [profile, setProfile] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', address: '', description: '' });
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [portfolioModal, setPortfolioModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [portfolioImg, setPortfolioImg] = useState<any>(null);
  const [savingPortfolio, setSavingPortfolio] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        const res = await axiosUser.get(`/users/${userId}`);
        const u = res.data?.data || res.data;
        setProfile(u);
        setForm({
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          phone: u.phone || '',
          address: u.address || '',
          description: u.description || '',
        });
        if (isWorker) {
          const pRes = await axiosUser.get(`/PortFolio/my/${userId}`).catch(() => ({ data: { data: [] } }));
          setPortfolio(pRes.data?.data || []);
        }
      } catch {
        Toast.show({ type: 'error', text1: 'Error al cargar el perfil' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, isWorker]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photoUri) {
        fd.append('profilePhoto', { uri: photoUri, name: 'photo.jpg', type: 'image/jpeg' } as any);
      }
      const res = await axiosUser.put(`/users/${userId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = res.data?.data || res.data;
      setProfile(updated);
      useAuthStore.setState({ user: { ...user, ...updated } });
      setPhotoUri(null);
      Toast.show({ type: 'success', text1: 'Perfil actualizado' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditingItem(null);
    setPortfolioDesc('');
    setPortfolioImg(null);
    setPortfolioModal(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setPortfolioDesc(item.description);
    setPortfolioImg(null);
    setPortfolioModal(true);
  };

  const pickPortfolioImg = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPortfolioImg(result.assets[0]);
  };

  const handleSavePortfolio = async () => {
    if (!portfolioDesc.trim()) {
      Toast.show({ type: 'error', text1: 'La descripción es obligatoria' });
      return;
    }
    try {
      setSavingPortfolio(true);
      if (editingItem) {
        const res = await axiosUser.put(`/PortFolio/${editingItem._id}`, { description: portfolioDesc });
        setPortfolio(prev => prev.map(p => p._id === editingItem._id ? (res.data?.data || res.data) : p));
        Toast.show({ type: 'success', text1: 'Trabajo actualizado' });
      } else {
        const fd = new FormData();
        fd.append('workerId', userId);
        fd.append('description', portfolioDesc);
        if (portfolioImg) {
          fd.append('image', { uri: portfolioImg.uri, name: 'work.jpg', type: 'image/jpeg' } as any);
        }
        const res = await axiosUser.post('/PortFolio', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setPortfolio(prev => [res.data?.data || res.data, ...prev]);
        Toast.show({ type: 'success', text1: 'Trabajo agregado' });
      }
      setPortfolioModal(false);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Error al guardar' });
    } finally {
      setSavingPortfolio(false);
    }
  };

  const handleToggle = async (item: any) => {
    try {
      await axiosUser.patch(`/PortFolio/status/${item._id}`);
      setPortfolio(prev => prev.map(p =>
        p._id === item._id ? { ...p, status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : p
      ));
      Toast.show({ type: 'success', text1: item.status === 'ACTIVE' ? 'Desactivado' : 'Activado' });
    } catch {
      Toast.show({ type: 'error', text1: 'Error al cambiar estado' });
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={WD.yellow} />
    </View>
  );

  const currentPhoto = photoUri || (profile?.profilePhoto && !profile.profilePhoto.includes('default') ? profile.profilePhoto : null);
  const initials = `${form.firstName?.[0] ?? ''}${form.lastName?.[0] ?? ''}`.toUpperCase();

  const menuItems = [
    { label: 'Mis Reseñas', icon: 'star-outline' as const, onPress: () => router.push('../reviews') },
    { label: 'Mis Reportes', icon: 'flag-outline' as const, onPress: () => router.push('../reports') },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Mi Perfil</Text>

      {/* Foto y datos */}
      <Card style={styles.card}>
        <CardContent>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickPhoto} style={styles.avatarWrapper}>
              {currentPhoto ? (
                <Image source={{ uri: currentPhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{initials || '?'}</Text>
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={14} color={WD.darkerGray} />
              </View>
            </TouchableOpacity>
            <View>
              <Text style={styles.userName}>{form.firstName} {form.lastName}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Badge variant={isWorker ? 'default' : 'secondary'} style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                {isWorker ? 'Trabajador' : 'Cliente'}
              </Badge>
            </View>
          </View>

          {/* Campos */}
          <View style={styles.fields}>
            {[
              { label: 'Nombre', key: 'firstName', placeholder: 'Tu nombre' },
              { label: 'Apellido', key: 'lastName', placeholder: 'Tu apellido' },
              { label: 'Teléfono', key: 'phone', placeholder: '+502 5555-5555' },
              { label: 'Dirección', key: 'address', placeholder: 'Ciudad, Zona' },
            ].map(({ label, key, placeholder }) => (
              <View key={key}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor={WD.textGray}
                  value={(form as any)[key]}
                  onChangeText={v => setForm({ ...form, [key]: v })}
                />
              </View>
            ))}
            {isWorker && (
              <View>
                <Text style={styles.fieldLabel}>Bio profesional</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Describe tu experiencia..."
                  placeholderTextColor={WD.textGray}
                  value={form.description}
                  onChangeText={v => setForm({ ...form, description: v })}
                  multiline
                />
              </View>
            )}
          </View>

          <Button fullWidth onPress={handleSaveProfile} loading={saving} style={{ marginTop: 8 }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </CardContent>
      </Card>

      {/* Menú de navegación (reseñas y reportes) */}
      <Card style={styles.card}>
        <CardContent style={{ padding: 0 }}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              style={[styles.menuRow, idx === menuItems.length - 1 && styles.menuRowLast]}
            >
              <Ionicons name={item.icon} size={18} color="#6B7280" />
              <Text style={styles.menuText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </CardContent>
      </Card>

      {/* Accesos rápidos (verificación) */}
      {isWorker && (
        <Card style={styles.card}>
          <CardContent style={{ gap: 8 }}>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/verification' as any)}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={WD.yellow} />
              <Text style={styles.quickLinkText}>Verificación de identidad</Text>
              <Ionicons name="chevron-forward" size={16} color={WD.textGray} />
            </TouchableOpacity>
          </CardContent>
        </Card>
      )}

      {/* Portafolio */}
      {isWorker && (
        <Card style={[styles.card, { marginBottom: 20 }]}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle>Portafolio</CardTitle>
              <Button size="sm" onPress={openAdd}>
                <Ionicons name="add" size={16} color={WD.darkerGray} />
                Agregar
              </Button>
            </View>
            <CardDescription>Trabajos realizados anteriormente</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolio.length === 0 ? (
              <View style={styles.emptyPortfolio}>
                <Ionicons name="briefcase-outline" size={32} color="#D1D5DB" />
                <Text style={styles.emptyText}>Sin trabajos en el portafolio</Text>
                <Button size="sm" variant="outline" onPress={openAdd} style={{ marginTop: 8 }}>
                  Agregar primer trabajo
                </Button>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {portfolio.map(item => (
                  <View
                    key={item._id}
                    style={[styles.portfolioItem, item.status === 'INACTIVE' && { opacity: 0.5 }]}
                  >
                    {item.imageUrl && !item.imageUrl.includes('no disponible') && (
                      <Image source={{ uri: item.imageUrl }} style={styles.portfolioImg} resizeMode="cover" />
                    )}
                    <View style={styles.portfolioBody}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={styles.portfolioDesc} numberOfLines={3}>{item.description}</Text>
                        <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </View>
                      <View style={styles.portfolioActions}>
                        <Button size="sm" variant="outline" onPress={() => openEdit(item)}>
                          <Ionicons name="pencil-outline" size={13} color="#374151" />
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onPress={() => handleToggle(item)}>
                          <Ionicons
                            name={item.status === 'ACTIVE' ? 'eye-off-outline' : 'eye-outline'}
                            size={13}
                            color="#374151"
                          />
                          {item.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                        </Button>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </CardContent>
        </Card>
      )}

      <Button variant="destructive" fullWidth onPress={() => { logout(); }} style={{ marginBottom: 40 }}>
        Cerrar Sesión
      </Button>

      {/* Modal portafolio */}
      <Modal
        open={portfolioModal}
        onClose={() => setPortfolioModal(false)}
        title={editingItem ? 'Editar trabajo' : 'Agregar trabajo'}
        footer={
          <>
            <Button variant="ghost" onPress={() => setPortfolioModal(false)}>Cancelar</Button>
            <Button onPress={handleSavePortfolio} loading={savingPortfolio}>
              {savingPortfolio ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        <View style={{ gap: 16 }}>
          {!editingItem && (
            <View>
              <Text style={styles.fieldLabel}>Foto del trabajo</Text>
              <TouchableOpacity
                onPress={pickPortfolioImg}
                style={[styles.imagePicker, portfolioImg && styles.imagePickerFilled]}
              >
                <Ionicons
                  name={portfolioImg ? 'checkmark-circle' : 'cloud-upload-outline'}
                  size={28}
                  color={portfolioImg ? WD.green : WD.textGray}
                />
                <Text style={{ fontSize: 13, color: portfolioImg ? WD.green : WD.textGray, marginTop: 4 }}>
                  {portfolioImg ? 'Imagen seleccionada ✓' : 'Toca para seleccionar'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View>
            <Text style={styles.fieldLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Describe el trabajo realizado..."
              placeholderTextColor={WD.textGray}
              value={portfolioDesc}
              onChangeText={setPortfolioDesc}
              multiline
              maxLength={500}
            />
            <Text style={{ fontSize: 11, color: WD.textGray, marginTop: 4, textAlign: 'right' }}>
              {portfolioDesc.length}/500
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WD.lightGray, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: WD.lightGray },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 16 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: WD.yellow, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: WD.darkerGray },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: WD.yellow, alignItems: 'center', justifyContent: 'center',
  },
  userName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  userEmail: { fontSize: 13, color: WD.textGray },
  fields: { gap: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: WD.borderGray, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#111827', backgroundColor: WD.white,
  },
  quickLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  quickLinkText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuRowLast: { borderBottomWidth: 0 },
  menuText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },
  emptyPortfolio: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, color: WD.textGray },
  portfolioItem: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: WD.borderGray },
  portfolioImg: { width: '100%', height: 130 },
  portfolioBody: { padding: 10, gap: 8 },
  portfolioDesc: { fontSize: 13, color: '#374151', lineHeight: 18, flex: 1 },
  portfolioActions: { flexDirection: 'row', gap: 8 },
  imagePicker: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: WD.borderGray,
    borderRadius: 10, padding: 20, alignItems: 'center',
    backgroundColor: WD.white,
  },
  imagePickerFilled: { borderColor: WD.green, backgroundColor: '#F0FDF4' },
});
