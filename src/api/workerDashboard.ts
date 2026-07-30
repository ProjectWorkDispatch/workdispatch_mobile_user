import { axiosUser } from './api';

export const getOpenServiceRequests = async (categoryId?: string) => {
  const params = categoryId ? { categoryId } : undefined;
  return axiosUser.get('/serviceRequest/open', { params });
};

export const getCategories = async () => {
  return axiosUser.get('/categories');
};

export const getWorkerSkills = async (workerId: string) => {
  return axiosUser.get(`/userSkill/worker/${workerId}`);
};

export const getWorkerProposals = async (workerId: string) => {
  return axiosUser.get(`/Proposal/worker/${workerId}`);
};

export const getProposalById = async (proposalId: string) => {
  return axiosUser.get(`/Proposal/${proposalId}`);
};

export const createProposal = async (payload: {
  serviceRequestId: string;
  workerId: string;
  price: number;
  message: string;
}) => {
  return axiosUser.post('/Proposal', payload);
};

export const getWorkerServices = async (workerId: string) => {
  return axiosUser.get(`/Service/worker/${workerId}`);
};

export const getServiceById = async (serviceId: string) => {
  return axiosUser.get(`/Service/${serviceId}`);
};

export const getReviewsByReviewer = async (reviewerId: string) => {
  return axiosUser.get(`/reviews/client/${reviewerId}`);
};

export const createReview = async (payload: {
  serviceId: string;
  reviewerId: string;
  revieweredId: string;
  Rating: number;
  Comment: string;
}) => {
  return axiosUser.post('/reviews', payload);
};

// ================= SERVICE ACTIONS =================
export const completeService = async (serviceId: string) =>
  axiosUser.patch(`/Service/complete/${serviceId}`);

export const cancelService = async (serviceId: string, cancelReason: string, role: string) =>
  axiosUser.patch(`/Service/cancel/${serviceId}`, { cancelReason, role });

export const scheduleService = async (serviceId: string, payload: {
  scheduledDate: string;
  estimatedDurationDays: number;
  workPlan: Array<{ dayNumber: number; description: string }>;
}) => axiosUser.patch(`/Service/schedule/${serviceId}`, payload);

export const toggleWorkPlanDay = async (serviceId: string, dayNumber: number) =>
  axiosUser.patch(`/Service/work-plan/${serviceId}/${dayNumber}`);

export const setupPlan = async (serviceId: string, payload: {
  estimatedStartDate: string;
  estimatedEndDate: string;
  generalPlan: string;
}) => axiosUser.patch(`/Service/setup-plan/${serviceId}`, payload);

export const addWorkLog = async (serviceId: string, payload: {
  date: string;
  description: string;
}) => axiosUser.post(`/Service/work-log/${serviceId}`, payload);

export const editWorkLog = async (serviceId: string, dayNumber: number, payload: {
  description: string;
}) => axiosUser.patch(`/Service/work-log/${serviceId}/${dayNumber}`, payload);

export const completeWorkDay = async (serviceId: string, dayNumber: number) =>
  axiosUser.patch(`/Service/complete-day/${serviceId}/${dayNumber}`);

// ================= MEETINGS (WORKER) =================
export const getPendingMeetings = async (userId: string) => {
  return axiosUser.get(`/meetings/pending/${userId}`);
};

export const confirmMeeting = async (meetingId: string) => {
  return axiosUser.patch(`/meetings/confirm/${meetingId}`);
};

export const proposeAlternativeTime = async (meetingId: string, startTime: string) => {
  return axiosUser.patch(`/meetings/propose-time/${meetingId}`, { startTime });
};

export const getProposalMeeting = async (proposalId: string) => {
  return axiosUser.get(`/meetings/proposal/${proposalId}`);
};

export const getServiceRequestMeeting = async (serviceRequestId: string) => {
  return axiosUser.get(`/meetings/service-request/${serviceRequestId}`);
};

export const workerRequestMeeting = async (payload: {
  serviceRequestId: string;
  startTime?: string;
}) => {
  return axiosUser.post('/meetings/worker-request', payload);
};

export const getClientTrustStats = async (clientId: string) => {
  return axiosUser.get(`/users/${clientId}/client-trust-stats`);
};

export const getReceivedReviews = async (userId: string) => {
  return axiosUser.get(`/reviews/received/${userId}`);
};

export const cancelMeeting = async (meetingId: string) => {
  return axiosUser.patch(`/meetings/cancel/${meetingId}`);
};

export const getMeetingsByUser = async (userId: string) => {
  return axiosUser.get(`/meetings/user/${userId}`);
};

export const getMeetingById = async (meetingId: string) => {
  return axiosUser.get(`/meetings/${meetingId}`);
};

// ================= SKILLS =================
export const getSkillsCatalog = async () =>
  axiosUser.get('/skill');

export const addUserSkill = async (data: {
  userId: string;
  skillId: string;
  experienceYears: number;
}) => axiosUser.post('/userSkill', data);
