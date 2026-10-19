import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

/**
 * Representación exacta de las 7 columnas autorizadas devueltas por el backend.
 */
export interface CandidateRecord {
  id_sistema: number;
  nombre: string | null;
  apellido: string | null;
  titulo: string | null;
  empresa: string | null;
  linkedin: string | null;
  fecha_inicio_programa: string | null;
}

/**
 * Entidad normalizada exclusivamente para presentación en NetworkingApp.
 */
export interface CandidateDirectoryItem {
  idSistema: string;
  nombreCompleto: string;
  cargo: string;
  empresa: string;
  linkedin: string | null;
  fechaInicioPrograma: string | null;
}

/**
 * Metadatos de paginación devueltos por el backend.
 */
export interface DirectoryPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Carga útil recibida desde el backend.
 */
interface BackendDirectoryPayload {
  success: boolean;
  data: CandidateRecord[];
  pagination: DirectoryPagination;
}

/**
 * Respuesta procesada y tipada del servicio para consumo en la aplicación.
 */
export interface DirectoryResponse {
  success: boolean;
  data: CandidateDirectoryItem[];
  raw: CandidateRecord[];
  pagination: DirectoryPagination;
}

/**
 * Parámetros para consultar el directorio.
 */
export interface FetchDirectoryParams {
  page?: number;
  limit?: number; // Máximo 50 registros por solicitud
  search?: string;
  token?: string; // Token opcional; si no se provee, se obtiene de la sesión de Supabase
  timeoutMs?: number;
}

// ==========================================
// Clases de Error Tipadas y Específicas
// ==========================================

export class DirectoryApiError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'DirectoryApiError';
    this.statusCode = statusCode;
  }
}

export class DirectoryAuthError extends DirectoryApiError {
  constructor(message = 'Acceso no autorizado: Sesión inválida o expirada. Inicie sesión nuevamente.') {
    super(message, 401);
    this.name = 'DirectoryAuthError';
  }
}

export class DirectoryRateLimitError extends DirectoryApiError {
  constructor(message = 'Límite de solicitudes alcanzado. Por favor intente más tarde.') {
    super(message, 429);
    this.name = 'DirectoryRateLimitError';
  }
}

export class DirectoryServerError extends DirectoryApiError {
  constructor(message = 'Error temporal en el servicio del directorio') {
    super(message, 500);
    this.name = 'DirectoryServerError';
  }
}

export class DirectoryNetworkError extends DirectoryApiError {
  constructor(message = 'No se pudo conectar con el servidor del directorio. Verifique su conexión de red.') {
    super(message, 0);
    this.name = 'DirectoryNetworkError';
  }
}

// ==========================================
// Reglas de Normalización de Presentación
// ==========================================

const KNOWN_ACRONYMS = new Set([
  'CEO', 'CFO', 'COO', 'CIO', 'CTO', 'CMO', 'CRO', 'CHRO',
  'VP', 'AVP', 'SVP', 'EVP',
  'HR', 'IT', 'TI', 'PMO', 'PMP', 'SAP', 'ERP', 'CRM', 'BI', 'QA', 'UI', 'UX', 'AI', 'IA', 'RRHH',
  'S.A.', 'S.A.S.', 'S.A.S', 'S.A', 'LTDA.', 'LTDA', 'S.L.', 'LLC', 'INC.', 'INC',
  'B2B', 'B2C', 'IBM', 'BBVA', 'DHL', 'LATAM', 'ONG', 'PYME', 'PYMES'
]);

const LOWERCASE_PARTICLES = new Set([
  'de', 'del', 'y', 'e', 'en', 'la', 'las', 'el', 'los', 'para', 'por', 'con', 'a', 'al', 'o', 'u'
]);

/**
 * Normaliza cadenas de texto para la presentación visual en la app:
 * - Limpia espacios marginales e intermedios duplicados.
 * - Convierte a formato título (Title Case).
 * - Respeta preposiciones y partículas comunes en minúscula.
 * - Preserva siglas y acrónimos corporativos reconocidos en mayúsculas.
 */
export function normalizePresentationText(text: string | null | undefined): string {
  if (!text) return '';
  const cleaned = text.replace(/[\r\n]+/g, ' ').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  const words = cleaned.split(' ');
  const normalizedWords = words.map((word, index) => {
    const upperWord = word.toUpperCase();
    if (KNOWN_ACRONYMS.has(upperWord)) {
      return upperWord;
    }

    const lowerWord = word.toLowerCase();
    if (index > 0 && LOWERCASE_PARTICLES.has(lowerWord)) {
      return lowerWord;
    }

    return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
  });

  return normalizedWords.join(' ');
}

/**
 * Normaliza un registro de candidato crudo para uso visual en la app.
 * Conserva id_sistema como idSistema, fecha_inicio_programa como fechaInicioPrograma,
 * y no altera la URL de LinkedIn.
 */
export function normalizeCandidate(record: CandidateRecord): CandidateDirectoryItem {
  const rawFullName = [record.nombre, record.apellido]
    .map(s => s?.trim())
    .filter(Boolean)
    .join(' ');
  const nombreCompleto = normalizePresentationText(rawFullName);

  const cargo = normalizePresentationText(record.titulo);
  const empresa = normalizePresentationText(record.empresa);

  // El enlace de LinkedIn no se modifica en lo absoluto (solo trim si existe)
  const linkedin = record.linkedin && record.linkedin.trim().length > 0
    ? record.linkedin.trim()
    : null;

  // Formatear fecha a YYYY-MM-DD si viene en formato ISO
  const fechaInicioPrograma = record.fecha_inicio_programa
    ? String(record.fecha_inicio_programa).split('T')[0]
    : null;

  return {
    idSistema: String(record.id_sistema),
    nombreCompleto,
    cargo,
    empresa,
    linkedin,
    fechaInicioPrograma
  };
}

/**
 * Extrae y formatea de forma segura únicamente el año de cuatro dígitos
 * de una fecha de inicio de programa.
 * 
 * - Si la fecha es nula, vacía, indefinida o no contiene un año válido,
 *   retorna null para evitar mostrar badges erróneos.
 * - No modifica la fecha original ni altera el ordenamiento.
 */
export function formatCandidateYear(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;
  const str = String(dateInput).trim();
  if (!str) return null;

  const lower = str.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'none' || lower === 'n/a' || lower === 'no') {
    return null;
  }

  // Intento 1: Coincidencia directa de 4 dígitos al inicio (ej: '2024-05-12' o '2024')
  const match = str.match(/^(\d{4})/);
  if (match) {
    const yearNum = parseInt(match[1], 10);
    if (yearNum >= 1970 && yearNum <= 2100) {
      return match[1];
    }
  }

  // Intento 2: Parseo con Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    if (year >= 1970 && year <= 2100) {
      return String(year);
    }
  }

  return null;
}

// ==========================================
// Caché y Recuperación Segura de Candidatos
// ==========================================

const candidateCache = new Map<string, CandidateDirectoryItem>();

/**
 * Almacena un candidato en caché en memoria (y en sessionStorage en web)
 * para permitir la apertura inmediata de su ficha individual sin recargar la red.
 */
export function cacheCandidate(candidate: CandidateDirectoryItem): void {
  if (!candidate || !candidate.idSistema) return;
  const idStr = String(candidate.idSistema);
  candidateCache.set(idStr, candidate);

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(`lhh_cand_${idStr}`, JSON.stringify(candidate));
    } catch {
      // Ignorar excepciones de cuota de almacenamiento
    }
  }
}

/**
 * Almacena un conjunto de candidatos en el caché local.
 */
export function cacheCandidates(candidates: CandidateDirectoryItem[]): void {
  if (Array.isArray(candidates)) {
    candidates.forEach(c => cacheCandidate(c));
  }
}

/**
 * Obtiene un candidato del caché local por su ID de sistema.
 */
export function getCachedCandidate(idSistema: string): CandidateDirectoryItem | undefined {
  if (!idSistema) return undefined;
  const idStr = String(idSistema);
  const fromMemory = candidateCache.get(idStr);
  if (fromMemory) return fromMemory;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(`lhh_cand_${idStr}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        candidateCache.set(idStr, parsed);
        return parsed;
      }
    } catch {
      // Continuar si no se pudo parsear
    }
  }

  return undefined;
}

/**
 * Recupera un candidato seleccionado utilizando los mecanismos existentes de fetchDirectory,
 * garantizando que si se recarga la app o se abre la ruta directamente, la información
 * pueda recuperarse de forma fiable sin crear endpoints nuevos innecesarios.
 */
export async function findCandidateById(idSistema: string): Promise<CandidateDirectoryItem | null> {
  if (!idSistema) return null;
  const idStr = String(idSistema);

  // 1. Revisar caché local primero
  const cached = getCachedCandidate(idStr);
  if (cached) return cached;

  // 2. Recuperación usando fetchDirectory existente (página 1)
  try {
    const res = await fetchDirectory({ page: 1, limit: 50 });
    const found = res.data.find(c => String(c.idSistema) === idStr);
    if (found) return found;

    // Si no está en la página 1 y hay más páginas, intentar en la página 2
    if (res.pagination && res.pagination.hasNextPage) {
      const res2 = await fetchDirectory({ page: 2, limit: 50 });
      const found2 = res2.data.find(c => String(c.idSistema) === idStr);
      if (found2) return found2;
    }
  } catch (error) {
    console.warn('[directoryApi] No se pudo recuperar candidato por ID:', error);
  }

  return null;
}

// ==========================================
// Configuración de URL Base y Red
// ==========================================

/**
 * Determina la URL base del backend según el entorno de ejecución:
 * 1. Si es una URL de producción (HTTPS / dominio público no local), la conserva intacta.
 * 2. Si corre en Expo Go en dispositivo móvil (Android/iOS físico), resuelve la IP de la máquina
 *    de desarrollo a través de Constants.expoConfig?.hostUri.
 * 3. Si se configuró una IP LAN explícita en .env (ej. http://192.168.1.2:3000), la respeta sin alterarla.
 * 4. En navegador web, utiliza localhost o la URL configurada.
 * 5. En emulador Android puro sin hostUri, utiliza el alias 10.0.2.2.
 */
export function getBaseApiUrl(): string {
  let url = process.env.EXPO_PUBLIC_API_URL?.trim();

  // 1. Conservar URLs de producción intactas (no locales)
  if (url && /^https?:\/\//i.test(url)) {
    const lower = url.toLowerCase();
    const isLocal =
      lower.includes('localhost') ||
      lower.includes('127.0.0.1') ||
      lower.includes('10.0.2.2');
    if (!isLocal) {
      return url.replace(/\/+$/, '');
    }
  }

  // 2. Extraer puerto configurado o usar 3000 por defecto
  let port = '3000';
  if (url) {
    try {
      const parsed = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
      if (parsed.port) {
        port = parsed.port;
      }
    } catch {
      port = '3000';
    }
  }

  // 3. Detección automática del Host LAN en Expo Go (compatible con Android/iOS físico)
  let expoHost: string | null = null;
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any).manifest?.debuggerHost;

    if (hostUri && typeof hostUri === 'string') {
      const rawHost = hostUri.split(':')[0]?.trim();
      if (rawHost && rawHost !== 'localhost' && rawHost !== '127.0.0.1') {
        expoHost = rawHost;
      }
    }
  } catch {
    // Continuar si Constants no está disponible
  }

  if (expoHost && Platform.OS !== 'web') {
    return `http://${expoHost}:${port}`;
  }

  // 4. Si se configuró una IP LAN explícita en .env (ej. http://192.168.1.2:3000), respetarla
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('10.0.2.2')) {
    const formatted = /^https?:\/\//i.test(url) ? url : `http://${url}`;
    return formatted.replace(/\/+$/, '');
  }

  // 5. Entorno Web
  if (Platform.OS === 'web') {
    return (url || `http://localhost:${port}`).replace(/\/+$/, '');
  }

  // 6. Respaldo para Emulador Android (cuando no se detectó host LAN)
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`;
  }

  // 7. Fallback por defecto
  return (url || `http://localhost:${port}`).replace(/\/+$/, '');
}

// ==========================================
// Función Principal de Consulta
// ==========================================

/**
 * Consulta de forma paginada y segura el Directorio de Candidatos LHH.
 * 
 * Reglas:
 * - Envía el token de sesión en la cabecera Authorization: Bearer <token>.
 * - Limita la solicitud a un máximo de 50 registros por página.
 * - Soporta búsqueda textual mediante el parámetro 'search'.
 * - Maneja timeout (por defecto 15s) y captura errores específicos (401, 429, red, servidor).
 */
export async function fetchDirectory(params: FetchDirectoryParams = {}): Promise<DirectoryResponse> {
  const baseUrl = getBaseApiUrl();

  const page = Math.max(params.page || 1, 1);
  // Regla estricta: tope máximo de 50 registros por solicitud
  const limit = Math.min(Math.max(params.limit || 20, 1), 50);

  // 1. Obtención de token de sesión vigente
  let token = params.token;
  if (!token) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new DirectoryAuthError('No se encontró una sesión activa en la aplicación. Inicie sesión para continuar.');
    }
    token = session.access_token;
  }

  // 2. Construcción de query parameters
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const search = params.search?.trim();
  if (search) {
    queryParams.set('q', search.slice(0, 100));
  }

  const endpoint = `${baseUrl}/api/directorio?${queryParams.toString()}`;

  // 3. Control de timeout con AbortController
  const timeoutMs = params.timeoutMs || 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });

    if (response.status === 401) {
      throw new DirectoryAuthError();
    }
    if (response.status === 429) {
      throw new DirectoryRateLimitError();
    }
    if (response.status >= 500) {
      throw new DirectoryServerError();
    }
    if (!response.ok) {
      throw new DirectoryApiError(`Error en el directorio: HTTP ${response.status}`, response.status);
    }

    const payload: BackendDirectoryPayload = await response.json();
    if (!payload.success || !Array.isArray(payload.data)) {
      throw new DirectoryServerError('Respuesta inválida del servidor del directorio');
    }

    // 4. Normalización exclusiva para presentación
    const normalizedData: CandidateDirectoryItem[] = payload.data.map(item => normalizeCandidate(item));

    // 5. Almacenar en caché local para navegación inmediata a la ficha
    cacheCandidates(normalizedData);

    return {
      success: true,
      data: normalizedData,
      raw: payload.data,
      pagination: payload.pagination
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new DirectoryNetworkError('La solicitud al directorio superó el tiempo límite de espera (timeout).');
    }
    if (err instanceof DirectoryApiError) {
      throw err;
    }
    throw new DirectoryNetworkError(err?.message || 'Error de conexión con el directorio');
  } finally {
    clearTimeout(timeoutId);
  }
}
