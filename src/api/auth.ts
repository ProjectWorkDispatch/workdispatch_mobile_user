import { axiosAuth, axiosUser } from './api';

const tryPostPaths = async (paths: string[], data: any, config: any = {}) => {
  let lastError: any;
  for (const path of paths) {
    try {
      return await axiosAuth.post(path, data, config);
    } catch (error: any) {
      lastError = error;
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }
  throw lastError;
};

const AUTH_BASE_PATH = '/api/v1/Auth';

const postAuth = async (endpoint: string, data: any, config: any = {}) => {
  const paths = [
    `${AUTH_BASE_PATH}/${endpoint}`,
    `/api/v1/auth/${endpoint}`,
    `/api/Auth/${endpoint}`,
    `/Auth/${endpoint}`,
  ];
  return await tryPostPaths(paths, data, config);
};

export const login = async (data: any) => {
  return await axiosUser.post('/users/login', data);
};

export const register = async (data: any) => {
  return await axiosUser.post('/users/register', data);
};

export const forgotPassword = async (email: string) => {
  return await postAuth('forgot-password', { email });
};

export const resetPassword = async (token: string, newPassword: string) => {
  return await postAuth('reset-password', { token, newPassword });
};

export const verifyEmail = async (token: string) => {
  return await postAuth('verify-email', { token });
};

export const resendVerification = async (email: string) => {
  return await postAuth('resend-verification', { email });
};
