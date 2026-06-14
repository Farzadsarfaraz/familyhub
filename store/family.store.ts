import { create } from 'zustand';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { Family } from '@/types';

interface FamilyStore {
  family:  Family | null;
  loading: boolean;
  error:   string | null;

  fetchFamily:  () => Promise<void>;
  createFamily: (name: string) => Promise<Family>;
  joinFamily:   (code: string) => Promise<Family>;
  leaveFamily:  () => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  clearError:   () => void;
}

export const useFamilyStore = create<FamilyStore>((set) => ({
  family:  null,
  loading: false,
  error:   null,

  fetchFamily: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/families/me');
      set({ family: data.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createFamily: async (name) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/families', { name });
      set({ family: data.data, loading: false });
      return data.data as Family;
    } catch (err) {
      const message = parseApiError(err);
      set({ error: message, loading: false });
      throw err;
    }
  },

  joinFamily: async (code) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/families/join', { inviteCode: code });
      set({ family: data.data, loading: false });
      return data.data as Family;
    } catch (err) {
      const message = parseApiError(err);
      set({ error: message, loading: false });
      throw err;
    }
  },

  leaveFamily: async () => {
    set({ loading: true });
    try {
      await api.delete('/families/me/leave');
      set({ family: null, loading: false });
    } catch (err) {
      set({ error: parseApiError(err), loading: false });
      throw err;
    }
  },

  removeMember: async (userId) => {
    await api.delete(`/families/me/members/${userId}`);
    set((state) => ({
      family: state.family
        ? { ...state.family, members: state.family.members.filter((m: any) => m.id !== userId) }
        : null,
    }));
  },

  clearError: () => set({ error: null }),
}));
