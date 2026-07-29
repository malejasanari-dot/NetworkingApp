/**
 * Genera un identificador único basado en timestamp.
 */
export const generateId = (offset: number = 0): string => {
  return (Date.now() + offset).toString();
};
