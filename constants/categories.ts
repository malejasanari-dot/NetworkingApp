export const CONTACT_CATEGORIES = ['Directorio LHH', 'Gestionados', 'Referidos', 'Conocidos'] as const;
export type ContactCategory = typeof CONTACT_CATEGORIES[number];

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
