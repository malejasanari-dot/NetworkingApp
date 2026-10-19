const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Configuración de Reverse Proxy para Render
// 'trust proxy', 1 confía exactamente en 1 salto (el reverse proxy frontal de Render),
// evitando suplantación de IP (IP spoofing) por cabeceras X-Forwarded-For manipuladas por clientes.
app.set('trust proxy', 1);

// Configuración de CORS con lista de orígenes permitidos
const defaultDevOrigins = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = new Set([...defaultDevOrigins, ...envOrigins]);
const allowAll = envOrigins.includes('*');

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Permitir solicitudes sin encabezado Origin (apps móviles nativas Android/iOS, curl, Postman, healthchecks)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Si se configuró wildcard explícito en CORS_ORIGINS
    if (allowAll) {
      return callback(null, true);
    }

    // 3. Normalizar origen (eliminar barra final si existe)
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.has(origin) || allowedOrigins.has(normalized)) {
      return callback(null, true);
    }

    // 4. Origen denegado por política de seguridad
    return callback(new Error(`Acceso denegado por política de CORS: origen '${origin}' no autorizado`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Endpoint 1: Health check del servidor
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'NetworkingApp Backend API'
  });
});

// Endpoint 2: Prueba de conexión a la base de datos MySQL (Solo lectura / Verificación)
app.get('/api/db-test', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 AS connection_test');
    res.json({
      success: true,
      message: 'Conexión a MySQL empresarial exitosa',
      database: process.env.DB_NAME || null,
      result: rows
    });
  } catch (error) {
    console.error('Error al conectar a la base de datos MySQL:', error.code || error.message);
    res.status(500).json({
      success: false,
      message: 'Error al conectar a la base de datos MySQL',
      error: error.message,
      code: error.code || null
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Endpoint 3: Directorio de candidatos LHH (Solo lectura, autenticado y paginado)
const directorioRouter = require('./routes/directorio');
app.use('/api/directorio', directorioRouter);

// Manejo centralizado de errores (incluyendo denegaciones de CORS)
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: err.message
    });
  }
  console.error('[Error no controlado en el servidor]:', err.message || err);
  return res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Verificación de conexión real a la base de datos MySQL empresarial
async function verifyDatabaseConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1');
    console.log('✅ Conexión a MySQL (REMOTA) exitosa');
    return true;
  } catch (error) {
    console.error(`❌ Conexión a MySQL fallida: ${error.code || error.message || 'Error de conexión'}`);
    console.warn('⚠️  El servidor seguirá activo para endpoints que no dependan de la base de datos.');
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

app.listen(PORT, HOST, async () => {
  console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
  console.log(`📍 Endpoint de salud: http://${HOST}:${PORT}/api/health`);
  await verifyDatabaseConnection();
});
