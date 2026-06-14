import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import api, { setAuthFailureCallback } from '@/lib/api';
import { storage } from '@/lib/storage';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';
import { User, AuthTokens } from '@/types';

interface AuthStore {
  user:    User | null;
  tokens:  AuthTokens | null;
  loading: boolean;
  error:   string | null;

  login:       (email: string, password: string) => Promise<void>;
  register:    (name: string, email: string, password: string) => Promise<void>;
  logout:      () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError:  () => void;
  hydrateAuth: () => Promise<void>;
  setAuth:     (user: User, accessToken: string, refreshToken: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:    null,
  tokens:  null,
  loading: false,
  error:   null,

  hydrateAuth: async () => {
    try {
      const user    = await storage.get<User>(storage.keys.USER);
      const access  = await storage.getString(storage.keys.ACCESS_TOKEN);
      const refresh = await storage.getString(storage.keys.REFRESH_TOKEN);
      if (user && access) {
        set({ user, tokens: { accessToken: access, refreshToken: refresh ?? '' } });
      }
    } catch {
      // Storage read failed — start unauthenticated
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = data.data;
      await storage.set(storage.keys.USER, user);
      await AsyncStorage.setItem(storage.keys.ACCESS_TOKEN, accessToken);
      await AsyncStorage.setItem(storage.keys.REFRESH_TOKEN, refreshToken);
      set({ user, tokens: { accessToken, refreshToken }, loading: false });
      toast.success('Welcome back!');
    } catch (err) {
      const message = parseApiError(err);
      set({ error: message, loading: false });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      set({ loading: false });
      toast.success('Account created! Check your email to verify.');
      return data;
    } catch (err) {
      const message = parseApiError(err);
      set({ error: message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* network errors on logout are ignorable */ }
    await storage.clear();
    set({ user: null, tokens: null, error: null });
    router.replace('/(auth)/welcome' as any);
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get('/users/me');
      await storage.set(storage.keys.USER, data.data);
      set({ user: data.data });
    } catch { /* silent — user stays logged in with cached data */ }
  },

  clearError: () => set({ error: null }),

  setAuth: async (user, accessToken, refreshToken) => {
    await storage.set(storage.keys.USER, user);
    await AsyncStorage.setItem(storage.keys.ACCESS_TOKEN, accessToken);
    await AsyncStorage.setItem(storage.keys.REFRESH_TOKEN, refreshToken);
    set({ user, tokens: { accessToken, refreshToken } });
    toast.success(`Welcome, ${user.name}!`);
  },
}));

// Wire up the API interceptor so a failed token refresh triggers an automatic
// logout. Storage is already cleared by the interceptor; we only need to reset
// Zustand state here (calling logout() again would fire another API request).
setAuthFailureCallback(() => {
  useAuthStore.setState({ user: null, tokens: null, error: null });
  router.replace('/(auth)/welcome' as any);
});
