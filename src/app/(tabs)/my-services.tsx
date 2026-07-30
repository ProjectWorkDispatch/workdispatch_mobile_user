import React from 'react';
import { ClientMyServices } from '../../components/dashboard/ClientMyServices';
import { WorkerServicesScreen } from '../../components/Services/Worker/WorkerServicesScreen';
import { useIsClient } from '../../store/authStore';

export default function MyServicesScreen() {
  const isClient = useIsClient();

  if (!isClient) {
    return <WorkerServicesScreen />;
  }

  return <ClientMyServices />;
}
