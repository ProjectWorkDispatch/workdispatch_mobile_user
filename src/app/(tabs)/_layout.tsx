import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { WD } from '../../constants/theme';
import { useAuthStore, useIsClient } from '../../store/authStore';

export default function TabsLayout() {
  const { logout } = useAuthStore();
  const isClient = useIsClient();

  const handleLogout = () => {
    logout();
  };

  return (
    <View style={styles.root}>
      <DashboardHeader onLogout={handleLogout} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: WD.yellow,
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: WD.darkGray,
            borderTopColor: '#374151',
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: isClient ? 'Inicio' : 'Trabajos',
            tabBarLabel: isClient ? 'Inicio' : 'Trabajos',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={isClient ? 'home-outline' : 'briefcase-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="my-requests"
          options={{
            href: isClient ? undefined : null,
            title: 'Mis Solicitudes',
            tabBarLabel: 'Solicitudes',
            tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="find-workers"
          options={{
            href: isClient ? undefined : null,
            title: 'Buscar',
            tabBarLabel: 'Buscar',
            tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="my-services"
          options={{
            title: isClient ? 'Contratos' : 'Servicios',
            tabBarLabel: isClient ? 'Contratos' : 'Servicios',
            tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="my-offers"
          options={{
            href: isClient ? null : undefined,
            title: 'Mis Ofertas',
            tabBarLabel: 'Ofertas',
            tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen name="messages" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="reviews" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarLabel: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
