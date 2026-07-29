const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * Formatea una fecha ISO o Date al formato 'DD Mes AAAA - HH:mm'
 */
export const formatDate = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const day = date.getDate();
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()} - ${timeString}`;
};

/**
 * Formatea un objeto Date solo la fecha 'DD Mes AAAA'
 */
export const formatDateString = (date: Date): string => {
  const day = date.getDate();
  return `${day} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Formatea un objeto Date solo la hora 'HH:mm'
 */
export const formatTimeString = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
