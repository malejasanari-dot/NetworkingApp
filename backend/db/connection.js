const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const requiredDbVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

// Crear pool de conexiones con mysql2/promise sin valores fallback inseguros
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Interceptor de validación para getConnection: genera errores descriptivos sin exponer credenciales
const originalGetConnection = pool.getConnection.bind(pool);
pool.getConnection = async () => {
  const missing = requiredDbVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    const error = new Error(
      `No se puede conectar a MySQL: Faltan las siguientes variables de entorno requeridas: ${missing.join(', ')}`
    );
    error.code = 'ER_MISSING_DB_CONFIG';
    throw error;
  }
  return originalGetConnection();
};

module.exports = pool;
