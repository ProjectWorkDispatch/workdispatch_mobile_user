import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WD } from '../../constants/theme';
import { useAuthStore, useIsClient } from '../../store/authStore';

interface DashboardHeaderProps {
  onLogout?: () => void;
}

export function DashboardHeader({ onLogout }: DashboardHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const isClient = useIsClient();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  const handleLogout = () => {
    onLogout?.();
  };

  return (
    <LinearGradient
      colors={[WD.darkerGray, WD.darkGray, WD.darkerGray]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Image
            source={require('../../../assets/images/logo_Workdispatch.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.brand}>
              Work<Text style={styles.brandHighlight}>Dispatch</Text>
            </Text>
            <Text style={styles.subtitle}>Conectando talento</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Messages */}
          <TouchableOpacity
            onPress={() => router.push('../messages')}
            style={styles.iconButton}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            onPress={() => router.push('../notifications')}
            style={styles.iconButton}
          >
            <Ionicons name="notifications-outline" size={20} color="#D1D5DB" />
          </TouchableOpacity>


          {/* Avatar - clickable to profile */}
          <TouchableOpacity onPress={() => router.push('../profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || '?'}</Text>
            </View>
          </TouchableOpacity>

        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234, 179, 8, 0.2)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    color: WD.white,
  },
  brandHighlight: {
    color: WD.yellow,
  },
  subtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: -2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WD.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: WD.darkerGray,
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WD.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
