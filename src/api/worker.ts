import { axiosUser } from './api';

// ===== USERS / WORKERS =====
export const getWorkers = () => axiosUser.get('/users');
export const getWorkerById = (id: string) => axiosUser.get(`/users/${id}`);
export const updateProfile = (id: string, formData: FormData) =>
  axiosUser.put(`/users/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ===== CATEGORIES =====
export const getCategories = () => axiosUser.get('/categories');

// ===== VERIFICATIONS =====
export const createVerification = (formData: FormData) =>
  axiosUser.post('/verifications', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getVerificationStatus = (id: string) =>
  axiosUser.get(`/verifications/${id}`);

// ===== PORTFOLIO =====
export const getMyPortfolio = (workerId: string) =>
  axiosUser.get(`/PortFolio/my/${workerId}`);
export const getPortfolioByWorker = (id: string) =>
  axiosUser.get(`/PortFolio/${id}`);
export const addPortfolioRecord = (formData: FormData) =>
  axiosUser.post('/PortFolio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updatePortfolioRecord = (id: string, data: any) =>
  axiosUser.put(`/PortFolio/${id}`, data);
export const changePortfolioStatus = (id: string) =>
  axiosUser.patch(`/PortFolio/status/${id}`);

// ===== SKILLS =====
export const getWorkerSkills = (userId: string) =>
  axiosUser.get(`/userSkill/worker/${userId}`);
