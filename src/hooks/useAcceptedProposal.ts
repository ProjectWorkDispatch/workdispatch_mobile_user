import { useEffect, useState } from 'react';
import { getProposalsForRequest } from '../api/clientDashboard';

export const useAcceptedProposal = (serviceRequestId: string | null | undefined) => {
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serviceRequestId) {
      setProposal(null);
      return;
    }

    let cancelled = false;

    const fetchProposal = async () => {
      setLoading(true);
      try {
        const res = await getProposalsForRequest(serviceRequestId);
        const proposals = res.data?.proposals || [];
        const accepted = proposals.find((p: any) => p.status === 'ACCEPTED');
        if (!cancelled) setProposal(accepted || null);
      } catch {
        if (!cancelled) setProposal(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProposal();

    return () => {
      cancelled = true;
    };
  }, [serviceRequestId]);

  return { proposal, loading };
};
