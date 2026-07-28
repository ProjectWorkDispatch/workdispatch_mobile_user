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
