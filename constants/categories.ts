export const CONTACT_CATEGORIES = ['Directorio LHH', 'Gestionados', 'Referidos', 'Conocidos'] as const;
export type ContactCategory = typeof CONTACT_CATEGORIES[number];

export const DIRECTORY_CATEGORY: ContactCategory = 'Directorio LHH';
export type ManualContactCategory = Exclude<ContactCategory, typeof DIRECTORY_CATEGORY>;
export const MANUAL_CONTACT_CATEGORIES: readonly ManualContactCategory[] = ['Gestionados', 'Referidos', 'Conocidos'] as const;

export function isReservedDirectoryTag(tag: unknown): boolean {
  return typeof tag === 'string' && tag.trim().toLowerCase().startsWith('directorio_id:');
}

export function stripReservedDirectoryTags(tags?: string[] | null): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t) => !isReservedDirectoryTag(t));
}

/**
 * Determina si un contacto proviene realmente del Directorio LHH
 * a partir de su identificador persistido (o etiqueta interna heredada).
 */
export function hasValidDirectoryOrigin(contact?: {
  directorioId?: string | null;
  tags?: string[] | null;
} | null): boolean {
  if (!contact) return false;
  const hasId = typeof contact.directorioId === 'string' && contact.directorioId.trim().length > 0;
  const hasLegacyTag = Array.isArray(contact.tags) && contact.tags.some(
    (t) =>
      isReservedDirectoryTag(t) &&
      t.trim().slice('directorio_id:'.length).trim().length > 0
  );
  return hasId || hasLegacyTag;
}

// Colores para la barra del dashboard y etiquetas (light mode)
export const CATEGORY_COLORS = {
  'Directorio LHH': '#4F185A', // Violeta corporativo LHH
  Gestionados: '#EA1E80',      // Passion Pink
  Referidos: '#AA0285',        // Bright Plum
  Conocidos: '#7C3AED',        // Violeta profundo
} as const;

// Colores para la barra del dashboard y etiquetas (dark mode)
export const CATEGORY_COLORS_DARK = {
  'Directorio LHH': '#DEB8E6', // Violeta corporativo LHH claro
  Gestionados: '#EA1E80',      // Passion Pink
  Referidos: '#FDF361',        // Accent1 dark
  Conocidos: '#C084FC',        // Violeta claro
} as const;
