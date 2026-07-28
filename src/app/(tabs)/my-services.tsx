import React from 'react';
import { PlaceholderScreen } from '../../components/dashboard/PlaceholderScreen';
import { WorkerServicesScreen } from '../../components/Services/Worker/WorkerServicesScreen';
import { useIsClient } from '../../store/authStore';

export default function MyServicesScreen() {
  const isClient = useIsClient();

  if (!isClient) {
    return <WorkerServicesScreen />;
  }

  return (
    <PlaceholderScreen
      title="Mis Contratos"
      subtitle="Revisa el estado de tus contratos activos y finalizados."
    />
  );
}
