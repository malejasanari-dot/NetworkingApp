import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const webStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
  },
};

const isServerOrWeb = typeof window === 'undefined' || Platform.OS === 'web';
export const supabaseStorage = isServerOrWeb ? webStorage : AsyncStorage;
