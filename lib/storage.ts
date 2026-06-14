import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN:  'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER:          'user',
  THEME:         'theme',
  ONBOARDED:     'onboarded',
} as const;

export const storage = {
  keys: KEYS,

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },

  async getString(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
};
