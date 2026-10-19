const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const requireAuth = require('../middleware/auth');
const directorioRateLimiter = require('../middleware/rateLimiter');

/**
 * GET /api/directorio
 * Consulta paginada y parametrizada del directorio de candidatos LHH.
 * 
 * Seguridad:
 * - Protegido por limitador de frecuencia (rateLimiter).
 * - Protegido por autenticación de sesión de Supabase (requireAuth).
 * - Consulta estrictamente de solo lectura (SELECT).
 * - Proyección explícita de exactamente 7 columnas autorizadas (sin SELECT *).
 * - Parámetros validados y consultas parametrizadas con placeholders (?).
 * - Manejo de errores seguro sin fugas de SQL ni credenciales.
 */
router.get('/', directorioRateLimiter, requireAuth, async (req, res) => {
  let connection;
  try {
    // 1. Validación y saneamiento de parámetros de paginación
    const rawPage = parseInt(req.query.page, 10);
    const rawLimit = parseInt(req.query.limit, 10);

    const page = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1;
    const limit = !isNaN(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 100) : 20;
    const offset = (page - 1) * limit;

    // 2. Validación y saneamiento de parámetro de búsqueda
    const rawSearch = (req.query.search || req.query.q || '').toString().trim();
    // Limitar longitud máxima de búsqueda para prevenir abuso
    const search = rawSearch.slice(0, 100);

    let whereClause = '';
    const whereParams = [];

    if (search.length > 0) {
      const searchPattern = `%${search}%`;
      whereClause = `
        WHERE (
          nombre LIKE ? OR
          apellido LIKE ? OR
          titulo LIKE ? OR
          empresa LIKE ?
        )
      `;
      whereParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // 3. Conexión a la base de datos
    connection = await pool.getConnection();

    // 4. Consulta de conteo total (estrictamente parametrizada)
    const countSql = `SELECT COUNT(*) AS total FROM reporte_candidatosv3 ${whereClause}`;
    const [countRows] = await connection.query(countSql, whereParams);
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // 5. Consulta de datos (proyección explícita y exclusiva de 7 columnas autorizadas)
    const dataSql = `
      SELECT id_sistema, nombre, apellido, titulo, empresa, linkedin, fecha_inicio_programa
      FROM reporte_candidatosv3
      ${whereClause}
      ORDER BY 
        CASE WHEN fecha_inicio_programa IS NULL THEN 1 ELSE 0 END ASC,
        fecha_inicio_programa DESC,
        nombre ASC,
        apellido ASC,
        id_sistema ASC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...whereParams, limit, offset];
    const [rows] = await connection.query(dataSql, dataParams);

    // 6. Proyección estricta y segura en capa de respuesta (garantiza solo los 7 campos)
    const sanitizedData = rows.map(row => ({
      id_sistema: row.id_sistema,
      nombre: row.nombre ?? null,
      apellido: row.apellido ?? null,
      titulo: row.titulo ?? null,
      empresa: row.empresa ?? null,
      linkedin: row.linkedin ?? null,
      fecha_inicio_programa: row.fecha_inicio_programa ?? null
    }));

    // 7. Respuesta exitosa estructurada con metadatos de paginación
    return res.json({
      success: true,
      data: sanitizedData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (err) {
    // Registro interno seguro en el servidor (sin enviar al cliente)
    console.error('[Error seguro en GET /api/directorio]:', err.message);

    // Respuesta genérica y segura al cliente
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar el directorio de candidatos'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
