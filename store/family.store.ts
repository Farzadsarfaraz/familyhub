import { create } from 'zustand';
import api from '@/lib/api';
import { Family } from '@/types';

interface FamilyStore {
  family:  Family | null;
  loading: boolean;
  error:   string | null;

  fetchFamily:    () => Promise<void>;
  createFamily:   (name: string) => Promise<void>;
  joinFamily:     (code: string) => Promise<void>;
  leaveFamily:    () => Promise<void>;
  inviteMember:   (email: string) => Promise<string>;
  removeMember:   (userId: string) => Promise<void>;
}

export const useFamilyStore = create<FamilyStore>((set) => ({
  family:  null,
  loading: false,
  error:   null,

  fetchFamily: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/families/mine');
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
    } catch (err: any) {
      set({ error: err.response?.data?.message ?? 'Failed to create family', loading: false });
      throw err;
    }
  },

  joinFamily: async (code) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/families/join', { inviteCode: code });
      set({ family: data.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message ?? 'Invalid invite code', loading: false });
      throw err;
    }
  },

  leaveFamily: async () => {
    set({ loading: true });
    try {
      await api.post('/families/leave');
      set({ family: null, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message, loading: false });
    }
  },

  inviteMember: async (email) => {
    const { data } = await api.post('/families/invite', { email });
    return data.data.inviteLink as string;
  },

  removeMember: async (userId) => {
    await api.delete(`/families/members/${userId}`);
    set((state) => ({
      family: state.family
        ? { ...state.family, members: state.family.members.filter((m) => m.userId !== userId) }
        : null,
    }));
  },
}));
