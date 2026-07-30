import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Platform.select({ android: 'http://10.0.2.2:3002/workDispatch/v1', default: undefined })!;

const AUTH_URL =
  process.env.EXPO_PUBLIC_AUTH_URL ??
  Platform.select({ android: 'http://10.0.2.2:5149', default: undefined })!;

const USER_URL = DEFAULT_API_URL;

const axiosAuth = axios.create({
  baseURL: AUTH_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

const axiosUser = axios.create({
  baseURL: USER_URL,
  timeout: 80000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor: handle expired tokens on axiosUser
axiosUser.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.error;

    if (status === 401 && (code === 'TOKEN_EXPIRED' || code === 'MISSING_TOKEN' || code === 'INVALID_TOKEN')) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);

// Request interceptors: attach Bearer token
axiosAuth.interceptors.request.use((config) => {
  (config as any)._axiosClient = 'auth';
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosUser.interceptors.request.use((config) => {
  (config as any)._axiosClient = 'user';
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token logic
let _isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function _processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!)
  );
  failedQueue = [];
}

const handleRefreshToken = async function (error: any) {
  const _original = error.config;
  if (!_original || _original._retry) {
    return Promise.reject(error);
  }

  const status = error.response?.status;
  const errorCode = error.response?.data?.error;
  const requestUrl: string = _original.url || '';
  const isRefreshEndpoint = requestUrl.includes('/Auth/refresh') || requestUrl.includes('/auth/refresh');
  const shouldAttemptRefresh = !isRefreshEndpoint && status === 401;
  const shouldAttemptRefreshFrom403 = !isRefreshEndpoint && status === 403 && errorCode === 'TOKEN_EXPIRED';

  if (shouldAttemptRefresh || shouldAttemptRefreshFrom403) {
    const retryClient = _original._axiosClient === 'user' ? axiosUser : axiosAuth;

    if (_isRefreshing) {
      return new Promise<string>(function (resolve, reject) {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          _original.headers['Authorization'] = 'Bearer ' + token;
          return retryClient(_original);
        })
        .catch((err: unknown) => Promise.reject(err));
    }

    _original._retry = true;
    _isRefreshing = true;

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // Snapshot the refreshToken before the async call
    const refreshTokenAtStart = refreshToken;

    try {
      let response;
      try {
        response = await axiosAuth.post('/Auth/refresh', { refreshToken });
      } catch (refreshError: any) {
        if (refreshError.response?.status === 404) {
          response = await axiosAuth.post('/auth/refresh', { refreshToken });
        } else {
          throw refreshError;
        }
      }

      // Guard: if the user logged out while the refresh was in-flight, discard the result
      const currentRefreshToken = useAuthStore.getState().refreshToken;
      if (currentRefreshToken !== refreshTokenAtStart) {
        _processQueue(error, null);
        return Promise.reject(error);
      }

      const { accessToken, refreshToken: newRefreshToken, expiresIn, userDetails } = response!.data;
      const expiresAt = typeof expiresIn === 'number'
        ? (expiresIn < 1e12 ? Date.now() + expiresIn * 1000 : expiresIn)
        : null;
      useAuthStore.setState({
        token: accessToken,
        refreshToken: newRefreshToken,
        expiresAt,
        user: userDetails || useAuthStore.getState().user,
        isAuthenticated: true,
      });

      _processQueue(null, accessToken);
      _original.headers['Authorization'] = 'Bearer ' + accessToken;
      return retryClient(_original);
    } catch (err) {
      _processQueue(err, null);
      useAuthStore.getState().logout();
      return Promise.reject(err);
    } finally {
      _isRefreshing = false;
    }
  }

  return Promise.reject(error);
};

axiosAuth.interceptors.response.use((res) => res, handleRefreshToken);
axiosUser.interceptors.response.use((res) => res, handleRefreshToken);

export { axiosAuth, axiosUser };

