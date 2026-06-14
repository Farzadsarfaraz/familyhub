import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_settings';

interface Settings {
  compactMode:  boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  autoRefresh:  boolean;
}

interface SettingsStore extends Settings {
  loaded: boolean;
  hydrate: () => Promise<void>;
  update:  (patch: Partial<Settings>) => Promise<void>;
}

const DEFAULTS: Settings = {
  compactMode:    false,
  soundEnabled:   true,
  hapticsEnabled: true,
  autoRefresh:    true,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Settings>;
        set({ ...DEFAULTS, ...saved, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  update: async (patch) => {
    const next = { ...get(), ...patch };
    set(patch);
    try {
      const { loaded, hydrate, update, ...toSave } = next;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* ignore write errors */ }
  },
}));
