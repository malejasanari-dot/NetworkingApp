const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Crear pool de conexiones con mysql2/promise
const pool = mysql.createPool({
  host: process.env.DB_HOST || '162.240.166.106',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'wwsilh_Test',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wwsilh_uat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

module.exports = pool;
