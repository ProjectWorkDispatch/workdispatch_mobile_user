import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ClientServiceDetail } from '../../components/dashboard/ClientServiceDetail';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ClientServiceDetail serviceId={id} />
    </>
  );
}
