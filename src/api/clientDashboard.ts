import { axiosUser } from './api';

export const getMyServiceRequests = async (status?: string | null) => {
  return axiosUser.get('/serviceRequest/mine', {
    params: status ? { status } : undefined,
  });
};

export const getCategories = async () => {
  return axiosUser.get('/categories');
};

export const createServiceRequest = async (formData: FormData) => {
  return axiosUser.post('/serviceRequest', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getAiEstimate = async (payload: {
  title: string;
  description: string;
  categoryName?: string;
  budgetMin?: string;
  budgetMax?: string;
}) => {
  return axiosUser.post('/ai/estimate', payload);
};

export const getServiceRequestById = async (id: string) => {
  return axiosUser.get(`/serviceRequest/${id}`);
};

export const getProposalsForRequest = async (serviceRequestId: string) => {
  return axiosUser.get(`/Proposal/requests/${serviceRequestId}`);
};

export const acceptProposal = async (proposalId: string) => {
  return axiosUser.patch(`/Proposal/accept/${proposalId}`);
};

export const rejectProposal = async (proposalId: string, reason: string) => {
  return axiosUser.patch(`/Proposal/reject/${proposalId}`, { reason });
};
