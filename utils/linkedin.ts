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

/**
 * Extrae una URL válida de LinkedIn si está presente en un texto (ej: "LinkedIn: https://www.linkedin.com/in/...")
 */
export function extractLinkedInUrl(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Caso directo: si el texto completo o con prefijo "LinkedIn:" es una URL válida
  const strippedPrefix = trimmed.replace(/^linkedin\s*:\s*/i, '').trim();
  if (isValidLinkedInUrl(strippedPrefix)) {
    return normalizeLinkedInUrl(strippedPrefix);
  }

  // 2. Búsqueda de patrón de URL de LinkedIn dentro del texto
  const match = trimmed.match(/(https?:\/\/[^\s]+linkedin\.com\/[^\s]+|[^\s]*linkedin\.com\/[^\s]+)/i);
  if (match && match[1]) {
    const candidateUrl = match[1].replace(/[.,;:)]+$/, '').trim();
    if (isValidLinkedInUrl(candidateUrl)) {
      return normalizeLinkedInUrl(candidateUrl);
    }
  }

  return null;
}

/**
 * Determina si una nota contiene EXCLUSIVAMENTE un enlace de LinkedIn
 * (ej: "LinkedIn: https://linkedin.com/in/foo" o simplemente "https://linkedin.com/in/foo"),
 * sin notas adicionales ni texto ajeno a LinkedIn.
 */
export function isPureLinkedInNote(content: string | null | undefined): boolean {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  if (!trimmed) return false;

  const withoutPrefix = trimmed.replace(/^linkedin\s*:\s*/i, '').trim();
  return isValidLinkedInUrl(withoutPrefix);
}