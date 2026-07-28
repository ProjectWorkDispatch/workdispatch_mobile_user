import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WD } from '../../constants/theme';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Detalle de Solicitud' }} />
      <Ionicons name="construct-outline" size={48} color={WD.textGray} />
      <Text style={styles.text}>
        El detalle completo de esta solicitud (ID: {id}) todavía no está
        implementado — próximamente en T82.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  text: { fontSize: 14, color: WD.textGray, textAlign: 'center' },
});
