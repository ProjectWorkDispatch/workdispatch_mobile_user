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

// ================= CLIENT SERVICES =================
export const getClientServices = async (clientId: string) =>
  axiosUser.get(`/Service/client/${clientId}`);

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

// ================= MEETINGS (CLIENT) =================
export const requestMeeting = async (proposalId: string, startTime?: string) => {
  return axiosUser.post('/meetings/request', { proposalId, startTime });
};

export const proposeAlternativeTime = async (meetingId: string, startTime: string) => {
  return axiosUser.patch(`/meetings/propose-time/${meetingId}`, { startTime });
};

export const confirmMeeting = async (meetingId: string) => {
  return axiosUser.patch(`/meetings/confirm/${meetingId}`);
};

export const getPendingMeetings = async (userId: string) => {
  return axiosUser.get(`/meetings/pending/${userId}`);
};

export const getProposalMeeting = async (proposalId: string) => {
  return axiosUser.get(`/meetings/proposal/${proposalId}`);
};

export const getServiceRequestMeeting = async (serviceRequestId: string) => {
  return axiosUser.get(`/meetings/service-request/${serviceRequestId}`);
};

export const cancelMeeting = async (meetingId: string) => {
  return axiosUser.patch(`/meetings/cancel/${meetingId}`);
};

// ================= WORKER STATS =================
export const getWorkerTrustStats = async (workerId: string) => {
  return axiosUser.get(`/users/${workerId}/trust-stats`);
};

export const getReceivedReviews = async (userId: string) => {
  return axiosUser.get(`/reviews/received/${userId}`);
};

// ================= WORK PLAN (CLIENT) =================
export const verifyWorkDay = async (serviceId: string, dayNumber: number, payload: {
  verified: boolean;
  clientNote?: string;
}) => axiosUser.patch(`/Service/verify-day/${serviceId}/${dayNumber}`, payload);
