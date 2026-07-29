/**
 * Convierte un string de etiquetas separadas por comas en un array de strings limpios.
 */
export const parseTags = (tagsInput: string): string[] => {
  return tagsInput
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
};

/**
 * Convierte un array de etiquetas en una cadena separada por comas.
 */
export const formatTags = (tags?: string[]): string => {
  return tags ? tags.join(', ') : '';
};
