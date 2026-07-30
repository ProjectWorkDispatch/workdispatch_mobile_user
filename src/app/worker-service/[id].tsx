import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { WorkerServiceDetail } from '../../components/Services/Worker/WorkerServiceDetail';

export default function WorkerServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkerServiceDetail serviceId={id} />;
}
