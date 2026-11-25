const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { authRateLimiter } = require('../middleware/rateLimiter');

/**
 * Helper interno para formatear nombre y apellido provenientes de MySQL
 * sin exponer datos sensibles.
 */
function buildCandidateFullName(nombre, apellido) {
  return [nombre, apellido]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');
}

/**
 * Comprueba en Supabase Admin Auth si ya existe un usuario registrado con el correo dado.
 */
async function checkSupabaseUserExistsByEmail(supabaseUrl, serviceRoleKey, email) {
  const url = `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50&filter=${encodeURIComponent(email)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Error al consultar usuarios en Supabase Admin Auth (HTTP ${response.status})`);
  }

  const data = await response.json();
  const users = Array.isArray(data?.users) ? data.users : [];
  const found = users.find(
    (u) => u && typeof u.email === 'string' && u.email.trim().toLowerCase() === email
  );
  return Boolean(found);
}

/**
 * POST /api/auth/validate-candidate
 * Valida que el correo electrónico y la cédula ingresados durante el Login
 * correspondan a un mismo registro existente en la tabla reporte_candidatosv3.
 */
router.post('/validate-candidate', authRateLimiter, async (req, res) => {
  let connection;
  try {
    const rawEmail = req.body && typeof req.body.email === 'string' ? req.body.email : '';
    const rawCedula =
      req.body && (typeof req.body.cedula === 'string' || typeof req.body.cedula === 'number')
        ? String(req.body.cedula)
        : '';

    const email = rawEmail.trim().toLowerCase();
    const cedula = rawCedula.trim();

    if (!email || !cedula) {
      return res.status(400).json({
        success: false,
        authorized: false,
        error: 'Debe proporcionar correo electrónico y cédula.'
      });
    }

    if (email.length > 255 || cedula.length > 128) {
      return res.status(401).json({
        success: false,
        authorized: false,
        error: 'Las credenciales ingresadas no son válidas.'
      });
    }

    connection = await pool.getConnection();

    const sql = `
      SELECT id_sistema
      FROM reporte_candidatosv3
      WHERE LOWER(TRIM(correo)) = ?
        AND TRIM(numero_documento) = ?
      LIMIT 1
    `;

    const [rows] = await connection.query(sql, [email, cedula]);

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({
        success: false,
        authorized: false,
        error: 'Las credenciales ingresadas no son válidas.'
      });
    }

    const candidateId = rows[0].id_sistema;

    return res.status(200).json({
      success: true,
      authorized: true,
      id_sistema: candidateId
    });
  } catch (err) {
    console.error('[Error seguro en POST /api/auth/validate-candidate]:', err.code || err.message);
    return res.status(500).json({
      success: false,
      authorized: false,
      error: 'Error interno al validar las credenciales.'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/**
 * POST /api/auth/activate-candidate
 * Valida correo y cédula contra MySQL (reporte_candidatosv3) y, si coinciden,
 * comprueba si el usuario ya existe en Supabase Auth antes de crearlo automáticamente
 * con Supabase Admin Auth (usando SUPABASE_SERVICE_ROLE_KEY en el servidor).
 */
router.post('/activate-candidate', authRateLimiter, async (req, res) => {
  let connection;
  try {
    const rawEmail = req.body && typeof req.body.email === 'string' ? req.body.email : '';
    const rawCedula =
      req.body && (typeof req.body.cedula === 'string' || typeof req.body.cedula === 'number')
        ? String(req.body.cedula)
        : '';

    const email = rawEmail.trim().toLowerCase();
    const cedula = rawCedula.trim();

    if (!email || !cedula) {
      return res.status(400).json({
        success: false,
        authorized: false,
        error: 'Debe proporcionar correo electrónico y cédula.'
      });
    }

    if (email.length > 255 || cedula.length > 128) {
      return res.status(401).json({
        success: false,
        authorized: false,
        error: 'Las credenciales ingresadas no son válidas.'
      });
    }

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[activate-candidate] Error de configuración: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el backend.');
      return res.status(500).json({
        success: false,
        authorized: false,
        error: 'Error de configuración en el servicio de autenticación.'
      });
    }

    // 1. Validar que correo y cédula coincidan en el mismo registro de MySQL
    connection = await pool.getConnection();

    const sql = `
      SELECT id_sistema, nombre, apellido
      FROM reporte_candidatosv3
      WHERE LOWER(TRIM(correo)) = ?
        AND TRIM(numero_documento) = ?
      LIMIT 1
    `;

    const [rows] = await connection.query(sql, [email, cedula]);

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({
        success: false,
        authorized: false,
        error: 'Las credenciales ingresadas no son válidas.'
      });
    }

    const candidateRow = rows[0];
    const candidateId = candidateRow.id_sistema;
    const fullName = buildCandidateFullName(candidateRow.nombre, candidateRow.apellido);

    // 2. Comprobar si el usuario ya existe en Supabase Auth antes de intentar crearlo
    const alreadyExists = await checkSupabaseUserExistsByEmail(supabaseUrl, serviceRoleKey, email);
    if (alreadyExists) {
      return res.status(200).json({
        success: true,
        authorized: true,
        created: false,
        alreadyExists: true,
        id_sistema: candidateId
      });
    }

    // 3. Crear el usuario en Supabase Auth mediante Admin API (email confirmado automáticamente)
    const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        email,
        password: cedula,
        email_confirm: true,
        user_metadata: {
          name: fullName,
          full_name: fullName,
          id_sistema: candidateId
        }
      })
    });

    if (!createResponse.ok) {
      const errBody = await createResponse.json().catch(() => ({}));
      const errMsg = (errBody?.msg || errBody?.message || errBody?.error_description || '').toLowerCase();
      const errCode = (errBody?.error_code || errBody?.code || '').toLowerCase();

      // Si por condición de carrera la cuenta ya existe en Supabase Auth, no fallar ni duplicar
      if (
        createResponse.status === 422 ||
        errCode === 'email_exists' ||
        errCode === 'user_already_exists' ||
        errMsg.includes('already')
      ) {
        return res.status(200).json({
          success: true,
          authorized: true,
          created: false,
          alreadyExists: true,
          id_sistema: candidateId
        });
      }

      console.error('[activate-candidate] Error al crear usuario en Supabase Admin Auth:', createResponse.status, errCode || errMsg);
      return res.status(500).json({
        success: false,
        authorized: false,
        error: 'No se pudo completar la creación de la cuenta.'
      });
    }

    return res.status(200).json({
      success: true,
      authorized: true,
      created: true,
      alreadyExists: false,
      id_sistema: candidateId
    });
  } catch (err) {
    console.error('[Error seguro en POST /api/auth/activate-candidate]:', err.code || err.message);
    return res.status(500).json({
      success: false,
      authorized: false,
      error: 'Error interno al procesar la validación de acceso.'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
