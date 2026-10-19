import { Linking, Platform } from 'react-native';

/**
 * Valida si una cadena corresponde a una URL válida de perfil o página de LinkedIn.
 */
export function isValidLinkedInUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower === 'n/a' ||
    lower === 'none' ||
    lower === 'no' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'no aplica' ||
    lower === 'no tiene'
  ) {
    return false;
  }

  try {
    const formatted = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(formatted);
    const host = parsed.hostname.toLowerCase();
    const isLinkedIn = host === 'linkedin.com' || host.endsWith('.linkedin.com');

    // Debe pertenecer al dominio de LinkedIn y tener una ruta con contenido más allá de '/'
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    return isLinkedIn && cleanPath.length > 1;
  } catch {
    return false;
  }
}

/**
 * Normaliza la URL de LinkedIn asegurando protocolo https://
 */
export function normalizeLinkedInUrl(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Abre una URL de LinkedIn validada en el navegador del dispositivo o web.
 */
export async function openLinkedInUrl(url: string | null | undefined): Promise<boolean> {
  if (!isValidLinkedInUrl(url)) {
    return false;
  }

  const targetUrl = normalizeLinkedInUrl(url!);

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return true;
    }

    const canOpen = await Linking.canOpenURL(targetUrl);
    if (canOpen) {
      await Linking.openURL(targetUrl);
      return true;
    }

    // Fallback intento directo
    await Linking.openURL(targetUrl);
    return true;
  } catch (error) {
    console.warn('[LinkedIn] Error al abrir URL de LinkedIn:', targetUrl, error);
    return false;
  }
}
