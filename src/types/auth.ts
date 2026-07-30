export type UserRole = 'CLIENT' | 'WORKER';

export interface User {
  _id?: string;
  id?: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  [key: string]: unknown;
}

export interface AuthResponse {
  user?: User;
  userDetails?: User;
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  refresh_token?: string;
  expiresIn?: number;
  expiresAt?: number;
  expiration?: number;
  emailVerificationRequired?: boolean;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
}
