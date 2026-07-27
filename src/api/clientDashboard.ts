import { axiosUser } from './api';

export const getMyServiceRequests = async () => {
  return axiosUser.get('/serviceRequest/mine');
};

export const getCategories = async () => {
  return axiosUser.get('/categories');
};
