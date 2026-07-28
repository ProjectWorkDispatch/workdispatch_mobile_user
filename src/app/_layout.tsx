import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { WD } from '../constants/theme';

export default function RootLayout() {
  const { isAuthenticated, isLoadingAuth } = useAuthStore();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen name="login" />
            <Stack.Screen name="verify-email" />
          </Stack.Protected>

          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="my-requests/[id]" />
          </Stack.Protected>
        </Stack>

        {isLoadingAuth && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={WD.yellow} />
          </View>
        )}

        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WD.darkerGray,
    zIndex: 999,
  },
});