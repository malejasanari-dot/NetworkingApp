/**
 * Middleware de autenticación segura para el backend de NetworkingApp.
 * Valida el token de sesión JWT de Supabase enviado en la cabecera Authorization: Bearer <token>.
 * No confía en API keys fijas ni expone detalles internos del sistema.
 */

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado: Token de sesión ausente'
    });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado: Formato de autorización inválido. Debe ser Bearer <token>'
    });
  }

  const token = parts[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado: Token vacío'
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('Error de configuración: Faltan credenciales de Supabase en backend/.env');
    return res.status(500).json({
      success: false,
      error: 'Error de configuración en el servicio de autenticación'
    });
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return res.status(401).json({
        success: false,
        error: 'Acceso no autorizado: Token de sesión inválido o expirado'
      });
    }

    const userData = await response.json();
    if (!userData || !userData.id) {
      return res.status(401).json({
        success: false,
        error: 'Acceso no autorizado: Usuario no reconocido'
      });
    }

    // Adjuntar usuario autenticado a la solicitud
    req.user = {
      id: userData.id,
      email: userData.email || null
    };

    return next();
  } catch (err) {
    console.error('Error al validar token con Supabase Auth:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado: Fallo en la verificación de credenciales'
    });
  }
}

module.exports = requireAuth;
