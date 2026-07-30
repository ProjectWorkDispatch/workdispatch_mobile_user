import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { WorkerProposalDetail } from '../../components/Proposals/Worker/WorkerProposalDetail';

export default function ProposalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkerProposalDetail proposalId={id} />;
}
