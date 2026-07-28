import React from 'react';
import { useAuthStore, useIsClient } from '../../store/authStore';
import { ClientDashboardSummary } from './ClientDashboardSummary';
import { WorkerDashboardSummary } from './Worker/WorkerDashboardSummary';

export function DashboardHome() {
  const isClient = useIsClient();
  const user = useAuthStore((state) => state.user);

  if (!isClient) {
    return <WorkerDashboardSummary user={user} />;
  }

  return <ClientDashboardSummary />;
}
