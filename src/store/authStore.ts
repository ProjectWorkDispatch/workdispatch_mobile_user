import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import { login as loginRequest, register as registerRequest } from '../api';
import type { User, UserRole } from '../types/auth';

const ALLOWED_ROLES: UserRole[] = ['CLIENT', 'WORKER'];

/**
 * Normaliza expiresIn a un timestamp absoluto en milisegundos.
 * Acepta: duración en segundos (number < 1e12) o timestamp ya absoluto.
 */
function toAbsoluteExpiresAt(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  // Si es menor a 1e12, asumimos que es duración en segundos (JWT expiresIn)
  return value < 1e12 ? Date.now() + value * 1000 : value;
}

/** Normaliza el objeto user para que user.role sea siempre 'CLIENT' | 'WORKER' en mayúsculas. */
function normalizeUser(raw: any): User | null {
  if (!raw || typeof raw !== 'object') return null;
  const role = (raw.role || raw.roleName || '').toString().toUpperCase() as UserRole;
  if (!ALLOWED_ROLES.includes(role)) return null;
  return { ...raw, role };
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  loading: boolean;
  error: string | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;

  checkAuth: () => void;
  logout: () => void;
  login: (payload: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  register: (formData: any) => Promise<{ success: boolean; data?: any; error?: string }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      expiresAt: null,
      loading: false,
      error: null,
      isLoadingAuth: true,
      isAuthenticated: false,

      checkAuth: () => {
        const token = get().token;
        const rawUser = get().user;
        const expiresAt = get().expiresAt;
        const user = normalizeUser(rawUser);

        // Check token expiration before anything else
        if (token && expiresAt && expiresAt < Date.now()) {
          set({ loading: false, error: null, isLoadingAuth: false });
          get().logout();
          set({
            user: null,
            token: null,
            refreshToken: null,
            expiresAt: null,
            isAuthenticated: false,
            isLoadingAuth: false,
            error: 'La sesión ha expirado. Inicia sesión nuevamente.',
          });
          return;
        }

        // Re-normalize persisted user on rehydration
        if (rawUser && !user) {
          // Role not in ALLOWED_ROLES — force logout
          set({ loading: false, error: null, isLoadingAuth: false });
          get().logout();
          set({
            user: null,
            token: null,
            refreshToken: null,
            expiresAt: null,
            isAuthenticated: false,
            isLoadingAuth: false,
            error: 'No tienes permiso para acceder a esta sección',
          });
          return;
        }

        if (rawUser && user && JSON.stringify(rawUser) !== JSON.stringify(user)) {
          // User existed but role was not normalized — fix it
          set({ user });
        }

        set({ loading: false, error: null, isLoadingAuth: false });

        if (token && !user) {
          get().logout();
          set({
            user: null,
            token: null,
            refreshToken: null,
            expiresAt: null,
            isAuthenticated: false,
            isLoadingAuth: false,
            error: 'No tienes permiso para acceder a esta sección',
          });
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          expiresAt: null,
          isAuthenticated: false,
        });
      },

      login: async ({ email, password }) => {
        try {
          set({ loading: true, error: null });

          const { data } = await loginRequest({ email, password });
          const rawUser = data?.user || data?.userDetails || data;
          const user = normalizeUser(rawUser);
          const accessToken = data?.accessToken || data?.token;
          const refreshToken = data?.refreshToken || data?.refresh_token;
          const expiresAt = toAbsoluteExpiresAt(data?.expiresIn || data?.expiresAt || data?.expiration);

          if (!user) {
            const message = 'No tienes permisos para acceder a esta sección';
            set({
              user: null,
              token: null,
              refreshToken: null,
              expiresAt: null,
              isAuthenticated: false,
              loading: false,
              error: message,
            });
            Toast.show({ type: 'error', text1: message });
            return { success: false, error: message };
          }

          set({
            user,
            token: accessToken,
            refreshToken,
            expiresAt,
            isAuthenticated: !!accessToken,
            loading: false,
          });

          return { success: true };
        } catch (error: any) {
          let errorMessage = 'Credenciales inválidas o error de conexión';

          if (error.response?.status === 401) {
            errorMessage = 'Credenciales inválidas';
          }

          set({ error: errorMessage, loading: false });
          Toast.show({ type: 'error', text1: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      register: async (formData) => {
        try {
          set({ loading: true, error: null });

          const { data } = await registerRequest(formData);

          set({ loading: false });

          if (data?.emailVerificationRequired) {
            Toast.show({ type: 'success', text1: data?.message || 'Cuenta creada. Revisa tu correo para verificar tu cuenta.' });
          } else {
            Toast.show({ type: 'success', text1: data?.message || 'Cuenta creada exitosamente.' });
          }

          return { success: true, data };
        } catch (error: any) {
          let errorMessage = 'Error al crear la cuenta';

          if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response?.status === 409) {
            errorMessage = 'Este correo ya está registrado';
          }

          set({ error: errorMessage, loading: false });
          Toast.show({ type: 'error', text1: errorMessage });
          return { success: false, error: errorMessage };
        }
      },
    }),
    {
      name: 'auth-store-user',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.checkAuth();
      },
    }
  )
);

/** Selector: true si el usuario autenticado tiene rol CLIENT. */
export const useIsClient = () => useAuthStore((s) => s.user?.role === 'CLIENT');
