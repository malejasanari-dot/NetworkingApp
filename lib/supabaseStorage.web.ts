// Storage adapter para Web / SSR (Totalmente SSR-safe sin dependencias a window o AsyncStorage)
export const supabaseStorage = {
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
      } catch {
        // Ignorar errores en modo privado o límites de cuota
      }
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignorar errores
      }
    }
  },
};
