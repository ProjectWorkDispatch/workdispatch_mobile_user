import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ServiceRequestDetail } from '../../components/dashboard/ServiceRequestDetail';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ServiceRequestDetail id={id} />
    </>
  );
}
