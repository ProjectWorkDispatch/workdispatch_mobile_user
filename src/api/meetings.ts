import { axiosUser } from './api';

export const getMeetingsByUser = async (userId: string) => {
  return axiosUser.get(`/meetings/user/${userId}`);
};