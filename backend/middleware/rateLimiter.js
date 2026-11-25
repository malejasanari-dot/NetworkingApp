const rateLimit = require('express-rate-limit');

/**
 * Limitador de frecuencia de solicitudes (Rate Limiting) para proteger el backend.
 * Previene extracción masiva de datos y ataques de denegación de servicio.
 */
const directorioRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutos por defecto
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 120, // Máximo 120 solicitudes por ventana
  standardHeaders: true, // Devuelve cabeceras RateLimit-* estándar
  legacyHeaders: false, // Deshabilita cabeceras X-RateLimit-*
  statusCode: 429,
  message: {
    success: false,
    error: 'Demasiadas solicitudes. Por favor intente más tarde.'
  }
});

/**
 * Limitador de frecuencia estricto para endpoints de validación/autenticación.
 * Previene ataques de fuerza bruta y enumeración de credenciales.
 */
const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutos por defecto
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 15, // Máximo 15 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    error: 'Demasiados intentos de validación. Por favor intente más tarde.'
  }
});

directorioRateLimiter.authRateLimiter = authRateLimiter;

module.exports = directorioRateLimiter;
