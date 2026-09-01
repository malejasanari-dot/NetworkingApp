export const CONTACT_CATEGORIES = ['Conocidos', 'Referidos', 'Gestionados'] as const;
export type ContactCategory = typeof CONTACT_CATEGORIES[number];

// Colores para la barra del dashboard (light mode)
export const CATEGORY_COLORS = {
  Conocidos: '#7C3AED',    // Violeta profundo
  Referidos: '#AA0285',    // Bright Plum
  Gestionados: '#EA1E80',  // Passion Pink
} as const;

// Colores para la barra del dashboard (dark mode)
export const CATEGORY_COLORS_DARK = {
  Conocidos: '#DEB8E6',    // primary dark
  Referidos: '#FDF361',    // accent1 dark
  Gestionados: '#EA1E80',  // accent2 dark
} as const;
