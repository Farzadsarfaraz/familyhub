import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id:      string;
  type:    ToastType;
  message: string;
  title?:  string;
}

interface ToastStore {
  toasts: Toast[];
  show:   (message: string, type?: ToastType, title?: string) => void;
  hide:   (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  show: (message, type = 'info', title) => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, type, message, title }] }));
  },

  hide: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience helpers usable outside React
export const toast = {
  success: (message: string, title?: string) => useToastStore.getState().show(message, 'success', title),
  error:   (message: string, title?: string) => useToastStore.getState().show(message, 'error', title),
  warning: (message: string, title?: string) => useToastStore.getState().show(message, 'warning', title),
  info:    (message: string, title?: string) => useToastStore.getState().show(message, 'info', title),
};
