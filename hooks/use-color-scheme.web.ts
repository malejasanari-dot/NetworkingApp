import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

/**
 * To support static rendering and dynamic user theme changes on web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { colorScheme } = useTheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
